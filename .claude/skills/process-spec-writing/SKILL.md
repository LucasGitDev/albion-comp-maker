---
name: process-spec-writing
description: Como escrever o PRD de um SaaS em uma página e quebrá-lo em milestones e tasks executáveis. Use ao iniciar um produto novo, adicionar um épico, ou quando o escopo está vago demais para virar backlog.
---

# PRD de uma página

Documento longo não é lido — nem por humano, nem por agent com contexto limitado. Uma página, seis seções.

```md
# PRD — <produto>

**Problema.** Quem sofre o quê, hoje, e como resolve na marra. Uma frase de dor real, não de mercado.
**Usuário.** Quem paga e quem usa (podem ser pessoas diferentes — isso muda a UI).
**Escopo v1.** Lista curta do que o produto faz. Se passa de 7 itens, v1 está grande.
**Fora de escopo v1.** Lista explícita. Seção obrigatória.
**Sucesso.** Uma métrica observável. "Usuário cria a primeira X em menos de 5 min."
**Riscos.** O que pode matar o produto: técnico, legal, de demanda.
```

## Fora de escopo é a seção mais importante

Sem ela, todo agent e todo você-do-futuro expandem o escopo por conta própria. Escreva o que **não** entra e por quê ("multi-idioma: só após 100 usuários pagantes").

## Do PRD para o backlog

1. **Milestones** = fatias entregáveis, cada uma usável por alguém. Nunca "backend" e "frontend" como fases — isso é fatia horizontal e não entrega nada até o fim.
2. **Tasks** = um PR reviewável cada. Se você não consegue escrever o AC verificável, a task ainda está grande.
3. **Ordem** = dependência técnica: contrato de dados → API → tela. Não empolgação.
4. A **task 1** de todo projeto é sempre scaffold + `make check` verde no vazio.

## Critério de aceite verificável

Ruim: "a listagem deve funcionar bem".
Bom:
- [ ] lista pagina de 50 em 50 e mantém o filtro ao paginar
- [ ] lista vazia mostra CTA "Criar primeiro contrato"
- [ ] erro de rede mostra retry sem perder o filtro

Se um AC não pode ser conferido por comando ou por passo manual escrito, ele não é AC — é desejo.

## Heurística de tamanho

Se a task não cabe em ~1 dia de agent e ~400 linhas de diff, quebre. Task grande produz PR irrevisável, e PR irrevisável vira dívida silenciosa.
