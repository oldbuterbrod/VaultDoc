#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

python3 tools/xss/xss_check.py
