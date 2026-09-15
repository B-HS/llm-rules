#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0

force_plain="$(printf '%s' "$cmd" | grep -E '(^|[[:space:]])--force($|[=[:space:]])|(^|[[:space:]])--force-with-lease($|[=[:space:]])|(^|[[:space:]])--force-if-includes($|[=[:space:]])|(^|[[:space:]])-f([=[:space:]]|$)' || true)"
if [ -n "$force_plain" ]; then
    echo "차단: force push는 모든 형태에서 금지입니다." >&2
    exit 2
fi

jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"llm-rules push guard 검사 통과"}}'
