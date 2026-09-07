#!/usr/bin/env bash
# Estado do loop: budget de tentativas por task, persistente entre sessões.
# Uso:
#   loop-state.sh claim   <TASK-ID>   # abre a task no loop
#   loop-state.sh attempt <TASK-ID>   # +1 tentativa; exit 1 se estourou o budget
#   loop-state.sh pass    <TASK-ID>   # fecha a task, zera contador
#   loop-state.sh reset   <TASK-ID>   # zera contador (destravar manualmente)
#   loop-state.sh status  [TASK-ID]   # imprime o estado
set -euo pipefail

LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE="$LOOP_DIR/state.json"
BUDGET="${LOOP_MAX_ATTEMPTS:-3}"

[[ -f "$STATE" ]] || echo '{"budget":3,"tasks":{}}' > "$STATE"

ACTION="${1:-status}"
TASK="${2:-}"

ACTION="$ACTION" TASK="$TASK" STATE="$STATE" BUDGET="$BUDGET" python3 - <<'PY'
import json, os, sys, datetime

state_path = os.environ["STATE"]
action = os.environ["ACTION"]
task = os.environ["TASK"]
budget = int(os.environ["BUDGET"])

d = json.load(open(state_path))
d.setdefault("tasks", {})
d["budget"] = budget
now = datetime.datetime.now().astimezone().isoformat(timespec="seconds")

def save():
    json.dump(d, open(state_path, "w"), indent=2, ensure_ascii=False)

if action == "status":
    if task:
        t = d["tasks"].get(task)
        print(json.dumps(t or {"task": task, "attempts": 0, "state": "unknown"}, indent=2, ensure_ascii=False))
    else:
        openq = {k: v for k, v in d["tasks"].items() if v.get("state") == "open"}
        print(f"budget={budget}  tasks_abertas={len(openq)}")
        for k, v in sorted(d["tasks"].items()):
            flag = "!" if v.get("attempts", 0) >= budget else " "
            print(f" {flag} {k:<12} {v.get('state','?'):<8} tentativas={v.get('attempts',0)}")
    sys.exit(0)

if not task:
    sys.exit("erro: TASK-ID obrigatório para '%s'" % action)

t = d["tasks"].setdefault(task, {"attempts": 0, "state": "open", "opened_at": now})

if action == "claim":
    t["state"] = "open"
    t.setdefault("opened_at", now)
    save()
    print(f"{task}: aberta (tentativas={t['attempts']}/{budget})")

elif action == "attempt":
    t["attempts"] += 1
    t["state"] = "open"
    t["last_attempt_at"] = now
    save()
    n = t["attempts"]
    if n > budget:
        print(f"BUDGET ESTOURADO: {task} já teve {n-1} tentativas (budget={budget}).")
        print("Pare o loop. Devolva a task para To Do com nota de bloqueio e escale para o humano.")
        sys.exit(1)
    print(f"{task}: tentativa {n}/{budget}")

elif action == "pass":
    t["state"] = "done"
    t["closed_at"] = now
    save()
    print(f"{task}: fechada em {t['attempts']} tentativa(s)")

elif action == "reset":
    t["attempts"] = 0
    t["state"] = "open"
    save()
    print(f"{task}: contador zerado")

else:
    sys.exit(f"ação desconhecida: {action}")
PY
