#!/usr/bin/env bash
set -euo pipefail

echo "==> install"
npm ci

echo "==> lint"
npm run lint

echo "==> typecheck"
npx tsc --noEmit

echo "==> build"
npm run build

if npm run | grep -qE '^  test$'; then
  echo "==> test"
  npm test -- --run
fi

echo "✅ gate verde"
