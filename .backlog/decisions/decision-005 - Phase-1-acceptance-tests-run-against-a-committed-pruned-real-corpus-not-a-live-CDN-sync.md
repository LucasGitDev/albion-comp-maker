---
id: decision-005
title: Phase-1 acceptance tests run against a committed pruned real corpus, not a live CDN sync
date: 2026-09-07
status: accepted
---

## Contexto

ACM-005 exige quatro testes de aceitacao. Dois deles (AC-3, AC-4) sao invariantes
sobre o corpus inteiro: 2036 itens e 9044 spells.

Mas `src/data/ao-data.json` e gitignored (`.gitignore:47`), pesa 5.1 MB, e so
existe depois de `pnpm sync:ao`. `scripts/check.sh` roda apenas `pnpm test`;
`.github/workflows/check.yml` roda `make check` num checkout limpo, sem dado.

Portanto um teste de corpus escrito de forma ingenua ou quebra no CI, ou — pior —
e escrito com `it.skipIf(!existsSync(...))` e passa vazio. Este projeto acabou de
gastar a ACM-025 inteira se recuperando de um pipeline que emitia 0 itens e saia 0
(decision-004). Um teste de aceitacao que passa vazio e exatamente o mesmo modo de
falha com outra roupa. Foi descartado por regra.

Download real medido em 2026-09-07: 150 MB (nao 94 MB) — items.json 23.2 MB,
items-raw.json 16.6 MB, spells.json 14.1 MB, localization.json 89.7 MB.

## Opcoes consideradas

**A. CI roda `pnpm sync:ao` antes dos testes.**
Invariante 100% real e sempre atual. Custo: 150 MB por run de CI, ~minutos,
flakiness de rede, e todo PR quebra quando o upstream muda. O alerta precoce e
desejavel, mas acopla-lo ao gate de PR pune quem nao causou o problema.

**B. Fixture curado pequeno.**
Rapido e hermetico, mas AC-3/AC-4 deixam de ser invariantes de corpus. Um curador
humano so coloca no fixture os casos em que ja pensou; a regressao ACM-024/025 foi
justamente um caso em que ninguem pensou.

**C. Dois tiers com skip condicional.**
Contem exatamente a logica de skip proibida acima. Rejeitado.

**D. Commitar um subset real podado.** Medido:
- ao-data.json completo: 5.1 MB
- podado (todos os 2036 itens, campos `uniquename`/`slot`/`spells[uniquename,slotGroup,kind]`,
  registry reduzido a `uniquename -> kind` e apenas as 699 spells referenciadas): **0.54 MB**, 21 KB em gzip no git.

## Decisao

**Opcao D**, com um job noturno separado emprestado de A.

1. `src/__tests__/fixtures/ao-corpus.json` — corpus real completo e podado
   (2036 itens), commitado. Gerado por `scripts/build-test-fixture.ts` a partir de
   `src/data/ao-data.json`.
2. AC-1..AC-4 rodam contra esse fixture **incondicionalmente**, via `import`
   estatico. Sem `existsSync`, sem `skipIf`, sem `try/catch`. Se o arquivo sumir,
   o modulo nao compila e a suite fica vermelha. E impossivel passar sem ter lido
   o dado.
3. Podar `localizedNames` nao e so tamanho: desacopla a invariante de mudancas de
   traducao, que senao gerariam churn no fixture a cada sync.
4. Job noturno `.github/workflows/nightly-ao.yml`: sincroniza do CDN, roda a suite
   e verifica que o fixture ainda e byte-identico ao regerado. Falha aqui = drift
   de upstream, avisado sem custar 150 MB por PR. `make check` fica intocado.

## Consequencias

- `make check` continua hermetico, offline e rapido. Nenhuma mudanca em
  `scripts/check.sh` nem em `check.yml`.
- O fixture e um artefato derivado versionado: precisa ser regerado junto com
  `pnpm sync:ao`. O job noturno e a rede de seguranca contra ele envelhecer.
- O corpus da invariante fica congelado no dia da geracao. Aceito: a invariante
  ainda cobre 2036 itens reais, e o noturno cobre o presente.

## Correcao factual das ACs (verificado contra o upstream em 2026-09-07)

**AC-3 esta errada como escrita.** "Todo item de equipamento tem >= 1 spell" e
falso: **584 dos 2036 itens tem zero spells**, e isso e verdade upstream, nao bug
do resolver. Esses itens tem literalmente `@activespellslots="0"` e
`@passivespellslots="0"` no items.json bruto. Distribuicao: offhand 111, cape 96,
head 90, armor 84, shoes 77, mount 67, mainhand 59.

Achado de produto relevante: **os 112 offhands do dataset tem zero spell slots** —
nenhum offhand concede habilidade. O editor nao deve oferecer slots de habilidade
para offhand.

AC-3 e substituida pela invariante de cobertura descrita em ACM-005.

**AC-4 esta correta e passa hoje**: 0 spells resolvidas ausentes do registry.
