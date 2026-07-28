#!/usr/bin/env bash
# guard-push.sh — PreToolUse(Bash, if Bash(git push*))
# git.md §6 (force push 금지) 를 결정론적으로 강제한다. permission deny 는 접두 매칭이라
# 'git push origin main --force' 같은 플래그 후치 변형을 못 잡으므로 여기서 전 위치를 검사한다.
# 차단: exit 2. 통과: exit 0. 파싱 실패는 fail-open(허용).
# 자동푸시: git config llm-rules.auto-push true 인 레포는 force 계열이 아닐 때
#           permissionDecision=allow 를 출력해 하네스 권한 프롬프트를 생략한다 (git.md §6 예외).
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0

# --- 1. force push 차단 (git §6) — --force-with-lease 는 차단하지 않되 자동 승인도 하지 않는다 ---
force_plain="$(printf '%s' "$cmd" | grep -E '(^|[[:space:]])--force([[:space:]]|$)|(^|[[:space:]])-f([[:space:]]|$)' || true)"
if [ -n "$force_plain" ]; then
    echo "차단: force push 는 금지입니다. 히스토리 재작성이 필요하면 사용자에게 승인받고 --force-with-lease 만 사용하세요. (git.md §6)" >&2
    exit 2
fi

# --- 2. 자동푸시 합의 레포 — force 계열(--force-with-lease 포함)이 아니면 권한 프롬프트 생략 ---
printf '%s' "$cmd" | grep -q -- '--force-with-lease' && exit 0
auto_push="$(git config --get llm-rules.auto-push 2>/dev/null || echo '')"
case "$auto_push" in
    1 | true) jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse", permissionDecision:"allow", permissionDecisionReason:"llm-rules auto-push 합의 레포 — force 아님"}}' ;;
esac

exit 0
