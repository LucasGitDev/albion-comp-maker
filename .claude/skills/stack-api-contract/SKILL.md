---
name: stack-api-contract
description: Contrato de API primeiro — OpenAPI, tipos compartilhados entre backend e frontend, versionamento e evolução sem quebrar clientes. Use ao criar ou alterar qualquer endpoint, ou quando back e front precisam concordar sobre um formato.
---

# Contrato primeiro

A classe de bug mais comum em full-stack com agents é **back e front discordarem do formato**. Contrato explícito elimina ela.

## Fluxo

1. O contrato é definido **antes** da implementação (na task ou no plano do architect).
2. Backend expõe OpenAPI (`@nestjs/swagger` com DTOs decorados — o DTO já é a fonte).
3. Tipos do cliente são **gerados**, nunca escritos à mão: `openapi-typescript` (ou similar) num script `npm run gen:api`.
4. Front importa os tipos gerados. Interface duplicada à mão no front é finding de review.

## Regras de shape

- Resposta de coleção sempre envelopada: `{ data: T[], page, pageSize, total }`. Array cru não tem onde crescer.
- Erro sempre `{ code, message, details? }`. `code` é string estável (`INVOICE_ALREADY_PAID`), o front decide por `code`, nunca por `message`.
- Datas em ISO-8601 UTC, string. Nunca timestamp numérico, nunca data local.
- Dinheiro em inteiro de centavos + `currency`. Float em dinheiro é bug garantido.
- IDs opacos (uuid/cuid) como string. Não exponha auto-increment.
- Campo ausente ≠ `null`. Escolha um e mantenha.

## Evolução sem quebrar

Aditivo é seguro: campo novo opcional, endpoint novo.
Quebra: remover campo, renomear, mudar tipo, apertar validação, mudar significado.

Para quebrar: adicione o novo ao lado, migre o consumidor, remova depois. Se o cliente é externo, versione (`/v2`) e anuncie deprecação com prazo.

Toda mudança de contrato é anotada na task. Task que muda contrato **sempre serializa** com outras que consomem ele.
