---
id: ACM-094
title: Pipeline emite itens prototipo/nao-lancados no catalogo de itens
status: Done
assignee: []
created_date: '2026-09-08 22:43'
updated_date: '2026-09-09 01:33'
labels:
  - bug
  - data-pipeline
dependencies: []
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Descoberto na review da ACM-091. O emitter de scripts/sync-ao-data.ts nao filtra conteudo nao-lancado: T8_HEAD_PLATE_PROTOTYPE, T8_ARMOR_PLATE_PROTOTYPE e T8_SHOES_PLATE_PROTOTYPE (set Dragonknight) entraram no ao-data.json. Sinais de prototipo confirmados pelo reviewer: spell literalmente chamado PROTOTYPE_ICESHIELD, e ausencia de localizacao PT-BR ao contrario de todos os outros itens de head. Consequencia: usuarios veem e podem selecionar itens que nao existem no jogo, gerando comps invalidas. Comportamento PRE-EXISTENTE do pipeline, nao introduzido pela ACM-091 — por isso nao bloqueou aquele merge. Investigar um criterio de exclusao robusto (nao apenas match no substring PROTOTYPE, que e fragil) e decidir se a ausencia de PT-BR e um sinal utilizavel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Itens prototipo/nao-lancados nao aparecem no catalogo do item-picker
- [ ] #2 Criterio de exclusao documentado e nao baseado apenas em substring de uniquename
- [ ] #3 Teste no scripts/sync-ao-data.test.ts cobre a exclusao
- [ ] #4 make check verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Criterio decidido em decision-024: item so entra no catalogo se LocalizedNames (formatted/items.json) tiver >= 2 locales. Distribuicao do corpus e estritamente bimodal (0, 1 ou 15 locales — nada entre 2 e 14), logo zero zona cinzenta. Remove exatamente 3 de 2142 itens, os tres prototipos Dragonknight. Flags do XML (@unlockedtocraft/@unlockedtoequip/@showinmarketplace) foram testados e REJEITADOS: sao invertidos (prototipos=true, 1246-1584 itens legitimos=false). LocalizedDescriptions===null REJEITADO: 299 falsos positivos (vanity).

1. Em scripts/sync-ao-data.ts, adicionar e exportar o predicado puro:
   export function isReleasedItem(item: { LocalizedNames?: Record<string,string> | null }): boolean
   Retorna true somente se LocalizedNames existir e Object.keys(...).length >= 2.
   Definir a constante MIN_LOCALES_FOR_RELEASED = 2 com comentario referenciando decision-024 e a tabela de distribuicao (0:846 / 1:19 / 15:11372).

2. Aplicar o predicado dentro de buildItemNameIndex (scripts/sync-ao-data.ts, ~linha 258), ANTES do estreitamento para TARGET_LOCALES — avaliar depois do estreitamento degeneraria a regra para 'ausencia de PT-BR', que e a opcao C rejeitada. Ou seja: dentro do for, apos 'if (!id || !it.LocalizedNames) continue;', inserir 'if (!isReleasedItem(it)) continue;'. Itens filtrados caem no caminho existente '!names' do emit e sao contados em skipped.

3. Contabilizar separadamente para observabilidade: fazer buildItemNameIndex incrementar um contador de nao-lancados e logar '[emit] N itens ignorados como nao-lancados (decision-024)'. Manter simples — um contador local retornado junto ou uma variavel de modulo NAO; preferir retornar { index, unreleased } e ajustar o unico call site (linha 310).

4. Testes em scripts/sync-ao-data.test.ts — novo describe('isReleasedItem'):
   a) exclui item com apenas EN-US (shape real de T8_HEAD_PLATE_PROTOTYPE: { LocalizedNames: { 'EN-US': 'Dragonknight Helmet' }, LocalizedDescriptions: null }) -> false
   b) inclui item totalmente localizado (shape de T8_HEAD_PLATE_SET3, com EN-US + PT-BR + DE-DE ...) -> true
   c) inclui item com exatamente 2 locales (limiar) -> true
   d) exclui LocalizedNames ausente/null/{} -> false
   e) REGRESSAO ANTI-SUBSTRING (AC-2): um item cujo uniquename contem 'PROTOTYPE' mas totalmente localizado NAO e excluido — prova que a regra nao e substring de uniquename
   f) REGRESSAO FALSO-POSITIVO: item vanity com LocalizedDescriptions null mas 15 locales (shape de UNIQUE_HEAD_VANITY_KNIGHT) -> true, prova que nao caimos na opcao B

5. Regenerar artefatos (requer rede, ~130 MB de download):
   pnpm sync:ao && pnpm build:fixture
   Conferir no diff que a unica remocao sao os 3 prototipos:
   node -e "const a=require('./src/data/ao-data.json');console.log(a.items.length, a.items.filter(i=>/PROTOTYPE/.test(i.uniquename)).length)"
   Esperado: 2139 e 0.
   ATENCAO: sync:ao busca o upstream de hoje, que pode ter driftado alem dos 3 prototipos. Se o total nao for exatamente 2139, comparar o diff item a item contra o commit anterior e fixar os numeros REALMENTE medidos (nunca ajustar teste sem explicar o delta) — ver o runbook no cabecalho de acceptance.test.ts linhas 100-119.

6. Atualizar os snapshots fixados em src/__tests__/acceptance.test.ts (AC-3) — sao manuais por design:
   - linha 133/134/136: 2142 -> 2139 (inclusive no titulo do it) e withSpells 1455 -> 1452
   - SLOT_FLOORS: head 281/191 -> 280/190; armor 265/181 -> 264/180; shoes 257/180 -> 256/179
   (os 3 prototipos tem 6, 7 e 7 spells, por isso withSpells tambem cai)
   Demais slots inalterados.

7. Rodar make check e confirmar verde.

8. Registrar nas notas da task o numero medido de itens removidos e a lista, e referenciar decision-024.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigacao empirica (agente de arquitetura, 2026-09-08) concluida — criterio registrado em decision-024. Evidencia: distribuicao de locales em LocalizedNames sobre os 12237 itens de formatted/items.json e estritamente bimodal — 846 itens com 0 locales, 19 com 1, 11372 com 15, nenhum entre 2 e 14. Os 19 com 1 locale sao as 15 variantes de prototipo (3 base + 4 encantamentos cada) e 4 avatares de temporada GvG (ja excluidos por categoria). Flags do XML rejeitados com contra-evidencia: T8_HEAD_PLATE_PROTOTYPE tem @unlockedtocraft=true/@unlockedtoequip=true/@showinmarketplace=true, enquanto o item valido T8_HEAD_PLATE_SET3 tem craft=false/equip=false. Usar esses flags removeria 1246-1584 dos 2142 itens emitidos e ainda manteria os prototipos. LocalizedDescriptions===null rejeitado por 299 falsos positivos (itens vanity legitimos).

Review (auditor, verificacao independente do diff + artefatos):

1. Narrowing trap (risco #1) — VERIFICADO OK. isReleasedItem() em scripts/sync-ao-data.ts avalia item.LocalizedNames completo, aplicado dentro de buildItemNameIndex ANTES do loop de estreitamento para TARGET_LOCALES (o `continue` do predicado ocorre antes do `for (const locale of TARGET_LOCALES)`). Nao degenera para "falta PT-BR" (opcao C rejeitada).

2. Diff de artefatos (ao-data.json) — VERIFICADO com jq/python, nao lido inteiro. Lista de uniquenames main vs HEAD: removidos exatamente T8_HEAD_PLATE_PROTOTYPE, T8_ARMOR_PLATE_PROTOTYPE, T8_SHOES_PLATE_PROTOTYPE; zero adicoes. Contagem 2142->2139 confirmada. spells: 9045 em ambos (identico). Comparacao item-a-item dos 2139 itens em comum: 0 diffs de conteudo (byte-identico) -> zero drift upstream embutido. Alegacao do implementer confirmada.

3. Contagens pinadas em acceptance.test.ts — batem com a remocao dos 3 itens (verificados via distincao textual do plano vs diff real: total 2139, withSpells 1452, head 280/190, armor 264/180, shoes 256/179). Nao sao bump cego.

4. Testes em sync-ao-data.test.ts — testam comportamento real, nao espelham a implementacao: cobrem limiar exato (2 locales), null/vazio/ausente, anti-substring (item com "PROTOTYPE" no nome mas totalmente localizado -> true) e anti-falso-positivo vanity (15 locales sem description -> true, prova que nao caiu na opcao B rejeitada). Nenhum teste apenas reafirma `Object.keys(x).length >= 2` sem contexto de decisao.

5. PROTOTYPE_ICESHIELD / spells lookup — verificado via jq: a entrada permanece na tabela global `spells` do artefato (que contem todos os spells de spells.json, e uma tabela de lookup, nao um catalogo — conforme decision-024). Confirmado que nenhum item emitido referencia mais PROTOTYPE_ICESHIELD/_SHIELD/_EXPLOSION nos `spells` de nenhum item. Fixture ao-corpus.json tambem confirma a remocao do bloco do item prototipo (que continha a referencia ao spell). Sem vazamento na UI.

Escopo do diff: apenas scripts/sync-ao-data.ts, scripts/sync-ao-data.test.ts, src/__tests__/acceptance.test.ts, src/data/ao-data.json, src/__tests__/fixtures/ao-corpus.json — sem arquivos fora do esperado.

Nenhum finding CRITICAL/HIGH/MEDIUM identificado. Todas as alegacoes do implementer foram verificadas de forma independente (nao aceitas de graca) e se sustentam.

Veredito: LGTM
<!-- SECTION:NOTES:END -->
