---
id: ACM-097
title: 'Rota /comp/new nao existe: criar comp e um 404 guardado pelo proxy'
status: In Progress
assignee: []
created_date: '2026-09-09 02:41'
updated_date: '2026-09-09 02:46'
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
