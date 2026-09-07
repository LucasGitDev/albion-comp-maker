#!/usr/bin/env bash
# Quality gate. Emite sinal ESTRUTURADO para o loop consumir.
# Uso: .claude/loop/check.sh [--quiet]
# Saída: .claude/loop/last-check.json  |  exit 0 = verde, 1 = vermelho
set -uo pipefail

LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$LOOP_DIR/last-check.json"
QUIET=false
[[ "${1:-}" == "--quiet" ]] && QUIET=true

log() { [[ "$QUIET" == "false" ]] && echo "$@" >&2; return 0; }

STEPS_FILE="$LOOP_DIR/steps.sh"
if [[ -f "$STEPS_FILE" ]]; then
  # Projeto pode sobrescrever os passos. Deve definir: STEPS=( "nome:comando" ... )
  # shellcheck disable=SC1090
  source "$STEPS_FILE"
else
  STEPS=(
    "lint:npm run lint --if-present"
    "typecheck:npx --no-install tsc --noEmit"
    "test:npm test --if-present -- --run"
    "build:npm run build --if-present"
  )
fi

START=$(date +%s)
FAILED_STEP=""
EXIT_CODE=0
ERR_LOG="$(mktemp)"
RESULTS=""

for entry in "${STEPS[@]}"; do
  name="${entry%%:*}"
  cmd="${entry#*:}"
  log "==> $name"
  step_start=$(date +%s)
  if output=$(eval "$cmd" 2>&1); then
    status="pass"
  else
    EXIT_CODE=$?
    status="fail"
    FAILED_STEP="$name"
    printf '%s' "$output" > "$ERR_LOG"
  fi
  step_dur=$(( $(date +%s) - step_start ))
  RESULTS="${RESULTS}${name}|${status}|${step_dur}"$'\n'
  [[ "$status" == "fail" ]] && { log "    FALHOU ($name)"; break; }
done

DURATION=$(( $(date +%s) - START ))

RESULTS="$RESULTS" FAILED_STEP="$FAILED_STEP" EXIT_CODE="$EXIT_CODE" \
DURATION="$DURATION" ERR_LOG="$ERR_LOG" OUT="$OUT" python3 - <<'PY'
import json, os, datetime
steps = []
for line in os.environ["RESULTS"].strip().splitlines():
    if not line.strip():
        continue
    n, s, d = line.split("|")
    steps.append({"step": n, "status": s, "duration_s": int(d)})
failed = os.environ["FAILED_STEP"]
errors = []
if failed:
    raw = open(os.environ["ERR_LOG"]).read().strip().splitlines()
    errors = [l for l in raw if l.strip()][-40:]
report = {
    "ok": not failed,
    "ts": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    "failed_step": failed or None,
    "exit_code": int(os.environ["EXIT_CODE"]) if failed else 0,
    "duration_s": int(os.environ["DURATION"]),
    "steps": steps,
    "errors": errors,
}
json.dump(report, open(os.environ["OUT"], "w"), indent=2, ensure_ascii=False)
PY

rm -f "$ERR_LOG"

if [[ -n "$FAILED_STEP" ]]; then
  log ""; log "GATE VERMELHO — falhou em: $FAILED_STEP"
  log "Detalhes estruturados: $OUT"
  exit 1
fi
log ""; log "GATE VERDE (${DURATION}s)"
exit 0
