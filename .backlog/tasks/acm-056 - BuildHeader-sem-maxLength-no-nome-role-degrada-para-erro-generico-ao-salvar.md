---
id: ACM-056
title: BuildHeader sem maxLength no nome/role degrada para erro generico ao salvar
status: To Do
assignee: []
created_date: '2026-09-07 19:26'
updated_date: '2026-09-07 19:26'
labels: []
dependencies:
  - ACM-036
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-049 (PR #33). O schema da ACM-049 limita name a 100 e role a 50 caracteres, mas src/components/editor/BuildHeader.tsx nao tem maxLength nos inputs. Consequencia: o usuario digita um nome longo, clica Salvar, e recebe apenas 'Nao deu para salvar.' sem nenhuma indicacao da causa — o limite so existe no servidor e a mensagem de erro nao o comunica. Relacionado a ACM-036 (contador de caracteres 0/10 que ja nao reflete o texto digitado), provavelmente devem ser resolvidos juntos. Adicionar maxLength client-side alinhado ao schema e/ou propagar a mensagem de validacao real ate a barra de acao.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inputs de nome e role tem maxLength alinhado aos limites do schema (100/50)
- [ ] #2 Exceder o limite comunica a causa ao usuario, nao um erro generico
- [ ] #3 Limites client e server derivam da mesma fonte, sem numeros magicos duplicados
- [ ] #4 make check verde
<!-- AC:END -->
