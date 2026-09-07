---
id: ACM-049
title: >-
  Validar data_json de build com Zod (size cap + shape) antes das paginas
  publicas SSR
status: In Progress
assignee: []
created_date: '2026-09-07 18:54'
updated_date: '2026-09-07 19:13'
labels: []
dependencies: []
priority: high
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da auditoria de seguranca da ACM-018 (PR #28). Em src/actions/builds.ts, saveBuild/updateBuild recebem 'content' (data_json) tipado como string e persistem com ZERO validacao em runtime. O comentario em schema.ts afirma que o campo e 'validated by a shared Zod schema at the application layer' — isso e FALSO, nenhum schema desse tipo existe em src/actions (confirmado por grep). Dois riscos concretos: (1) sem limite de tamanho -> abuso de storage / DoS; (2) sem validacao de shape -> precursor de stored XSS assim que a ACM-021 renderizar paginas publicas de build via SSR a partir dessa coluna. Hoje o dado so volta para o proprio dono, entao o risco esta contido; ele DETONA quando conteudo controlado pelo usuario passar a ser servido a terceiros. Precisa pousar antes da ACM-021.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existe um Zod schema compartilhado para o payload de build, aplicado com .parse() em saveBuild e updateBuild
- [ ] #2 Limite maximo de tamanho aplicado ao data_json, com erro claro ao exceder
- [ ] #3 Shape validado: campos desconhecidos rejeitados ou removidos, nao persistidos as-is
- [ ] #4 Comentario enganoso em schema.ts corrigido ou passa a ser verdadeiro
- [ ] #5 Testes cobrindo payload acima do limite e payload com shape invalido
- [ ] #6 make check verde
- [ ] #7 forkBuild e duplicateBuild validam o content ANTES de copiar — hoje copiam source.content direto (inclusive de outro usuario no fork), propagando row legada invalida para a biblioteca de quem forkou
- [ ] #8 accent restrito por regex ^#[0-9a-fA-F]{6}$ e obrigatorio — vetor concreto de injecao de CSS via style={{color: accent}} em BuildCardVertical/BuildCardGrid
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Serializar a lane: esta task altera package.json e pnpm-lock.yaml. Confirmar com o orchestrator que nenhuma outra lane esta ativa nesses arquivos antes de comecar.
2. `pnpm add zod@^4.5.4`. Justificativa e alternativas em decision-013. NAO depender da zod transitiva de eslint-config-next (dev-only, some em bump).
3. Criar src/lib/build-schema.ts com `import "server-only";` na primeira linha. Exportar MAX_BUILD_CONTENT_BYTES = 131072, equippedItemSchema, swapSchema, buildStateSchema. Todos os objetos com .strict(). Fonte de verdade dos slots: SLOT_ORDER de @/types/build (NAO o tipo Slot de @/data/ao-data.d.ts, que e '... | string' e nao restringe nada).
4. Limites por campo (tabela completa em decision-013): schemaVersion z.literal(1); name 1..100; role 0..50; accent regex ^#[0-9a-fA-F]{6}$ obrigatorio (e o vetor real: BuildCardVertical.tsx faz style={{color: accent}}); itemId e spell ids 1..128 com ^[A-Z0-9_@#]+$ case-insensitive; tier int 1..8; enchant int 0..4; swaps max 20; swaps[].label 1..60.
5. Anti-drift compile-time no mesmo arquivo: type Exact<A,B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never; const _check: Exact<z.infer<typeof buildStateSchema>, BuildState> = true; quebra tsc --noEmit se divergirem. NAO trocar BuildState por z.infer: BuildState e consumido pelo store cliente e nao pode depender de modulo server-only.
6. Exportar validateBuildContentForWrite(raw: string): string — (a) Buffer.byteLength(raw,'utf8') > MAX -> throw InvalidBuildContentError('too-large'); (b) JSON.parse em try/catch -> 'invalid-json'; (c) buildStateSchema.parse -> 'invalid-shape'; (d) retorna JSON.stringify(parsed), re-serializado do objeto validado. Persistir SEMPRE esse retorno, nunca a string original.
7. Exportar parseBuildContent(raw: string): { ok: true; data: BuildState } | { ok: false; reason: 'too-large' | 'invalid-json' | 'invalid-shape' }. Nunca lanca. E o caminho de LEITURA tolerante para rows legadas.
8. Adicionar InvalidBuildContentError em src/actions/build-errors.ts (arquivo separado porque um modulo 'use server' so pode exportar funcoes async).
9. Ligar em src/actions/builds.ts: saveBuild e updateBuild passam input.content por validateBuildContentForWrite antes do insert/update. forkBuild TAMBEM valida source.content antes de copiar (copia conteudo de outro usuario, nao pode propagar row legada invalida). duplicateBuild idem.
10. Corrigir o comentario mentiroso em src/db/schema.ts na coluna 'content' (AC#4): apontar para src/lib/build-schema.ts e decision-013.
11. Testes em src/__tests__: payload acima de 128 KiB -> too-large; JSON malformado -> invalid-json; campo desconhecido no topo e dentro de um slot -> invalid-shape; accent 'red' e 'url(x)' -> invalid-shape; createEmptyBuild() e build cheio com swaps -> ok; parseBuildContent nunca lanca.
12. make check verde. NAO implementar as paginas de leitura aqui: apenas exportar parseBuildContent; a ACM-021 consome com notFound() quando ok:false.
<!-- SECTION:PLAN:END -->
