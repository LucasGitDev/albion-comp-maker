---
id: ACM-012
title: Swaps section — add/remove/reorder (RF-3)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 19:49'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add swap entries to a build: each has a slot, item, enchant, spells, and label. Displayed below main slots.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add swap button opens item picker with slot selector
- [ ] #2 Each swap shows item name, icon, spell icons
- [ ] #3 Swap can be removed
- [ ] #4 Swap label editable inline
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UX spec (ACM-012) — Seção de swaps. Depende de ACM-011 (store/slot layout) e ACM-007 (ícones).

## 0. Modelo mental
Um swap é uma **substituição condicional**: "neste slot, nesta situação, use este outro item". Ele só faz sentido em relação ao item equipado. Por isso a UI é sempre `slot → item atual → item alternativo → condição`, e a seção mora **imediatamente abaixo** da grade de slots, sem colapso por padrão — se o leader tem que abrir um acordeão para lembrar que swaps existem, ele não escreve nenhum.

```ts
type Swap = {
  id: string;              // nanoid, estável para reorder/keys
  slot: Slot;
  itemId: string;
  tier: number;
  enchant: 0|1|2|3|4;
  spells: Record<"q"|"w"|"e"|"passive", string | null>;
  label: string;           // "" permitido; nunca null
};
```
`swaps: Swap[]` — a ordem do array **é** a ordem exibida e exportada. Sem campo `order`; array ordenado é a fonte da verdade e elimina a classe de bug "índice fora de sincronia".

## 1. Fluxo
1. Leader termina o build → vê a seção "Swaps" com o estado vazio.
2. Clica "Adicionar swap" → uma **linha inline** abre no fim da lista, já em modo edição, com o seletor de slot focado. Não é modal: o leader precisa enxergar o build acima enquanto define a troca.
3. Escolhe slot → o item atual daquele slot aparece à esquerda como referência (read-only). Abre o ItemPicker filtrado por esse slot (mesmo componente de ACM-008; `slot` prop já existe).
4. Escolhe item → tier/encanto/spells no mesmo padrão do SlotCard.
5. Digita o rótulo ("Bridge fight", "Contra 5+ healers"). Salva ao sair do campo (autosave, sem botão "Salvar" — a store é local).
6. Erro: escolher um slot que está vazio no build → linha mostra aviso inline âmbar "Este slot está vazio no build principal. O swap será exibido como item avulso." Não bloqueia: às vezes o swap é justamente "leve uma bolsa de fuga".

Mecanismo: **loss aversion** no remover — a remoção é imediata com undo por 6s ("Swap removido · Desfazer"), não com um `confirm()`. Diálogo de confirmação em ação barata treina o usuário a clicar OK sem ler; undo preserva a reversibilidade sem custo de atenção.

## 2. Wireframe

┌ Swaps  ·  3 ────────────────────────────────────  [ + Adicionar swap ] ┐
│                                                                        │
│ ⠿ 1 │ MÃO PRINCIPAL │ [ico] T8.1 Martelo ─→ [ico] T8.1 Machado         │
│      │ [Q][W][E][P]  │ Rótulo: Bridge fight              [↑][↓]  [🗑]  │
│ ─────┼───────────────────────────────────────────────────────────────  │
│ ⠿ 2 │ CAPA          │ [ico] T8 Martlock ─→ [ico] T8 Lymhurst           │
│      │ [Q]           │ Rótulo: Contra composição de burst   [↑][↓] [🗑]│
│ ─────┼───────────────────────────────────────────────────────────────  │
│ ⠿ 3 │ BOLSA         │ [—] vazio ─→ [ico] T7 Bolsa                      │
│      │               │ Rótulo: —  ⚠ slot vazio no build   [↑][↓]  [🗑] │
└────────────────────────────────────────────────────────────────────────┘

Linha: altura 72px, ícones `size="md"` (40px), separador 1px `--color-icon-slot-empty`.
Chip de slot: 11px/600 uppercase, muted, largura fixa 132px — colunas alinhadas verticalmente, escaneáveis.
Seta `→`: 16px, muted. É o único elemento que carrega o significado "substitui"; não trocar por ícone decorativo.
Rótulo: input sem borda que ganha borda no foco (inline edit). Placeholder: "Quando usar? ex.: fights de bridge". Placeholder é uma pergunta, não um rótulo — a pergunta é o que produz texto útil.

## 3. Reorder — decisão
**Botões ↑/↓ são o mecanismo primário. Drag fica fora do MVP.**
Justificativa: listas de swap têm 1–5 itens; a vantagem do drag só aparece por volta de 10+. Botões são acessíveis por teclado de graça, testáveis em Vitest sem simular pointer events, e não adicionam dnd-kit (~12kB) a uma tela que já vai carregar html2canvas. O handle `⠿` no wireframe é **placeholder visual reservado**: renderizar apenas quando o drag existir, senão é affordance mentindo.
Regras: `↑` desabilitado (não escondido) no primeiro; `↓` no último — botão que some faz o layout pular. Após reorder, foco permanece no botão clicado e um live region anuncia "Swap movido para posição 2 de 3".

## 4. Estados obrigatórios
| Estado | Visual |
|---|---|
| vazio | Bloco tracejado, altura 120px, centralizado: ícone de setas trocando (24px, muted) + título 14px/600 "Nenhum swap definido" + corpo 13px muted "Liste trocas obrigatórias para o grupo — ex.: 'T8 Martelo → T8 Machado em fights de bridge'." + botão primário "Adicionar swap". O exemplo é literal e do domínio; empty state genérico não ensina o formato. |
| loading | Só existe no carregamento de um build salvo: 2 linhas esqueleto de 72px. Adicionar swap é local e síncrono, não tem loading. |
| linha em edição | fundo levemente elevado, borda accent 1px, `[↑][↓]` ocultos durante edição |
| erro (slot vazio) | banda âmbar 2px à esquerda da linha + aviso inline; não bloqueia salvar |
| erro (item removido do dump) | ícone em estado `error` do ItemIcon + botão "Trocar item" |
| sucesso | sem toast ao adicionar (o item aparecendo é o feedback). Toast **apenas** no remover, com Desfazer. |
| máximo | soft cap 8 swaps: acima disso o botão fica desabilitado com "Máximo de 8 swaps — o card fica ilegível no Discord". O limite é de legibilidade do PNG, e a copy diz isso. |

## 5. Componentes
Reuso: `ItemPicker` (ACM-008, prop `slot` já existe), `ItemIcon`/`SpellIcon` (ACM-007), seletores de tier/encanto (ACM-009), chips de spell (ACM-010).
Novos, com justificativa:
- `SwapsSection` — dono do estado vazio, header com contagem e do botão de adicionar.
- `SwapRow` — layout horizontal `atual → alternativo`, que o `SlotCard` (vertical, 168px) não comporta sem virar um componente com dois modos. Dois componentes simples > um com prop `variant` que ninguém entende em 3 meses.
- `UndoToast` — só se ainda não existir sistema de toast no projeto; se existir, reusar.
Nenhum token novo: reusa `--color-tier-*` e `--color-enchant` introduzidos em ACM-011. Aviso âmbar usa `--color-warn:#c98a2b` se não existir.

## 6. Verificação manual
1. Adicionar 2 swaps, mover o segundo para cima → ordem persiste no `getState()` e no card de preview (ACM-013).
2. Remover swap → toast com Desfazer; clicar Desfazer restaura na mesma posição, não no fim.
3. Criar swap para slot vazio → aviso âmbar aparece e o swap continua salvável.
<!-- SECTION:NOTES:END -->
