---
id: ACM-013
title: 'Build card preview component — single source of truth (RF-4, RF-5)'
status: In Progress
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 16:58'
labels: []
milestone: m-3
dependencies:
  - ACM-008
  - ACM-009
  - ACM-010
  - ACM-011
  - ACM-012
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The preview component IS the export component. No separate layout for export. Supports vertical and grid layouts, theme tokens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Renders BuildState as visual card
- [ ] #2 vertical layout: icon left, name right, spells below
- [ ] #3 grid layout: builds side by side, role as column header
- [ ] #4 Same React component tree used for both screen preview and PNG export
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UX spec (ACM-013) — BuildCard, fonte única para preview e export. Depende de ACM-008/009/010/011/012.

## 0. A regra que faz "single source of truth" ser verdade
Não basta o mesmo componente: basta **um `<div id="capture-root">` que não contém nenhum elemento interativo**. Todo o chrome de edição (hover, botões "×", focus ring, tooltips, handles) é renderizado em uma **camada irmã absolutamente posicionada por cima**, nunca dentro do nó capturado.

```
<div class="relative">
  <BuildCard ref={captureRef} state={build} theme={theme} />   ← html2canvas captura ESTE nó
  <EditOverlay state={build} />                                ← irmão, nunca capturado
</div>
```
Alternativas rejeitadas: `mode="export"` com condicionais dentro do card (toda condicional é uma chance de divergência silenciosa que só aparece no PNG do usuário); e clonar o DOM para exportar (o clone perde estilos computados e é exatamente o bug que a task quer evitar). Registrar como `backlog decision create "Capture root sem chrome interativo"`.

Consequências obrigatórias:
- Zero `:hover` dentro do card. Hover vive no overlay.
- Zero `oklch()`/`color-mix()`/`lab()` dentro do card — html2canvas não parseia; usar hex/rgb. Tailwind v4 emite oklch por padrão: as cores do card vêm de CSS custom properties em hex declaradas no `@theme`, aplicadas via `style` ou classes que resolvem para hex.
- Fonte auto-hospedada e `await document.fonts.ready` antes de capturar. Fonte externa = PNG com fallback serif.
- Ícones via `/api/icon` (mesma origem) — já é o caso por doc-001; nunca URL da Render API direto, senão canvas contaminado.
- Nada de `position: sticky`, `transform` no ancestral ou `overflow: hidden` cortando; o card é um bloco de fluxo com dimensão lógica fixa.

## 1. Dimensões
Largura lógica fixa **960px**; captura com `scale: 2` → PNG de 1920px. Supera o mínimo de 800px do requisito não-funcional e sobrevive ao zoom no Discord.
- `vertical` (1 build): 960 × altura automática (tipicamente 620–860px conforme swaps).
- `grid` (comp, ACM-020): coluna de 320px por build, papel como cabeçalho de coluna; 3 builds = 960px, 5 = 1600px. A largura da coluna é a mesma constante em ambos os layouts, então um build renderizado sozinho e o mesmo build dentro da comp têm ícones do mesmo tamanho.

## 2. Wireframe — layout `vertical`

┌───────────────────────────────────────────────────── 960 ──────────────┐
│ ▌TANK                                                                  │ ← barra accent 6px + papel
│                                                                        │
│  ┌────────┐   BRUISER DE FRONTLINE                                     │
│  │        │   Martelo de Guerra · T8.1                                 │
│  │  ícone │   ┌───┐ ┌───┐ ┌───┐ ┌───┐                                  │
│  │  144px │   │ Q │ │ W │ │ E │ │ P │   ← spells da arma, 56px         │
│  │        │   └───┘ └───┘ └───┘ └───┘                                  │
│  └T8──.1──┘   Explosão  Investida  Grito  Resistência   ← 11px, opcional│
│                                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  EQUIPAMENTO                                                           │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐        │
│  │cabe│  │peit│  │bota│  │capa│  │secu│  │bols│  │mont│  │comi│        │
│  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │        │
│  └T8.1┘  └T8.1┘  └T8.1┘  └T8──┘  └────┘  └T7──┘  └T8──┘  └T8──┘        │
│  [W][P]  [W][P]  [W][P]  [Q]     ─       ─       ─       ─             │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  SWAPS OBRIGATÓRIOS                                                    │
│  [ico] Martelo ─→ [ico] Machado   ·  Bridge fight                      │
│  [ico] Martlock ─→ [ico] Lymhurst ·  Contra burst                      │
│                                                                        │
│  ────────────────────────────────────────────────────  albioncomp.gg   │ ← rodapé 11px, 40% opacidade
└────────────────────────────────────────────────────────────────────────┘

Hierarquia: a **arma principal é o herói** (144px vs 80px dos demais). É por ela que o membro do grupo identifica o build em 1 segundo rolando o Discord. Uma tela, uma ação primária — aqui: um card, uma leitura primária.
Slots vazios **não são renderizados** no card exportado (diferente do editor, onde o vazio é convite). Espaço tracejado num PNG parece bug.

Layout `grid` (comp): cada coluna = papel no topo (12px/700 uppercase, cor accent do build), arma em 96px, nome do build, grade 2×4 de slots em 48px, swaps condensados a ícones com tooltip removido (no PNG, rótulo em 10px sob os ícones).

## 3. Tipografia e espaçamento
Base 8px. Padding do card 40px (32px no `grid`).
| Papel | Tamanho/peso | Uso |
|---|---|---|
| display | 30/700, tracking -0.01em | nome do build |
| eyebrow | 12/700 uppercase, tracking 0.08em | papel, "EQUIPAMENTO", "SWAPS OBRIGATÓRIOS" |
| body | 15/500 | nome da arma principal |
| caption | 12/500 | nomes de item/spell secundários |
| micro | 10/700 | badges de tier e encanto |
Fonte: uma única família sans auto-hospedada (Inter ou Geist já no projeto), pesos 500/700 apenas — cada peso extra é um arquivo a mais que precisa estar carregado antes da captura.
Nomes de item e spell são **toggles do tema** (ACM-014 `showItemNames`/`showSpellNames`); com ambos desligados o card encolhe ~180px. Default: nomes de spell **ligados**, nomes de item desligados — o membro precisa saber a ability, reconhece o item pelo ícone.

## 4. Variante dark (default, Discord-ready)
Discord dark tem fundo `#313338`. O card **não pode** usar esse tom ou vira mancha sem contorno.
- superfície do card `#12141a`, seções internas `#171a21`
- borda externa 1px `#2a2e37` + radius 16px — o contorno é o que faz o card ler como objeto dentro do embed
- texto primário `#ECEDEE`, secundário `#9aa1ad` (contraste ≥ 4.5:1 no primário, ≥ 3:1 no secundário sobre `#12141a`)
- accent por papel, default do tema: Tank `#4a8fd4`, Healer `#3f8f4a`, DPS `#c8452f`, Support `#a86fd4` — aplicado na barra superior de 6px e no eyebrow do papel
- badges de tier usam `--color-tier-*` de ACM-011; texto do badge `#0b0d11` (tiers claros) para não falhar contraste
- Sem sombra externa (o PNG tem fundo opaco; sombra vira halo cinza). Profundidade vem de contraste de superfície.
- Variante `light` existe mas é secundária; não bloqueia esta task.

## 5. Estados obrigatórios do preview
| Estado | Comportamento |
|---|---|
| vazio (build sem nada) | Card renderiza com placeholder "Sem nome" em itálico muted + área da arma como silhueta 12% opacidade + copy centralizada "Escolha a mão principal para ver o card". Botão "Exportar PNG" desabilitado. O preview nunca some — ver o card se formar é o que sustenta a sessão (**endowment effect**: quanto mais formado o card, maior o custo percebido de abandonar). |
| loading | Enquanto ícones carregam: esqueletos do ItemIcon. Export **bloqueado** até todos os ícones do card estarem `loaded` ou `error`; botão mostra "Carregando ícones… 6/9". Exportar durante o loading produz PNG com buracos — o bug mais caro possível para este produto. |
| erro | Ícone que falhou entra em `error` no editor; no **export** um ícone em `error` vira o quadrado neutro sem "!" (glifo de debug não vai para o Discord) e o botão de export mostra aviso "2 ícones não carregaram — exportar mesmo assim?" com ações "Tentar novamente" / "Exportar assim". |
| sucesso | Após export: toast "PNG copiado" ou "PNG baixado" com miniatura 64px do resultado — confirma que o arquivo é o que ele viu. |

## 6. Hover vs export estático (o que vive no overlay)
| Elemento | Preview na tela | PNG |
|---|---|---|
| tooltip com nome completo de item/spell | sim (overlay) | não |
| botão "×" limpar slot, "Trocar item" | sim (overlay) | não |
| focus ring / outline de teclado | sim (overlay) | não |
| realce do slot correspondente ao hover no editor | sim (overlay, `outline` externo) | não |
| glifos "?" e "!" de ícone ausente/erro | sim | não (§5) |
| rodapé com marca/URL | sim | sim |
| nomes de item/spell | conforme tema | idêntico ao preview |
Regra de aceite operacional: capturar o mesmo nó com o mouse fora da janela e com o mouse sobre um slot deve produzir dois PNGs **byte-idênticos**. É o teste que prova a AC #4 e é automatizável.

## 7. Componentes e tokens
Novos: `BuildCard` (raiz de captura, puro, sem hooks de interação — recebe `state` e `theme` por prop, nenhum acesso à store: é o que permite renderizá-lo no Satori de ACM-022 e no server), `BuildCardVertical`, `BuildCardGrid`, `CardSlotTile` (80px, distinto do `SlotCard` de 168px do editor — este não tem estado vazio nem clique), `EditOverlay`.
`BuildCard` **não** importa Zustand. Justificativa: ACM-022 (Open Graph via Satori) e ACM-021 (SSR) precisam renderizá-lo fora do browser; qualquer acoplamento à store mata isso e força um segundo layout — exatamente o que a task proíbe.
Tokens novos: `--color-card-surface:#12141a; --color-card-surface-2:#171a21; --color-card-border:#2a2e37; --color-card-fg:#ECEDEE; --color-card-fg-muted:#9aa1ad;` + accents por papel. Todos em hex por causa da restrição do html2canvas.

## 8. Verificação manual
1. Exportar com o mouse sobre um slot e fora da janela → PNGs idênticos.
2. Abrir o PNG dentro do Discord em dark mode → borda do card visível contra `#313338`, texto legível sem zoom.
3. Build só com mão principal → card renderiza sem buracos e sem áreas tracejadas.
<!-- SECTION:NOTES:END -->
