---
id: ACM-056
title: BuildHeader sem maxLength no nome/role degrada para erro generico ao salvar
status: In Progress
assignee: []
created_date: '2026-09-07 19:26'
updated_date: '2026-09-09 03:25'
labels: []
milestone: m-2
dependencies:
  - ACM-036
  - ACM-059
priority: medium
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
NARROWED pela ACM-036 (merged). A ACM-036 fechou o caso de EXCEDER TAMANHO para nome e papel: maxLength client-side derivado de validation-constants.ts (ACM-059) impede digitar alem do limite, e o contador mostra o maximo real. AC#1 e AC#3 desta task estao satisfeitos para esses dois campos.\n\nO QUE RESTA — e o reviewer achou a linha exata: src/components/editor/EditorActionBar.tsx:99 CAPTURA error.message do saveBuild, mas a linha 131 SEMPRE renderiza a string generica hardcoded ('Nao deu para salvar.'), ignorando a mensagem capturada. Isso e codigo morto: a causa real do erro ja esta em maos e e jogada fora. Entao qualquer falha de save que NAO seja tamanho de nome/papel (payload invalido, rate limit, sessao expirada, conflito) continua degradando para a mensagem generica. Corrigir e pequeno: renderizar a mensagem capturada quando ela existir, com fallback generico. Cuidado: nao vazar detalhe interno de schema/DB para o usuario — mapear erros conhecidos para copy util.
<!-- SECTION:NOTES:END -->
