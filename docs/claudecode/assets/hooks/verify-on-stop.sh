#!/usr/bin/env bash
# verify-on-stop.sh — Stop
# 코드 변경이 있을 때만 타입체크(+선택적 테스트)를 돌리고, 실패하면 계속 작업하도록 block 한다.
# ai-process §8 (검증 후 다음 스텝). 느리므로 변경 게이팅 필수. 무한루프 방지: stop_hook_active 가드.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
active="$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)"
[ "$active" = "true" ] && exit 0 # 이미 stop-hook 으로 재개된 턴이면 재검증하지 않음

# 변경된(추적/미추적) 코드 파일이 없으면 검증 생략
changed="$(git status --porcelain 2>/dev/null | grep -Ei '\.(ts|tsx|js|jsx|mts|cts)$' || true)"
[ -z "$changed" ] && exit 0

# tsconfig 없으면 타입체크 불가 → 생략
[ -f tsconfig.json ] || exit 0

# 타입체크 실행기 결정. 없으면 검증 생략(거짓 차단 방지) — tsconfig 만 있고 tsc 가 없는 경우.
runner=""
if grep -q '"typecheck"' package.json 2>/dev/null; then
    if [ -f bun.lockb ] || [ -f bun.lock ]; then runner="bun run typecheck"
    elif [ -f pnpm-lock.yaml ]; then runner="pnpm run typecheck"
    else runner="npm run typecheck"; fi
elif [ -x ./node_modules/.bin/tsc ]; then runner="./node_modules/.bin/tsc --noEmit"
elif command -v tsc >/dev/null 2>&1; then runner="tsc --noEmit"
fi
[ -z "$runner" ] && exit 0

out="$($runner 2>&1)"
status=$?
if [ $status -ne 0 ]; then
    tail="$(printf '%s' "$out" | tail -n 40)"
    jq -nc --arg r "타입체크(tsc --noEmit) 실패 — 끝내기 전에 고치세요:
$tail" '{decision:"block", reason:$r}'
    exit 0
fi

# 선택: 테스트는 느려서 기본 비활성. LLM_RULES_STOP_TEST=1 일 때만.
if [ "${LLM_RULES_STOP_TEST:-0}" = "1" ]; then
    if [ -f bun.lockb ] || [ -f bun.lock ]; then tout="$(bun test 2>&1)"; tstatus=$?; else tout="$(npx --no-install vitest run 2>&1)"; tstatus=$?; fi
    if [ $tstatus -ne 0 ]; then
        jq -nc --arg r "테스트 실패 — 끝내기 전에 고치세요:
$(printf '%s' "$tout" | tail -n 40)" '{decision:"block", reason:$r}'
        exit 0
    fi
fi
exit 0
