---
description: Transforma uma ideia de produto em PRD + milestones + tasks no backlog
argument-hint: "<ideia do produto em 1-2 frases>"
---

Use o agent `product-spec` para transformar em backlog executável:

**$ARGUMENTS**

Antes de criar qualquer coisa, rode `backlog instructions overview` e leia o `CLAUDE.md` do projeto.

Entregue, nesta ordem:
1. PRD de uma página (`backlog doc create ... -t specification`) — com a seção "Fora de escopo v1" obrigatória
2. Milestones (fatias entregáveis, cada uma usável)
3. Tasks com AC verificável, `depends`, `touches`, `skills`

Ao terminar, **pare e mostre o resumo** (milestones + títulos das tasks) para eu aprovar antes de qualquer implementação.
