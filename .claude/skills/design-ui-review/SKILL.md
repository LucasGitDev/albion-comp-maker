---
name: design-ui-review
description: Rotina de revisão visual de uma tela implementada — captura de screenshot, comparação com a spec, heurísticas de usabilidade e checagem de acessibilidade. Use após implementar qualquer tela, antes do merge.
---

# Revisão de UI

## Captura

```bash
npm run dev &
npx playwright screenshot --viewport-size=1440,900 http://localhost:3000/<rota> /tmp/ui-desktop.png
npx playwright screenshot --viewport-size=390,844  http://localhost:3000/<rota> /tmp/ui-mobile.png
```

Force cada estado antes de aprovar: vazio, loading, erro, dado longo (nome de 80 caracteres), lista de 200 itens. Bug de UI quase sempre aparece nos extremos, não no caso feliz.

## Heurísticas (na ordem que importa)

1. **Ação primária identificável em 2 segundos.** Se você precisa procurar, o usuário também.
2. **Os 4 estados existem** e cada um diz o que fazer a seguir. Estado vazio sem CTA é beco sem saída.
3. **Erro é acionável.** "Erro ao salvar" é inútil; "Não foi possível salvar: o CNPJ já está cadastrado" resolve.
4. **Hierarquia visual** — o mais importante é o maior/mais contrastado. Se tudo é negrito, nada é.
5. **Consistência** — mesma ação, mesmo lugar, mesmo nome em todas as telas.
6. **Nada de layout shift** ao carregar. Skeleton com a altura do conteúdo real.

## Acessibilidade (mínimo não-negociável)

- [ ] contraste ≥ 4.5:1 em texto, ≥ 3:1 em borda de controle
- [ ] todo input tem label associada (não só placeholder)
- [ ] foco visível e ordem de tab lógica; modal prende o foco e fecha no Esc
- [ ] ícone-only tem `aria-label`
- [ ] estado não é comunicado só por cor (adicione ícone ou texto)

## Responsivo

390px é o teste real: tabela vira card ou rola no próprio container (a página nunca rola na horizontal), toolbar empilha, modal vira sheet.

## Saída

Nota na task: paths dos screenshots + findings. **Divergência da spec é finding**, não sugestão. Preferência pessoal sua não é finding — se não está na spec nem nas heurísticas acima, não reporte.
