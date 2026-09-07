---
name: saas-auth
description: Autenticação e autorização de SaaS — sessão, papéis, convites de time, troca de workspace e as armadilhas comuns de authz. Use ao implementar login, permissões, convites, ou ao revisar qualquer rota protegida.
---

# Auth de SaaS

## Modelo mínimo

```
User (identidade global)
Tenant / Organization (a conta que paga)
Membership (user × tenant × role)   ← a permissão vive aqui, não no user
```

Um usuário pertence a mais de um tenant. Papel é **por tenant**. `user.role` global é o erro de modelagem que você vai pagar caro depois.

Papéis iniciais: `owner`, `admin`, `member`. Três bastam até alguém pagar por mais.

## Sessão

- Cookie `httpOnly`, `secure`, `sameSite=lax`. Token em `localStorage` é XSS servido de bandeja.
- Sessão carrega `userId` **e** `tenantId` ativo. Trocar de workspace reemite a sessão.
- Logout invalida no servidor, não só apaga o cookie.
- Rotação de sessão no login e na troca de senha.

## Autorização

Checagem em **toda** entrada: rota de API, server action, job, endpoint de export. A UI esconder o botão não é autorização — é decoração.

Duas perguntas, sempre nesta ordem:
1. Este usuário pertence a este tenant? (isolamento)
2. O papel dele permite esta ação? (permissão)

Recurso de outro tenant → **404**, não 403. 403 confirma que o recurso existe.

## Convite de time

Token de uso único, com expiração (7 dias), vinculado ao email convidado. Aceitar cria `Membership`, nunca cria acesso a outro tenant. Convidado que já tem conta só ganha a membership. Reenvio invalida o token anterior.

## Armadilhas frequentes

- Server action Next.js sem checagem — é endpoint público.
- Endpoint de "meus dados" que aceita `?userId=` — clássico IDOR.
- Rota de admin protegida só pelo menu não renderizar.
- Reset de senha que revela se o email existe (resposta deve ser idêntica nos dois casos).
- Sessão que não expira e não é revogável ao remover membro do time.

Senha: bcrypt/argon2, mínimo de 8 caracteres, sem regra de complexidade teatral. Prefira OAuth/magic link se o público permite — menos superfície.
