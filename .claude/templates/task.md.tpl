## [TASK-XXX] <título imperativo e específico>

status: To Do
depends: <TASK-ID ou vazio>
touches: <globs que esta task vai modificar — erre pra mais>
skills: <skills que o implementer deve carregar>
verify: <COMANDO que sai 0 quando a task esta pronta. Obrigatorio. Sem isso o /loop recusa a task>

**Contexto**
Por que esta task existe, em até 3 linhas. Qual problema do usuário ela resolve.

**Critério de aceite** (cada item deve ser coberto pelo `verify:` acima ou por um gate de review)
- [ ] <verificável por comando ou passo manual>
- [ ] <caso de erro tratado>
- [ ] <caso limite>

**Verificação manual** (obrigatório se tem UI)
1. <passo>
2. <resultado esperado>

**Fora do escopo desta task**
- <o que é tentador fazer junto mas não entra>
