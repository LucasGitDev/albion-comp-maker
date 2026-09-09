---
id: ACM-097
title: 'Rota /comp/new nao existe: criar comp e um 404 guardado pelo proxy'
status: Done
assignee: []
created_date: '2026-09-09 02:41'
updated_date: '2026-09-09 03:05'
labels: []
milestone: m-6
dependencies: []
priority: high
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/proxy.ts trata '/comp/new' como rota autenticada (decision-016) mas o arquivo src/app/comp/new/page.tsx nao existe. Resultado: o proxy autentica o usuario e entrega 404. Nao existe nenhum caminho no produto para chamar createComp(), que ja esta implementado em src/actions/comps.ts:115.

Fluxo (1 passo, deliberadamente minimo — friction no ponto de criacao mata conversao):
1. Usuario clica 'Nova comp' -> tela unica com um campo 'Nome da comp' (placeholder 'ZvZ Terça') + botao primario 'Criar comp'.
2. Sucesso -> redirect direto para a pagina da comp criada, ja no estado vazio de builds. Nao voltar para a listagem: o usuario esta no meio de uma tarefa, devolver para a lista quebra o momentum.
3. Erro de validacao (nome vazio / acima do limite de ACM-057) -> mensagem inline sob o campo, foco no campo, sem perder o texto digitado.

Alternativa aceitavel e preferivel se couber no escopo: criar a comp inline por dialog a partir da home, sem rota dedicada — mas entao o proxy deve parar de referenciar '/comp/new' (hoje ele guarda uma rota inexistente, o que e uma inconsistencia por si so).

Wireframe:
+--------------------------------------+
|  < Minhas comps                      |
|                                      |
|  Nova comp                           |
|  Nome da comp                        |
|  [ ZvZ Terça................. ] 0/60 |
|                                      |
|  [ Criar comp ]   Cancelar           |
+--------------------------------------+

Estados: idle, submitting (botao 'Criando...', desabilitado, sem duplo submit), erro (inline), sucesso (redirect).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /comp/new autenticado renderiza o formulario de criacao, nao 404
- [ ] #2 Submeter com nome valido chama createComp e redireciona para a pagina da comp criada
- [ ] #3 Nome vazio ou acima do limite mostra erro inline preservando o texto digitado, sem chamar a action
- [ ] #4 Duplo clique no botao primario nao cria duas comps
- [ ] #5 Se a decisao final for dialog inline, src/proxy.ts deixa de guardar '/comp/new' e o teste do proxy e atualizado
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Ver decision-027 (destino do redirect). AC#5 NAO se aplica: mantemos a rota dedicada, proxy fica como esta.

1. src/actions/comps.ts — adicionar wrapper serializavel no MESMO arquivo (ja e "use server"; um arquivo "use server" so pode exportar funcoes async, entao NAO exportar tipo/classe nova ali):
   export async function createCompAction(input: { name: string }): Promise<{ ok: true; compId: string } | { ok: false; error: string }>
   Implementacao: try { const row = await createComp(input); return { ok: true, compId: row.id } } catch (e) { if (e instanceof RateLimitError) return {ok:false,error:'Voce criou comps demais em pouco tempo. Tente de novo em instantes.'}; if (e instanceof z.ZodError) return {ok:false,error: mensagem do primeiro issue}; return {ok:false,error:'Nao foi possivel criar a comp.'} }.
   Retornar so { compId } (string), nao a CompRow — evita serializar Date/campos que a UI nao usa. NAO usar redirect() dentro do wrapper: redirect lanca NEXT_REDIRECT e o catch acima engoliria.
   Comentario obrigatorio no wrapper: por que ele existe (createComp lanca; client precisa de mensagem inline) e por que a navegacao e client-side.

2. src/components/comp/NewCompForm.tsx (novo, "use client") — form controlado:
   - state: name (string), error (string|null), useTransition para isPending.
   - import { COMP_NAME_MAX_LENGTH } from '@/lib/validation-constants'. NUNCA importar '@/lib/comp-schema' aqui: ele e import 'server-only' e src/__tests__/server-only-boundary.test.ts falha (decision-013).
   - label 'Nome da comp', input placeholder 'ZvZ Terça', contador data-testid='comp-name-char-count' com texto `{name.trim().length}/{COMP_NAME_MAX_LENGTH}` (mesmo padrao de BuildHeader / build-header-char-counter.test.tsx).
   - onSubmit: e.preventDefault(); se isPending -> return (guarda de duplo submit); const trimmed = name.trim(); se trimmed === '' -> setError('Informe um nome para a comp'), inputRef.current?.focus(), NAO chamar a action; se trimmed.length > COMP_NAME_MAX_LENGTH -> setError(...limite...), focus, NAO chamar a action. Em ambos os casos manter o texto digitado intacto.
   - sucesso: startTransition(async () => { const res = await createCompAction({ name: trimmed }); if (!res.ok) { setError(res.error); inputRef.current?.focus(); return } router.push(`/comps/${res.compId}`) }).
   - botao submit: disabled={isPending}, texto 'Criando...' quando isPending senao 'Criar comp'. Link 'Cancelar' -> /comps.
   - erro: <p id='comp-name-error' role='alert'> abaixo do input; input com aria-invalid e aria-describedby apontando pro erro + pro contador.
   - Estilos: copiar as classes/tokens de CompShareStatus.tsx e builds/page.tsx (var(--color-accent), var(--color-border), var(--color-surface)). Nao introduzir hex literal — ha guard estatico contra isso.

3. src/app/comp/new/page.tsx (novo, Server Component, sem 'use client'):
   - breadcrumb/back link '< Minhas comps' -> /comps, h1 'Nova comp', <NewCompForm />.
   - <main id='main-content' tabIndex={-1} className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8 outline-none'> — mesmo shell de /comps/[id].
   - NAO chamar auth() aqui: o proxy ja guarda /comp/new e createCompAction chama requireSession(). Documentar isso em comentario, igual builds/page.tsx.

4. src/app/comps/page.tsx — adicionar <Link href='/comp/new'> 'Nova comp' no header (hoje o header tem so o h1 e um espaco vazio) e um CTA 'Criar primeira comp' no empty state. Sem esse passo nao existe caminho de UI ate a rota. Copiar exatamente as classes do botao 'Nova build' em src/app/builds/page.tsx.

5. Testes — novo arquivo src/__tests__/new-comp-page.test.tsx (jsdom, @testing-library/react, mock de next/navigation useRouter e de '@/actions/comps'):
   - AC#1: renderiza o form (label 'Nome da comp', placeholder 'ZvZ Terça', botao 'Criar comp') — e o teste de que a rota existe/exporta default.
   - AC#2: nome valido -> createCompAction chamado 1x com { name: 'ZvZ Terça' } (trimado) e router.push chamado com '/comps/<id>' retornado (NAO '/comp/<slug>' — decision-027; assertar explicitamente que push nao recebeu string comecando com '/comp/').
   - AC#3a: submit vazio -> mensagem inline via role='alert', createCompAction NAO chamado, valor do input preservado.
   - AC#3b: nome com COMP_NAME_MAX_LENGTH+1 chars -> idem (usar a constante, nao 101 hardcoded).
   - AC#3c: erro vindo da action ({ok:false,error}) vira mensagem inline e nao quebra a pagina.
   - AC#4: duplo clique com a action pendente (promise nao resolvida) -> createCompAction chamado exatamente 1x e o botao fica disabled com texto 'Criando...'.
   - contador: '0/N' inicial e atualiza ao digitar, usando COMP_NAME_MAX_LENGTH.
   - src/__tests__/comps-actions.test.ts: adicionar cobertura de createCompAction — ok com nome valido; {ok:false} para nome vazio (zod) e para RateLimitError, sem lancar.
   - src/__tests__/auth-middleware.test.ts: NAO alterar (matcher continua igual). Se alguem alterar, AC#5 nao se aplica.
   - src/__tests__/server-only-boundary.test.ts roda sozinho e cobre o risco de importar comp-schema no client — nada a adicionar.

6. make check verde. Verificacao manual (registrar nas notas): logado, /comps -> 'Nova comp' -> digitar 'ZvZ Terça' -> 'Criar comp' -> cai em /comps/<id> mostrando 'a comp nao tem nenhuma build'; voltar, submeter vazio -> erro inline com foco no campo.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review (adversarial, commit 40d57c7, branch task/97-comp-new-route): LGTM, no CRITICAL/HIGH/MEDIUM findings.

AC#1: /comp/new renders NewCompForm, no auth() call in the server page (relies on proxy guard + createCompAction's own requireSession), covered by test.
AC#2: redirect via router.push(`/comps/${compId}`) (NewCompForm.tsx:57), matches decision-027. Test explicitly asserts target does NOT start with '/comp/' (new-comp-page.test.tsx:59) -- catches regression to public 404-prone route.
AC#3: client validation blocks empty/over-limit submits without calling the action, preserves typed text; server independently re-validates via zod in createComp/createCompAction (comps.ts:222-236) -- never trusts client. comps-actions.test.ts covers the {ok:false} zod path.
AC#4: isPending early-return guard (not just disabled button) in handleSubmit; test fires a second click while the mocked action promise is unresolved and asserts exactly 1 call -- would fail if the isPending guard were removed (fireEvent.click bypasses HTML disabled in jsdom), so it's a real assertion, not cosmetic.
AC#5 N/A confirmed: git diff main -- src/proxy.ts src/__tests__/auth-middleware.test.ts is empty, genuinely untouched.

Other checks: createCompAction never calls redirect() (avoids NEXT_REDIRECT being swallowed by its own catch); returns only {compId}, no raw error/Date leak to client; generic catch returns a safe user message. No server-only/comp-schema import in the client component. Char counter uses COMP_NAME_MAX_LENGTH (100), not the wireframe's wrong '60'. Trimming consistent between client guard and server persistence. comps/page.tsx changes are additive links only, no regression to existing content. text-red-500 error class matches existing CompShareStatus.tsx pattern (not a design-token violation).

Verified: tsc --noEmit clean; targeted vitest run (new-comp-page, comps-actions, server-only-boundary) = 44/44 passing, including the AC#2/#4 assertions described above.

Verdict: LGTM.

Security audit (read-only, commit 40d57c7, branch task/97-comp-new-route): NO CRITICAL/HIGH findings.

Verified:
- Authz/tenancy: createCompAction -> createComp calls requireSession() first, then checkWriteRateLimit(session.user.id), then compNameSchema.parse(). userId is always taken from session.user.id (comps.ts:186), never accepted from the input object ({name} is the only field client can set) -> no mass assignment, no cross-tenant write possible.
- Rate limiting: preserved and correctly keyed per-user (checkWriteRateLimit(session.user.id), comps.ts:178). The try/catch in createCompAction (comps.ts:216-229) re-throws are not swallowed into a retry-friendly success -- RateLimitError is explicitly matched and returned as {ok:false}, same as before wrapping; no bypass.
- Input validation: compNameSchema (server-side, comp-schema.ts:45-49) still runs inside createComp regardless of the wrapper, so calling createCompAction directly (bypassing the NewCompForm client validation) still enforces trim + min(1) + max(COMP_NAME_MAX_LENGTH) server-side. Whitespace-only or over-limit names cannot reach the DB.
- Error disclosure: catch block in createCompAction (comps.ts:220-227) only distinguishes RateLimitError and z.ZodError with static/validation messages; every other failure (including requireSession()'s thrown Error('Unauthorized') and any DB error) falls into the same generic 'Não foi possível criar a comp.' -- no existence oracle, no raw stack/DB text leaked, consistent with decision-015/016.
- Slug generation: generateSlug (src/lib/slug.ts) always appends a random nanoid(8) suffix after the slugified name, so name='new' produces 'new-<8 random chars>', never a bare 'new' slug. Confirmed src/proxy.ts explicitly special-cases pathname === '/comp/new' before the PUBLIC_READ_PATHS regex (proxy.ts:52), so no ambiguity/shadowing is possible even in principle.
- Proxy: /comp/new remains on the authenticated branch (proxy.ts matcher includes '/comp/new' explicitly, separate from the public /comp/:slug regex); change does not widen PUBLIC_READ_PATHS.
- XSS: comp.name rendered via plain JSX interpolation ({comp.name}, src/app/comps/page.tsx:55) -- React auto-escapes, no dangerouslySetInnerHTML anywhere in the diff.

Verdict: LGTM from a security standpoint, no blockers.

UI/UX review (ACM-097) — mode: code-level static review (route is auth-gated via proxy.ts; standing up a real browser session was not worth the cycles, used JSX/Tailwind reading + existing new-comp-page.test.tsx coverage of idle/submitting/error/success states instead).

Wireframe hierarchy: MATCHES. Back link '< Minhas comps' -> /comps, h1 'Nova comp', labelled input placeholder 'ZvZ Terça', counter, primary 'Criar comp' + secondary 'Cancelar' link all present (page.tsx:16-23, NewCompForm.tsx:64-107). Note: wireframe's '0/60' is stale per task instructions, correctly implemented as COMP_NAME_MAX_LENGTH (100) — not a bug.

Accessibility: label properly associated (htmlFor/id, NewCompForm.tsx:67-71), not placeholder-as-label. Error has role='alert' (line 83) and input has aria-invalid + aria-describedby pointing to both error and counter ids (77-78). Focus moves to field on both client and server-returned errors (40, 45, 54). Real <form onSubmit> — Enter works, no keyboard trap. Double-submit guarded by isPending early-return + disabled button (35, 98), matches AC#4.

Visual consistency: 'Nova comp'/'Criar primeira comp' buttons use byte-identical classes to 'Nova build' in builds/page.tsx. No raw hex literals; consistently uses var(--color-accent/border/accent-foreground/accent-hover) tokens.

Findings:
- MEDIUM: NewCompForm.tsx:89-91 — char counter has no aria-live/role=status, and no visual distinction (color/weight) when over limit. Screen-reader users get zero feedback approaching/exceeding the limit; sighted users only learn on submit via the separate alert, not by watching the counter. Wireframe/spec implies live counter feedback; this is a gap.
- LOW: NewCompForm.tsx:44 — over-limit error message doesn't state current length, just the max (e.g. add '(você digitou X)').
- LOW: NewCompForm.tsx:70-80 — input has no maxLength attribute; user can type arbitrarily past the limit before seeing the error. Native maxLength would give tighter feedback.
- LOW: NewCompForm.tsx:83 — error text uses Tailwind palette class text-red-500 instead of a --color-* token like the rest of the component; check if an existing --color-error/danger token should be used instead for consistency with the design-token convention used everywhere else in this file.

No CRITICAL/HIGH issues found.
<!-- SECTION:NOTES:END -->
