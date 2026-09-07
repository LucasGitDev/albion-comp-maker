---
id: doc-003
title: Visual redesign spec — editor e home
type: specification
created_date: 2026-09-07
---

# Visual redesign spec — editor e home

## Contexto

Review visual de 2026-09-07 encontrou o app no estado atual "muito ruim e feio,
difícil de usar e nada prático" (feedback do usuário). A home ainda é o
boilerplate padrão do `create-next-app`, e o editor de build (`/build/new`)
tem hierarquia visual quebrada, ícones não carregam e a ação principal
(selecionar um item) não funciona. Achados detalhados viraram tasks
ACM-033 a ACM-041. Este doc define os princípios de design que o editor e a
home devem seguir daqui pra frente, usando como referência direta
albiononlinegrind.com/builds e albiononlinebuilds.com.

## Princípios

### 1. Tema dark consistente, ponta a ponta

Todo o produto — home, listagem, editor, footer — deve usar o mesmo tema
escuro. Hoje o body é branco e o card do editor é escuro, criando um
contraste abrupto não intencional nas bordas. As duas referências usam dark
theme absoluto (fundo `~#0f0f12`, cards `~#1a1a1f`/cinza-azulado,
texto secundário cinza-claro). Nenhuma tela do produto deve ter fundo branco
"vazando" atrás de um componente dark.

### 2. Uma cor de acento, reservada para ação primária

Escolher UMA cor de destaque (ex: laranja como albiononlinebuilds.com usa no
botão "Criar", ou verde/azul) e usá-la SOMENTE para:
- CTA de criar/salvar/exportar
- Estado ativo/selecionado de um slot
- Badges de categoria da comp (ex: "PVE GROUP")

Toda cor de foco atual do editor (borda verde ao clicar em "Adicionar") deve
ser resultado de uma ação real (abrir seletor), nunca um efeito visual sem
função.

### 3. Hierarquia clara: o que o usuário faz primeiro deve ser óbvio em <2s

Ordem de leitura esperada na tela de edição, do topo para baixo:
1. Header com nav + botão de voltar/salvar (fixo/sticky)
2. Nome da comp + categoria (papel) — inputs claramente maiores/mais
   destacados que os slots
3. Grade de papéis/slots de equipamento
4. Ação de exportar/salvar, sempre acessível sem precisar rolar até o fim

Nenhum elemento decorativo deve competir em peso visual com a ação primária.

### 4. Densidade de informação — Albion é denso, o editor deve caber mais por tela

albiononlinebuilds.com consegue mostrar 6 builds completas (8 slots cada) por
tela, usando cards compactos: ícone + nome do item lado a lado numa única
linha por slot, cards com pouco padding. O editor atual usa cards grandes
demais (ícone empilhado acima do rótulo, muito espaço em branco), o que
força scroll excessivo mesmo para 1 build só. Meta: reduzir a altura de cada
card de slot em pelo menos 40%, mantendo legibilidade.

### 5. Feedback visual obrigatório em toda ação

- Slot vazio: ícone de silhueta da categoria (espada, elmo, poção) em cinza
  — nunca um ícone de erro/imagem quebrada.
- Slot com hover: leve destaque de borda/fundo indicando que é clicável.
- Slot clicado: abre modal/popover de seleção com busca (autocomplete),
  fecha com Esc ou clique fora.
- Slot preenchido: ícone real do item + nome, com opção de trocar/remover
  visível no hover.
- Loading (ex: aguardando dados dos itens): skeleton nos slots, nunca tela
  em branco.
- Erro (ex: falha ao carregar ícones/dados): mensagem com ação de retry,
  nunca silêncio ou ícone de imagem quebrada.

### 6. Home é uma página de produto, não o template do framework

A home deve ter: header com logo/nav, um CTA primário "Nova comp", e uma
listagem (grid) das comps existentes ou um empty state explícito
("Nenhuma comp ainda — crie a primeira") com o mesmo CTA. Zero conteúdo do
boilerplate Next.js deve permanecer.

### 7. Contadores e limites de input devem refletir o estado real

Qualquer contador (ex: "0/10" ao lado do nome da build) precisa estar
vinculado ao valor real do campo e ao limite de caracteres realmente
aplicado (truncamento no input, não só um número decorativo). Definir
limites realistas: nomes de comp reais (ver referências) frequentemente
passam de 20-30 caracteres — o limite de 10 é baixo demais.

## Referências visuais usadas

- https://albiononlinegrind.com/builds — densidade de listagem, uso de
  badges coloridos por tipo de conteúdo (Fame Farm, Corrupted Dungeon etc.)
- https://www.albiononlinebuilds.com/pt/comp/dragon-raid-meele-comp — layout
  de página de comp única: header com título + categoria + compartilhar,
  grid de papéis com slots compactos, seção de guia/estratégia, área de
  comentários.

## Tasks relacionadas

ACM-033, ACM-034, ACM-035, ACM-036, ACM-037, ACM-038, ACM-039, ACM-040,
ACM-041.
