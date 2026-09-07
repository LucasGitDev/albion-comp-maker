---
id: ACM-049
title: >-
  Validar data_json de build com Zod (size cap + shape) antes das paginas
  publicas SSR
status: Done
assignee: []
created_date: '2026-09-07 18:54'
updated_date: '2026-09-07 20:42'
labels: []
milestone: m-7
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented per decision-013. Added zod ^4.5.4 and server-only ^0.0.1 as
direct production deps (both already resolvable, no new heavy resolution).

src/lib/build-schema.ts: buildStateSchema (strict at every level, derived
shape mirrors SLOT_ORDER/BuildState with a compile-time Exact<> check so
tsc fails on drift). 128 KiB byte cap enforced on the raw string before
JSON.parse. validateBuildContentForWrite() throws (strict write path,
used by saveBuild/updateBuild) and re-serializes from the validated
object, never the raw input. parseBuildContent() never throws (tolerant
read path) and returns a discriminated result — not yet wired into any
read path since no read path parses build content yet in this codebase;
it exists now so ACM-021 (public SSR build pages) has it ready and does
not have to invent its own tolerant-read handling.

accent constrained to /^#[0-9a-fA-F]{6}$/ per the ADR's CSS-injection
concern.

Scope note: per the ADR's compatibility section, duplicateBuild and
forkBuild also copy `content` directly and, per decision-013, should
revalidate before copying (fork especially, since it copies another
user's row). This was left OUT per the explicit task scope (AC#1 names
only saveBuild/updateBuild) — flagging as a known gap for a follow-up
task before ACM-021 ships, since a legacy-invalid row can otherwise
propagate via fork today (though it is not yet reachable by SSR).

vitest.config.ts: aliased "server-only" to its "react-server" no-op
build (node_modules/server-only/empty.js) because Vitest resolves under
Node conditions, not react-server, and the package's default export
throws unconditionally otherwise. Every test importing build-schema.ts
is exercising server code by construction, so this is a correct test-only
resolution, not a bypass of the server-only guard for real client code.

builds-actions.test.ts fixtures switched from "{}" to a schema-valid
payload since saveBuild/updateBuild now enforce strict validation.

AC#7 follow-up (fork/duplicate content laundering) now implemented in this PR, per orchestrator direction, instead of splitting into a follow-up task.

Chosen behavior: REFUSE, do not normalize/guess. duplicateBuild and forkBuild now call a shared revalidateContentForCopy() helper that runs the source row's content through the tolerant parseBuildContent() first (legacy rows are a legitimate possibility on the read side), and if that fails (too-large/invalid-json/invalid-shape) the copy is rejected with a new BuildContentInvalidError rather than silently propagating unvalidated content into the copying user's library. If parseBuildContent succeeds, the parsed object is re-serialized through validateBuildContentForWrite so the copy is written in normalized form, same as any other write path. Reasoning: a legacy/malformed source is not something fork/duplicate can safely "fix" on the user's behalf (the shape may be ambiguous or lossy to normalize), and forkBuild in particular copies another user's row — refusing keeps the write path's strictness guarantee intact end-to-end and gives the caller a clear, actionable error instead of a 500 (JSON.parse/Zod would otherwise throw uncaught) or a silently corrupted copy.

Tests added in src/__tests__/builds-actions.test.ts: duplicateBuild and forkBuild each get a case that inserts a legacy/malformed row directly via db.insert(builds) (bypassing the write-path validation, simulating a pre-ACM-049 row or a future incompatible payload) and asserts the copy is rejected with BuildContentInvalidError. Existing happy-path fork/duplicate tests (valid source content) continue to pass unchanged, confirming the normal path still works.

No changes to authz logic in src/actions/builds.ts: requireSession(), the ownership-scoped WHERE clauses in loadOwnedBuild, and forkBuild's isPublic-or-owner check are untouched. The new validation runs strictly after those checks resolve which row is being copied.

vitest.config.ts "server-only" alias — verified isolated to the test runner, does not weaken the production guard:
- The alias lives under vitest.config.ts's own `resolve.alias`, consumed only by Vite/Vitest's bundler when running `vitest run`.
- next.config.ts has no reference to vitest.config.ts and no alias for "server-only" — Next's Turbopack/webpack build resolves the package through its own `package.json` "exports" map (react-server condition -> empty.js for RSC bundles, default -> index.js otherwise), which is exactly the mechanism decision-013 relies on to turn a future client-side import of build-schema.ts into a build error.
- Empirically confirmed via `make check`: `next build` in this PR still succeeds and does NOT go through the vitest alias (grep of the build output/config shows no vitest involvement in the `next build` step), so a client-importing build-schema.ts would still be resolved via the real index.js in a Client Component bundle and throw at import time (dev) / fail the build's RSC boundary checks — the guard is untouched in the real build. The alias only prevents `server-only`'s unconditional Node-condition throw from blocking tests that import server code by construction (every test importing build-schema.ts).

Dependency delta for PR description: `server-only` ^0.0.1 added as a second new direct production dependency in addition to `zod` ^4.5.4 (already noted in a prior implementation-notes entry) — calling it out explicitly here per request so it's reviewable as its own line item.
<!-- SECTION:NOTES:END -->

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
