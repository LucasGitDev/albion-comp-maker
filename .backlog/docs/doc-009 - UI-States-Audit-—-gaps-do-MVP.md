---
id: doc-009
title: UI States Audit — gaps do MVP
type: guide
created: 2026-09-09
---

# UI States Audit — gaps do MVP

Auditoria realizada em 2026-09-09 mapeando os 5 estados de UI padrão no MVP atual.

## Estados auditados

### ✅ Empty State
- `/builds` — texto + CTA "Nova build"
- `/comps` — texto + CTA "Criar primeira comp"
- `BuildsListManager` — empty state inline
- **Gap:** sem ícone ou ilustração — só texto puro

### ✅ Loading / Pending State
- `BuildsListManager`, `CompBuildsManager`, `NewCompForm` — botões desabilitados via `isPending` + `useTransition`
- `CompListSkeleton.tsx` — skeleton existe mas só para comp list
- **Gap:** builds list não tem skeleton; nenhum componente mostra spinner visual explícito

### ❌ Success / Feedback State (Toast)
- **Zero toasts no app** — nenhuma dependência de sonner/react-hot-toast/etc
- Ações de duplicar, tornar pública/privada, excluir, salvar build: silenciosas
- Única "confirmação" é redirect automático após criar comp/build (navegação, não feedback)

### ✅ Error State
- `BuildsListManager` — banner inline + "Tentar de novo" ✅
- `NewCompForm` — erro inline no campo via `aria-invalid` + mensagem ✅
- `CompListErrorRetry.tsx` — retry para comp list ✅
- `CompBuildsManager` — error state inline ✅

### ✅ Partial / Populated State
- Listas renderizam dados reais
- Texto longo: `truncate` aplicado em nomes de build ✅
- **Gap:** sem paginação — listas crescem sem limite/cursor

## Resumo de gaps por prioridade

| # | Gap | Impacto | Arquivos afetados |
|---|-----|---------|-------------------|
| 1 | Toast de sucesso ausente | Alto — usuário não sabe se ação funcionou | `BuildsListManager`, `CompBuildsManager`, `EditorActionBar`, `layout.tsx` |
| 2 | Spinner visual ausente | Médio — botão desabilitado mas sem progresso visual | `BuildsListManager`, `CompBuildsManager` |
| 3 | Ícone no empty state | Baixo | `BuildsListManager`, `src/app/comps/page.tsx` |
| 4 | Paginação ausente | Baixo (MVP pequeno) | `src/app/builds/page.tsx`, `src/app/comps/page.tsx` |

## Approach sugerido para toast (gap #1)

Instalar `sonner` (leve, sem deps pesadas), adicionar `<Toaster />` em `src/app/layout.tsx`, chamar `toast.success()` nos `try` blocks existentes em cada action handler.
