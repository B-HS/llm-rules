#!/usr/bin/env bash
# reinject-rules.sh — UserPromptSubmit
# 매 프롬프트마다 "절대 금지" 안티패턴을 짧게 재주입해 긴 컨텍스트 드리프트를 막는다.
# 짧게 유지(토큰 절약). stdout(exit 0) 또는 additionalContext 가 컨텍스트로 들어간다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

ctx="[리마인더] arrow-fn only · 주석 금지(JSDoc 만) · any/unknown 금지 · useCallback/useMemo 금지 · named export · FSD 의존 방향 위→아래 · Conventional Commits · Co-Authored-By 금지 · 요청 전 commit/push 금지 · 시크릿 하드코딩 금지 · 모호하면 1줄 객관식 질문."

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit", additionalContext:$c}}'
exit 0
