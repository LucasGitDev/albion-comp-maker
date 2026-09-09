---
id: ACM-118
title: >-
  Adicionar nota técnica ao ACM-020: ExportBar desmontado + conflito de
  capture-root
status: Done
assignee: []
created_date: '2026-09-09 17:38'
updated_date: '2026-09-09 18:09'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nota técnica registrada diretamente pelo orchestrator: (1) ExportBar está completamente implementado em src/components/export/ExportBar.tsx mas NÃO está montado em nenhuma rota além de /build/[id]. (2) /comp/[slug] emite captureId='capture-root-{id}' por entry (dinâmico), mas ExportBar.resolveCaptureNode busca '#capture-root' literal — retorna null e entra no branch de erro. Antes de implementar ACM-020 (multi-export), o implementer DEVE: alinhar o seletor do ExportBar para aceitar o padrão capture-root-{id}, ou alterar CompBuildsManager para emitir um captureId canônico fixo por comp, e montar ExportBar em /comps/[id]. Contrato do seletor é o blocker principal.
<!-- SECTION:NOTES:END -->
