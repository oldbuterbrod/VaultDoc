#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_URL="${TARGET_URL:-http://127.0.0.1:8080}"
REPORT_DIR="${REPORT_DIR:-$SCRIPT_DIR/security-reports/k6}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPORT_DIR/$STAMP"

mkdir -p "$OUT_DIR"
chmod 777 "$OUT_DIR"

curl -fsS "$TARGET_URL/health" >/dev/null

set +e
docker run --rm --network host \
  -v "$SCRIPT_DIR:/scripts:ro" \
  -v "$OUT_DIR:/reports:rw" \
  -e TARGET_URL="$TARGET_URL" \
  -e K6_SUMMARY_TXT="/reports/k6_summary.txt" \
  grafana/k6 run \
  --summary-export /reports/k6_summary.json \
  /scripts/vaultdoc_load_test.js \
  2>&1 | tee "$OUT_DIR/k6_console.log"

STATUS="${PIPESTATUS[0]}"
set -e

echo "$STATUS" > "$OUT_DIR/exit_code.txt"

echo "Готово"
echo "$OUT_DIR"
echo "$OUT_DIR/k6_summary.txt"

exit "$STATUS"
