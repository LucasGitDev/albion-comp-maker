---
name: stack-nextjs
description: Convenções de frontend Next.js App Router — server vs client components, data fetching, server actions, estados de UI, formulários e performance. Use ao escrever ou revisar qualquer código de tela em Next.js.
---

# Next.js (App Router) — convenções

## Server por padrão

Componente é server component até provar o contrário. `"use client"` só quando precisa de: estado, efeito, evento do DOM, ou API de browser. Empurre o `"use client"` para a **folha** da árvore — um provider client no topo transforma o app inteiro em client bundle.

## Data fetching

- Leitura → server component busca direto (sem `useEffect` + `fetch` para dado inicial).
- Mutação → server action ou rota de API, seguida de `revalidatePath`/`revalidateTag`.
- Cache: declare a intenção explicitamente. Dado de usuário nunca em cache compartilhado.

## Server action é endpoint público

Toda server action precisa, na primeira linha: autenticar, autorizar, validar input com schema (Zod). Não é função interna — qualquer um pode chamá-la com qualquer payload.

```ts
"use server";
export async function updateInvoice(input: unknown) {
  const session = await requireSession();
  const data = UpdateInvoiceSchema.parse(input);
  await assertOwnership(session.tenantId, data.id);
  ...
}
```

## Estrutura

```
src/app/(app)/invoices/{page.tsx, loading.tsx, error.tsx, _components/}
src/components/ui/          # design system, sem regra de negócio
src/lib/                    # client de api, auth, utils
```

Todo segmento de rota tem `loading.tsx` e `error.tsx`. Sem eles, o usuário vê tela branca no erro.

## Os 4 estados

Toda tela que carrega dado implementa: **loading** (skeleton, não spinner de página inteira), **vazio** (com CTA e explicação), **erro** (com ação de recuperação), **conteúdo**. Componente sem estado vazio é componente incompleto.

## Formulário

Estado no servidor via action + `useFormStatus` para pending. Validação no cliente é UX; a validação que vale é a do servidor, com o mesmo schema. Erro do servidor volta mapeado por campo, não como toast genérico.

## Performance

- `next/image` sempre, com `sizes`. Imagem crua é o maior peso do LCP.
- Lista longa: pagine ou virtualize. Nada de 500 linhas no DOM.
- Sem barrel file gigante importado em client component — arrasta a árvore inteira pro bundle.
