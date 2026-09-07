---
name: stack-data-layer
description: Camada de dados — modelagem, migrations reversíveis, índices, transações, soft delete, paginação e armadilhas de ORM (N+1). Use ao criar ou alterar schema, escrever query, ou revisar performance de acesso a dado.
---

# Camada de dados

## Migrations

- Toda mudança de schema é migration versionada e commitada **junto** do código que a exige.
- Reversível ou com plano de rollback escrito. Migration destrutiva (drop column) roda em duas etapas: para de escrever → deploy → dropa depois.
- Nunca edite migration já aplicada em produção. Crie a próxima.
- Migration que roda em tabela grande precisa ser online (índice concorrente, backfill em lote).

## Modelagem para SaaS

- Toda tabela de dado de cliente tem `tenant_id NOT NULL`, com índice composto `(tenant_id, <coluna de busca>)`. Índice só na coluna de busca não serve.
- `created_at`/`updated_at` em tudo. Você vai precisar.
- Soft delete (`deleted_at`) onde o usuário pode apagar por engano — mas então **toda** query filtra `deleted_at IS NULL`. Meio-soft-delete é pior que nenhum.
- Unicidade quase sempre é por tenant: `UNIQUE(tenant_id, slug)`, não `UNIQUE(slug)`.
- Dinheiro: inteiro de centavos. Enum de domínio: coluna string + validação na aplicação (enum de banco é caro de migrar).

## Query

- **N+1 é o bug de performance padrão de ORM.** Carregou lista e acessou relação dentro do loop? É N+1. Use include/join/dataloader.
- `SELECT` só do que usa quando a linha é gorda.
- Paginação por cursor em lista que cresce; offset só em lista pequena e estável.
- Toda listagem tem limite máximo (ex.: 100). Sem teto, um cliente derruba o banco.

## Transação

Operação que escreve em mais de uma tabela e precisa ser atômica → transação explícita. Nunca chame serviço externo (Stripe, email) **dentro** de transação: se o externo demora, você segura o lock.

## Antes de fechar a task

- [ ] índice existe para toda query que a task introduziu
- [ ] nenhuma query nova sem `tenant_id`
- [ ] migration roda limpa do zero (`db:reset && db:migrate`)
