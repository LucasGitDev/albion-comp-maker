---
id: ACM-079
title: Passivas sem traducao no ao-data.json (localizedNames repete o uniquename)
status: To Do
assignee: []
created_date: '2026-09-08 00:35'
labels: []
dependencies: []
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado da verificacao visual da ACM-040 (PR #48), fora do escopo daquela task. Pelo menos uma passiva (PASSIVE_ARMORCHANCE_SWORD) e exibida sem traducao na UI. Investigado na fonte: NAO e regressao do pickLocalizedName nem do lookup de casing — o proprio artefato src/data/ao-data.json ja traz localizedNames['EN-US'] com valor IGUAL ao uniquename para essa entrada. Ou seja, a lacuna esta no pipeline de dados (resolucao de localizacao de spells em scripts/sync-ao-data.ts / spell-resolver / indexador de localizacao da ACM-004), nao na camada de apresentacao. Investigar se a chave de localizacao dessas passivas segue outro padrao no dump da AO (ex.: sufixo diferente no localization.json) ou se realmente nao existe traducao upstream — e nesse caso decidir o fallback de UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Causa raiz identificada: chave de localizacao ausente upstream vs. padrao de chave nao coberto pelo indexador,Se for padrao de chave nao coberto, o emitter passa a resolver e ao-data.json traz o nome traduzido,Se nao houver traducao upstream, o comportamento de fallback e uma decisao registrada (nao apenas exibir o uniquename cru para o usuario final),Teste cobrindo a resolucao de nome da passiva afetada,make check verde
<!-- AC:END -->
