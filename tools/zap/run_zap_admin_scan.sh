#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_URL="${TARGET_URL:-http://127.0.0.1:8080}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@vaultdoc.ru}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPass123!}"
REPORT_DIR="${REPORT_DIR:-$SCRIPT_DIR/security-reports/zap}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPORT_DIR/$STAMP"

mkdir -p "$OUT_DIR"

LOGIN_RESPONSE="$OUT_DIR/login_response.json"

curl -sS -X POST "$TARGET_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=$ADMIN_EMAIL" \
  --data-urlencode "password=$ADMIN_PASSWORD" \
  > "$LOGIN_RESPONSE"

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
  echo "Ответ сохранён: $LOGIN_RESPONSE"
  cat "$LOGIN_RESPONSE"
  exit 1
fi

cat > "$OUT_DIR/zap-options.prop" <<EOF
replacer.full_list(0).description=admin-jwt
replacer.full_list(0).enabled=true
replacer.full_list(0).matchtype=REQ_HEADER
replacer.full_list(0).matchstr=Authorization
replacer.full_list(0).regex=false
replacer.full_list(0).replacement=Bearer $TOKEN
EOF

docker pull ghcr.io/zaproxy/zaproxy:stable >/dev/null

docker run --rm --network host \
  -v "$OUT_DIR:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t "$TARGET_URL" \
  -r zap_full_admin_report.html \
  -J zap_full_admin_report.json \
  -w zap_full_admin_report.md \
  -I \
  -m 5 \
  -T 10 \
  -z "-configfile /zap/wrk/zap-options.prop"

echo "Готово"
echo "$OUT_DIR"
