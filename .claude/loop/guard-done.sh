#!/usr/bin/env bash
# Hook PreToolUse: bloqueia fechar task com o gate vermelho.
# Recebe o payload do hook em stdin. Exit 2 = bloqueia e devolve o motivo ao agente.
set -uo pipefail
LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD="$(cat)"

CMD="$(PAYLOAD="$PAYLOAD" python3 -c '
import json, os, sys
try:
    d = json.loads(os.environ["PAYLOAD"])
except Exception:
    sys.exit(0)
print((d.get("tool_input") or {}).get("command", ""))
')"

# Só interessa comando que marca task como Done
echo "$CMD" | grep -qiE 'status[= ]+"?Done"?' || exit 0

TASK="$(echo "$CMD" | grep -oE 'TASK-[0-9]+' | head -1)"

"$LOOP_DIR/check.sh" --quiet
GATE=$?

"$LOOP_DIR/loop-log.sh" gate_check task="${TASK:-?}" result="$([[ $GATE -eq 0 ]] && echo green || echo red)" origin=guard-done

if [[ $GATE -ne 0 ]]; then
  STEP="$(python3 -c "import json;print(json.load(open('$LOOP_DIR/last-check.json')).get('failed_step'))" 2>/dev/null || echo '?')"
  {
    echo "BLOQUEADO: não dá para marcar ${TASK:-a task} como Done — o quality gate está VERMELHO."
    echo "Passo que falhou: $STEP"
    echo "Erros estruturados em .claude/loop/last-check.json"
    echo ""
    echo "Faça: leia last-check.json, corrija a causa, rode .claude/loop/loop-state.sh attempt ${TASK:-TASK-ID}"
    echo "e só volte a fechar a task quando .claude/loop/check.sh sair verde."
  } >&2
  exit 2
fi

if [[ -n "$TASK" ]]; then
  LOOP_DIR="$LOOP_DIR" TASK="$TASK" python3 - <<'PY'
import json, os, datetime, sys

loop_dir = os.environ["LOOP_DIR"]
task = os.environ["TASK"]
state_path = os.path.join(loop_dir, "state.json")

if os.path.exists(state_path):
    try:
        d = json.load(open(state_path))
    except Exception:
        d = {}
else:
    d = {}

d.setdefault("budget", 3)
d.setdefault("tasks", {})

now = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
t = d["tasks"].setdefault(task, {"attempts": 0, "state": "open"})
attempts = t.get("attempts", 0)

t["state"] = "done"
t["closed"] = True
t["closed_at"] = now
t["attempts"] = attempts

try:
    json.dump(d, open(state_path, "w"), indent=2, ensure_ascii=False)
    print(f"{task}: fechada em {attempts} tentativa(s)")
except Exception as e:
    print(f"AVISO: não foi possível escrever state.json: {e}", file=sys.stderr)
PY
fi
exit 0
