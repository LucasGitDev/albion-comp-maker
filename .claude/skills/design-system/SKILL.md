---
name: design-system
description: Tokens visuais e base de componentes para um SaaS — cor, tipografia, espaçamento, raio, sombra, tema claro/escuro, e quando criar um componente novo. Use ao iniciar a identidade visual do produto ou ao introduzir qualquer componente ou estilo novo.
---

# Design system mínimo, decidido uma vez

## Tokens (defina antes da primeira tela)

**Cor** — semântica, não literal. `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--primary`, `--primary-fg`, `--danger`, `--success`, `--warning`. Nunca `--azul-claro-2` no componente.

Uma cor de marca só. Neutros fazem 90% da tela; a cor primária existe para a ação primária e mais nada. SaaS colorido demais parece amador e some a hierarquia.

**Tipografia** — uma família (system stack ou uma web font). Escala de 5 tamanhos: 12 / 14 / 16 / 20 / 28. Dois pesos: 400 e 600. Mais que isso vira bagunça.

**Espaçamento** — escala de 4px: 4, 8, 12, 16, 24, 32, 48, 64. Nada fora da escala.

**Raio** — um valor para controles (6–8px), um para cards (10–12px). **Sombra** — duas: elevação sutil e overlay.

## Tema claro/escuro

Defina o tema claro completo em `:root` e **só redefina os tokens** no escuro. Se uma cor só existe dentro do bloco escuro, o tema claro quebra. Componente nunca usa hex direto — sempre token.

## Regra de componente novo

Antes de criar, responda: existe no shadcn/ui ou já existe no projeto? Se sim, use. Componente novo exige: aparece em ≥2 telas **ou** encapsula regra de interação real. Um `<Card>` custom que é uma div com padding não é componente.

Componente de UI não conhece regra de negócio, não busca dado e não sabe rota. Se precisa disso, é um componente de feature — vive junto da feature, não em `ui/`.

## Densidade

Escolha uma e mantenha: ferramenta de trabalho (densa, tabela compacta, muita informação) ou produto de consumo (espaçosa, uma decisão por tela). Misturar as duas na mesma app é a causa mais comum de "parece feito por 3 pessoas diferentes".

## Checagem antes de fechar

- [ ] nenhuma cor, tamanho ou espaçamento fora dos tokens
- [ ] contraste ≥ 4.5:1 em texto e ≥ 3:1 em borda de controle
- [ ] estado de foco visível em tudo que é focável
