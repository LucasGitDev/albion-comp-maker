---
id: decision-029
title: >-
  Bucket untrusted: paridade de orcamento com per-IP, tabela de politica unica e
  sinal de hops incorreto (sucessora da decision-016 secoes 3 e 4)
date: '2026-09-09 03:26'
status: accepted
---

## Contexto

A decision-016 (ACM-063) definiu a chave de rate limit a partir de
`X-Forwarded-For` com `RATE_LIMIT_TRUSTED_HOPS`, e um fallback compartilhado
`__untrusted__` com orcamento **maior** que o per-IP (600 vs 120). A ACM-072
repetiu o mesmo padrao em `/api/items` (150 vs 30) e `/api/icon` (3000 vs 600),
transformando o que era excecao em padrao. A auditoria da ACM-072 levantou dois
problemas (ACM-084):

1. **Incentivo perverso.** O bucket e escolhido pela AUSENCIA de um header que o
   proprio cliente controla. Omitir XFF concede hoje 5x mais cota do que ser
   identificavel. O controle recompensa o comportamento que ele deveria punir.
2. **Falha silenciosa de configuracao.** Se `RATE_LIMIT_TRUSTED_HOPS` nao bater
   com a topologia real, `parts.length < hops` para TODO request e o limiter
   degrada para um unico balde global. Continua respondendo 200 e parece
   saudavel. Nao ha nenhum sinal.

Superficies com throttle hoje: `/build/:slug` e `/comp/:slug` (proxy),
`/api/items`, `/api/icon` e `/api/background/[id]` (que reusa a politica de
leitura publica). Cinco pontos de chamada, dois modulos, politicas divergentes
escritas a mao.

## Opcoes consideradas

### 1. Qual deve ser o orcamento do bucket untrusted

**A. Manter maior que o per-IP.** Status quo. Rejeitado: e exatamente o achado.

**B. Muito menor que o per-IP (ex.: 10-25%), "fail-closed agressivo".**
Intuitivamente mais seguro, mas nao compra seguranca nenhuma alem da opcao C — e
paga caro em disponibilidade. Ver o argumento abaixo.

**C. Paridade exata: `untrustedMax === perIpMax`. ESCOLHIDA.**

Racional: o unico ganho que um atacante obtem ao omitir XFF e *cota*. Com
paridade, omitir XFF concede exatamente o mesmo teto que um unico IP
identificavel — e ainda pior para ele, porque o balde e compartilhado com
qualquer outro trafego nao identificavel, entao ele pode receber menos que a
cota cheia. **A paridade ja zera o incentivo.** Qualquer valor abaixo da
paridade nao reduz mais nada do ganho do atacante (ja e zero), e apenas:
- reduz a margem do trafego legitimo sem XFF (health checks/uptime probes,
  crawlers, chamadas server-to-server, curl interno);
- **barateia o DoS do balde compartilhado** — quanto menor o teto, menos
  requests o atacante precisa para negar servico ao trafego anonimo;
- aumenta o raio de dano de um `hops` errado, que e o modo de falha mais
  provavel na pratica.

Ou seja, paridade e o ponto otimo simultaneamente em seguranca e em
disponibilidade. Nao e um meio-termo: e o maximo dos dois.

Valores resultantes (janela de 60s mantida):

| superficie | perIpMax | untrustedMax (antes -> depois) |
|---|---|---|
| publicRead (`/build/:slug`, `/comp/:slug`, `/api/background/[id]`) | 120 | 600 -> 120 |
| items (`/api/items`) | 30 | 150 -> 30 |
| icon (`/api/icon`) | 600 | 3000 -> 600 |

A invariante `untrustedMax <= perIpMax` passa a ser verificada em codigo (ver
secao 3), nao apenas em prosa.

### 2. Chave de particao melhor que "tudo junto"

Um balde global unico e, por definicao, alvo de DoS para todo o trafego anonimo
nao identificavel. Vale a pena particiona-lo?

**A. Particionar por socket/peer address.** Verificado no runtime real: **nao
existe**. `NextRequest.ip` foi removido do Next.js (era especifico da Vercel) e
nao voltou no 16.3.4; `src/proxy.ts` e os route handlers do App Router recebem
um `Request` da Web API, sem acesso ao socket Node subjacente. Nao ha
`req.socket.remoteAddress` acessivel a partir desses pontos. Descartada por
inexistencia, nao por preferencia.

**B. Particionar por `User-Agent` (ou UA + Accept-Language, "fingerprint").**
Rejeitada, e ativamente perigosa. O UA e 100% controlado pelo cliente — o mesmo
defeito que motivou esta task. Particionar por dado do atacante **multiplica** a
cota dele: variando o UA a cada request, ele passa de 120/min para
120 x (numero de UAs distintos) por minuto, ou seja, ilimitado. Alem disso
explode a cardinalidade do `Map` e faz o eviction LRU descartar buckets
legitimos. Trocaria um problema de cota por um bypass total.

**C. Balde compartilhado unico, por superficie, com orcamento em paridade.
ESCOLHIDA.** Nao existe nenhum sinal confiavel para particionar. Registrando
explicitamente: **em `src/proxy.ts` e nos route handlers do Next 16 nao ha
nenhum atributo de request que seja simultaneamente (i) estavel por cliente e
(ii) nao controlado pelo cliente.** Nesse cenario, fail-closed com balde unico e
teto em paridade e a escolha correta porque o dano fica limitado a uma populacao
que, num deploy corretamente configurado, e quase vazia (so probes internos), e
porque o risco real — o balde deixar de estar quase vazio por causa de `hops`
errado — passa a ser *detectavel* (secao 4) em vez de silencioso.

Particao que **se mantem**: por superficie. `publicRead`, `items` e `icon` tem
baldes untrusted separados, entao esgotar o de icones nao derruba as paginas
publicas. Essa e a unica dimensao de particao segura disponivel, porque e
derivada da rota, nao do cliente.

### 3. Como aplicar consistentemente (AC#4)

**A. Editar os dois modulos a mao.** Rejeitado: e como o defeito se propagou da
ACM-063 para a ACM-072. Nada impede a terceira copia.

**B. Refactor grande unificando os tres limitadores (incluindo o de escrita) num
so modulo.** Rejeitado para esta slice: `rate-limit.ts` e keyed por `userId`,
nao por IP, nao tem bucket untrusted e nao compartilha o problema. Arrastar ele
para ca aumenta a superficie de review sem beneficio.

**C. Tabela de politica declarativa + factory. ESCOLHIDA.**
Novo `src/lib/rate-limit-policy.ts` com um `Record<ThrottleSurface, {windowMs,
perIpMax, untrustedMax}>` e uma factory `createSurfaceLimiter(surface)` que
encapsula a escolha per-IP vs untrusted. `public-read-rate-limit.ts` e
`editor-api-rate-limit.ts` viram instancias finas que re-exportam os mesmos
nomes publicos de hoje — `src/proxy.ts` e as tres rotas nao mudam. A invariante
`untrustedMax <= perIpMax` e verificada na carga do modulo: em producao ela faz
clamp para `perIpMax` e loga `console.error` (nunca derruba o processo), e um
teste unitario percorre a tabela e falha o CI se alguem introduzir uma
superficie que viole a regra. Adicionar uma quarta superficie no futuro exige
adicionar uma linha na tabela, e a linha e validada.

### 4. Sinal observavel de `hops` incorreto (AC#2)

Confirmado: o projeto **nao tem stack de metricas** (sem OpenTelemetry,
Prometheus, pino ou winston no `package.json`). Introduzir uma so para este
sinal seria desproporcional e violaria "nao escolher tecnologia nova sem
necessidade demonstrada".

Decisao: `console.warn` estruturado (uma linha JSON), emitido por um novo
`src/lib/untrusted-traffic-monitor.ts`, com histerese explicita para nao virar
ruido:

- **Ponto de instrumentacao:** dentro da derivacao de chave
  (`clientKeyFromHeaders`), que e o unico ponto por onde as cinco chamadas
  passam. Instrumentar nos call sites seria esquecivel e reintroduziria o
  problema de "caso a caso".
- **Janela:** 60s, alinhada a janela dos limitadores. Contadores
  `total` e `untrusted`, avaliados na virada de janela.
- **Piso de amostragem:** so avalia com `total >= 50` na janela. Trafego baixo
  (um unico health check as 3h da manha) produziria 100% untrusted e um alerta
  falso.
- **Limiar de disparo:** fracao untrusted `>= 0.5` na janela. Num deploy
  correto o esperado e ~0; metade do trafego sem IP identificavel nao tem
  explicacao benigna.
- **Histerese:** maquina de dois estados. Loga na *transicao* ok -> alerting;
  enquanto sustentado, re-loga no maximo a cada 15 min; loga uma linha de
  recuperacao ao cair abaixo de `0.2` (banda morta entre 0.2 e 0.5 evita
  flapping). Pior caso: 4 linhas/hora.
- **Conteudo da linha:** evento, fracao, total da janela, valor efetivo de
  `RATE_LIMIT_TRUSTED_HOPS` e uma acao. Nenhum IP, nenhum header bruto — nao
  transformar um alerta operacional em log de dados de cliente.

**Como o operador age:** fracao proxima de 1.0 significa quase sempre `hops`
maior que o numero real de proxies que fazem append no XFF (ou XFF nao chegando
na app). Acao: contar as entradas de XFF na borda e ajustar
`RATE_LIMIT_TRUSTED_HOPS` para o numero de proxies confiaveis; o alerta deve
sumir na janela seguinte. Fracao intermediaria e persistente com `hops` correto
indica trafego automatizado sem XFF — a decidir caso a caso se ganha um
allow-list na borda.

### 5. Topologia esperada em producao (AC#3)

Documentada em doc novo (`-t guide`) e reforcada no `.env.example`. Premissa do
v1: app Node single-process (decision-006/016) atras de **exatamente um** proxy
reverso que faz append do peer real ao XFF -> `RATE_LIMIT_TRUSTED_HOPS=1`.
Variantes que mudam o valor: CDN/Cloudflare na frente do proxy = 2; app exposta
diretamente sem proxy = nao ha valor correto, todo o trafego cai em untrusted
por definicao e o alerta da secao 4 vai disparar (comportamento desejado).

## Decisao

1. `untrustedMax === perIpMax` em toda superficie; nunca maior. Invariante
   verificada em codigo (clamp + `console.error`) e no CI (teste sobre a
   tabela).
2. Bucket untrusted continua sendo um balde compartilhado unico por superficie.
   Nao ha particao segura disponivel no runtime — `NextRequest.ip` nao existe e
   `User-Agent` e controlado pelo cliente.
3. Politica declarativa em `src/lib/rate-limit-policy.ts`, consumida pelos dois
   modulos existentes, que preservam sua API publica.
4. `src/lib/untrusted-traffic-monitor.ts`: `console.warn` estruturado com piso
   de 50 amostras, limiar 0.5, recuperacao em 0.2 e re-log a cada 15 min.
5. Topologia e valor de `RATE_LIMIT_TRUSTED_HOPS` documentados em doc de guia +
   `.env.example`.

Esta decisao **substitui** o fallback descrito na secao 3 e o dimensionamento do
bucket untrusted da secao 4 da decision-016 (e o dimensionamento equivalente
adotado pela ACM-072). O restante da decision-016 — camada proxy, derivacao de
chave por hops a partir da direita, 429 constante sem oraculo, motor de janela
fixa compartilhado — permanece valido.

## Consequencias

- Um deploy hoje mal configurado (`hops` errado) que estava passando com
  600/60s globais passa a ser cortado em 120/60s globais **e** a gritar no log.
  Isso e intencional: e o unico jeito de a configuracao errada aparecer. Rodar
  esta mudanca sem ler o log na primeira janela de deploy e o principal risco
  operacional.
- Clientes legitimos sem XFF (probes, server-to-server) passam a dividir a cota
  de um IP. Para os volumes esperados (poucos req/min) ha folga larga; se algum
  dia um integrador legitimo aparecer, a resposta certa e faze-lo passar pelo
  proxy que faz append no XFF, nao aumentar o balde untrusted.
- O monitor introduz estado mutavel de modulo num caminho ate agora puro
  (`clientKeyFromHeaders`). Mitigado com clock injetavel e helper de reset, no
  mesmo padrao ja usado pelos limitadores.
- `console.warn` some se o processo nao tiver captura de stdout. Nao e um
  sistema de alerta; e o degrau minimo honesto. Se um dia houver stack de
  metricas, este monitor e o ponto de troca (uma funcao, um call site).
