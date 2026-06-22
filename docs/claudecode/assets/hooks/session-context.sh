#!/usr/bin/env bash
# session-context.sh — SessionStart(startup|resume)
# 세션 시작/재개 시 컨벤션 핵심 + (있으면) docs/PROCESS.md 를 컨텍스트로 주입한다.
# ai-process §1·§14 (docs/PROCESS.md 기반) + 드리프트 방지. stdout(exit 0) 이 컨텍스트로 들어간다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

mkdir -p docs 2>/dev/null || true # comments §3 / ai-process §1: docs/ 보장

ctx="[llm-rules 컨벤션 — 항상 준수]
- arrow function 만, return type 미명시, any/unknown 금지, 코드 주석 금지(JSDoc 만), 2회 이상일 때만 공통화.
- named export 기본, 타입은 원본에서 유도(z.infer/ReturnType/Pick/Omit), useCallback/useMemo 금지(React Compiler).
- FSD 의존은 app→pages→widgets→features→entities→shared 위→아래로만.
- 커밋: Conventional Commits, author 사용자 단독, Co-Authored-By/Claude 트레일러 금지, 요청 전 commit/push 금지.
- 시크릿은 .env+getEnv() 로만. 모호하면 추측하지 말고 1줄 객관식으로 질문.
세부: ~/.claude/convention/*.md"

if [ -f docs/PROCESS.md ]; then
    process="$(head -n 200 docs/PROCESS.md)"
    ctx="$ctx

[현재 작업 상태 — docs/PROCESS.md (앞부분)]
$process"
fi

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
