#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
direct_file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)"
patch="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
files="$({ printf '%s\n' "$direct_file"; printf '%s\n' "$patch" | sed -nE 's/^\*\*\* (Add|Update) File: //p'; } | awk 'NF && !seen[$0]++')"
[ -z "$files" ] && exit 0

hard=()
soft=()

while IFS= read -r file; do
    case "$file" in
        *.ts | *.tsx | *.js | *.jsx | *.mts | *.cts) ;;
        *) continue ;;
    esac
    [ -f "$file" ] || continue

    if [ -x ./node_modules/.bin/prettier ]; then
        ./node_modules/.bin/prettier --write "$file" >/dev/null 2>&1 || true
    elif command -v prettier >/dev/null 2>&1; then
        prettier --write "$file" >/dev/null 2>&1 || true
    fi

    content="$(cat "$file")"
    printf '%s' "$content" | grep -Eq '\buse(Callback|Memo)\(' && hard+=("$file: frontend §4 useCallback/useMemo 금지")

    case "$file" in
        *service/* | *route/* | *compose/* | *dto/* | */server/*)
            printf '%s' "$content" | grep -Eq 'throw[[:space:]]+new[[:space:]]+Error\(' && hard+=("$file: backend §6.1 throw new Error 금지")
            printf '%s' "$content" | grep -Eq 'process\.env\.' && hard+=("$file: backend §14 process.env 직접 접근 금지")
            ;;
    esac

    if printf '%s' "$content" | grep -Eq '^[[:space:]]*export default'; then
        case "$file" in
            *page.tsx | *layout.tsx | *route.ts | *app/* | *pages/*) ;;
            *) soft+=("$file: common §6 named export 기본") ;;
        esac
    fi
    printf '%s' "$content" | grep -Eq '^[[:space:]]*function[[:space:]]|=[[:space:]]*function[[:space:]]*\(' && soft+=("$file: common §3.1 arrow function 사용")
    printf '%s' "$content" | grep -Eq '\b(HACK|FIXME|XXX|TODO)\b|@ts-ignore|eslint-disable' && soft+=("$file: ai-process §6.2 임시 우회·검사 억제 금지")
    printf '%s' "$content" | grep -Eq '\bdangerouslySetInnerHTML\b' && ! printf '%s' "$content" | grep -Eiq 'sanitize|DOMPurify' && soft+=("$file: security §4 sanitize 없는 HTML 주입 금지")
done <<< "$files"

if [ "${#hard[@]}" -gt 0 ]; then
    reason="[llm-rules] 컨벤션 위반: $(IFS='; '; echo "${hard[*]}")"
    [ "${#soft[@]}" -gt 0 ] && reason="$reason; 참고: $(IFS='; '; echo "${soft[*]}")"
    jq -nc --arg reason "$reason" '{decision:"block",reason:$reason}'
    exit 0
fi

if [ "${#soft[@]}" -gt 0 ]; then
    message="[llm-rules] 컨벤션 점검: $(IFS='; '; echo "${soft[*]}")"
    jq -nc --arg message "$message" '{systemMessage:$message}'
fi
