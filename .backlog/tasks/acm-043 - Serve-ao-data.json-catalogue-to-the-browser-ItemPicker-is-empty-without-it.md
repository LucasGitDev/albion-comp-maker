---
id: ACM-043
title: Serve ao-data.json catalogue to the browser (ItemPicker is empty without it)
status: In Progress
assignee: []
created_date: '2026-09-07 17:54'
updated_date: '2026-09-07 17:58'
labels: []
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
- [ ] #1 ItemPicker no /build/new lista itens reais do ao-data.json em um checkout que rodou npm run sync:ao
- [ ] #2 Selecionar um item grava no slot e mostra o icone oficial — fluxo ponta a ponta funcionando
- [ ] #3 Quando ao-data.json NAO existe, a UI mostra estado de erro explicito instruindo rodar o pipeline — nunca um dropdown vazio silencioso
- [ ] #4 Catalogo nao e embutido no bundle client inteiro se isso degradar o tempo de carga; medir e documentar a escolha
- [ ] #5 make check verde
<!-- AC:END -->
