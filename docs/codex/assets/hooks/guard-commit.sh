#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit' || exit 0

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

staged="$(git diff --cached --name-only 2>/dev/null || echo '')"
if [ -n "$staged" ]; then
    bad="$(printf '%s\n' "$staged" | grep -Ei '(^|/)\.env($|\.)|(^|/)secrets/|(^|/)dist/|(^|/)node_modules/|\.pem$|id_rsa' || true)"
    [ -n "$bad" ] && block "스테이지에 커밋하면 안 되는 파일이 있습니다: $(printf '%s' "$bad" | tr '\n' ' ')"
fi

header="$(printf '%s' "$cmd" | grep -oE -- "(-m|--message)[[:space:]]*('[^']*'|\"[^\"]*\")" | head -n1 | sed -E "s/^(-m|--message)[[:space:]]*//; s/^['\"]//; s/['\"]$//")"
if [ -n "$header" ]; then
    header_line="$(printf '%s' "$header" | head -n1)"
    types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
    printf '%s' "$header_line" | grep -Eq "^(${types})(\([a-z0-9._/-]+\))?!?: .+" || block "Conventional Commits 형식이 아닙니다: '$header_line'"
fi

auto_commit="$(git config --get llm-rules.auto-commit 2>/dev/null || echo '')"
case "$auto_commit" in
    1 | true) jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"llm-rules auto-commit 합의 저장소의 가드 검사 통과"}}' ;;
esac
