---
description: Revisa o PR/diff atual contra os critérios de aceite da task
argument-hint: "<TASK-ID>"
---

Rode `reviewer` na task **$ARGUMENTS**, e também `security-reviewer` se o diff toca auth, dados de tenant, upload, serialização de input ou integração externa.

Base: `git diff master...HEAD` + `backlog task view $ARGUMENTS --plain`.

Todo finding precisa de cenário de falha concreto e severidade. Registre como nota na task e me dê o veredito final: **LGTM** ou **BLOCKED: n findings**.
