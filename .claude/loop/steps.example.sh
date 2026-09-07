# Copie para .claude/loop/steps.sh e ajuste ao projeto.
# O check.sh roda os passos NA ORDEM e para no primeiro que falhar.
# Formato: "nome:comando". Comando deve sair != 0 quando reprova.
STEPS=(
  "lint:pnpm lint"
  "typecheck:pnpm typecheck"
  "test:pnpm test --run"
  "build:pnpm build"
)
