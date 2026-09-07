#!/usr/bin/env bash
# DEPRECADO desde a v0.3.0 — o gate agora vive em .claude/loop/check.sh,
# que emite sinal estruturado (last-check.json) para o loop consumir.
# Configure os passos do projeto em .claude/loop/steps.sh.
exec "$(dirname "${BASH_SOURCE[0]}")/../loop/check.sh" "$@"
