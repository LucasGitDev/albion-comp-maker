---
id: ACM-059
title: >-
  Criar modulo compartilhado de constantes de validacao (client+server) para
  eliminar deriva
status: Done
assignee: []
created_date: '2026-09-07 20:01'
updated_date: '2026-09-07 20:35'
labels: []
dependencies: []
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Terceira ocorrencia do mesmo problema — tratar a causa, nao os sintomas. Limites de validacao estao duplicados entre o schema server-only e o codigo cliente porque src/lib/build-schema.ts e src/lib/comp-schema.ts usam import 'server-only' e portanto NAO podem ser importados pelo cliente. Confirmado pelo reviewer da ACM-012: nao e preguica, a restricao e real. Instancias conhecidas: (1) MAX_SWAPS=20 em src/store/build-store.ts duplica buildStateSchema.swaps.max(20) — sem nenhum teste garantindo que os dois numeros continuem iguais; (2) ACM-054, dois regex de accent independentes (build-schema ^#[0-9a-fA-F]{6}$ vs build-card/tokens ^#[0-9a-fA-F]{3,8}$); (3) ACM-056, limites de name/role (100/50) existem so no servidor, sem maxLength no cliente. Solucao: um modulo de constantes SEM 'server-only' (apenas numeros/regex, zero logica de validacao e zero dependencia de zod), importado tanto pelos schemas server-only quanto pelo cliente. Preserva a garantia da decision-013 (o validador continua server-only) enquanto elimina os numeros magicos duplicados.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existe um modulo de constantes compartilhado, sem import 'server-only', contendo apenas valores (numeros/regex)
- [ ] #2 build-schema.ts e comp-schema.ts consomem essas constantes em vez de literais inline
- [ ] #3 build-store.ts consome MAX_SWAPS do modulo compartilhado, nao de uma copia local
- [ ] #4 O modulo compartilhado NAO importa zod nem qualquer coisa server-only — nao pode inflar o bundle cliente (ver criterio de load time da ACM-043)
- [ ] #5 Teste garantindo que schema e cliente usam a MESMA constante (falha se divergirem)
- [ ] #6 make check verde
<!-- AC:END -->
