---
name: stack-nestjs
description: Convenções de backend NestJS para SaaS — estrutura de módulo, DTO e validação, tratamento de erro, injeção, config e limites de camada. Use ao escrever ou revisar qualquer código de API em NestJS.
---

# NestJS — convenções

## Estrutura por feature, não por tipo

```
src/
  billing/
    billing.module.ts
    billing.controller.ts      # HTTP apenas: valida, delega, responde
    billing.service.ts         # regra de negócio, sem saber que existe HTTP
    billing.repository.ts      # acesso a dado, sem regra de negócio
    dto/{create-subscription.dto.ts, ...}
    billing.service.spec.ts
  common/    # guards, interceptors, filters, decorators compartilhados
  config/    # schema de env validado no boot
```

Nunca `src/services/`, `src/controllers/`. Pasta por domínio.

## Regras de camada

- **Controller** não tem `if` de negócio. Recebe DTO, chama service, devolve.
- **Service** não importa nada de `@nestjs/common` relativo a HTTP (exceto exceptions), não conhece `Request`.
- **Repository** não decide nada. Query e mapeamento.
- Service não chama outro controller. Dependência circular entre módulos = modelagem errada.

## DTO e validação

Toda entrada externa passa por DTO com `class-validator` + `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true, transform: true`. Sem whitelist, mass assignment entra de graça.

```ts
export class CreateInvoiceDto {
  @IsUUID() customerId: string;
  @IsInt() @Min(1) amountCents: number;
  @IsOptional() @IsISO8601() dueAt?: string;
}
```

Nunca `@Body() body: any`. Nunca espalhe o body direto num update.

## Erros

Lance exceções de domínio no service; um `ExceptionFilter` global traduz para HTTP. Resposta de erro tem shape único: `{ code, message, details? }`. Nunca vaze stack ou mensagem de ORM para o cliente.

## Config

Env validada no boot com schema. App que sobe com env faltando e quebra em produção às 3h é bug de config, não de infra.

## Async

- Nada de `async` sem `await` no fluxo de erro (promise rejeitada silenciosa).
- Trabalho lento (email, PDF, webhook de saída) sai do request: fila. Request HTTP não espera terceiro.
- Toda chamada externa tem timeout explícito. Sem timeout, um terceiro lento derruba sua API.

## Multi-tenant

`tenantId` vem **sempre** da sessão via guard/decorator, nunca do body ou param. Ver skill `saas-multi-tenancy`.
