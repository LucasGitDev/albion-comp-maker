---
id: ACM-112
title: 'BuildEditor: redirecionar para /build/[id]/edit após primeiro save'
status: Done
assignee: []
created_date: '2026-09-09 17:37'
updated_date: '2026-09-09 18:18'
labels:
  - editor
  - bug
  - data-integrity
dependencies: []
priority: high
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
BuildEditor.handleSave em modo new chama saveBuild() e descarta o BuildRow retornado. Usuário permanece em /build/new após salvar. Segundo clique em Salvar cria build duplicada silenciosamente. Auditoria product-spec de 2026-09-09. Arquivo: src/components/editor/BuildEditor.tsx (~linha 400).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Após primeiro save em modo new, router.push para /build/[id]/edit com o id retornado por saveBuild()
- [ ] #2 Não é possível criar duplicata clicando Salvar duas vezes no fluxo new
- [ ] #3 Modo edit (já em /build/[id]/edit) não é afetado — continua salvando no lugar
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewer pass 2: LGTM — query params fix confirmed, 850 tests pass
<!-- SECTION:NOTES:END -->
