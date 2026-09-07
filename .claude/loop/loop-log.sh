#!/usr/bin/env bash
# Append de evento no events.jsonl. Uso: loop-log.sh <evento> [chave=valor ...]
set -euo pipefail
LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVENT="${1:-unknown}"; shift || true
EVENT="$EVENT" ARGS="$*" LOG="$LOOP_DIR/events.jsonl" python3 - <<'PY'
import json, os, datetime
rec = {"ts": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
       "event": os.environ["EVENT"]}
for pair in os.environ.get("ARGS", "").split():
    if "=" in pair:
        k, v = pair.split("=", 1)
        rec[k] = v
with open(os.environ["LOG"], "a") as f:
    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
PY
