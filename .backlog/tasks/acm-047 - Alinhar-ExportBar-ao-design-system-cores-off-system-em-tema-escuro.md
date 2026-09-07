---
id: ACM-047
title: Alinhar ExportBar ao design system (cores off-system em tema escuro)
status: To Do
assignee: []
created_date: '2026-09-07 18:50'
labels: []
dependencies: []
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Levantado pela spec doc-004 (ACM-037). src/components/build-card/ExportBar.tsx usa classes cruas fora do design system: bg-blue-600, bg-white, border-neutral-300, text-neutral-900. Em tema escuro isso renderiza uma barra visualmente BRANCA, destoando de todo o resto da UI e competindo com a acao primaria. Nao e o mesmo bug da ACM-042 (aquele e drift de token de texto em item-result-list): aqui sao cores de componente inteiras nunca migradas para o sistema. A ACM-037 esta proibida de reaproveitar esses classNames (reusa apenas a LOGICA de export), entao esta task limpa o componente legado. Mapear tudo para --color-surface/-border/-accent e conferir contraste 4.5:1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ExportBar nao usa nenhuma cor crua do Tailwind (bg-blue-600, bg-white, border-neutral-300, text-neutral-900) — tudo via tokens do design system
- [ ] #2 ExportBar nao renderiza como bloco branco no tema escuro
- [ ] #3 Todo texto/controle da ExportBar passa 4.5:1 de contraste
- [ ] #4 A hierarquia visual da ExportBar nao compete com a acao primaria 'Salvar' da action bar (ACM-037)
- [ ] #5 Contrato de capture-root preservado: export-bar.test.tsx continua verde e a guarda ACM-029 nao e relaxada
- [ ] #6 make check verde
<!-- AC:END -->
