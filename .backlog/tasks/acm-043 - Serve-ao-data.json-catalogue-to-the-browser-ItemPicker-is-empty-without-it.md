---
id: ACM-043
title: Serve ao-data.json catalogue to the browser (ItemPicker is empty without it)
status: Done
assignee: []
created_date: '2026-09-07 17:54'
updated_date: '2026-09-07 20:42'
labels: []
milestone: m-1
dependencies: []
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-034 conectou o ItemPicker ao editor, mas o catalogo nunca chega ao browser. src/components/editor/use-item-catalogue.tsx:39 faz import dinamico com turbopackIgnore de '@/data/ao-data.json'; o proprio comentario (linhas 25-27) admite: 'today nothing serves @/data/ao-data.json to the browser, so the import always rejects and we fall back to an empty catalogue'. O .catch() da linha 44 engole a falha e devolve [], com loading=false. Resultado: o picker ABRE mas fica SEMPRE VAZIO, sem mensagem — indistinguivel do bug original para o usuario. src/data/ao-data.json e gitignored (.gitignore:48) e gerado por 'npm run sync:ao'. Abordagem sugerida: route handler server-side (mesmo padrao de /api/icon) que le o artifact no servidor e serve JSON ao cliente, com estado de erro explicito quando o pipeline ainda nao rodou.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ItemPicker no /build/new lista itens reais do ao-data.json em um checkout que rodou npm run sync:ao
- [x] #2 Selecionar um item grava no slot e mostra o icone oficial — fluxo ponta a ponta funcionando
- [x] #3 Quando ao-data.json NAO existe, a UI mostra estado de erro explicito instruindo rodar o pipeline — nunca um dropdown vazio silencioso
- [x] #4 Catalogo nao e embutido no bundle client inteiro se isso degradar o tempo de carga; medir e documentar a escolha
- [x] #5 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified already implemented: PR #25 (fix(editor): wire ItemPicker into slots and fix empty-slot icons — ACM-034 ACM-035) folded in this exact work per prior claim commit 'chore(config): claim ACM-043 (folded into PR #25)'. src/app/api/items/route.ts serves a trimmed AOItem[] (uniquename, slot, localizedNames, spells, twohanded, maxEnchant) parsed once and cached in module scope, gzip'd (~2.0MB raw -> ~63KB gzip) with ETag/304 revalidation on every request since the artifact changes on every sync:ao + deploy with no cache-busting URL segment. Missing artifact -> 503 {code: CATALOGUE_UNAVAILABLE}; src/components/editor/use-item-catalogue.tsx fetches /api/items and distinguishes missing-artifact vs generic failure, never silently returning an empty list. Tests exist: src/__tests__/api-items-route.test.ts (missing-artifact path) and src/__tests__/use-item-catalogue.test.tsx (hook error state). Task branch task/43-serve-ao-data (from current main) has zero diff vs main for this work. make check green (194 tests passed, exit 0). All 5 ACs already satisfied on main; no new commit/PR needed for this task.
<!-- SECTION:NOTES:END -->
