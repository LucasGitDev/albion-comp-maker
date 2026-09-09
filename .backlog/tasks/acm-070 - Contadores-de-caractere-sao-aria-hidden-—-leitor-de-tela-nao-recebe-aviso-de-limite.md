---
id: ACM-070
title: >-
  Contadores de caractere sao aria-hidden — leitor de tela nao recebe aviso de
  limite
status: To Do
assignee: []
created_date: '2026-09-07 20:47'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-036 (PR #44). Em src/components/editor/BuildHeader.tsx os contadores de nome e papel usam aria-hidden para preservar o nome acessivel dos inputs ('Nome do build' / 'Papel') — a intencao esta certa, mas o efeito e que usuario de leitor de tela recebe ZERO sinal ao se aproximar do limite. Combinado com maxLength, que impede a digitacao SILENCIOSAMENTE por design, a experiencia e: o texto simplesmente para de entrar, sem nenhuma explicacao audivel. Recomendacao do reviewer: em vez de esconder por completo, expor via aria-describedby ou uma regiao aria-live='polite' que so anuncia ao cruzar um limiar (ex.: ultimos 10 caracteres), evitando verbosidade a cada tecla.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Usuario de leitor de tela recebe aviso ao se aproximar do limite de nome/papel
- [ ] #2 O nome acessivel dos inputs continua exatamente 'Nome do build' e 'Papel' (sem regressao da ACM-036)
- [ ] #3 O anuncio nao e verboso a cada tecla — usa limiar ou describedby, nao live region continua
- [ ] #4 make check verde
<!-- AC:END -->
