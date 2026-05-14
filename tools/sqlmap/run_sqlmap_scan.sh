#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_URL="${TARGET_URL:-http://127.0.0.1:8080}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@vaultdoc.ru}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPass123!}"
REPORT_DIR="${REPORT_DIR:-$SCRIPT_DIR/security-reports/sqlmap}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPORT_DIR/$STAMP"
LOG_DIR="$OUT_DIR/logs"
REQUEST_DIR="$OUT_DIR/requests"

mkdir -p "$OUT_DIR" "$LOG_DIR" "$REQUEST_DIR"

if ! command -v sqlmap >/dev/null 2>&1; then
  echo "sqlmap не найден"
  echo "Установи: sudo apt update && sudo apt install -y sqlmap"
  exit 1
fi

LOGIN_RESPONSE="$OUT_DIR/login_response.json"

LOGIN_HTTP_CODE="$(curl -sS -o "$LOGIN_RESPONSE" -w "%{http_code}" -X POST "$TARGET_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=$ADMIN_EMAIL" \
  --data-urlencode "password=$ADMIN_PASSWORD")"

case "$LOGIN_HTTP_CODE" in
  2*) ;;
  *)
    echo "Не удалось войти под admin"
    echo "HTTP: $LOGIN_HTTP_CODE"
    cat "$LOGIN_RESPONSE"
    exit 1
    ;;
esac

TOKEN="$(python3 - "$LOGIN_RESPONSE" <<'PY'
import json
import sys

path = sys.argv[1]

try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    print("")
    raise SystemExit

for key in ("access_token", "token", "accessToken"):
    value = data.get(key)
    if value:
        print(value)
        break
else:
    print("")
PY
)"

if [ -z "$TOKEN" ]; then
  echo "Не удалось получить JWT"
  cat "$LOGIN_RESPONSE"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"
OPENAPI_JSON="$OUT_DIR/openapi.json"
TARGETS_FILE="$OUT_DIR/targets.tsv"
SUMMARY_FILE="$OUT_DIR/summary.txt"

curl -sS "$TARGET_URL/openapi.json" -o "$OPENAPI_JSON" || true

if ! python3 -m json.tool "$OPENAPI_JSON" >/dev/null 2>&1; then
  curl -sS "$TARGET_URL/api/openapi.json" -o "$OPENAPI_JSON" || true
fi

if ! python3 -m json.tool "$OPENAPI_JSON" >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx "vaultdoc-backend"; then
    docker exec vaultdoc-backend python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/openapi.json", timeout=10).read().decode())' > "$OPENAPI_JSON" || true
  fi
fi

python3 - "$OPENAPI_JSON" "$TARGET_URL" "$TARGETS_FILE" <<'PY'
import json
import sys
import urllib.parse

openapi_path = sys.argv[1]
base_url = sys.argv[2].rstrip("/")
targets_path = sys.argv[3]

try:
    with open(openapi_path, "r", encoding="utf-8") as f:
        spec = json.load(f)
except Exception:
    open(targets_path, "w", encoding="utf-8").close()
    raise SystemExit

def value_for(param):
    name = param.get("name", "")
    schema = param.get("schema") or {}
    param_type = schema.get("type", "")

    if param_type in ("integer", "number"):
        return "1"
    if param_type == "boolean":
        return "true"
    if "email" in name.lower():
        return "test@vaultdoc.ru"
    if "date" in name.lower() or name.lower().endswith("_at"):
        return "2026-05-06"
    return "test"

rows = []

for path, methods in (spec.get("paths") or {}).items():
    if "{" in path or "}" in path:
        continue

    for method, operation in (methods or {}).items():
        if method.lower() != "get":
            continue

        parameters = operation.get("parameters") or []
        query_params = [
            p for p in parameters
            if p.get("in") == "query" and p.get("name")
        ]

        if not query_params:
            continue

        query = {
            p["name"]: value_for(p)
            for p in query_params
        }

        params = ",".join(query.keys())
        url = f"{base_url}{path}?{urllib.parse.urlencode(query)}"
        rows.append((method.upper(), url, params))

with open(targets_path, "w", encoding="utf-8") as f:
    for row in rows:
        f.write("\t".join(row) + "\n")
PY

python3 - "$TARGET_URL" "$REQUEST_DIR/login.req" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" <<'PY'
import sys
import urllib.parse

target_url = sys.argv[1]
path = sys.argv[2]
email = sys.argv[3]
password = sys.argv[4]

parsed = urllib.parse.urlparse(target_url)
host = parsed.netloc
body = urllib.parse.urlencode({
    "username": email,
    "password": password,
})
content_length = len(body.encode("utf-8"))

request = (
    "POST /api/auth/login HTTP/1.1\r\n"
    f"Host: {host}\r\n"
    "Content-Type: application/x-www-form-urlencoded\r\n"
    f"Content-Length: {content_length}\r\n"
    "Connection: close\r\n"
    "\r\n"
    f"{body}"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(request)
PY

COMMON_ARGS=(
  --batch
  --random-agent
  --level=2
  --risk=1
  --threads=1
  --dbms=PostgreSQL
  --output-dir="$OUT_DIR/sqlmap-output"
  --flush-session
)

run_sqlmap() {
  local name="$1"
  shift

  echo "=== $name ===" | tee -a "$SUMMARY_FILE"

  set +e
  sqlmap "$@" "${COMMON_ARGS[@]}" 2>&1 | tee "$LOG_DIR/$name.log"
  local status="${PIPESTATUS[0]}"
  set -e

  echo "exit_code=$status" | tee -a "$SUMMARY_FILE"
  echo "" | tee -a "$SUMMARY_FILE"
}

run_sqlmap "login_form" -r "$REQUEST_DIR/login.req" -p "username,password"

if [ -s "$TARGETS_FILE" ]; then
  while IFS=$'\t' read -r method url params; do
    name="$(python3 - "$method" "$url" <<'PY'
import re
import sys

method = sys.argv[1].lower()
url = sys.argv[2]
value = method + "_" + re.sub(r"[^a-zA-Z0-9]+", "_", url)
value = re.sub(r"_+", "_", value).strip("_")
print(value[:120])
PY
)"
    run_sqlmap "$name" -u "$url" -p "$params" -H "$AUTH_HEADER"
  done < "$TARGETS_FILE"
else
  echo "GET endpoints с query-параметрами в OpenAPI не найдены или OpenAPI недоступен" | tee -a "$SUMMARY_FILE"
fi

{
  echo "Итоговая сводка"
  echo "Цель: $TARGET_URL"
  echo "Папка отчёта: $OUT_DIR"
  echo ""

  if grep -RqiE "is vulnerable|appears to be injectable|Parameter: " "$LOG_DIR"; then
    echo "Найдены признаки возможной SQL-инъекции. Нужно разобрать логи вручную."
    grep -RniE "is vulnerable|appears to be injectable|Parameter: " "$LOG_DIR" || true
  else
    echo "Подтверждённых SQL-инъекций sqlmap не обнаружил."
  fi

  echo ""
  echo "Проверенные цели:"
  find "$LOG_DIR" -type f -name "*.log" -printf "%f\n" | sort
} | tee "$OUT_DIR/final_summary.txt"

echo "Готово"
echo "$OUT_DIR"
echo "$OUT_DIR/final_summary.txt"
