#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
[ -z "$cwd" ] && cwd="$PWD"
mkdir -p "$cwd/docs" 2>/dev/null || true

convention_dir=""
for candidate in "${LLM_RULES_CONVENTION_DIR:-}" "$cwd/.llm-rules" "$cwd/.codex/llm-rules" "$HOME/.codex/llm-rules"; do
    if [ -n "$candidate" ] && [ -f "$candidate/index.md" ]; then
        convention_dir="$candidate"
        break
    fi
done

if [ -n "$convention_dir" ]; then
    case "$convention_dir" in "$HOME"/*) convention_dir="~${convention_dir#"$HOME"}" ;; esac
    detail="세부: $convention_dir/*.md"
else
    detail="세부 문서 미설치: install-codex의 instructions 항목을 설치하세요."
fi

ctx="[llm-rules 컨벤션]
- arrow function, 추론 가능한 반환 타입 생략, any·enum·코드 주석·매직넘버·이모지 금지, unknown은 경계에서 즉시 좁힘, early return과 const 우선.
- named export 기본, 타입은 원본에서 유도, useCallback·useMemo 금지, 폼은 react-hook-form과 zodResolver 사용.
- FSD 의존은 app→pages→widgets→features→entities→shared 방향이며 barrel을 만들지 않습니다.
- Conventional Commits, author 사용자 단독, AI 트레일러·git add -A·force push 금지. commit·push는 요청 또는 저장소 합의가 있을 때만 합니다.
- .env와 키 파일을 읽거나 쓰지 않습니다. 종료 전 typecheck→lint·format→test→실행 확인 순서로 검증합니다.
$detail

[작업 개시 프로토콜]
1. 사소한 애매함도 작업 결과를 바꾼다면 한 번에 모아 질문하고, 애매함이 없으면 바로 진행합니다.
2. 신규 프로젝트나 새 기능·라이브러리 도입은 후보 장단점과 기존 환경을 확인해 합의합니다.
3. 결정은 docs/acknowledge, 작업 상태는 docs/PROCESS.md에 기록합니다.
4. 사용자 요청의 기술 타당성을 근거로 판단하고 문제에는 대안을 함께 제시합니다.
5. 저장소의 llm-rules.auto-commit·auto-push 설정을 존중하되 모든 Git 안전 규칙을 유지합니다."

if [ -f "$cwd/docs/PROCESS.md" ]; then
    process="$(head -n 200 "$cwd/docs/PROCESS.md")"
    ctx="$ctx

[현재 작업 상태]
$process"
fi

jq -nc --arg context "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$context}}'
