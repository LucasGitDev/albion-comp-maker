---
id: ACM-023
title: i18n routing PT-BR / EN with locale toggle (RF-10)
status: To Do
assignee: []
created_date: '2026-09-07 13:34'
labels: []
milestone: m-7
dependencies:
  - ACM-005
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Locale prefix routing /pt/... /en/... with Accept-Language redirect from /. Toggle in nav switches locale keeping current slug. Item and spell names respect active locale from ao-data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 / redirects to /pt or /en based on Accept-Language
- [ ] #2 Locale toggle navigates to same page in other locale
- [ ] #3 Item names shown in active locale
- [ ] #4 Spell names shown in active locale
- [ ] #5 UI strings (labels, buttons) translated PT + EN
<!-- AC:END -->
