#!/usr/bin/env bash
# Local quality gate: runs every metric independently and prints a summary.
# Intentionally does NOT use `set -e` — a failure in one metric must not
# prevent the others from running, so the summary always reflects reality.
set -uo pipefail

declare -A STATUS
declare -A DETAIL

run_step() {
  local name="$1"
  shift
  echo ""
  echo "=== ${name} ==="
  if "$@"; then
    STATUS["$name"]="pass"
  else
    STATUS["$name"]="fail"
  fi
}

# Coverage (bloqueante: thresholds definidos em vitest.config.ts)
run_step "coverage" pnpm exec vitest run --coverage

# Duplication (alerta: nunca falha o script)
echo ""
echo "=== duplication ==="
if pnpm exec jscpd .; then
  STATUS["duplication"]="pass"
else
  STATUS["duplication"]="warn"
fi

# Dead code (alerta: nunca falha o script)
echo ""
echo "=== dead-code ==="
if pnpm exec knip; then
  STATUS["dead-code"]="pass"
else
  STATUS["dead-code"]="warn"
fi

# Vulnerabilities (bloqueante em HIGH/CRITICAL)
run_step "audit" pnpm audit --prod

echo ""
echo "========================================"
echo "Quality Gate Summary"
echo "========================================"

EXIT_CODE=0
for metric in coverage duplication dead-code audit; do
  result="${STATUS[$metric]:-unknown}"
  case "$result" in
    pass)
      echo "✅ ${metric}"
      ;;
    warn)
      echo "⚠️  ${metric} (não bloqueante)"
      ;;
    fail)
      echo "❌ ${metric}"
      EXIT_CODE=1
      ;;
    *)
      echo "❓ ${metric} (status desconhecido)"
      EXIT_CODE=1
      ;;
  esac
done

exit "$EXIT_CODE"
