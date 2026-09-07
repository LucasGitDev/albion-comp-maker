# Backlog — Albion Comp Maker

> Gerenciado via `backlog` CLI. Não edite manualmente.

## Contexto do produto

**Problema:** Guild leaders de Albion Online perdem horas montando cards de comp manualmente (Photoshop/Canva), sem validação se as abilities escolhidas pertencem de fato ao item equipado.

**ICP:** Líder de guild de Albion Online que produz comp cards para Discord para guiar o grupo em batalha.

**Proposta de valor:** Editor visual de comp que valida abilities reais por item (dados oficiais do CDN Albion) e exporta PNG pronto para Discord — elimina o workflow manual.

**Referência de mercado:** albiononlinegrind.com/builds — nosso diferencial é comp-level (múltiplos builds) + export PNG Discord-ready.

**MVP:** Next.js App Router desktop-first, pipeline de dados (CDN → JSON normalizado), editor visual (role slots, item picker com ícone, slots Q/W/E/passive, seção de swaps obrigatórios), export PNG.

**Fora do MVP:** login/accounts, banco de dados backend, cálculo de dano/stats, preços de mercado, layout mobile-first.

**Monetização:** v1 gratuito (ferramenta de guild). Monetização fora de escopo.

**Stack:** Next.js App Router, TypeScript strict, Tailwind CSS, Vitest, html2canvas ou similar para export.

**Não-funcionais:** Desktop-first 1440px+, i18n PT-BR + EN, dados precisos do CDN oficial Albion, PNG mínimo 800px de largura.

## Milestones

- **M1 — Data Pipeline**: CDN fetch → JSON normalizado com items, spells, localização. Make check verde. *(ACM-001 a ACM-005)*
- **M2 — Editor Visual**: Role slots, item picker com ícone, ability slots validados contra dados reais.
- **M3 — Export PNG**: Layout fiel ao comp, Discord-ready.
- **M4 — Polish**: Seção de swaps obrigatórios, i18n completo, UX final.

## Épicos

### [EPIC-001] Data Pipeline

- [x] ACM-001 · Scaffold Next.js + TypeScript strict + Tailwind + Vitest + make check
- [x] ACM-002 · Downloader de dados AO (items, spells, localization do CDN)
- [x] ACM-003 · Spell resolver (herança, removeSpell, detecção de ciclo)
- [x] ACM-004 · Localization indexer + emitter ao-data.json
- [ ] ACM-005 · Testes de aceite Phase 1 (4 casos mandatórios) · `depends: ACM-004`

### [EPIC-002] Editor Visual

> Tasks a criar após ACM-005 Done.

### [EPIC-003] Export PNG

> Tasks a criar após EPIC-002 Done.

### [EPIC-004] Polish

> Tasks a criar após EPIC-003 Done.
