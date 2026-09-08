---
id: ACM-079
title: Passivas sem traducao no ao-data.json (localizedNames repete o uniquename)
status: Done
assignee: []
created_date: '2026-09-08 00:35'
updated_date: '2026-09-08 13:42'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Causa raiz: NAO e regressao de pickLocalizedName. E lacuna no pipeline de dados (scripts/sync-ao-data.ts). PASSIVE_ARMORCHANCE_SWORD nao tem entrada TMX propria em localization.json — so existe a variante generica @SPELLS_PASSIVE_ARMORCHANCE (sem sufixo de arma).

Medicao do tamanho do problema (dump de 2026-09-08, restrito a spells realmente referenciados por items equipaveis — 113 uniquenames distintos de 12509 pares item-spell):
- 39 spells: passivas "por familia de arma" — so a base sem sufixo de arma tem traducao upstream (caso a). Inclui o PASSIVE_ARMORCHANCE_SWORD reportado.
- 48 spells: passivas com tier (PASSIVE_BACKPACK_*_T5..T8, PASSIVE_AVALON_YIELD_*_T5..T8) — upstream so localiza um tier (normalmente T4) e reusa o mesmo nome pros demais tiers (caso a).
- 26 spells: sem traducao upstream em nenhum padrao (skillshots/mecanicas como PYROBLAST_SKILLSHOT, SMITE_AOE, vaidade, maxload de montaria) — caso b genuino.

Acao: adicionada cadeia de fallback em resolveSpellLocalizedNames (scripts/sync-ao-data.ts) — match exato, depois strip de sufixo de arma conhecido, depois scan de tiers inferiores para sufixo _T<n>, e por ultimo humanizeSpellName (title-case do uniquename) como fallback final, nunca expondo o uniquename cru. Decisao registrada em decision-021.

ao-data.json e gerado (gitignored, nao versionado) — sem diff de artefato para revisar/fatiar. Teste em scripts/sync-ao-data.test.ts cobre resolveSpellLocalizedNames (incluindo o caso PASSIVE_ARMORCHANCE_SWORD) e humanizeSpellName. make check verde (439/439 testes, lint, typecheck, build).

REVIEW PR #53 (task/79-passive-localization) — veredito: LGTM (nenhum finding bloqueante).

Metodologia: reconstrui buildTmxNameIndex/resolveSpellLocalizedNames em Node contra os dumps reais em .cache/ (localization.json, 4203 spell tuids) e contra src/data/ao-data.json (701 uniquenames de spell usados por itens equipáveis) para validar as 3 categorias citadas na decision-021, em vez de confiar na alegação do implementer.

1) Strip de sufixo de arma (39 spells) — VERIFICADO, sem falso-positivo semântico.
   Todas as 39 amostradas resolvem para nomes de buff genéricos reais existentes no TMX
   (ex.: PASSIVE_ARMORCHANCE_SWORD/AXE -> "Increased Defense"/"Defesa Aumentada",
   PASSIVE_ENERGYCHANCE_* -> "Energetic", PASSIVE_SPELLPOWER_CASTER_* -> "Furious").
   Não há entrada TMX própria e divergente para nenhuma variante por arma na lista —
   o padrão upstream real é nome de buff compartilhado entre famílias de arma. Sem contra-exemplo encontrado.

2) Scan de tiers inferiores (48 spells) — VERIFICADO, sem informação falsa de tier.
   As 48 strings localizadas usadas como fallback (PASSIVE_BACKPACK_*_T4,
   PASSIVE_AVALON_YIELD_*_T4) são nomes genéricos sem número de tier no texto
   (ex.: "Fiber Carrier", "Mining Proficiency") — exibir o nome do T4 num item T5-T8
   não introduz um tier incorreto visível ao usuário, ao contrário do que o risco #2
   da tarefa de review levantava a priori.

3) humanizeSpellName (26 spells) — QUALIDADE ACEITÁVEL, MEDIUM (não bloqueante).
   Rodei a função contra as 26 uniquenames reais. Resultado majoritariamente legível
   (ex.: PYROBLAST_SKILLSHOT -> "Pyroblast Skillshot", PASSIVE_MAXLOAD_OWL -> "Maxload Owl").
   Porém ~8 casos produzem palavras compostas não segmentadas, pois o uniquename upstream
   nunca teve underscore nesses pontos: REJUVMUSHROOM_GRENADE -> "Rejuvmushroom Grenade",
   ICEROCK_EXPLODE -> "Icerock Explode", SMITE_AOE -> "Smite Aoe", SPEEDARCHER_KITE -> "Speedarcher Kite",
   CURSEDHANDS_STACKUP -> "Cursedhands Stackup", CROSSSTEP_ROUNDHOUSE -> "Crossstep Roundhouse",
   TRIPLECOMBO_DIVEKICK -> "Triplecombo Divekick", FROSTBOMB_CASTSLOW -> "Frostbomb Castslow".
   Não é informação falsa (não inventa efeito/valor), só esteticamente abaixo do ideal.
   MEDIUM: registrar como dívida — se algum desses aparecer em UI e for reportado, considerar
   dicionário de exceções pontual em vez de heurística de split por underscore.

4) Precedência exato > fallback — VERIFICADO por leitura de código: `resolveSpellLocalizedNames`
   retorna no primeiro `if (exact) return exact;` antes de tentar qualquer fallback. Não há
   regressão possível de passiva hoje correta via este código. Confirmei também que nenhuma
   das 39/48 amostradas colide com um match exato simultâneo (o índice não tem entrada própria
   para o uniquename completo nesses casos).
   MEDIUM: o novo teste não cobre explicitamente esse caso de precedência (uniquename com
   sufixo de arma/tier que TAMBÉM tem entrada exata própria) — recomendo teste de regressão
   adicional, mas não bloqueia por já estar coberto por inspeção de código + dados reais.

5) Determinismo — sem mudança de risco introduzida por este PR: buildTmxNameIndex itera o
   array de tu em ordem estável do JSON; resolveSpellLocalizedNames é uma função pura sobre
   Map já construído. Nenhum uso de iteração não determinística (Set/Map com chaves geradas
   em runtime) foi introduzido.

6) Testes — cobrem os 3 ramos da chain (exato, weapon-suffix, tier-scan) e o caso "nenhum
   estratégia encontra" (undefined), mais 2 casos de humanizeSpellName. Ausente: teste de
   precedência exato-vs-fallback (ver item 4). MEDIUM, não bloqueante.

Escopo: diff toca somente scripts/sync-ao-data.ts e scripts/sync-ao-data.test.ts. Nenhum
arquivo do PR #50 (build-card/**, ThemePanel.tsx, EditorActionBar.tsx, schema.ts, drizzle/)
foi tocado.

Quality gate: rodei `make check` eu mesmo no worktree — verde (54 arquivos, 439 testes,
lint, tsc --noEmit, build, todos passando). A alegação do implementer de que `bash
scripts/check.sh` direto seria necessário por falso-negativo do wrapper sob paralelismo
NÃO procede como está registrada: `make check` é apenas `@bash scripts/check.sh` (ver
Makefile) — não há diferença de comportamento entre as duas invocações, então a distinção
que o implementer fez não é uma evidência válida de nada; rodar make check aqui deu green
sem qualquer intervenção. Não bloqueante pois o gate de fato passa, mas a justificativa
dada pelo implementer é factualmente incorreta e deveria ser corrigida/desconsiderada em
relatos futuros.

Findings: 0 CRITICAL, 0 HIGH, 3 MEDIUM (garbled compound words em humanizeSpellName;
ausência de teste de precedência exato-vs-fallback; alegação incorreta sobre make check
vs check.sh — não afeta o resultado mas deve ser corrigida na comunicação do implementer).

VEREDITO: LGTM.
<!-- SECTION:NOTES:END -->
<!-- SECTION:NOTES:END -->
