---
id: ACM-101
title: 'i18n: traduzir strings de UI hard-coded do editor, hero e empty states'
status: To Do
assignee: []
created_date: '2026-09-09 03:05'
updated_date: '2026-09-09 03:26'
labels: []
dependencies: []
priority: high
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-093 entregou o toggle EN/PT-BR mas limitou o escopo (decision-026) a ~10 chaves de chrome global (nav, conta, skip link, toggle) mais os nomes de itens/spells vindos do ao-data.json. Todo o resto da UI segue em PT-BR hard-coded, o que produz mistura de idiomas visivel quando o usuario seleciona EN.

Superficie a cobrir:
- Hero da home (titulo, subtitulo, CTAs)
- Empty states (ex. 'Nenhuma comp ainda')
- Editor /build/new: 'Detalhes da build', 'Nome do build', 'Papel', 'Armas', 'Armadura', 'Utilidade', 'Consumiveis', 'Swaps', 'Adicionar', 'Salvar', 'Exportar PNG', 'Aparencia'
- SLOT_LABELS, ThemePanel, breadcrumbs
- metadata (title/description) por locale

Reaproveitar a infra existente: src/lib/i18n/messages.ts, t(locale, key), getRequestLocale().
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Com cookie acm_locale=en-US, a home (hero, CTAs, empty state) renderiza 100% em ingles, sem nenhuma string PT-BR visivel
- [ ] #2 Com cookie acm_locale=en-US, /build/new renderiza todos os labels de UI em ingles (incluindo SLOT_LABELS, ThemePanel e breadcrumbs)
- [ ] #3 Com cookie acm_locale=pt-BR (default), toda a UI permanece em PT-BR identica ao comportamento atual, sem regressao
- [ ] #4 metadata (title/description) responde ao locale do request
- [ ] #5 Nenhuma string de UI hard-coded restante nas telas cobertas: teste automatizado ou grep documentado prova a ausencia
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADA por conflito de arquivos (orchestrator paralelo, 2026-09-09). ACM-101 precisa editar src/app/page.tsx (hero/home) e src/app/(editor)/build/new/page.tsx (labels do editor). Ambos estao reclamados por PRs abertos de outro orquestrador: PR #71 (ACM-096) toca src/app/page.tsx e PR #66 (ACM-095) toca src/app/(editor)/build/new/page.tsx. Nao claimed; permanece To Do. Desbloqueio: mergear #66 e #71, entao reabrir.
<!-- SECTION:NOTES:END -->
