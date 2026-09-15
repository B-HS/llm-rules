#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

ctx='[llm-rules 리마인더] arrow function, 코드 주석·any·enum·매직넘버·이모지·useCallback·useMemo 금지. named export와 FSD 방향을 지키고 시크릿·.env에 접근하지 않습니다. Conventional Commits, AI 트레일러·git add -A·force push 금지를 지킵니다. 스텝마다 docs/PROCESS.md를 갱신하고 종료 전 typecheck→lint·format→test를 실행합니다. 필요하면 $llm-rules-process와 $llm-rules-save-docs를 사용합니다.'

jq -nc --arg context "$ctx" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$context}}'
