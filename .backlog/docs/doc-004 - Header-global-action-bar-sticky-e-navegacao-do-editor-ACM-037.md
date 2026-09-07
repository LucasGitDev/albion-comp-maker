---
id: doc-004
title: Header global, action bar sticky e navegacao do editor (ACM-037)
type: specification
created_date: 2026-09-07
---

# Header global, action bar sticky e navegação do editor (ACM-037)

Spec de UI/UX. Nenhum código de aplicação aqui — estrutura, hierarquia,
estados, copy real e tokens. Desktop-first. Sem dependência nova.

Contexto lido antes de escrever: `src/app/globals.css` (tokens pós-ACM-038),
`src/components/layout/Header.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`,
`src/app/(editor)/build/new/page.tsx`, `src/components/editor/BuildHeader.tsx`,
`src/components/build-card/ExportBar.tsx` (contrato de capture-root, decision-010),
doc-003, ACM-029, ACM-038 (FINDING 5), ACM-041, ACM-042.

---

## 0. Decisões que governam o resto

**D1 — O Header global já existe e NÃO é duplicado no editor.**
`Header.tsx` é montado no root layout, portanto já renderiza em `/build/new`.
O problema real apontado no FINDING 5 da review de ACM-038 não é "falta header",
é *header com CTA errado no contexto do editor* ("Nova build" enquanto o usuário
já está criando uma build) somado a um `BuildHeader` do editor que parece um
segundo header. Resolução: o Header global ganha **estado contextual** (§1.3) e
o `BuildHeader` do editor deixa de ser uma barra e vira **bloco de identidade da
build** (§3.2). Uma tela, uma ação primária.

**D2 — "Salvar" é a ação primária do editor. "Exportar PNG" é secundária.**
Mecanismo: *Zeigarnik* — a build começa incompleta (0/9 slots) e o contador
mantém a tensão de tarefa aberta; a ação primária deve fechar essa tensão
(persistir), não produzir um artefato. Exportar um card com 2/9 slots é o
caminho de menor valor. Exportar continua sempre acessível, só não compete
visualmente.

**D3 — Existe auth (decision-012, `src/app/api/auth/[...nextauth]`) mas o
editor não exige login para montar.** O gate acontece no clique de "Salvar",
nunca na entrada. Mecanismo: *sunk cost / commitment escalation* — o usuário
que já montou 6 slots converte muito melhor no login do que quem viu um muro
na porta. Detalhe em §2.4-E.

**D4 — Zero cor hardcoded.** Toda cor sai de `globals.css`. Ver §5, incluindo
o débito já existente em `ExportBar.tsx` que esta task NÃO deve copiar.

---

## 1. Header global

### 1.1 Estrutura (desktop, >= 768px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▣ Albion Comp Maker      Minhas comps   Builds            [ + Nova build ]  │  56px
└──────────────────────────────────────────────────────────────────────────────┘
   ^ logo/home link          ^ nav (landmark <nav>)          ^ CTA accent
```

- `<header>` é landmark. `<nav aria-label="Principal">` envolve os links.
  O conteúdo de página vira `<main>` (já é, no editor).
- Logo é `<Link href="/">` — é o caminho de volta universal, mas **não conta**
  como o caminho de volta explícito de AC#3 (§3.1).
- Nav: `Minhas comps` (`/`) e `Builds` (`/builds`). Se `/builds` ainda não
  existe na rota, o link **não é renderizado** — link morto é pior que link
  ausente. Item da rota atual: `aria-current="page"` + `text-foreground` cheio
  (os demais `text-foreground/70`).
- CTA `Nova build`: pill accent, único elemento accent do header.

### 1.2 Comportamento no scroll

Já é `sticky top-0 z-10`. Manter, com dois ajustes:

1. **z-index acima da action bar do editor.** Header `z-30`, action bar `z-20`,
   popover de item picker `z-50`. Hoje é `z-10` sem escala definida; a action
   bar sticky vai passar por baixo ou por cima de forma acidental. Definir a
   escala explicitamente é parte da task.
2. **Sombra/borda só depois de rolar.** Em `scrollY === 0`, borda inferior
   `border-[var(--color-border)]`. Após rolar, adicionar
   `shadow-[0_1px_0_0_var(--color-border),0_8px_24px_-12px_#000000]`.
   Nada de mudar altura ou esconder o header no scroll — o editor é ferramenta
   de trabalho, header que some é ruído.
3. Sem blur/`backdrop-filter`. O fundo já é opaco (`--color-surface`) e blur é
   custo de compositor sem ganho aqui.

### 1.3 Estado contextual em rota de editor

Em `/build/*`, o CTA `Nova build` do header **é suprimido**. Motivo: a ação
primária da tela passa a ser "Salvar" (action bar). Dois botões accent na mesma
viewport = nenhuma ação primária. O slot do CTA é ocupado pelo estado de conta:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▣ Albion Comp Maker      Minhas comps   Builds                    Lucas ▾   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Se não autenticado, o slot mostra `Entrar` como link discreto
(`text-foreground/70`, sem fundo accent) — nunca accent, para não competir com
"Salvar".

### 1.4 Responsivo em 390px

Hoje o header é `flex-wrap`: em 390px ele quebra em duas linhas e come ~104px de
altura fixa em cima de uma página que ACM-041 já mede em ~2200px. Isso é
inaceitável.

```
390px
┌────────────────────────────────────┐
│ ▣ ACM                    [ + ]  ⋮  │  48px, uma linha, sem wrap
└────────────────────────────────────┘
```

Regras:
- **Proibido `flex-wrap` no header.** Uma linha, sempre, altura fixa 48px.
- Logo colapsa para a marca curta `ACM` abaixo de 480px (o nome completo fica em
  `aria-label` / `sr-only` para leitor de tela).
- Nav vira menu `⋮` (disclosure `<button aria-expanded>` + painel). Não é um
  drawer novo: painel simples ancorado, mesmo padrão do `SlotPickerPopover`
  (fecha em Esc, clique fora, foco retorna ao trigger).
- CTA vira ícone-only `+` com `aria-label="Nova build"`, alvo mínimo 44×44.
- Em rota de editor e mobile, o header **não é sticky** (`position: static`).
  Motivo: em 390px a action bar sticky de baixo (§2.2) é o chrome que importa;
  dois elementos fixos comem ~100px de 844px de viewport. O header volta a ser
  sticky em `>= 768px`. Isso mitiga ACM-041 em vez de agravar.

---

## 2. Action bar sticky do editor

### 2.1 Fluxo

1. Usuário entra em `/build/new` → action bar visível, "Salvar" **desabilitado**
   com motivo textual ao lado (build vazia).
2. Preenche nome / equipa slots → contador `3/9` sobe; "Salvar" habilita assim
   que houver **nome não-vazio E >= 1 slot preenchido**.
3. Clica "Salvar" → `saving` → `saved` (2,5s) → volta a `idle`.
4. Erro → mensagem inline com ação `Tentar de novo` no mesmo lugar. O usuário
   nunca perde a build; nada é limpo em erro.
5. Não autenticado → clique em "Salvar" abre o gate de login (§2.4-E), com o
   estado da build preservado.

Máximo de passos para finalizar: **1 clique**, de qualquer ponto do scroll.

### 2.2 Posicionamento

- **Desktop (>= 768px): sticky no topo do `<main>`, logo abaixo do header
  global** (`sticky top-14`, casando com os 56px do header). Motivo: o olho já
  está no topo por causa da identidade da build; a ação fica no mesmo eixo
  vertical do fluxo de leitura descrito em doc-003 §3.
- **Mobile (390px): fixed no rodapé** (`fixed inset-x-0 bottom-0`), com
  `padding-bottom: env(safe-area-inset-bottom)` e um spacer de altura
  equivalente no fim do `<main>` para o último card de slot não ficar coberto.
  Motivo: alcance do polegar; e libera o topo (§1.4).

### 2.3 Wireframe

Desktop, estado `idle` com build parcial:

```
┌ header global ───────────────────────────────────────────────── z-30 ────────┐
├──────────────────────────────────────────────────────────────────────────────┤
│ ← Minhas comps  ›  Nova build                                                │ breadcrumb (§3.1)
├─ action bar ──────────────────────────────────────────── sticky top-14 z-20 ─┤
│                                                                              │
│  Bruiser de frontline   ·  3/9 slots                                         │
│                                       [ Exportar PNG ]   [   Salvar   ]      │
│                                        secundária        PRIMÁRIA (accent)   │
└──────────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  ┌ identidade da build ───────────────────────────────────────────────────┐  │
│  │  Nome do build  [ Bruiser de frontline            ]                    │  │
│  │  Papel          [ Tank                            ]                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Armas ─────────────────────────────────────────────────────────────────     │
│  [ slot ] [ slot ] [ slot ] ...                                              │
```

Mobile 390px:

```
┌────────────────────────────────────┐
│ ▣ ACM                    [ + ]  ⋮  │  static
├────────────────────────────────────┤
│ ← Minhas comps                     │
│ Nova build · 3/9                   │
│                                    │
│  … grade de slots (scroll longo)   │
│                                    │
├──── fixed bottom ──────────── z-20 ┤
│  [ PNG ]  [      Salvar       ]    │  56px + safe-area
└────────────────────────────────────┘
```

Regra de hierarquia: **"Salvar" é o único botão com fundo `--color-accent` na
viewport**. "Exportar PNG" é ghost/outline (`border-[var(--color-border)]`,
`text-foreground`, hover `bg-[var(--color-icon-slot)]`). Se ambos parecem
botões cheios, nenhum é primário.

Ordem no DOM: `Salvar` antes de `Exportar PNG`, com `flex-row-reverse` visual —
assim a ordem de tabulação alcança a ação primária primeiro, mas o botão
primário fica à direita (convenção de barra de ação; não inventar padrão).

### 2.4 Estados

Todos os estados escrevem no **mesmo `<span role="status" aria-live="polite">`**
à esquerda dos botões. Um só canal de feedback — o mesmo contrato que
`ExportBar` já usa.

**A. idle (build inválida para salvar)**
```
Dê um nome e escolha ao menos 1 item        [ Exportar PNG ]  [ Salvar ]
                                                               disabled
```
`Salvar` com `aria-disabled="true"` (permanece focável, para o leitor de tela
ouvir o motivo) e `disabled:opacity-60 disabled:cursor-not-allowed`.
Copy do motivo é `text-foreground/70` — nunca vermelho: não é erro, é
pré-condição. Mecanismo: *goal gradient* — a frase diz o que falta, não o que
está errado.

**B. idle (válida)**
```
3/9 slots · não salvo                        [ Exportar PNG ]  [ Salvar ]
```
`não salvo` só aparece se houver alteração pendente após um save anterior.
Mecanismo: *loss aversion leve* — sinaliza risco de perder trabalho sem alarme.

**C. saving**
```
Salvando…                                    [ Exportar PNG ]  [ Salvando… ]
                                              disabled          disabled
```
Ambos desabilitados (exportar durante escrita gera card de estado ambíguo).
Sem spinner novo: rótulo textual, igual ao padrão de `ExportBar` ("Exportando…").

**D. saved**
```
Build salva.                                 [ Exportar PNG ]  [ Salvar ]
```
Auto-reset em 2,5s para `idle`, mesmo timer do `ExportBar`. A partir daqui
`Exportar PNG` ganha ênfase secundária (`border-[var(--color-accent)]`,
texto accent, fundo ainda transparente) — é o próximo passo natural. Mecanismo:
*next-action framing*, sem virar segunda primária.

**E. unauthenticated**
Não é um estado visual da barra em repouso: `Salvar` fica habilitado normalmente
(nada de cadeado antecipado). Ao clicar:
```
Entre para salvar esta build. Ela não será perdida.   [ Entrar ]  [ Agora não ]
```
Painel ancorado ao botão `Salvar` (não modal de tela cheia). Rascunho da build
é preservado no retorno do OAuth; a copy promete isso explicitamente porque é a
objeção real ("vou perder o que montei"). `Agora não` fecha e devolve foco ao
`Salvar`. Mecanismo: *sunk cost* + remoção de risco percebido.

**F. error**
```
Não deu para salvar. [Tentar de novo]        [ Exportar PNG ]  [ Salvar ]
^ text-[var(--color-icon-error-fg)]  ^ link inline
```
Erro **não** auto-reseta em 2,5s — some só na próxima tentativa ou edição.
Mensagem de erro que desaparece sozinha é mensagem perdida. A cópia da build
nunca é descartada.

---

## 3. Volta e breadcrumb (AC#3)

### 3.1 Tratamento

Breadcrumb de **um nível**, entre o header e a action bar, dentro do `<main>`:

```
← Minhas comps  ›  Nova build
```

- `←` + `Minhas comps` é um `<Link href="/">` real (navegação, não
  `router.back()`). Motivo: `history.back()` é imprevisível quando o usuário
  chegou por link direto ou refresh; AC#3 pede caminho explícito que não dependa
  do back do navegador.
- Marcado como `<nav aria-label="Trilha">` com `<ol>`; o último item é
  `aria-current="page"` e **não é link**.
- Em build já salva, o último item é o nome da build (`Bruiser de frontline`),
  truncado com `max-w-[24ch] truncate` + `title` completo.
- Em 390px, mostra só `← Minhas comps` (o nível atual já está na linha de
  título logo abaixo — não repetir).

### 3.2 `BuildHeader` deixa de parecer header

Consequência direta de D1: `BuildHeader` perde a `border-b` e o contador de
slots (`data-testid="slot-count"` **migra para a action bar**, mantendo o
testid para não quebrar o teste existente). Vira um bloco de campos
identificado por um `<h1>` visualmente discreto. Só uma barra na tela tem cara
de barra: a action bar.

---

## 4. Estados obrigatórios por superfície

| Superfície | Loading | Vazio | Erro | Sucesso |
|---|---|---|---|---|
| Header global | Nenhum (server component, sem dados) | n/a | n/a | n/a |
| Header — slot de conta | `Entrar` neutro enquanto a sessão resolve; **nunca** pisca "Entrar"→nome (layout shift + falso negativo). Reservar largura fixa 96px e mostrar skeleton `bg-[var(--color-icon-placeholder)]` | Sessão ausente → `Entrar` | Falha de sessão → trata como ausente, sem mensagem no header | Nome do usuário |
| Breadcrumb | Sem loading (rota é conhecida) | n/a | n/a | n/a |
| Action bar | `Salvando…` (§2.4-C) | Build vazia → §2.4-A com copy `Dê um nome e escolha ao menos 1 item` + o próprio grid de slots abaixo já é o CTA | §2.4-F com `Tentar de novo` | §2.4-D `Build salva.` |
| Nav mobile `⋮` | n/a | Se não houver rota além de Home, o `⋮` não é renderizado (não abrir painel vazio) | n/a | n/a |
| `/builds` (destino do nav) | Skeleton de 3 cards | Reusar o vazio já existente em `page.tsx`: `Nenhuma comp ainda` + `Crie sua primeira build…` + CTA `Nova build` accent | Mensagem + `Recarregar` | Lista |

Regra transversal: **nenhum estado vazio sem CTA.** O vazio do editor é o único
que não tem botão próprio, porque o CTA é a grade inteira logo abaixo — e por
isso a copy diz o que fazer.

---

## 5. Tokens

### 5.1 Reusar (nada novo necessário para cor)

De `src/app/globals.css`, pós-ACM-038:

| Uso | Token |
|---|---|
| Fundo do header e da action bar | `var(--color-surface)` `#14171d` |
| Fundo da página | `var(--background)` `#0a0a0a` |
| Borda de header/action bar/botão ghost | `var(--color-border)` `#262b34` |
| Texto principal, rótulos de botão | `var(--foreground)` / `text-foreground` |
| Texto secundário (breadcrumb inativo, contador, motivo do disabled) | `text-foreground/70` (6,15:1 sobre surface — medido na review de ACM-038) |
| Botão primário `Salvar` | `bg-[var(--color-accent)]`, hover `--color-accent-hover`, texto `--color-accent-foreground` (6,57:1) |
| Texto muted não-crítico | `var(--color-icon-muted)` `#9ca3af` (7,07:1 sobre surface) |
| Hover de botão ghost | `var(--color-icon-slot)` `#1c1f26` |
| Foco | regra global `:focus-visible` já existente (outline branco 2px, offset 3px) + `focus-visible:transition-none` |

### 5.2 Regras anti-drift (ACM-042 é o precedente a não repetir)

1. **Proibido hex literal em className.** `text-[#6b7280]` foi exatamente o
   defeito de ACM-042 (`item-result-list.tsx:161,170`). Nenhum arquivo desta
   task pode conter hex fora de `globals.css`.
2. **Débito existente que esta task não deve imitar nem propagar:**
   `src/components/build-card/ExportBar.tsx` usa `bg-blue-600`, `bg-white`,
   `border-neutral-300`, `text-neutral-900` — paleta Tailwind crua, fora do
   sistema, e visualmente branca dentro de um tema dark. A action bar de
   ACM-037 **não** reaproveita esses classNames. Se ela reutilizar a lógica de
   export do `ExportBar`, o estilo do botão vem dos tokens de §5.1. Recomendo
   abrir task separada para alinhar `ExportBar` (fora do escopo de ACM-037,
   mas registrar).
3. **`--color-tier-low` (`#6b7280`) em `build-card/tokens.ts` não é texto** —
   é cor de tier, não tocar (AC#3 de ACM-042).
4. **`--color-enchant` (`#3f8f4a`) não é cor de ação.** É estado de slot
   (foco de input no `BuildHeader`). O botão `Salvar` nunca usa enchant.

### 5.3 Único token realmente novo

Nenhum token de **cor** novo. Um token de **layout** é necessário porque duas
superfícies precisam concordar sobre a altura do header para o `sticky top-*` da
action bar não sobrepor:

```
--header-h: 56px;   /* >= 768px */
--header-h-sm: 48px; /* < 768px  */
```

Justificativa: hoje a altura do header é emergente (`py-4` + line-height). A
action bar precisa de `top: var(--header-h)`. Sem o token, isso vira um `top-14`
mágico que quebra silenciosamente quando alguém mudar o padding do header.

### 5.4 Escala de z-index (definir de uma vez)

| Camada | z |
|---|---|
| Action bar do editor | 20 |
| Header global | 30 |
| Painel de nav mobile / gate de login | 40 |
| `SlotPickerPopover` | 50 |

---

## 6. Exclusão do capture-root do PNG (AC#5, decision-010, ACM-029)

Invariante, redigida para virar teste:

> Nenhum nó da action bar, do header global ou do breadcrumb pode ser descendente
> de `#capture-root`.

Como garantir, em ordem de força:

1. **Estrutural.** `#capture-root` é renderizado por `BuildCard.tsx:51` dentro
   do subtree de preview. A action bar vive no `<main>` do editor, **irmã** do
   wrapper de preview — exatamente o contrato que `ExportBar` já documenta e que
   `src/__tests__/export-bar.test.tsx` já testa
   ("structural invariant: never a descendant of #capture-root"). A action bar
   segue o mesmo padrão: recebe `captureNodeRef` e só **lê** o nó, nunca
   renderiza dentro dele.
2. **Teste.** Estender o guard existente com uma asserção de que, com a action
   bar montada, `document.querySelector('#capture-root').contains(actionBarEl)`
   é `false`, e mutation-testar (mover a barra para dentro do preview deve
   quebrar o teste). O guard de ACM-029 em `build-card.test.tsx` continua valendo
   e **não** deve ser afrouxado.
3. **Risco específico de `position: sticky`/`fixed`.** `html-to-image` clona o
   nó; um elemento `fixed` que estivesse dentro do clone seria posicionado
   relativo ao viewport do clone e pode vazar como faixa no topo/rodapé do PNG.
   Como a barra é irmã (item 1), isso não ocorre — mas a spec proíbe
   explicitamente qualquer wrapper `sticky`/`fixed` **entre** o `<main>` e o
   `#capture-root`, porque um ancestral posicionado também altera o box de
   captura.
4. **Sem `color-mix()`/alpha-slash migrando para dentro.** A action bar usa
   `bg-[var(--color-accent)]` sólido; se algum dia um estilo dela for
   compartilhado com um componente do capture-root, o guard de ACM-029 (regex
   de alpha-slash + varredura de `style` inline por `color-mix(`/`oklab(`/
   `oklch(`) é quem barra. Não relaxar o guard para acomodar a barra.

---

## 7. Componentes

| Componente | Novo? | Justificativa |
|---|---|---|
| `Header` (`components/layout/Header.tsx`) | existe | Ganha: sem `flex-wrap`, altura fixa via token, `aria-current`, CTA contextual (§1.3), colapso 390px |
| `Breadcrumb` | **novo** | Não existe equivalente; AC#3 exige caminho de volta explícito e semântico (`nav` + `ol` + `aria-current`). Pequeno e reutilizável em `/builds/[id]` depois |
| `EditorActionBar` | **novo** | Combina estado de save (novo) + ação de export (existente). Não é `ExportBar` renomeado: hierarquia primária/secundária e máquina de estados de save são responsabilidades novas |
| `ExportBar` | existe | Reaproveitar a **lógica** (`resolveCaptureNode`, `exportNodeToPng`, fallback de clipboard). Estilo não (§5.2-2) |
| `BuildHeader` | existe | Perde `border-b` e o contador; vira bloco de campos (§3.2) |
| Painel de nav mobile | **novo, mínimo** | Disclosure simples; segue o comportamento de foco/Esc já estabelecido por `SlotPickerPopover`. Não introduzir lib de menu |

---

## 8. Acessibilidade (AC#4) — checklist verificável

- Landmarks: `<header>`, `<nav aria-label="Principal">`, `<nav aria-label="Trilha">`, `<main>`.
- Ordem de tab: logo → nav → conta/CTA → breadcrumb → `Salvar` → `Exportar PNG` → conteúdo.
- Foco visível: regra global `:focus-visible` + `focus-visible:transition-none`
  em tudo que tem `transition-colors` (a transição animava o outline e produziu
  o falso positivo registrado em ACM-038 — manter a correção).
- `Salvar` desabilitado usa `aria-disabled` e permanece focável, com o motivo
  associado por `aria-describedby` ao `role="status"`.
- Um único `aria-live="polite"` na action bar. Não empilhar regiões live.
- Alvo de toque >= 44×44 em 390px (CTA `+` e `⋮`).
- Skip link `Pular para o conteúdo` no topo do header, visível só no foco.
  Sem ele, todo usuário de teclado tabula o header inteiro em cada rota.
