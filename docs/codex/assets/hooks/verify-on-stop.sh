#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
active="$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)"
[ "$active" = "true" ] && printf '{}' && exit 0

changed="$(git status --porcelain 2>/dev/null | grep -Ei '\.(ts|tsx|js|jsx|mts|cts)$' || true)"
[ -z "$changed" ] && printf '{}' && exit 0
[ -f tsconfig.json ] || { printf '{}'; exit 0; }

runner=""
if grep -q '"typecheck"' package.json 2>/dev/null; then
    if [ -f bun.lockb ] || [ -f bun.lock ]; then
        runner="bun run typecheck"
    elif [ -f pnpm-lock.yaml ]; then
        runner="pnpm run typecheck"
    else
        runner="npm run typecheck"
    fi
elif [ -x ./node_modules/.bin/tsc ]; then
    runner="./node_modules/.bin/tsc --noEmit"
elif command -v tsc >/dev/null 2>&1; then
    runner="tsc --noEmit"
fi
[ -z "$runner" ] && printf '{}' && exit 0

out="$($runner 2>&1)"
status=$?
if [ "$status" -ne 0 ]; then
    tail_output="$(printf '%s' "$out" | tail -n 40)"
    jq -nc --arg reason "타입체크 실패입니다. 끝내기 전에 고치세요:
$tail_output" '{decision:"block",reason:$reason}'
    exit 0
fi

if [ "${LLM_RULES_STOP_TEST:-0}" = "1" ]; then
    if [ -f bun.lockb ] || [ -f bun.lock ]; then
        test_output="$(bun test 2>&1)"
        test_status=$?
    else
        test_output="$(npx --no-install vitest run 2>&1)"
        test_status=$?
    fi
    if [ "$test_status" -ne 0 ]; then
        jq -nc --arg reason "테스트 실패입니다. 끝내기 전에 고치세요:
$(printf '%s' "$test_output" | tail -n 40)" '{decision:"block",reason:$reason}'
        exit 0
    fi
fi

printf '{}'
