# BOOTSTRAP — Adaptar o harness a este projeto

Este prompt é executado pelo comando `/adapt-harness` dentro do projeto novo, logo após o `install.sh`.

Execute cada passo NA ORDEM. Não pule, não paralelize, não implemente código ainda.

---

## Passo 1 — Extrair o escopo real (skill: grill-me)

O usuário vai colar uma descrição de 2-3 linhas da ideia. Você vai rodar a skill `grill-me` completa — ondas de perguntas, resumos intermediários, cobertura total — até ter verificado:

- Problema concreto (quem perde o quê se não existir o produto)
- ICP (perfil exato do decisor de compra)
- Proposta de valor (uma frase, diferencial real)
- Escopo do MVP (o que faz / o que explicitamente não faz)
- Modelo de monetização (preço estimado, one-time ou assinatura, por quê)
- Stack (restrições técnicas, time de um ou mais)
- Não-escopo v1 (lista explícita)
- Requisitos não-funcionais relevantes (latência, compliance, multi-tenant, etc.)

**Saída obrigatória do Passo 1:**
```
## Escopo verificado — [Nome do produto]
Problema: ...
ICP: ...
Proposta de valor: ...
MVP: ...
Fora do MVP: ...
Monetização: ...
Stack: ...
Não-funcionais: ...
Suposições ainda não verificadas: ...
```

Salve este bloco — ele alimenta todos os passos seguintes.

---

## Passo 2 — Escrever/atualizar CLAUDE.md

Crie ou sobrescreva `CLAUDE.md` na raiz do projeto usando `templates/CLAUDE.md.tpl` como base.

Substitua TODOS os `[[placeholders]]` com dados reais do Passo 1:
- Nome do produto, descrição de uma frase
- Fora de escopo v1
- Stack confirmada (ORM, banco, deploy)
- Scopes de commit específicos do domínio (ex: `contracts, tenants, billing, api, web`)
- Agents disponíveis (liste só os que ficaram após a poda do Passo 4)

---

## Passo 3 — Reescrever os agents com linguagem do domínio

Para cada arquivo em `.claude/agents/`:

1. Leia o agent atual.
2. Substitua linguagem genérica por linguagem específica do produto:
   - Nomes de entidades (ex: "contrato", "assinante", "workspace", "campanha")
   - Jargão do domínio
   - Regras de negócio específicas (ex: "tenant isolation obrigatório", "webhook Stripe é crítico")
   - Exemplos no frontmatter reescritos para cenários reais do produto
3. Não altere a estrutura ou o método — só a linguagem.

---

## Passo 4 — Podar agents e skills irrelevantes

Avalie cada agent e skill em `.claude/agents/` e `.claude/skills/`:

Para cada um, decida: **mantém** ou **remove**.

Critérios de remoção:
- Agent/skill cobre domínio que não existe neste produto (ex: `saas-billing` em produto sem pagamento)
- Skill de stack diferente da confirmada (ex: `stack-nestjs` se o produto for só frontend)

Para cada remoção, registre:
```
Removido: [arquivo]
Motivo: [razão específica baseada no escopo]
```

Faça a remoção com `rm`.

---

## Passo 5 — Gerar backlog.md completo

Crie `backlog.md` com:

**Seção "Contexto do produto"** — cole o bloco do Passo 1 inteiro.

**Milestones** — fases de entrega, cada uma um incremento usável pelo ICP.

**Épicos e tasks** — seguindo o formato do `templates/backlog.template.md`:

Regras obrigatórias:
- Task 001 = scaffold + `make check` verde no vazio (sempre)
- Task de data/contrato antes de task de tela
- Cada task: AC verificável por comando ou passo manual escrito
- Campo `touches` com globs reais
- Campo `skills` com skills relevantes
- `depends` correto (dependência técnica, não empolgação)
- Épicos de landing/onboarding carregam `skills: revenue-centric-design, marc-lou-review`

---

## Passo 6 — Review de produto (skills: revenue-centric-design + marc-lou-review)

Antes de escrever qualquer código, passe o escopo do MVP pelos dois filtros:

**6a. revenue-centric-design:** para cada tela do MVP, nomeie:
- O mecanismo de conversão/retenção relevante
- A decisão de layout/copy que ele implica

**6b. marc-lou-review:** rode o checklist completo contra o escopo. Itens FAIL viram tasks no backlog ou ajustes no escopo antes de começar.

Escreva a saída em `docs/product-review.md` (crie com `backlog doc create "Product Review — [produto]" -t specification`):

```markdown
# Product Review — [produto]

## revenue-centric-design
[mecanismos por tela/fluxo]

## marc-lou-review
[checklist com PASS/FAIL e ações corretivas para FAILs]

## Ajustes no escopo pré-código
[o que muda no backlog.md com base nos FAILs]
```

---

## Passo 7 — Finalizar

```bash
python3 -c "
import json
p = '.claude/harness.json'
d = json.load(open(p))
d['adapted'] = True
json.dump(d, open(p,'w'), indent=2)
print('harness.json → adapted: true')
"
```

Imprima:

```
Harness adaptado para [produto].

Próximos passos:
  /next        → começa a primeira task do backlog (scaffold)
  /work TASK-001 → implementa diretamente
```

## Passo final — armar o loop
