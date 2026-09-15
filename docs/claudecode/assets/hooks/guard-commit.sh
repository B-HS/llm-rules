#!/usr/bin/env bash
# guard-commit.sh — PreToolUse(Bash, if Bash(git commit*))
# git.md §1·§2·§3·§6 + 개인 절대규칙(Co-Authored-By 금지) 을 결정론적으로 강제한다.
# 차단: exit 2 (+stderr 가 Claude 에게 전달). 통과: permissionDecision=allow.
# 이 가드는 커밋을 수행하지 않고, 검사를 통과한 자동 커밋만 허용한다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0
# git commit 이 아니면 통과 (if 필터가 1차로 거르지만 방어적으로 재확인)
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit' || exit 0

block() {
    echo "차단: $1" >&2
    echo "→ git.md / 개인 컨벤션 위반입니다. 커밋 메시지·브랜치·스테이지를 고친 뒤 다시 시도하세요." >&2
    exit 2
}

# --- 1. main/master 직접 커밋 금지 (git §6) — 명시적 허용 시에만 생략 ---
# 허용 방법: ① 1회성 — 커맨드에 LLM_RULES_ALLOW_MAIN=1 접두
#            ② 레포 단위(합의 기록) — git config llm-rules.allow-main true
#            ③ 전역 — hook 환경변수 LLM_RULES_ALLOW_MAIN=1
allow_main="${LLM_RULES_ALLOW_MAIN:-}"
[ -z "$allow_main" ] && allow_main="$(git config --get llm-rules.allow-main 2>/dev/null || echo '')"
printf '%s' "$cmd" | grep -q 'LLM_RULES_ALLOW_MAIN=1' && allow_main=1
case "$allow_main" in
    1 | true) ;;
    *)
        branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
        case "$branch" in
            main | master) block "보호 브랜치 '$branch' 에 직접 커밋할 수 없습니다. 작업 브랜치에서 커밋하거나, 합의된 레포면 'git config llm-rules.allow-main true' 로 허용하세요." ;;
        esac
        ;;
esac

# --- 2. Co-Authored-By / Claude 트레일러 금지 (절대규칙) ---
if printf '%s' "$cmd" | grep -Eiq 'co-authored-by|generated with|🤖 *generated|claude(\.ai)? *<|noreply@anthropic|claude-session *:'; then
    block "커밋 메시지에 Co-Authored-By / Claude 트레일러가 포함되어 있습니다. author 는 사용자 단독이어야 합니다."
fi

# --- 3. 스테이지에 시크릿/빌드 산출물 금지 (git §6 · security §1) ---
staged="$(git diff --cached --name-only 2>/dev/null || echo '')"
if [ -n "$staged" ]; then
    bad="$(printf '%s\n' "$staged" | grep -Ei '(^|/)\.env($|\.)|(^|/)secrets/|(^|/)dist/|(^|/)node_modules/|\.pem$|id_rsa' || true)"
    [ -n "$bad" ] && block "스테이지에 커밋하면 안 되는 파일이 있습니다: $(printf '%s' "$bad" | tr '\n' ' ')"
fi

# --- 4. Conventional Commits 헤더 검증 (git §1·§2·§3) ---
# 에디터·템플릿·파일 메시지는 검사할 수 없으므로 차단하고, 인라인 -m/--message 만 허용한다.
if [[ "$cmd" =~ (^|[[:space:]])(-F|-e|-t|--file|--edit|--template|--no-edit)([[:space:]=]|$) ]]; then
    block "에디터·템플릿·파일 기반 커밋 메시지는 검사할 수 없습니다. 인라인 -m 또는 --message 로 Conventional Commit 메시지를 지정하세요."
fi

if [[ "$cmd" =~ (^|[[:space:]])(-m|--message)([[:space:]]+|=)(\"[^\"]*\"|\'[^\']*\') ]]; then
    message="${BASH_REMATCH[4]}"
    header="${message:1:${#message}-2}"
else
    block "커밋 메시지를 검사할 수 없습니다. 인라인 -m 또는 --message 에 따옴표로 감싼 Conventional Commit 메시지를 지정하세요."
fi

header_line="$(printf '%s' "$header" | head -n1)"
types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
if ! printf '%s' "$header_line" | grep -Eq "^(${types})(\([a-z0-9._/-]+\))?!?: .+"; then
    block "Conventional Commits 형식이 아닙니다: '$header_line'  (형식: <type>(scope)?: 설명 / type ∈ ${types})"
fi

jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse", permissionDecision:"allow", permissionDecisionReason:"llm-rules 커밋 가드 검사 통과"}}'

exit 0
