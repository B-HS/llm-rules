#!/usr/bin/env bash
# lint-edit.sh — PostToolUse(Edit|Write|MultiEdit)
# 편집은 이미 끝났으므로 차단(exit 2)은 무시된다 → JSON {"decision":"block"} 로 Claude 에게 수정을 요구하거나,
# systemMessage 로 경고한다. 대상이 TS/JS 가 아니면 즉시 no-op.
# common §1·§2·§3·§6·§7 / comments §1 / frontend §4 / backend §6.1·§14 를 어휘적으로 검사.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0
case "$file" in
    *.ts | *.tsx | *.js | *.jsx | *.mts | *.cts) : ;;
    *) exit 0 ;; # 비대상(md/json/css/이미지 등) → no-op
esac
[ -f "$file" ] || exit 0

# --- 1. Prettier 자동 정렬 (common §2) — best-effort, 없으면 건너뜀 ---
run_prettier() {
    if [ -x "./node_modules/.bin/prettier" ]; then ./node_modules/.bin/prettier --write "$1" >/dev/null 2>&1
    elif command -v prettier >/dev/null 2>&1; then prettier --write "$1" >/dev/null 2>&1
    fi
}
run_prettier "$file"

content="$(cat "$file")"
hard=()
soft=()

# 코드 라인만 검사 (JSDoc/문자열 오탐을 줄이려고 일부 패턴은 soft 로만 둔다)
# --- HARD: 명백한 위반 → block ---
printf '%s' "$content" | grep -Eq '\buse(Callback|Memo)\(' && hard+=("frontend §4: useCallback/useMemo 금지 — React Compiler 에 위임하세요.")

case "$file" in
    *service/* | *route/* | *compose/* | *dto/* | */server/*)
        printf '%s' "$content" | grep -Eq 'throw[[:space:]]+new[[:space:]]+Error\(' && hard+=("backend §6.1: throw new Error 금지 — createAppError('CODE') 를 쓰세요.")
        printf '%s' "$content" | grep -Eq 'process\.env\.' && hard+=("backend §14 · security §1: process.env 직접접근 금지 — getEnv() 싱글톤을 쓰세요.")
        ;;
esac

# --- SOFT: 오탐 가능 → 경고만(systemMessage) ---
printf '%s' "$content" | grep -Eq '^\s*export default' && case "$file" in
    *page.tsx | *layout.tsx | *route.ts | *app/* | *pages/*) : ;;
    *) soft+=("common §6: named export 를 기본으로 (default export 는 page/layout 만).") ;;
esac
printf '%s' "$content" | grep -Eq '^[[:space:]]*function[[:space:]]|=[[:space:]]*function[[:space:]]*\(' && soft+=("common §3.1: function 키워드 대신 arrow function 을 쓰세요.")
printf '%s' "$content" | grep -Eq '(^|[^:])//[^/]|/\*[^*]' && ! printf '%s' "$content" | grep -Eq '/\*\*' && soft+=("comments §1: 코드 주석 금지(JSDoc 만 예외). 설명은 docs/ 로.")
printf '%s' "$content" | grep -Eq '\b(HACK|FIXME|XXX|TODO)\b|@ts-ignore|eslint-disable' && soft+=("ai-process §6.2: HACK/FIXME/@ts-ignore/eslint-disable — 근본 해결하거나 docs/ 에 기록.")
printf '%s' "$content" | grep -Eq '\bdangerouslySetInnerHTML\b' && ! printf '%s' "$content" | grep -Eiq 'sanitize|DOMPurify' && soft+=("security §4: dangerouslySetInnerHTML 은 sanitize(DOMPurify) 와 함께만.")

esc() { printf '%s' "$1" | jq -Rs .; }
join() { local IFS='; '; echo "$*"; }

if [ ${#hard[@]} -gt 0 ]; then
    reason="[llm-rules] 컨벤션 위반 — 수정하세요: $(join "${hard[@]}")"
    [ ${#soft[@]} -gt 0 ] && reason="$reason  (참고: $(join "${soft[@]}"))"
    jq -nc --arg r "$reason" '{decision:"block", reason:$r}'
    exit 0
fi
if [ ${#soft[@]} -gt 0 ]; then
    msg="[llm-rules] 컨벤션 점검: $(join "${soft[@]}")"
    jq -nc --arg m "$msg" '{systemMessage:$m}'
    exit 0
fi
exit 0
