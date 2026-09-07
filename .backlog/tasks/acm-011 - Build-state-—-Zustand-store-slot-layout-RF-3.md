---
id: ACM-011
title: Build state — Zustand store + slot layout (RF-3)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 16:38'
labels: []
milestone: m-2
dependencies:
  - ACM-005
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zustand store for BuildState (schemaVersion, name, role, accent, slots, swaps). Slot panel showing all 9 slots. Serializable to/from JSON.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BuildState matches type definition in PRD 5.5
- [ ] #2 Selecting item in a slot updates store
- [ ] #3 Selecting spells updates store
- [ ] #4 store.getState() returns serializable object (no functions, no undefined)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UX spec (ACM-011) — Build state + slot layout. Depends on doc-001 (icons) e doc-002 (ItemPicker); nenhum dos dois é redesenhado aqui.

## 0. Correção de escopo antes de codar
A descrição diz "9 slots". `Slot` em src/data/ao-data.d.ts declara 10: mainhand, offhand, head, armor, shoes, cape, bag, mount, food, potion. A tela especifica **10 cards**, sendo offhand condicional (bloqueado quando mainhand é twohanded — ACM-026 / doc-002 §4). Ajustar a descrição da task ou a spec antes de implementar; não implementar 9 e descobrir depois.

## 1. Fluxo do usuário
1. Entra em /build/new → card de build vazio, 10 slots em estado vazio, cursor já no campo "Nome do build".
2. Clica em um card de slot → abre ItemPicker (popover ancorado no card, doc-002). Não é modal: o leader compara com os outros slots enquanto escolhe.
3. Seleciona item → popover fecha, card entra em `loading` (ícone via /api/icon), depois `filled`.
4. Seletores de tier/encanto (ACM-009) aparecem no rodapé do card; chips Q/W/E/Passive (ACM-010) aparecem abaixo, **apenas para os spell groups que aquele item realmente expõe** (`item.spells`). Slot sem spell não renderiza linha de spell — o diferencial do produto é não oferecer ability que o item não tem.
5. Erros: item inválido/ícone 404 → card mantém nome + badge de tier e mostra o estado `error` do ItemIcon (anel vermelho + "!"), com ação de recuperação "Trocar item" no próprio card. Nunca card em branco silencioso.

Mecanismo (revenue-centric): **Zeigarnik** — o contador `7/10 slots` no header e os 3 slots vazios com contorno tracejado mantêm a tarefa visivelmente incompleta; conclusão é o que leva ao export, que é o momento de valor do produto. Não usar barra de progresso cheia por default (anticlímax): o contador começa em 0/10.

## 2. Wireframe (desktop 1440+)

┌ Editor ────────────────────────────────────────────────────────────────────┐
│ Nome do build [ Bruiser de frontline________ ]  Papel [ Tank ▾ ]   7/10 ▮▮▮ │
├────────────────────────────────────────────────────────────────────────────┤
│  ARMAS                ARMADURA               UTILIDADE                     │
│  ┌──────────┐        ┌──────────┐          ┌──────────┐                    │
│  │ Mão prin.│        │ Cabeça   │          │ Capa     │                    │
│  │ ┌──────┐ │        │ ┌──────┐ │          │ ┌──────┐ │                    │
│  │ │ ícone│ │        │ │ ícone│ │          │ │ ícone│ │                    │
│  │ │  96  │ │        │ │  96  │ │          │ │  96  │ │                    │
│  │ └T8─◆1─┘ │        │ └T8─◆1─┘ │          │ └T8─◆0─┘ │                    │
│  │ Martelo  │        │ Capuz de │          │ Capa de  │                    │
│  │ de Guerra│        │ Guardião │          │ Martlock │                    │
│  │ [Q][W][E]│        │ [W] [P]  │          │ [Q]      │                    │
│  │ [P]      │        └──────────┘          └──────────┘                    │
│  └──────────┘        ┌──────────┐          ┌──────────┐                    │
│  ┌──────────┐        │ Peito    │          │ Bolsa    │                    │
│  │ Mão sec. │        │ ┌──────┐ │          │ ┌ ─ ─ ┐ │                     │
│  │ ┌──────┐ │        │ │ ícone│ │          │  vazio  │                     │
│  │ │ 🔒   │ │        │ └T8─◆1─┘ │          │ └ ─ ─ ┘ │                     │
│  │ └──────┘ │        │ Armadura │          │ Adicionar                     │
│  │ Ocupada  │        │ [W] [P]  │          └──────────┘                    │
│  │ por arma │        └──────────┘          ┌──────────┐                    │
│  │ de 2 mãos│        ┌──────────┐          │ Montaria │ …                  │
│  └──────────┘        │ Botas … │           └──────────┘                    │
│                      └──────────┘                                          │
│  ── Consumíveis ─────────────────────────────────────────────────────────  │
│  ┌──────────┐ ┌──────────┐                                                 │
│  │ Comida … │ │ Poção …  │                                                 │
│  └──────────┘ └──────────┘                                                 │
└────────────────────────────────────────────────────────────────────────────┘

Ordem visual é a do painel de equipamento do próprio Albion (arma à esquerda, armadura no centro, utilidade à direita, consumíveis embaixo). Convenção existente: o usuário não vai aprender uma tabela nova.

## 3. Card de slot — anatomia e medidas
- Card: 168px largura fixa, padding 12px, radius 12px, `bg-icon-slot`, borda 1px `--color-icon-slot-empty`.
- Label do slot: 11px/600, uppercase, letter-spacing 0.04em, cor muted. Sempre visível, inclusive preenchido (o leader escaneia por posição, não por nome do item).
- Ícone: `ItemIcon size="xl"` (80px) centralizado em caixa 96px. Não criar tamanho novo.
- Badge de tier: canto inferior esquerdo do ícone, pílula 20x16, 10px/700, fundo da cor do tier (§6), texto #0b0d11. Só renderiza com tier > 0.
- Encanto: canto inferior direito, `.1`–`.4` em pílula verde `#3f8f4a`; encanto 0 não renderiza nada (silêncio é o default).
- Nome do item: 13px/500, 2 linhas máx, `line-clamp-2`, `title` com o nome completo.
- Linha de spells: chips 32px (`SpellIcon size="sm"`), gap 4px, wrap. Chip vazio = quadrado tracejado com a tecla ("Q","W","E","P") em 10px.
- Densidade: **densa**. Isto é ferramenta de trabalho, não onboarding. Gap entre cards 12px, entre colunas 32px.

## 4. Estados obrigatórios do card
| Estado | Visual | Recuperação |
|---|---|---|
| vazio | borda tracejada 1px, ícone-fantasma do slot 40% opacidade, texto "Adicionar" 12px | clique abre picker |
| hover (vazio) | borda sólida accent, `cursor-pointer`, texto "Adicionar" → accent | — |
| loading | esqueleto do ItemIcon (`animate-pulse`, já implementado); label e nome já visíveis se conhecidos | — |
| preenchido | como no wireframe | botão "×" no canto sup. dir. aparece no hover → limpa slot |
| bloqueado (offhand + 2H) | cadeado, opacidade 60%, `cursor-not-allowed`, copy "Ocupada por arma de duas mãos" | trocar a mão principal por arma de 1 mão |
| erro de ícone | anel `--color-icon-error` + "!" (doc-001); nome e tier preservados | botão "Trocar item" |
| item removido do dump | badge "Item desatualizado" âmbar; slot mantém o id | "Trocar item" |

Estado vazio da **tela inteira** (build novo): os 10 cards vazios *são* o empty state; acima deles, uma linha única "Escolha a arma principal primeiro — ela define as habilidades do build." com seta apontando para o card de mão principal. Uma tela, uma ação primária: escolher a mão principal. O botão "Exportar PNG" existe mas fica `disabled` com tooltip "Adicione ao menos a mão principal" até o primeiro item.

## 5. Store (Zustand)
Decisão a registrar (`backlog decision create`) — **estado e ações separados**, porque a AC #4 exige `getState()` serializável e uma store Zustand plana devolve as funções junto.

```ts
// src/store/build-store.ts
type EquippedItem = {
  itemId: string;            // uniquename sem sufixo de tier/encanto? NÃO: uniquename completo
  tier: number;              // 1..8
  enchant: 0|1|2|3|4;
  spells: Record<"q"|"w"|"e"|"passive", string | null>;  // spell uniquename
};
type BuildState = {
  schemaVersion: 1;
  name: string;
  role: string;
  accent: string;            // hex
  slots: Record<Slot, EquippedItem | null>;   // 10 chaves, sempre presentes
  swaps: Swap[];             // ACM-012
};
type BuildStore = { build: BuildState; actions: { setItem(...): void; ... } };
export const selectBuild = (s: BuildStore) => s.build;
```
Regras:
- **`null`, nunca `undefined`.** `JSON.stringify` apaga `undefined` e quebra o round-trip da AC #4. Teste: `JSON.parse(JSON.stringify(b))` deve ser `toEqual(b)`.
- `slots` tem as 10 chaves sempre presentes (não sparse) — assim a grade renderiza por `SLOT_ORDER` constante e nunca por `Object.keys`.
- `setItem(slot, item)` limpa `spells` do slot (as spells do item anterior não existem no novo) e, se `slot === "mainhand"` e o item é `twohanded`, seta `slots.offhand = null`. Regra de negócio no store, não no componente.
- `SLOT_ORDER` e o agrupamento em colunas vivem em `src/lib/slot-layout.ts` como dado, não como JSX hardcoded — ACM-013 reusa a mesma ordem no card exportado, senão preview e export divergem.

## 6. Tokens novos (adicionar em globals.css @theme)
Cores de tier do próprio jogo (fonte: forum oficial), necessárias porque nenhum token atual cobre tier:
`--color-tier-4:#557E98; --color-tier-5:#934038; --color-tier-6:#D8894C; --color-tier-7:#E8C95F; --color-tier-8:#D9D9E3;` (T1–T3 fora do MVP de comps: `--color-tier-low:#6b7280`).
`--color-enchant:#3f8f4a;`
Demais cores reusam os tokens `--color-icon-*` existentes. Nenhum componente novo além de `SlotCard`, `SlotGrid` e `BuildHeader`; o picker é o de ACM-008 e os ícones são os de ACM-007.

## 7. Verificação manual
1. Equipar arma 2H na mão principal com offhand preenchida → offhand limpa e bloqueada com a copy correta.
2. Trocar item de um slot que tinha spells escolhidas → chips voltam a vazio, nenhum spell órfão.
3. `JSON.parse(JSON.stringify(selectBuild(store.getState())))` idêntico ao original.
<!-- SECTION:NOTES:END -->
