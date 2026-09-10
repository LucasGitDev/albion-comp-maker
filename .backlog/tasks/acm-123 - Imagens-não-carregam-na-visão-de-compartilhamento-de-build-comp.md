---
id: ACM-123
title: Imagens não carregam na visão de compartilhamento de build/comp
status: In Progress
assignee: []
created_date: '2026-09-10 12:59'
updated_date: '2026-09-10 13:13'
labels: []
dependencies: []
priority: high
type: bug
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Na share page de build ou comp, as imagens dos itens equipados não carregam — aparecem como blocos cinzas/vazios (ver screenshot). As imagens funcionam no editor. O problema provavelmente está relacionado ao domínio das imagens não estar na allowlist do next/image, ou CORS/CSP bloqueando as requisições na rota pública de compartilhamento.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ícones de itens equipados carregam corretamente na share page de build
- [x] #2 Ícones de itens equipados carregam corretamente na share page de comp
- [x] #3 Verificar se next.config remotePatterns cobre o CDN do Albion para rotas públicas
- [x] #4 Sem erros de CORS ou CSP no console na rota de compartilhamento
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: not remotePatterns/CORS/CSP — all icons already go through the same-origin /api/icon proxy. Real bug: SSR hydration race in useIconStatus (ItemIcon/SpellIcon) — on server-rendered share pages the <img> src is present in the initial HTML and the browser can finish loading before React hydrates and attaches onLoad, so status never reaches 'loaded' and the icon stays opacity-0 over its grey placeholder. Fixed with a mount-time ref check of img.complete/naturalWidth in use-icon-status.ts. Also added images.remotePatterns for render.albiononline.com to next.config.ts per AC#3 (defensive, no current next/image usage against it). See decision-031.
<!-- SECTION:NOTES:END -->
