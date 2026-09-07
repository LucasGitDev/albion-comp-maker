---
name: process-research
description: Como pesquisar tecnologia, biblioteca ou referência de produto com rigor e parar na hora certa, entregando opções com trade-off em vez de um despejo de links. Use antes de escolher dependência, integrar API de terceiro ou levantar referência de concorrente.
---

# Pesquisa com critério de parada

Pesquisa de agent falha de dois jeitos: para cedo demais (pega o primeiro blog post) ou nunca para (lê 30 páginas e não decide).

## Protocolo

1. **Escreva a pergunta de decisão** antes de pesquisar. "Qual lib de X?" é ruim. "Preciso de X com suporte a Y e sem lock-in em Z — o que atende?" é acionável.
2. **Fonte primária primeiro**: docs oficiais, changelog, repositório (issues abertas, último commit, tamanho da comunidade). Blog post é sinal fraco.
3. **Mínimo 2 alternativas reais.** Uma opção só não é pesquisa, é justificativa.
4. **Pare quando** a terceira fonte não muda mais a conclusão, ou quando o custo de errar é menor que o custo de continuar pesquisando.

## Checagem obrigatória de dependência

- Último release e último commit (abandonada?)
- Issues abertas relevantes ao seu caso de uso
- Licença compatível com produto comercial
- Tamanho do bundle, se for front
- Existe alternativa na stdlib / no framework que já usamos?

## Formato de saída

```md
**Pergunta:** ...
**Opções:**
| Opção | A favor | Contra | Custo de reverter |
**Recomendação:** X, porque ...
**Custo de estar errado:** ...
**Fontes:** links
```

Nunca entregue lista de links sem conclusão. Se você não conseguiu concluir, diga isso e diga o que falta pra concluir.
