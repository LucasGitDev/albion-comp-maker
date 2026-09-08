---
id: decision-018
title: >-
  Armazenamento de background de tema: arquivo em disco fora de public,
  referenciado por id em DB, servido por rota autorizada
date: '2026-09-08 00:56'
status: accepted
---
## Context

RF-4 / ACM-014 AC#1 e AC#2: upload de imagem de background (max 4 MB, JPEG/PNG/WebP),
redimensionada no servidor para no maximo 2000px via `sharp`, gravada como WebP; e
`theme_json` guarda **path, nao dataURL**.

Estado do projeto hoje:
- Persistencia e **SQLite local** via `better-sqlite3` + Drizzle (decision-006).
  `DATABASE_PATH` default `./data/app.db`, e `/data/` esta no `.gitignore`.
- `next.config.ts` usa `output: "standalone"`.
- `better-sqlite3` e binario nativo com escrita em arquivo — ou seja, **o deploy ja
  assume um processo Node com volume persistente**. Serverless com filesystem efemero
  ja esta descartado pela camada de dados existente, nao e uma restricao nova do upload.
- Ja existe precedente de rota de imagem propria: `src/app/api/icon/route.ts` faz proxy
  same-origin de icones (existe justamente porque o `html-to-image` nao lida com
  cross-origin, decision-007).
- Nao ha storage externo (S3/R2/Blob) configurado, nem credencial no `.env.example`.

## Options considered

**A. Gravar em `public/uploads/...` e guardar a URL publica no tema.**
Zero infra. Mas: `public/` e copiado para o bundle em build time — no `output: standalone`
arquivos escritos em runtime nao sao servidos de forma confiavel; qualquer rebuild/redeploy
perde tudo; e o arquivo fica **publico e enumeravel para qualquer um**, sem authz, o que
vaza background de build privada. Alem disso, o path viria do cliente para o `<img src>`,
abrindo espaco para path traversal se algum dia for resolvido no servidor.

**B. Base64 no DB (dataURL em `theme_json`).**
Explicitamente vetado pelo AC#2. Alem disso inflaria `builds.content`/`theme_json` para
centenas de KB, colidindo com o cap de 128 KiB de decision-013 e com o payload de toda
leitura de build.

**C. Arquivo em diretorio de dados fora de `public/`, linha em tabela `background_images`,
servido por `GET /api/background/[id]`.**
O tema guarda **apenas o id**; o path real nunca sai do servidor nem entra por request.
A rota resolve id -> linha -> path absoluto derivado no servidor.

**D. BLOB no SQLite.**
Mantem tudo em um arquivo so (backup trivial). Mas `better-sqlite3` e sincrono: ler um
BLOB de MBs bloqueia o event loop a cada request de imagem, e nao da streaming.

## Decision

**Opcao C.**

- Diretorio: `${UPLOADS_DIR}` (nova env, default `./data/uploads`), irmao do `app.db`,
  **fora de `public/`**, dentro do mesmo volume persistente que o DB ja exige.
  `/data/` ja e gitignored.
- Nome do arquivo: **gerado pelo servidor** — `${nanoid()}.webp`. O nome original enviado
  pelo cliente e **descartado por completo**, nunca concatenado em path. Isso elimina path
  traversal por construcao (nao ha string do usuario em nenhum `path.join`).
- Tabela nova `background_images`: `id` (PK, nanoid), `user_id` (FK -> user, cascade),
  `file_name`, `width`, `height`, `bytes`, `created_at`. Migration `0003`.
- `theme_json.background.imageId = "<id>"`. O cliente monta `src={"/api/background/" + id}`.
  Atende AC#2 (referencia, nao dataURL) e mantem a URL same-origin, requisito do
  `html-to-image` (decision-007).
- `GET /api/background/[id]`: valida `id` contra o alfabeto do nanoid, busca a linha,
  autoriza (dono OU imagem referenciada por build publica — mesma regra de
  `public-content.ts`), e serve o arquivo com `Content-Type: image/webp` e
  `Cache-Control: private, max-age=31536000, immutable` (o id e imutavel; um novo upload
  gera novo id, entao cache agressivo e seguro).
- `POST /api/background`: `requireSession()` + `checkWriteRateLimit(userId)` (limitador ja
  existente, 30/min) + limite adicional dedicado de uploads.

## Consequences

- O deploy **precisa** de volume persistente. Isso ja era verdade por causa do SQLite;
  esta decisao nao piora o perfil de deploy, mas sela o compromisso. Migrar para storage
  externo depois e barato: so o modulo de storage e a rota `GET` mudam, `theme_json`
  continua guardando um id opaco.
- O nome original do arquivo e perdido (nao aparece na UI depois do upload). Aceito.
- Imagens orfas se acumulam quando o usuario troca de background. Fora de escopo desta
  task: registrar task de garbage collection (varredura de `background_images` sem
  referencia em nenhum `theme_json`). **Nao** deletar o arquivo antigo no momento da troca
  — a build pode ainda nao ter sido salva, e a mesma imagem pode ser referenciada por
  varias builds.
- `GET /api/background` custa uma query SQLite sincrona por request. Aceitavel: `immutable`
  no cache faz o browser nao reperguntar.
- Delecao de usuario (`ON DELETE CASCADE`) remove as linhas mas **nao** os arquivos —
  mesma task de GC.
