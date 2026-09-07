---
id: doc-005
title: Navegacao da grade de slots em 390px (ACM-041)
type: specification
created_date: '2026-09-07 20:28'
---

# Navegação da grade de slots em 390px (ACM-041)

Escopo: `/build/new` abaixo de 768px. Não contradiz doc-004 (ACM-037): o header
continua estático em rota de editor no mobile, a action bar continua
`fixed inset-x-0 bottom-0 z-20`, e nada aqui disputa a borda inferior da tela.

## 0. Diagnóstico medido

Estado atual em 390px:

- `<main>` usa `p-8` → 32px de padding lateral, **326px de largura útil**.
- `SlotCard` é **largura fixa `w-[168px]`**. Dois cards (336px) + `gap-3` (12px)
  = 348px > 326px. Por isso `flex-wrap` cai para **1 coluna**: não é escolha de
  design, é consequência de uma largura hardcoded.
- 9 cards visíveis (offhand pode estar travado) × ~230px + 4 títulos de grupo +
  `gap-8` entre grupos ≈ 2200px. Com `SwapsSection` preenchida, ~2700px.
- Zero wayfinding: nenhum sumário, nenhuma âncora, nenhum indicador de progresso
  no corpo da página (o contador `3/9` da action bar é `hidden ... sm:inline`,
  ou seja **invisível justamente em 390px** — bug adjacente, ver §8).

O problema tem duas causas independentes e precisa de duas respostas:
**altura** (layout) e **orientação** (navegação). Uma solução só que ataque
apenas uma delas resolve metade.

---

## 1. Avaliação de opções

### Opção A — Tabs de grupo (só um grupo visível por vez)

Strip horizontal fixo com `Armas | Armadura | Utilidade | Consumíveis`;
`tabpanel` renderiza só o grupo ativo.

- **Ganho:** altura por tela cai para ~700px. É o corte mais agressivo.
- **Custo real:** destrói a leitura da build como objeto único. O produto
  entrega um **card de comp inteiro** para o Discord; se o usuário nunca vê
  9 slots juntos, ele não consegue conferir o que vai exportar sem trocar de
  aba 4 vezes. Conferência é a tarefa final do fluxo, não um detalhe.
- **Custo 2:** o offhand travado por arma de duas mãos (`offhandLocked`) é uma
  consequência de uma escolha feita na aba "Armas" — dentro da mesma aba, ok;
  mas o mesmo tipo de acoplamento com Swaps (que referenciam `buildSlots`)
  passa a ser invisível.
- **Custo 3:** `SwapsSection` não é um grupo de slots. Ou vira uma 5ª aba
  (mentira semântica) ou fica fora do strip (inconsistência).
- **Custo 4:** ARIA de tabs com painel destruído/recriado + `SlotPickerPopover`
  devolvendo foco a um trigger que pode ter sido desmontado. É exatamente a
  classe de bug que já mordeu o projeto (foco perdido para `<body>`).

**Rejeitada.** Corte de altura pago com perda de visão do todo.

### Opção B — Accordions colapsáveis por grupo, colapsados por padrão

- **Ganho:** página inicial vira 4 linhas de ~48px. Escaneável.
- **Custo:** um grupo colapsado **esconde equipamento já escolhido**. O usuário
  volta à build e vê 4 barras cinzas — o trabalho dele sumiu. Badge de contagem
  ameniza, não resolve: "Armadura 2/3" não diz *qual* peito está equipado, e a
  conferência pré-export volta a exigir 4 cliques.
- **Custo 2:** estado colapsado é estado. Persistir por grupo, por sessão, e
  reconciliar com "colapsar o que está completo" gera regras que o usuário não
  pediu para aprender.
- **Nota:** colapso **iniciado pelo usuário** (tudo aberto por padrão) é
  defensável, mas aí ele não reduz a altura inicial — que é o defeito
  reportado. Não paga o custo de ARIA.

**Rejeitada como default.** Aceita como evolução futura, fora de escopo (§9).

### Opção C — Grid compacto 2-up (SlotCard fluido)

Trocar `w-[168px]` por largura fluida e forçar 2 colunas abaixo de 768px.

- **Ganho:** ~9 cards em 5 linhas. Altura da grade cai ~45% (2200 → ~1150px).
  Nenhuma interação nova, nenhum estado novo, nenhum ARIA novo, zero risco
  de foco.
- **Custo:** ainda é scroll longo (~1150px de grade + swaps). Não dá atalho
  nem orientação — o AC do ACM-041 pede explicitamente "atalho" e "indicação
  de progresso".
- **Custo 2:** 155px de card comprime nome do item (`line-clamp-2` já existe) e
  a linha `TierSelect + EnchantSelect` (`flex-wrap`, quebra em 2 linhas).
  Aceitável; a densidade é o caminho que ACM-039 já quer seguir.

**Necessária, insuficiente sozinha.**

### Opção D — Progressive disclosure de slots vazios

Esconder vazios atrás de "+ Adicionar mais 4 slots".

- **Ganho:** build cheia fica curta.
- **Custo:** esconde a ação primária da tela (equipar) numa build nova, onde
  **todos** os slots estão vazios. Piora o caso de uso #1.

**Rejeitada.**

---

## 2. Recomendação: C + strip de âncoras (scroll-to, não filtro)

**Grid compacto 2-up** resolve altura. **Strip de âncoras sticky** resolve
orientação — chips que **rolam até** o grupo, nunca escondem conteúdo.

Por que âncora e não tab: âncora é aditiva. Se o JS de scroll-spy falhar, os
chips continuam sendo links `#armas` funcionais, a página continua inteira e
nada quebra. Tab é subtrativa — sem JS, ou some conteúdo ou some a navegação.
Além disso o chip carrega o contador `2/3` **sem** esconder os slots que ele
conta, que é a objeção central contra B.

Nome do padrão: sumário de seção ancorado com scroll-spy. Convenção conhecida
(docs, checkout longo). Nada inventado.

### Trade-off assumido, explicitamente

O strip custa **44px de chrome vertical permanente** no topo do scroll, e o
scroll permanece ~1150px de grade. Não é o corte máximo de altura possível
(A e B cortam mais). Estamos **trocando altura mínima por integridade da
build visível** — decisão consciente, porque o produto é conferir e exportar
uma comp inteira, não preencher um formulário linear.

---

## 3. Fluxo

**Objetivo:** equipar 9 slots e salvar, em 390px.

1. Entra em `/build/new`. Vê: breadcrumb, identidade da build, **strip de
   grupos com `0/2 · 0/3 · 0/3 · 0/2`**, e a grade 2-up já iniciando.
2. Toca em um card vazio → picker (ACM-045 trata o formato).
3. Ao voltar, o chip do grupo incrementa (`Armas 1/2`) e o chip ativo acompanha
   o scroll.
4. Quer pular para Consumíveis → toca no chip → scroll suave até o heading do
   grupo, que para logo abaixo do strip.
5. Salva pela action bar fixa no rodapé — 1 toque, de qualquer ponto do scroll
   (contrato de doc-004 §2.1 preservado).

**Erro:** nenhum caminho novo de erro. Chip de grupo cujo alvo não existe no
DOM (catálogo falhou) fica desabilitado — ver §5.

---

## 4. Wireframe (390px)

```
┌────────────────────────────────────┐
│ ▣ ACM                    [ + ]  ⋮  │  header 48px, static (doc-004 §1.4)
├────────────────────────────────────┤
│ ← Minhas comps › Nova build        │
│ ┌ identidade ─────────────────────┐│
│ │ Nome  [ Bruiser de frontline  ] ││
│ │ Papel [ Tank                  ] ││
│ └─────────────────────────────────┘│
├─ strip ───── sticky top-0 z-10 ────┤  44px  <-- só < md
│ 3/9 ·(Armas 1/2)(Armad 2/3)(Util 0/│  chips rolam na horizontal
├────────────────────────────────────┤
│ ARMAS                              │  heading, scroll-margin-top = strip
│ ┌──────────┐ ┌──────────┐          │
│ │ MÃO PRIN.│ │ MÃO SEC. │          │  2 colunas, card fluido
│ │  [icon]  │ │  🔒      │          │
│ │ Martelo  │ │ ocupada  │          │
│ │ T8 · .2  │ │          │          │
│ │ Q W E P  │ │          │          │
│ └──────────┘ └──────────┘          │
│ ARMADURA                           │
│ ┌──────────┐ ┌──────────┐          │
│ │ CABEÇA   │ │ PEITO    │          │
│ └──────────┘ └──────────┘          │
│ ┌──────────┐                       │  3º card fica sozinho na linha
│ │ BOTAS    │                       │
│ └──────────┘                       │
│ …                                  │
│ SWAPS · 2                          │
│ …                                  │
│                                    │  spacer (doc-004 §2.2)
├──── fixed bottom ──────────── z-20 ┤
│ [ PNG ]   [       Salvar       ]   │
└────────────────────────────────────┘
```

Uma ação primária na tela: **Salvar**. Os chips são navegação (ghost,
`--color-border`), nunca `--color-accent` de fundo — não competem.

---

## 5. Comportamento exato em 390px

### 5.1 O que fica visível (invariante)

**Nada é colapsado. Nenhum slot é escondido, em nenhum estado.** É a regra que
esta spec assume como não-negociável: um grupo colapsado escondendo equipamento
já escolhido é pior que scroll longo.

### 5.2 Strip de grupos

- Renderiza **apenas abaixo de `md`** (`md:hidden`). Desktop não muda.
- `sticky top-0 z-10`. Seguro: header é `static` em editor mobile (doc-004
  §1.4), action bar é `fixed bottom` `z-20` (sem sobreposição, eixos opostos),
  header global `z-30`, picker `z-50`. O strip entra **abaixo de todos**, em
  `z-10` — camada nova na escala de doc-004 §5.4, sem realocar nenhuma
  existente.
- Conteúdo, na ordem: contador total `3/9`, depois um chip por grupo, depois
  o chip `Swaps · 2`.
- Chips em `overflow-x-auto` com scroll horizontal; nunca quebram em 2 linhas
  (mesma regra do header: altura fixa, sem `flex-wrap`).
- Cada chip: `<a href="#slot-group-armas">` com texto `Armas 1/2`.
  Contador **sempre** visível, inclusive `0/2` — é goal gradient: mostra o que
  falta, não só o que já foi feito.
- Chip do grupo completo ganha `✓` antes do nome (`✓ Armas 2/2`) e
  `--color-enchant` no texto — é estado de slot preenchido, uso coerente com a
  semântica que doc-004 §5.2.4 fixou para esse token (estado, não ação).
- Chip do grupo em foco de scroll: `aria-current="location"`, borda
  `--color-accent` (1px), fundo `--color-icon-slot`. Só o contorno é accent, não
  o preenchimento.

### 5.3 Como se sabe que um grupo tem slots preenchidos

Pela grade — os cards nunca somem. O contador do chip é **redundância de
orientação**, não substituto de conteúdo. Essa é a diferença central entre esta
proposta e a Opção B.

### 5.4 Scroll até âncora

- `scroll-behavior: smooth` no container, respeitando
  `@media (prefers-reduced-motion: reduce)` → `auto`.
- Cada `<h3>` de grupo recebe `scroll-margin-top: var(--group-nav-h)` para não
  parar embaixo do strip. Sem isso o heading fica coberto — defeito clássico de
  âncora + sticky.

### 5.5 Grid 2-up

- `SlotCard` deixa de ter `w-[168px]`: passa a `w-full` com
  `max-w-[168px]` em `md+` (preserva o desktop pixel a pixel).
- Container do grupo: `grid grid-cols-2 gap-3 md:flex md:flex-col`.
- `gap-8` entre grupos cai para `gap-5` abaixo de `md` (o heading já separa).
- Ícone permanece `size-24` (96px) — cabe em 155px de card e é o elemento de
  reconhecimento; encolher ícone de item é a última coisa a fazer num app cujo
  valor é o ícone oficial.

---

## 6. Degradação para tablet/desktop

| Largura | Strip | Grade |
|---|---|---|
| `< 768px` | visível, sticky top-0 | `grid-cols-2`, card fluido |
| `>= 768px` | **não renderizado** (`md:hidden`) | idêntico a hoje: `flex flex-wrap gap-8`, colunas por grupo, card 168px |

Nenhum arquivo do desktop muda de comportamento. `SlotGrid` ganha classes
responsivas; o ramo `md+` reproduz a marcação atual. Teste de não-regressão
sugerido: snapshot do `SlotGrid` em viewport desktop antes/depois.

---

## 7. Estados

| Estado | Strip | Grade |
|---|---|---|
| **Loading do catálogo** (`useItemCatalogue.loading`) | renderiza normalmente com `0/2` etc. — os slots do build vêm do store, não do catálogo | grade normal; só nomes/tier/enchant chegam depois |
| **Vazio** (build nova, 9 vazios) | `0/9` + todos os chips `0/n`. Nenhum chip com `✓` | 9 cards `data-slot-state="empty"`, cada um com CTA "Adicionar" (já existe). CTA da tela é a própria grade — não adicionar um segundo empty-state acima dela; seria duas ações primárias |
| **Erro de catálogo** (`failed`) | chips continuam navegando (as âncoras existem) | grade renderiza com `itemId` cru como nome; o retry vive no picker (contrato atual). Chip **não** vira erro — grupo não é a unidade de falha |
| **Parcialmente preenchido** | `4/9`, mistura de chips com e sem `✓` | cards preenchidos e vazios lado a lado, sem reordenar. **Nunca reordenar slots por estado** — a posição do slot é a memória espacial do usuário |
| **Offhand travado** | conta como **não preenchido** e o denominador de Armas cai para 1 (`Armas 1/1 ✓`) | card `locked` como hoje. Contar um slot inatingível como pendente trava o `9/9` para sempre |
| **Sem swaps** | chip `Swaps · 0` presente | empty state de `SwapsSection` inalterado |

O denominador global (`3/9`) segue a mesma regra: `SLOT_ORDER.length` menos os
slots travados. Hoje `EditorActionBar` recebe `totalSlots={SLOT_ORDER.length}`
fixo — alinhar as duas fontes ou o usuário vê `8/9` e `9/9` na mesma tela.

---

## 8. Acessibilidade

Não há accordion nem tabs — logo **nenhum padrão ARIA composto** é introduzido.
Isso é parte do valor da recomendação.

- **Marcação:** `<nav aria-label="Grupos de slots">` contendo `<ul>` de links.
  Links reais (`<a href="#id">`), não `<button>` + `scrollIntoView`: o alvo é um
  destino no documento, é o elemento certo. Teclado ganha navegação nativa,
  Enter ativa, sem handler de setas para escrever.
- **Alvo de toque:** chip com mínimo 44×44 (`py-2 px-3`, `min-h-11`), igual à
  regra do CTA `+` do header em doc-004 §1.4.
- **Alvo da âncora:** o `<h3>` do grupo recebe `id` e `tabIndex={-1}`. O
  handler de clique chama `heading.focus({ preventScroll: true })` **depois**
  do scroll — sem isso o foco fica no chip e o leitor de tela nunca sabe que
  mudou de contexto. Este é exatamente o defeito "foco perdido para `<body>`"
  visto em ACM-012, invertido: aqui o risco é foco *que não acompanha*.
- **`aria-current="location"`** no chip ativo do scroll-spy. Não usar
  `aria-selected` (é vocabulário de tab/option e sugere um `tablist`
  inexistente).
- **Anúncio de contagem:** o texto do chip já é `Armas 1 de 2` via
  `aria-label` explícito (`1/2` lido como "um barra dois" é ruim). Não criar
  `aria-live` novo para a contagem — a tela já tem dois canais vivos
  (status da action bar, reordenação de swaps); um terceiro vira ruído.
- **Scroll-spy:** `IntersectionObserver` com `rootMargin` compensando
  `--group-nav-h`. Se `IntersectionObserver` não existir, nenhum chip fica
  ativo e a navegação continua funcionando.
- **`inert` do picker:** o strip vive **dentro** do `<div inert={pickerOpen}>`
  junto com o restante do conteúdo. Não pode ficar fora — seria navegação
  alcançável por trás de um diálogo modal.
- **Reduced motion:** ver §5.4.
- **Contraste:** texto do chip em `--color-icon-muted` (7,07:1 sobre surface,
  medido em ACM-038); chip ativo em `text-foreground`.

---

## 9. Componentes

| Componente | Situação |
|---|---|
| `SlotGrid` | modificado: wrapper responsivo, `id` + `tabIndex={-1}` nos headings de grupo |
| `SlotCard` | modificado: largura fluida com teto em `md+`. Sem mudança de API |
| `SlotGroupNav` | **novo** |
| `SwapsSection`, `EditorActionBar`, `BuildHeader`, `SlotPickerPopover` | inalterados |

**Justificativa do componente novo:** o strip tem estado próprio
(grupo ativo por `IntersectionObserver`), ciclo de vida próprio (observer) e é
condicional por viewport. Enfiar isso dentro de `SlotGrid` acopla observação de
scroll a renderização de slots e complica ACM-039/040, que vão mexer no card.
Recebe apenas dados derivados (`{ id, title, filled, total }[]` + contagem
total) — sem acesso a store, coerente com a regra "a página é a única
assinante do store".

---

## 10. Tokens

Reuso, de `globals.css`:

| Uso | Token |
|---|---|
| Fundo do strip | `var(--color-surface)` |
| Borda inferior do strip e borda do chip | `var(--color-border)` |
| Texto do chip inativo | `var(--color-icon-muted)` |
| Texto do chip ativo | `text-foreground` |
| Fundo do chip ativo | `var(--color-icon-slot)` |
| Borda do chip ativo | `var(--color-accent)` |
| `✓` de grupo completo | `var(--color-enchant)` |
| Foco | regra global `:focus-visible` já existente |

**Zero hex literal em `className`.** É a regra anti-drift de doc-004 §5.2 e o
defeito que ACM-042/048 rastreiam. Nenhum arquivo desta task pode conter hex
fora de `globals.css`.

**Um token novo, de layout:**

```css
--group-nav-h: 44px;  /* altura do strip de grupos < md (ACM-041) */
```

Justificativa, mesma de `--header-h` em doc-004 §5.3: duas superfícies precisam
concordar sobre essa altura — o `sticky top-0` do strip e o
`scroll-margin-top` de cada heading de grupo, mais o `rootMargin` do observer.
Sem token, viram três números mágicos que quebram em silêncio quando o padding
do chip mudar. Nome semântico, não `--nav-44`.

Nenhum token de cor novo.

---

## 11. Interação com tasks abertas

- **ACM-045 (picker full-screen em 390px): independente.** Esta spec não muda
  quem abre o picker, com que props, nem como o foco volta
  (`restoreFocusTo={triggerElement}` continua sendo o contrato). Um card 2-up
  continua sendo o trigger. Podem ser implementadas em qualquer ordem, em
  paralelo — arquivos distintos (`SlotPickerPopover` vs `SlotGrid`/`SlotCard`).
  Único ponto de contato: com a grade 2-up o trigger fica menor, o que
  **reforça** o argumento do full-screen. Nenhum conflito.
- **ACM-039 (cor/ícone por categoria + densidade): sobreposição direta, deve
  ser serializada com esta.** Ambas editam `SlotCard`/`SlotGrid`. ACM-039 pede
  "ícone + nome lado a lado, card mais baixo" — isso é **compatível e
  cumulativo**: com card mais baixo, o 2-up desta spec fica ainda mais curto.
  Recomendação: **ACM-041 primeiro** (largura fluida é pré-requisito para
  qualquer redesenho de densidade responsiva), ACM-039 depois. Se ACM-039
  introduzir cor de borda por categoria, ela **não** pode reusar
  `--color-accent` (reservado a ação) nem `--color-enchant` (usado aqui como
  "grupo completo").
- **ACM-040 (indicadores Q/W/E/passiva): sobreposição parcial.** Os
  indicadores entram dentro de `SlotCard`, abaixo do nome. Em card de ~155px,
  4 ícones pequenos em linha cabem; a spec de ACM-040 deve dimensionar contra
  **155px**, não contra 168px. Ponto único de atenção; nada bloqueia.
- **ACM-037 (doc-004):** consumida, não contradita. Reconfirma header estático,
  action bar `fixed bottom` e a escala de z-index, estendida com `z-10`.

---

## 12. Fora de escopo (deliberado)

1. **Colapso de grupo iniciado pelo usuário.** Avaliado em §1-B e recusado como
   default; como opt-in, é feature nova sem demanda. Task separada se surgir.
2. **Reordenar ou esconder slots por estado de preenchimento.** Quebra memória
   espacial.
3. **Colapsar `SwapsSection`.** Ela já tem header com contagem e empty state
   próprios (ACM-012); só entra aqui como chip de âncora.
4. **Redesenho de densidade do card** (ícone+nome em linha, altura menor) —
   é ACM-039.
5. **Formato do picker em mobile** — é ACM-045.
6. **Indicadores de habilidade** — é ACM-040.
7. **Layout `< 360px`.** Alvo é 390px; abaixo disso o 2-up degrada para 1
   coluna via `min-width` do card, sem tratamento dedicado.
8. **Bug adjacente encontrado, não corrigido aqui:**
   `EditorActionBar` esconde o contador de slots com
   `hidden shrink-0 text-foreground/70 sm:inline` — o progresso desaparece
   exatamente em 390px. Esta spec resolve o sintoma colocando `3/9` no strip,
   mas a classe merece task própria (ou a decisão explícita de que o strip é
   a fonte única de progresso no mobile).
