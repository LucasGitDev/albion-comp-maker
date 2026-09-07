#!/usr/bin/env bash
# Agrega events.jsonl + state.json num resumo legível. Uso: loop-report.sh [--json]
set -euo pipefail
LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FMT="${1:-text}"
LOOP_DIR="$LOOP_DIR" FMT="$FMT" python3 - <<'PY'
import json, os, collections
d = os.environ["LOOP_DIR"]
events = []
p = os.path.join(d, "events.jsonl")
if os.path.exists(p):
    for line in open(p):
        line = line.strip()
        if line:
            try: events.append(json.loads(line))
            except Exception: pass
state = {}
sp = os.path.join(d, "state.json")
if os.path.exists(sp):
    state = json.load(open(sp))

tasks = state.get("tasks", {})
budget = state.get("budget", 3)
gates = [e for e in events if e.get("event") == "gate_check"]
green = sum(1 for e in gates if e.get("result") == "green")
red = len(gates) - green
by_step = collections.Counter(e.get("step") for e in events if e.get("event") == "gate_fail")
skills = collections.Counter(e.get("skill") for e in events if e.get("event") == "skill_used")
done = [t for t, v in tasks.items() if v.get("state") == "done"]
stuck = [t for t, v in tasks.items() if v.get("attempts", 0) >= budget and v.get("state") != "done"]
attempts = [v.get("attempts", 0) for v in tasks.values() if v.get("state") == "done"]

if os.environ["FMT"] == "--json":
    print(json.dumps({"gates": {"green": green, "red": red}, "tasks_done": len(done),
                      "stuck": stuck, "avg_attempts": round(sum(attempts)/len(attempts), 2) if attempts else 0,
                      "failing_steps": dict(by_step), "skills": dict(skills)}, indent=2, ensure_ascii=False))
    raise SystemExit

print("── LOOP REPORT ──")
print(f"gates: {green} verdes / {red} vermelhos" + (f"  ({green*100//max(len(gates),1)}% de acerto de primeira)" if gates else ""))
print(f"tasks fechadas: {len(done)}   media de tentativas: {round(sum(attempts)/len(attempts),2) if attempts else 0}/{budget}")
if stuck:
    print(f"TRAVADAS (budget estourado): {', '.join(sorted(stuck))}")
if by_step:
    print("\npassos que mais reprovam:")
    for k, v in by_step.most_common(5):
        print(f"  {v:>3}x  {k}")
if skills:
    print("\nskills mais acionadas:")
    for k, v in skills.most_common(8):
        print(f"  {v:>3}x  {k}")
if not events and not tasks:
    print("(sem dados ainda — rode algumas tasks pelo /loop)")
PY
