#!/usr/bin/env bash
# session-context.sh — SessionStart(startup|resume|clear|compact)
# 세션 시작/재개/클리어/컴팩션 시 컨벤션 핵심 + (있으면) docs/PROCESS.md 를 컨텍스트로 주입한다.
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
- arrow function 만, any/enum 금지(unknown 은 경계에서 즉시 좁힘), 코드 주석 금지(JSDoc 만), 2회 이상일 때만 공통화, 매직넘버·이모지 금지, early return·const 우선.
- named export 기본, 타입은 원본에서 유도(z.infer/ReturnType/Pick/Omit), useCallback/useMemo 금지(React Compiler), FSD 의존은 app→pages→widgets→features→entities→shared 위→아래로만, barrel 금지.
- 시크릿은 .env+getEnv() 로만(.env 읽기/쓰기 금지). 종료 전 typecheck→lint/format→관련 test→가능한 실행 확인을 실제로 수행한다.
- Git은 main 오케스트레이터만 소유한다. 변경을 독립적으로 되돌릴 수 있는 논리 단위로 선별 스테이징·검토·자동 commit/push 하고, Conventional Commit·사용자 단독 author·AI 트레일러 금지·force push 금지를 지킨다.
$detail

[작업 개시 프로토콜 — 도구를 쓰는 실행 작업에 적용]
1. 단순 대화 답변은 직접 처리할 수 있다. 파일 조사·구현·테스트·리서치처럼 도구를 쓰는 실행 작업은 Claude Code subagent workflow로 시작한다.
2. Fable high 메인은 요구사항·작업 분해·의존 관계·통합·최종 검증·Git만 소유한다. Sonnet high 서브에이전트에는 정확한 목표/DoD, 실제 파일·심볼 근거, 파일 소유권·비목표, 적용 규칙·커맨드, 구현 순서, edge case·금지 우회, 검증 명령·합격 기준, 보고 형식, Git 금지, 의존·대기 관계를 모두 전달한다.
3. 독립적인 읽기·구현·검증 작업은 병렬로 위임하고, 같은 파일을 쓰거나 선행 결과가 필요한 작업은 직렬로 진행한다. 서브에이전트 결과는 메인이 실제 diff와 검증으로 통합한다.
4. 2개 파일 또는 2단계 이상 작업은 docs/PROCESS.md 체크리스트를 먼저 읽고 실제 진척에 맞춰 갱신한다. 결정은 docs/acknowledge에 남긴다.
5. 신규 스택·외부 API는 공식 문서를 확인한다. 범위를 바꾸는 중대한 모호성만 한 번에 질문하고, 안전한 범위 안의 합리적 가정은 명시하고 진행한다."

if [ -f docs/PROCESS.md ]; then
    process="$(head -n 200 docs/PROCESS.md)"
    ctx="$ctx

[현재 작업 상태 — docs/PROCESS.md (앞부분)]
$process"
fi

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
