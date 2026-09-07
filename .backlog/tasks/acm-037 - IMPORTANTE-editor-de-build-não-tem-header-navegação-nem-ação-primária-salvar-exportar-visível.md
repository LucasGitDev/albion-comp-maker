---
id: ACM-037
title: >-
  IMPORTANTE: editor de build não tem header, navegação, nem ação primária
  (salvar/exportar) visível
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 19:08'
labels: []
dependencies: []
priority: high
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new não existe nenhum header/nav global, breadcrumb, botão de voltar, nem botão de salvar/exportar PNG — a página é só o formulário de nome+papel e a grade de slots, sem chrome nenhum. Um usuário não sabe onde está no fluxo do produto nem como finalizar a comp que está montando. Comparar com https://www.albiononlinebuilds.com/pt/comp/dragon-raid-meele-comp: header fixo com logo/nav/busca/CTA 'Criar', título da comp e tag de categoria (ex: 'PVE GROUP') logo abaixo, botão 'Compartilhar' no canto superior direito da área de conteúdo. Ação: adicionar header persistente com navegação e, na página de edição, uma barra de ação fixa (sticky) com botão primário 'Salvar' / 'Exportar PNG' sempre visível, mesmo com scroll longo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Header global persistente com logo/marca, navegacao (Home, Builds) e CTA primario 'Criar build', presente em todas as rotas via layout
- [ ] #2 Na pagina de edicao de build existe uma action bar sticky sempre visivel durante scroll longo, com acao primaria 'Salvar' e secundaria 'Exportar PNG'
- [ ] #3 Existe caminho de volta explicito a partir do editor (breadcrumb ou botao voltar) sem depender do back do navegador
- [ ] #4 Header e action bar sao navegaveis por teclado, com foco visivel e landmarks semanticos (header/nav/main)
- [ ] #5 A action bar sticky nao aparece dentro do capture-root do export PNG (nao vaza para a imagem exportada)
- [ ] #6 make check verde e testes cobrindo a presenca do header e o disparo das acoes primarias
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SPEC: ver doc-004 'Header global, action bar sticky e navegacao do editor'. CORRECAO DE PREMISSA: a descricao original desta task esta ERRADA — Header.tsx JA existe e JA e montado no root layout, portanto JA renderiza em /build/new. O defeito real e outro: (1) CTA 'Nova build' com destaque accent aparece enquanto o usuario ESTA criando uma build (FINDING 5 da review da ACM-038) — deve virar contextual, suprimido em /build/*, dando lugar ao slot de conta; (2) BuildHeader parece um segundo header — remover border-b e o contador de slots, virando bloco de identidade. O trabalho novo de verdade e a ACTION BAR sticky, nao o header. AC#1 ja esta majoritariamente satisfeito.

Implementação (correção de premissa confirmada: Header.tsx já existia e já era montado no root layout).

O QUE FOI FEITO:
- Header.tsx: virou contextual por rota via usePathname — CTA 'Nova build' some em /build/* e dá lugar a um slot de conta (Entrar/nome, com skeleton enquanto a sessão resolve, via fetch direto em /api/auth/session — sem SessionProvider, para não exigir novo contexto global nem quebrar o teste existente que renderiza NewBuildPage isolado). Sem flex-wrap (uma linha fixa, --header-h-sm/--header-h). Nav com aria-current. Sombra só após rolar. z-30. Disclosure mobile (⋮) só aparece quando há rota além de Home — hoje não há (/builds não existe), então fica oculto por design. Em rota de editor + mobile o header vira static (md:sticky).
- BuildHeader.tsx: perdeu border-b e o contador de slots (virou bloco de identidade com <h1 discreto>). data-testid="slot-count" migrou para EditorActionBar.
- EditorActionBar.tsx (novo): sticky top-[var(--header-h)] em desktop, fixed bottom-0 (com safe-area) em mobile, z-20. Máquina de estados idle-inválido/idle-válido/saving/saved/error com um único aria-live. Salvar como aria-disabled+focável com motivo textual. Auth gate no clique (fetch /api/auth/session), não na entrada da rota (decision-012/D3) — abre painel ancorado com Entrar/Agora não, foco retorna ao botão Salvar. Exportar PNG reaproveita a LÓGICA de src/lib/export-png (exportNodeToPng/downloadDataUrl/buildExportFilename) mas não o styling do ExportBar (que usa bg-blue-600/bg-white/border-neutral-300/text-neutral-900, fora do sistema — ACM-047 é quem deve limpar isso). Estruturalmente irmã do preview: captureNodeRef não está anexado a nenhum nó real hoje porque BuildCard/#capture-root ainda não está wired em /build/new (isso é ACM-018/019, fora de escopo) — "Exportar PNG" reporta corretamente "Card não está pronto para exportar." em vez de fingir sucesso.
- Breadcrumb.tsx (novo): <nav aria-label="Trilha"> com Link real para "/" (não router.back()), aria-current no item atual.
- layout.tsx: skip link "Pular para o conteúdo" antes do Header; main do editor recebeu id="main-content".
- globals.css: tokens --header-h/--header-h-sm, --color-icon-error-fg (texto de erro legível, distinto do --color-icon-error que é um fill), e uma regra global @media (prefers-reduced-motion: reduce).
- Escala de z-index adotada: action bar 20 / header 30 / painéis (mobile nav, auth gate) 40 / SlotPickerPopover 50 (já estava em 50, não mexi).

TESTES NOVOS: src/__tests__/header.test.tsx (presença de landmarks, CTA contextual, aria-current) e src/__tests__/editor-action-bar.test.tsx (disabled com motivo, save disparando onSave, gate de auth, export via #capture-root, testid slot-count migrado, invariante estrutural de nunca envolver #capture-root). export-bar.test.tsx não foi tocado (guard do ACM-029 não foi relaxado).

O QUE FICOU DE FORA (documentado, não escondido):
- Persistência real do "Salvar" (Server Actions/DB) é ACM-018/019, fora de escopo — onSave é injetado pela página como stub (Promise.resolve) até essa task existir. Não persiste rascunho no localStorage durante o redirect de OAuth (D3 menciona isso mas exigiria decisão de escopo do BuildState, deixado para ACM-018/019).
- Guard de hover `[@media(hover:hover)]` (presente só no ExportBar hoje) não foi replicado nos novos botões — polish menor, não bloqueante.
- Breakpoint de colapso do logo (ACM/Albion Comp Maker) usa `sm:` (640px) do Tailwind em vez dos 480px literais do doc-004, para não introduzir breakpoint customizado.

make check verde (206 testes, lint 0 erros/2 warnings pré-existentes em ItemIcon/SpellIcon fora de escopo, build ok).
<!-- SECTION:NOTES:END -->
