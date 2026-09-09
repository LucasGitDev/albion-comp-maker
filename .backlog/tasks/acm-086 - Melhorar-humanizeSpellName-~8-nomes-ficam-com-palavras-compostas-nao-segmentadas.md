---
id: ACM-086
title: >-
  Melhorar humanizeSpellName: ~8 nomes ficam com palavras compostas nao
  segmentadas
status: In Progress
assignee: []
created_date: '2026-09-08 13:42'
updated_date: '2026-09-09 03:25'
labels: []
dependencies: []
priority: low
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finding MEDIUM da review da ACM-079 (PR #53), nao bloqueante.

O fallback humanizeSpellName cobre os 26 spells sem traducao upstream. A maioria fica legivel, mas ~8 produzem palavras compostas nao segmentadas, porque o uniquename upstream nunca teve underscore naquele ponto:

- REJUVMUSHROOM_GRENADE -> 'Rejuvmushroom Grenade'
- ICEROCK_EXPLODE -> 'Icerock Explode'
- SMITE_AOE -> 'Smite Aoe'
- SPEEDARCHER_KITE
- CURSEDHANDS_STACKUP
- CROSSSTEP_ROUNDHOUSE
- TRIPLECOMBO_DIVEKICK
- FROSTBOMB_CASTSLOW

Nao e informacao falsa (diferente do risco de tier, que a review descartou com dados reais) — e so estetica abaixo do ideal numa superficie que o usuario ve. 'Smite Aoe' tambem expoe jargao tecnico nao expandido.

Como sao apenas ~8 casos e um conjunto fechado, a solucao provavelmente e um dicionario de override explicito em vez de heuristica de segmentacao — heuristica generica vai errar mais do que acerta nesse volume.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Os ~8 nomes com palavras compostas nao segmentadas exibem nome legivel em portugues/ingles
- [ ] #2 A abordagem e override explicito para conjunto fechado, ou heuristica com teste cobrindo os 8 casos
- [ ] #3 Nenhuma regressao nos demais 18 casos de humanizeSpellName nem nos ramos exact/weapon-strip/tier da chain
- [ ] #4 make check verde
<!-- AC:END -->
