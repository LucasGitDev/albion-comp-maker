---
id: decision-021
title: >-
  Fallback chain de localizacao de nomes de spell: familia de arma, tier,
  humanizado
date: '2026-09-08 13:43'
status: accepted
---
## Context

Origem: ACM-079 (PR #53). A UI exibia ao menos uma passiva sem traducao
(`PASSIVE_ARMORCHANCE_SWORD` aparecia como o proprio uniquename). A investigacao
descartou regressao na camada de apresentacao: `pickLocalizedName` e o lookup de
casing estavam corretos. A lacuna estava no pipeline de dados
(`scripts/sync-ao-data.ts`): `localization.json` simplesmente nao tem entrada
propria para varios spells.

Medicao no dump de 2026-09-08, restrita a spells referenciados por itens
equipaveis (113 uniquenames distintos, de 12509 pares item-spell):

- 39 spells: passivas "por familia de arma". Upstream so localiza a variante
  generica, sem sufixo de arma (`PASSIVE_ARMORCHANCE_SWORD` nao existe, mas
  `@SPELLS_PASSIVE_ARMORCHANCE` existe).
- 48 spells: passivas com tier (backpack/gathering T5-T8). Upstream localiza
  apenas um dos tiers.
- 26 spells: sem traducao upstream em nenhum padrao (skillshots, vaidade,
  maxload de montaria).

Ou seja: 87 dos 113 casos sao chave nao coberta pelo indexador (corrigivel), e
26 sao ausencia real de traducao (exigem decisao de fallback).

## Decision

Implementar uma fallback chain em `resolveSpellLocalizedNames`
(`scripts/sync-ao-data.ts`), avaliada estritamente nesta ordem:

1. **Match exato** da chave de localizacao. Sempre vence; nenhum fallback e
   tentado se o exato resolve.
2. **Strip de sufixo de arma** — `PASSIVE_X_SWORD` -> `@SPELLS_PASSIVE_X`.
3. **Scan de tiers inferiores** — para spells com tier, cai para o tier
   localizado disponivel.
4. **`humanizeSpellName`** — ultimo recurso para os 26 sem traducao upstream.

O uniquename cru NUNCA e exposto ao usuario final.

## Consequences

**Positivas**

- 87 dos 113 spells passam a exibir o nome real traduzido.
- Os 26 restantes exibem texto humanizado em vez de `SCREAMING_SNAKE_CASE`.
- Correcao fica no pipeline, nao na UI: qualquer consumidor de `ao-data.json`
  herda o resultado.

**Riscos avaliados com dados reais na review do PR #53**

- *Strip de sufixo de arma poderia inventar nome errado* se alguma variante por
  arma tivesse semantica propria. Verificado contra o dump nas 39: todas resolvem
  para buffs genericos legitimos (`PASSIVE_ARMORCHANCE_SWORD/AXE` -> "Increased
  Defense"). Nenhum contra-exemplo encontrado.
- *Scan de tier poderia exibir informacao falsa* se a string localizada
  mencionasse o numero do tier (mostrar nome de T5 num item T8). Verificado: as
  strings desses 48 casos ("Fiber Carrier", "Mining Proficiency", etc.) nao
  contem numero de tier. O risco nao se materializa.

**Divida aceita (follow-ups registrados)**

- ACM-086: ~8 saidas de `humanizeSpellName` ficam com palavras compostas nao
  segmentadas (`REJUVMUSHROOM_GRENADE` -> "Rejuvmushroom Grenade", `SMITE_AOE` ->
  "Smite Aoe"). Estetica, nao informacao falsa.
- ACM-087: falta teste travando a PRECEDENCIA dos ramos. Hoje o comportamento e
  correto, mas uma reordenacao futura degradaria em silencio — o pipeline
  continuaria gerando nomes, apenas errados.

**Nota de processo**

Este arquivo foi recriado apos o merge do PR #53: o original ficou untracked no
worktree da task e foi perdido na limpeza. O conteudo foi reconstruido a partir
dos relatorios verificados do implementer e do reviewer. Decisoes precisam ser
commitadas junto com o PR, nao deixadas untracked. Ver ACM-088.
