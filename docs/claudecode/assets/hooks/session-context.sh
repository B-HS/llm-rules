#!/usr/bin/env bash
# session-context.sh — SessionStart(startup|resume)
# 세션 시작/재개 시 컨벤션 핵심 + (있으면) docs/PROCESS.md 를 컨텍스트로 주입한다.
# ai-process §1·§14 (docs/PROCESS.md 기반) + 드리프트 방지. stdout(exit 0) 이 컨텍스트로 들어간다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

mkdir -p docs 2>/dev/null || true # comments §3 / ai-process §1: docs/ 보장

# 컨벤션 문서 위치 자동 감지: env 오버라이드 → 프로젝트(.claude/convention) → 글로벌(~/.claude/convention)
convention_dir=""
for candidate in "${LLM_RULES_CONVENTION_DIR:-}" "${CLAUDE_PROJECT_DIR:-$PWD}/.claude/convention" "$HOME/.claude/convention"; do
    if [ -n "$candidate" ] && [ -f "$candidate/index.md" ]; then
        convention_dir="$candidate"
        break
    fi
done

if [ -n "$convention_dir" ]; then
    case "$convention_dir" in "$HOME"/*) convention_dir="~${convention_dir#"$HOME"}" ;; esac
    detail="세부: $convention_dir/*.md"
else
    detail="세부 문서 미설치 — 컨벤션 문서가 없습니다. install-files/install.sh 로 설치하세요. (https://github.com/B-HS/llm-rules)"
fi

ctx="[llm-rules 컨벤션 — 항상 준수]
- arrow function 만, return type 미명시, any/enum 금지(unknown 은 경계에서만+즉시 좁힘), 코드 주석 금지(JSDoc 만), 2회 이상일 때만 공통화, 매직넘버·이모지 금지, early return·const 우선.
- named export 기본, 타입은 원본에서 유도(z.infer/ReturnType/Pick/Omit), useCallback/useMemo 금지(React Compiler), 폼은 react-hook-form+zodResolver.
- FSD 의존은 app→pages→widgets→features→entities→shared 위→아래로만. barrel(index.ts) 금지. 쿼리는 queryOptions 팩토리+QUERY_KEY 배열 키.
- 커밋: Conventional Commits, author 사용자 단독, Co-Authored-By/Claude 트레일러 금지, 요청 전 commit/push 금지, git add -A/force push 금지.
- 시크릿은 .env+getEnv() 로만(.env 읽기/쓰기 금지). 종료 전 검증(typecheck→lint→test). 모호하면 추측하지 말고 1줄 객관식으로 질문.
$detail"

if [ -f docs/PROCESS.md ]; then
    process="$(head -n 200 docs/PROCESS.md)"
    ctx="$ctx

[현재 작업 상태 — docs/PROCESS.md (앞부분)]
$process"
fi

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
