#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0

force_plain="$(printf '%s' "$cmd" | grep -E '(^|[[:space:]])--force([[:space:]]|$)|(^|[[:space:]])-f([[:space:]]|$)' || true)"
if [ -n "$force_plain" ]; then
    echo "차단: force push는 금지입니다. 승인받은 경우에도 --force-with-lease만 사용하세요." >&2
    exit 2
fi

printf '%s' "$cmd" | grep -q -- '--force-with-lease' && exit 0
auto_push="$(git config --get llm-rules.auto-push 2>/dev/null || echo '')"
case "$auto_push" in
    1 | true) jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"llm-rules auto-push 합의 저장소의 가드 검사 통과"}}' ;;
esac
