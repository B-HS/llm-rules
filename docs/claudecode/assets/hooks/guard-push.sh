#!/usr/bin/env bash
# guard-push.sh — PreToolUse(Bash, if Bash(git push*))
# git.md §6 (force push 금지) 를 결정론적으로 강제한다. permission deny 는 접두 매칭이라
# 'git push origin main --force' 같은 플래그 후치 변형을 못 잡으므로 여기서 전 위치를 검사한다.
# 차단: exit 2. 통과: permissionDecision=allow. 이 가드는 푸시를 직접 수행하지 않는다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0

# --- 1. force push 차단 (git §6) ---
force_option="$(printf '%s' "$cmd" | grep -E '(^|[[:space:]])--force(-with-lease|-if-includes)?(=|[[:space:]]|$)|(^|[[:space:]])-f(=|[[:space:]]|$)' || true)"
if [ -n "$force_option" ]; then
    echo "차단: force push 는 금지입니다. 히스토리 재작성이 필요하면 사용자에게 먼저 승인받으세요. (git.md §6)" >&2
    exit 2
fi

jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse", permissionDecision:"allow", permissionDecisionReason:"llm-rules 푸시 가드 검사 통과"}}'

exit 0
