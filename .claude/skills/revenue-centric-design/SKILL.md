---
name: revenue-centric-design
description: >
  Design de produto focado em conversão, retenção e receita — landing pages, checkout,
  onboarding, churn, pricing, behavioral science. Usa mecanismos nomeados (decoy effect,
  Zeigarnik, loss aversion, GBB, Eugene Schwartz awareness levels). Aplique em decisões
  de layout, fluxo, copy e pricing antes de implementar qualquer tela voltada ao usuário.
  Examples:
  <example>user: "desenha o pricing" assistant: "revenue-centric-design define ancoragem, tiers e copy antes do wireframe." <commentary>Decisão de negócio antes de pixel.</commentary></example>
---

Design serve ao usuário E ao negócio. Interface neutra não existe — passividade reduz conversão.

**Restrição absoluta:** esta skill nunca se aplica a jogos de azar, apostas ou mecânicas de dinheiro real.

## Os 9 princípios spine

1. **Neutralidade é omissão** — interface que não direciona perde receita por padrão
2. **Quem fala com todos não convence ninguém** — ICP claro bate mensagem ampla
3. **Valor antes de compromisso** — demonstre antes de pedir
4. **Promessa = tamanho da prova** — afirmação sem evidência é ruído
5. **Diferente compete em categoria, igual compete em preço** — diferenciação real evita race to bottom
6. **Default é decisão tomada pelo produto** — estado inicial determina adoção em massa
7. **Retenção é construída, não solicitada** — perda percebida retém mais que ganho prometido
8. **Expansão nasce do uso** — upgrade prompt funciona quando usuário bate no limite
9. **Preço é filtro** — ponto de preço define quem entra, fica e cresce

## Como aplicar

Para cada decisão de design/copy/pricing:

1. Identifique o domínio (tabela abaixo)
2. Nomeie o mecanismo relevante
3. Fundamente a decisão no mecanismo, não em "parece certo"

## Módulos de referência

### Conversão e Landing Page

**Hierarquia de consciência (Eugene Schwartz):**
- Não consciente do problema → educa primeiro
- Consciente do problema, não da solução → mostre que existe solução
- Consciente da solução, não do produto → compare diretamente
- Consciente do produto → preço e prova social
- Mais consciente → oferta e urgência

**Hero:** headline que passa no teste de "faz sentido sozinha?". Subheadline explica o mecanismo. CTA diz o que acontece após o clique.

**Acima do fold:** problema → solução → prova → CTA. Não inverta.

**Social proof:** números específicos batem depoimentos genéricos. "4.800 equipes" > "amado por times". Outcome concreto > satisfação vaga.

### Checkout e Formulários

**Princípio de momentum:** não interrompa o usuário no pico de intenção. Peça menos campos. Dados complementares depois.

**Abandono:** campo de cartão de crédito no fim, não no começo (peça e-mail primeiro — captura o lead). Progress indicator reduz abandono em formulários longos.

**Trust signals:** selos de segurança, política de reembolso, garantia — ao lado do botão de compra, não no rodapé.

### Onboarding e Ativação

**Time-to-value:** mapeie o menor caminho até o "aha moment". Cada passo que não leva ao aha é candidato a corte.

**Ativação ≠ cadastro:** usuário ativado = usuário que experimentou o valor central. Meça isso, não o cadastro.

**Zeigarnik effect:** progresso parcial motiva conclusão. Progress bar de onboarding funciona por isso.

**Empty state como onboarding:** primeiro estado vazio é o melhor lugar para ensinar. "Crie seu primeiro contrato" > "Nenhum contrato encontrado".

### Churn e Retenção

**Loss aversion:** usuário retém quando percebe o que perde ao sair, não o que ganha ficando. "Você vai perder acesso a X projetos" > "Continue tendo acesso a X projetos".

**Peak-end rule:** usuário lembra do pico + do último momento. Termine toda interação bem. Cancellation flow é oportunidade de reversão, não de punição.

**Expectation management:** churn por decepção > churn por preço. Alinhe expectativas antes da compra.

### Pricing e Monetização

**GBB (Good-Better-Best):** três tiers máximo. Tier do meio é o âncora — precifique o Best para fazer o Better parecer razoável.

**Decoy effect:** tier projetado para ser rejeitado, mas que faz o tier preferido parecer melhor valor.

**Ancoragem:** primeiro número que o usuário vê ancora a percepção de preço. Mostre o valor anual primeiro, depois o mensal.

**Preço anual:** desconto explícito ("economize R$ 240/ano") > porcentagem ("20% off").

**One-time vs. assinatura:** one-time converte melhor frio; assinatura requer mais prova de valor contínuo. Se o produto melhora com o tempo — assinatura; se é uma ferramenta discreta — considere one-time.

### Behavioral Science Toolkit

| Mecanismo | Aplicação |
|-----------|-----------|
| Loss aversion | upgrade prompts, cancellation flows |
| Zeigarnik | onboarding progress, checklists |
| Social proof | hero section, pricing page |
| Decoy effect | pricing tiers |
| Scarcity | urgência real (não fake) |
| Reciprocity | free value antes do pitch |
| Peak-end rule | offboarding, cancelamento |
| Defaults | opt-in vs opt-out, plano sugerido |

### Produto e Features

**Swiss Knife Index:** se você precisa de mais de 7 palavras para descrever o que o produto faz, está largo demais.

**Feature adoption:** feature que < 10% dos usuários usa em 30 dias é candidata a corte ou reposicionamento, não a melhoria de UI.

**Attention design:** cada elemento que não direciona ao objetivo primário compete contra ele.
