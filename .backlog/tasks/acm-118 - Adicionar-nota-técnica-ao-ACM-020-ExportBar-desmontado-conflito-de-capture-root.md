---
id: ACM-118
title: >-
  Adicionar nota técnica ao ACM-020: ExportBar desmontado + conflito de
  capture-root
status: To Do
assignee: []
created_date: '2026-09-09 17:38'
labels:
  - export
  - technical-debt
dependencies: []
priority: high
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-020 (multi-export) depende de ExportBar, mas auditoria de 2026-09-09 descobriu: (1) ExportBar está completamente implementado mas NUNCA montado em nenhuma rota de produção além de /build/[id]; (2) /comp/[slug] emite captureId='capture-root-{id}' por entry, mas ExportBar.resolveCaptureNode busca '#capture-root' literal — vai resolver null e cair no branch de erro. Implementer do ACM-020 deve resolver o contrato do seletor antes de montar.
<!-- SECTION:DESCRIPTION:END -->
