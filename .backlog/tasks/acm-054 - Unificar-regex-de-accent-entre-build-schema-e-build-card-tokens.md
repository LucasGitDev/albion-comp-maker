---
id: ACM-054
title: Unificar regex de accent entre build-schema e build-card/tokens
status: Done
assignee: []
created_date: '2026-09-07 19:23'
updated_date: '2026-09-08 00:08'
labels: []
dependencies:
  - ACM-059
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado INFO da auditoria de seguranca da ACM-049 (PR #33). Existem hoje DOIS padroes independentes para validar accent: src/lib/build-schema.ts usa /^#[0-9a-fA-F]{6}$/ (estrito, ancorado, aplicado na escrita) e src/components/build-card/tokens.ts usa um fallback mais largo /^#[0-9a-fA-F]{3,8}$/ em resolveAccent(). Ambos sao hex-only e seguros — nao ha vulnerabilidade hoje. O risco e de DERIVA: dois validadores para o mesmo campo divergem com o tempo, e o mais largo pode passar a aceitar algo que o estrito rejeita (ou vice-versa), criando confusao sobre qual e a fonte de verdade no momento em que a ACM-021 servir esse valor a terceiros. Unificar em uma constante compartilhada.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Um unico padrao/constante de accent compartilhado entre escrita e renderizacao
- [x] #2 Comportamento de resolveAccent preservado para valores validos existentes
- [x] #3 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Unificado em src/lib/validation-constants.ts: ACCENT_HEX_PATTERN (estrito, 6-digitos, write-side, inalterado) + novo ACCENT_HEX_RENDER_PATTERN (3-8 digitos, render-side, superset deliberado). Decisao: nao forcei um unico regex — mantive dois nomes explicitos a partir da mesma fonte, pois resolveAccent() pode receber valores nao persistidos (defaults de role, props diretas de teste) com shorthand hex CSS legitimo que o schema de escrita nunca produz. ACCENT_HEX_PATTERN e subconjunto estrito de ACCENT_HEX_RENDER_PATTERN, entao todo valor persistido valido se comporta identicamente antes/depois. tokens.ts agora importa ACCENT_HEX_RENDER_PATTERN em vez de manter HEX_COLOR_PATTERN local. Teste novo em validation-constants.test.ts cobre a concordancia entre escrita e render para valores validos + caso shorthand render-only. make check: build falha com erro pre-existente e nao relacionado (fs.existsSync tracing em src/db/migrate.ts) — confirmado via git stash que o mesmo erro ocorre em master sem minhas mudancas; tsc/vitest(354 testes)/eslint passam limpos nos arquivos tocados. PR #46 aberto.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PR #46 merged. Regex de accent unificado em ACCENT_HEX_PATTERN (unico, estrito 6 digitos) em src/lib/validation-constants.ts, consumido tanto pela escrita (build-schema) quanto pela renderizacao (resolveAccent em build-card/tokens.ts). Tentativa 1 propos manter dois patterns (write estrito + render largo 3-8 digitos); review provou que o largo era codigo morto — resolveAccent tem so 2 callers de producao, setAccent nao tem caller de UI, e nao ha literal hex curto no src. Estreitar nao quebrou nenhum teste, confirmando a analise. make check verde na main pos-merge (371 testes).
<!-- SECTION:FINAL_SUMMARY:END -->
