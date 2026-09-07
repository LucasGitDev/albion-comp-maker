#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test
