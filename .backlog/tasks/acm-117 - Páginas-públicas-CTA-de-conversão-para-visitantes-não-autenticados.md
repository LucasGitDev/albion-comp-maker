---
id: ACM-117
title: 'Páginas públicas: CTA de conversão para visitantes não autenticados'
status: Done
assignee: []
created_date: '2026-09-09 17:38'
updated_date: '2026-09-09 18:31'
labels:
  - growth
  - ux
  - conversion
dependencies: []
priority: medium
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Páginas /build/[id] e /comp/[slug] são as únicas vistas por visitantes anônimos (link compartilhado no Discord — canal primário de aquisição). Header não mostra nenhum CTA contextual para não-autenticados além do link de sign-in genérico. Não há footer, banner ou card com 'Monte a sua comp'. Momento de maior intenção do funil desperdiçado. Auditoria uiux de 2026-09-09.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Página /build/[id] exibe CTA sticky/footer para não-autenticados: ex. "Monte sua própria comp → Entrar com Discord"
- [ ] #2 Página /comp/[slug] exibe o mesmo CTA
- [ ] #3 CTA não aparece para usuário autenticado
- [ ] #4 CTA leva para /api/auth/signin com callbackUrl para a página atual
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented GuestCTABanner (server component, reads auth() directly) rendered from /build/[id] and /comp/[slug] pages, gated on unauthenticated session. Links to /api/auth/signin?callbackUrl=<current path>. i18n strings added (guestCta.message/signIn). Committed directly to main per task instructions. Gate: tsc, lint, npm run build, npm test all green (850 tests passing).
<!-- SECTION:NOTES:END -->
