---
name: saas-multi-tenancy
description: Isolamento de dados entre clientes num SaaS — escolha do modelo de tenancy, propagação do tenant, blindagem de queries e testes de vazamento. Use ao modelar dados, escrever qualquer query de dado de cliente, ou auditar segurança.
---

# Multi-tenancy

**O bug mais caro do seu SaaS é o tenant A ler dado do tenant B.** Ele não dá erro, não aparece em teste de caminho feliz, e é notícia quando aparece.

## Modelos

| Modelo | Quando | Custo |
|---|---|---|
| `tenant_id` por linha (shared schema) | padrão para 95% dos SaaS | disciplina em toda query |
| Schema por tenant | exigência de compliance, poucos clientes grandes | migrations × N, operação complexa |
| Banco por tenant | enterprise, isolamento contratual | caro, só com receita que justifique |

Comece com `tenant_id`. Migrar depois é possível; começar complexo mata o produto antes.

## Propagação — a regra de ouro

`tenantId` vem **sempre da sessão autenticada**. Nunca do body, do param, da query, do header. Se veio do cliente, é do atacante.

```ts
// NestJS
const tenantId = req.user.tenantId;                    // ✅
const tenantId = req.body.tenantId;                    // ❌ vazamento
// Next.js server action
const { tenantId } = await requireSession();           // ✅
```

## Blindagem: não confie na disciplina

Disciplina falha em código gerado por agent. Force no nível estrutural — escolha ao menos uma:

- **Repository que exige tenant** — a única forma de consultar é `repo.forTenant(tenantId).findMany(...)`. Nenhum service acessa o ORM direto.
- **Extensão/middleware do ORM** que injeta `where.tenantId` em toda query de tabela marcada.
- **RLS no Postgres** (`SET LOCAL app.tenant_id` por transação + policy). O mais forte; exige rigor no pool de conexão.

Acesso por ID nunca é `findById(id)` — é `findById(id, tenantId)`, ou um `assertOwnership`. `findById(params.id)` puro é IDOR.

## Fronteiras que também precisam de tenant

Cache (chave inclui tenant), fila/job (payload carrega tenant e o worker o respeita), busca, upload de arquivo (prefixo por tenant), export/relatório, e webhook de saída.

## Testes obrigatórios

Para cada recurso com dono:
- tenant B recebe 404 ao ler recurso de A (404, não 403 — 403 confirma existência)
- tenant B não consegue editar nem apagar recurso de A
- listagem de B nunca contém item de A

Sem esses três testes, a task não fecha.
