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
- 모든 tool-using 실행 작업은 Codex Subagent workflow로 시작합니다. main은 요구사항·분해·통합·Git을 소유하고 subagent는 commit·push하지 않습니다.
- 독립 범위는 병렬, 공유 파일 또는 선행 의존 범위는 직렬로 배정합니다. 위임에는 목표·완료 조건·실제 파일 근거·소유 범위·규칙·순서·금지 우회·검증·보고 형식·의존 관계를 모두 제공합니다.
- arrow function, any·enum·코드 주석·매직넘버·이모지, AI 트레일러·git add -A·force push를 금지합니다. .env와 키 파일을 읽거나 쓰지 않습니다.
- main은 검증 뒤 독립적으로 되돌릴 수 있는 단위로 선별 staging하고 Conventional Commit을 자동 commit·push합니다. guard는 실행기가 아닌 안전 검증기입니다.
- 종료 전 typecheck→lint·format→test→실행 확인 순서로 검증하고, 작업 상태는 docs/PROCESS.md에 기록합니다.
$detail"

if [ -f "$cwd/docs/PROCESS.md" ]; then
    process="$(head -n 200 "$cwd/docs/PROCESS.md")"
    ctx="$ctx

[현재 작업 상태]
$process"
fi

jq -nc --arg context "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$context}}'
