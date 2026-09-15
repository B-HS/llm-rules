#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)' || exit 0

block() {
    echo "차단: $1" >&2
    echo "git.md 위반을 고친 뒤 다시 시도하세요." >&2
    exit 2
}

allow_main="${LLM_RULES_ALLOW_MAIN:-}"
[ -z "$allow_main" ] && allow_main="$(git config --get llm-rules.allow-main 2>/dev/null || echo '')"
printf '%s' "$cmd" | grep -q 'LLM_RULES_ALLOW_MAIN=1' && allow_main=1
case "$allow_main" in
    1 | true) ;;
    *)
        branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
        case "$branch" in
            main | master) block "보호 브랜치 '$branch'에 직접 커밋할 수 없습니다. 작업 브랜치를 쓰거나 합의된 저장소에서 llm-rules.allow-main을 설정하세요." ;;
        esac
        ;;
esac

if printf '%s' "$cmd" | grep -Eiq 'co-authored-by|generated with|claude-session *:|codex-session *:|noreply@(anthropic|openai)|claude(\.ai)? *<|codex *<'; then
    block "커밋 메시지에 AI 서명이나 트레일러가 포함되어 있습니다. author는 사용자 단독이어야 합니다."
fi

if printf '%s' "$cmd" | grep -Eq -- '(^|[[:space:]])(-F|--file|--template|-t|--edit|-e|--no-edit)([=[:space:]]|$)'; then
    block "편집기·파일 기반 커밋 메시지는 검사할 수 없습니다. 인라인 -m 메시지 하나만 사용하세요."
fi

staged="$(git diff --cached --name-only 2>/dev/null || echo '')"
if [ -n "$staged" ]; then
    bad="$(printf '%s\n' "$staged" | grep -Ei '(^|/)\.env($|\.)|(^|/)secrets/|(^|/)dist/|(^|/)node_modules/|\.pem$|id_rsa' || true)"
    [ -n "$bad" ] && block "스테이지에 커밋하면 안 되는 파일이 있습니다: $(printf '%s' "$bad" | tr '\n' ' ')"
fi

message_args="$(printf '%s' "$cmd" | grep -oE -- "-m[[:space:]]+('[^']*'|\"[^\"]*\")" || true)"
message_count="$(printf '%s\n' "$message_args" | sed '/^$/d' | wc -l | tr -d ' ')"
[ "$message_count" = "1" ] || block "커밋 메시지는 검사 가능한 인라인 -m 메시지 하나여야 합니다."

header="$(printf '%s' "$message_args" | sed -E "s/^-m[[:space:]]+//; s/^['\"]//; s/['\"]$//")"
types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
printf '%s' "$header" | grep -Eq "^(${types})(\([a-z0-9._/-]+\))?!?: .+" || block "Conventional Commits 형식이 아닙니다: '$header'"

jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"llm-rules commit guard 검사 통과"}}'
