---
id: ACM-054
title: Unificar regex de accent entre build-schema e build-card/tokens
status: To Do
assignee: []
created_date: '2026-09-07 19:23'
labels: []
dependencies: []
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado INFO da auditoria de seguranca da ACM-049 (PR #33). Existem hoje DOIS padroes independentes para validar accent: src/lib/build-schema.ts usa /^#[0-9a-fA-F]{6}$/ (estrito, ancorado, aplicado na escrita) e src/components/build-card/tokens.ts usa um fallback mais largo /^#[0-9a-fA-F]{3,8}$/ em resolveAccent(). Ambos sao hex-only e seguros — nao ha vulnerabilidade hoje. O risco e de DERIVA: dois validadores para o mesmo campo divergem com o tempo, e o mais largo pode passar a aceitar algo que o estrito rejeita (ou vice-versa), criando confusao sobre qual e a fonte de verdade no momento em que a ACM-021 servir esse valor a terceiros. Unificar em uma constante compartilhada.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Um unico padrao/constante de accent compartilhado entre escrita e renderizacao
- [ ] #2 Comportamento de resolveAccent preservado para valores validos existentes
- [ ] #3 make check verde
<!-- AC:END -->
