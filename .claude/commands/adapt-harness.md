---
description: Adapta o harness ao projeto atual — entrevista a ideia, reescreve agents e gera backlog.md
---

Leia e execute o prompt em `.claude/BOOTSTRAP.md` passo a passo, na ordem exata descrita.

Ao terminar, execute:

```bash
python3 -c "
import json
p = '.claude/harness.json'
d = json.load(open(p))
d['adapted'] = True
json.dump(d, open(p,'w'), indent=2)
print('harness.json → adapted: true')
"
```

Depois imprima:

```
Harness adaptado. Próximo passo:
  /spec "ideia em 2 frases"   → gera PRD + tasks
  /next                        → começa o build loop
```
