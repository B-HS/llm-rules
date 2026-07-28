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
- arrow function 만, return type 미명시, any/enum 금지(unknown 은 경계에서만+즉시 좁힘), 코드 주석 금지(JSDoc 만), 2회 이상일 때만 공통화, 매직넘버·이모지 금지, early return·const 우선.
- named export 기본, 타입은 원본에서 유도(z.infer/ReturnType/Pick/Omit), useCallback/useMemo 금지(React Compiler), 폼은 react-hook-form+zodResolver.
- 컴포넌트는 FC<Props>·1파일 1컴포넌트(SFC), 본문 순서 useRef→useState→함수/로직→useEffect.
- FSD 의존은 app→pages→widgets→features→entities→shared 위→아래로만. barrel(index.ts) 금지. 쿼리는 queryOptions 팩토리+QUERY_KEY 배열 키.
- 커밋: Conventional Commits, author 사용자 단독, Co-Authored-By/Claude 트레일러 금지, 요청 전 commit/push 금지(auto-commit/push 합의 레포 예외), git add -A/force push 금지.
- 시크릿은 .env+getEnv() 로만(.env 읽기/쓰기 금지). 종료 전 검증(typecheck→lint→test). 모호하면 추측하지 말고 1줄 객관식으로 질문.
$detail

[작업 개시 프로토콜 — 세션 첫 요청부터 적용]
1. 사용자 프롬프트를 정확하게 분석하고, 일말의·아주 사소한 애매함이라도 추측하지 말고 먼저 물어 확정한 뒤 진행을 시작한다. 질문은 한 번에 모아 객관식으로 하고, 애매함이 없으면 바로 진행한다.
2. 신규 프로젝트이거나 새 기능·라이브러리를 도입할 때 기술 스택이 명시되지 않으면 기본은 컨벤션을 따르되, 어떤 기능(스택)을 쓸지 후보의 장점·단점을 명확하고 짧게 요약해 제시하고 사용자와 정확히 정하고 간다.
3. 정해진 내용은 프롬프트(대화)에만 두지 말고 docs/ 에도 기록한다 — 결정·합의는 docs/acknowledge, 작업 상태·체크리스트는 docs/PROCESS.md.
4. 사용자의 말을 전긍정하지 말고 객관적으로 판단해 기술 타당성을 정확히 평가하고, 문제가 있으면 근거와 대안을 함께 제시한다.
5. git commit·push 는 요청 시에만이 기본이다. 커밋이 예상되는 세션에서 레포에 git config llm-rules.auto-commit / llm-rules.auto-push 가 없으면, 첫 확인 질문 묶음에 자동/수동을 포함해 정하고 git config 로 기록(true=자동)한 뒤 docs/acknowledge 에도 남긴다. 미설정이면 수동(요청 시에만)으로 동작한다. 자동이어도 가드 훅 검사(Conventional Commits·트레일러·시크릿·보호 브랜치·force push)는 항상 선행되고, 커밋 형식·author 단독·선별 스테이징 규칙은 유지한다."

if [ -f docs/PROCESS.md ]; then
    process="$(head -n 200 docs/PROCESS.md)"
    ctx="$ctx

[현재 작업 상태 — docs/PROCESS.md (앞부분)]
$process"
fi

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
