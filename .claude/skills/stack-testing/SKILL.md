---
name: stack-testing
description: Estratégia de testes para SaaS TypeScript — o que testar, em que nível, Vitest e Playwright, fixtures e testes de isolamento entre tenants. Use ao escrever testes, ao decidir cobertura de uma task, ou ao revisar se um teste tem valor.
---

# Testes

## Pirâmide prática

| Nível | Cobre | Custo |
|---|---|---|
| Unidade | regra de negócio pura no service, cálculo, transformação | barato — use bastante |
| Integração | controller + banco real (testcontainer/sqlite), authz, migrations | médio — use nos caminhos de dado |
| E2e (Playwright) | só fluxos que dão dinheiro ou perdem dado: signup, checkout, criar/apagar | caro e frágil — 5 a 10 no projeto todo |

E2e de tudo é a forma mais rápida de ter uma suíte que ninguém confia.

## O teste precisa poder falhar

Escreva o teste que **falha com o bug presente**. Se você não viu ele vermelho, não sabe se ele testa algo.

Teste que espelha a implementação (mocka tudo e verifica que o mock foi chamado) não protege de nada: refatorar quebra ele, e o bug real passa. Teste **comportamento observável**.

## Obrigatórios em SaaS

- **Isolamento**: tenant A não lê, não edita e não apaga dado do tenant B. Um teste por recurso com dono.
- **Authz**: usuário sem papel recebe 403, não 200 com lista vazia.
- **Idempotência** de webhook: mesmo evento 2x → 1 efeito.
- **Regressão**: todo bug corrigido ganha um teste antes da correção.

## Higiene

- Sem `sleep`/`waitForTimeout` — espere condição (`toBeVisible`, `waitForResponse`).
- Cada teste cria seu próprio dado; nada de ordem entre testes nem banco compartilhado sujo.
- Fixture/factory com defaults e override: `makeInvoice({ status: 'paid' })`.
- Teste flaky é quebrado. Conserte ou apague — nunca marque `skip` e siga.
- Sem asserção em texto de UI que muda toda semana; use role e label acessível.

## Cobertura

Não persiga porcentagem. Persiga: caminho feliz + os 2 erros prováveis + o caso limite de cada regra de negócio.
