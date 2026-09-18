#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
source="$(printf '%s' "$input" | jq -r '.source // "startup"' 2>/dev/null)"
[ -z "$cwd" ] && cwd="${CLAUDE_PROJECT_DIR:-$PWD}"

convention_dir=""
for candidate in "${LLM_RULES_CONVENTION_DIR:-}" "$cwd/.claude/convention" "$HOME/.claude/convention"; do
    if [ -n "$candidate" ] && [ -f "$candidate/index.md" ]; then
        convention_dir="$candidate"
        break
    fi
done

if [ -n "$convention_dir" ]; then
    case "$convention_dir" in "$HOME"/*) convention_dir="~${convention_dir#"$HOME"}" ;; esac
    detail="규칙 원문: $convention_dir/*.md"
else
    detail="규칙 원문 미설치: install-files/install.sh로 설치하세요."
fi

active_process_section() {
    awk '
        function print_label(value) {
            sub(/ — .*/, "", value)
            print value
        }
        function emit(    lines, count, i, pending) {
            count = split(section, lines, "\n")
            print lines[1]
            for (i = 2; i <= count && pending < 4; i++) {
                if (lines[i] ~ /^- \[ \]/) {
                    print_label(lines[i])
                    pending++
                }
            }
            if (pending == 0) print "- 미완료 체크박스 없음 — 세부가 필요할 때 해당 PROCESS 섹션을 읽습니다."
        }
        /^## 작업:/ {
            if (in_section && active) {
                emit()
                found = 1
                exit
            }
            in_section = 1
            skipped = ($0 ~ /\((완료|보류)\)/)
            active = ($0 ~ /\(진행 중\)/)
            section = $0 ORS
            next
        }
        in_section && /^## / {
            if (active) {
                emit()
                found = 1
                exit
            }
            in_section = 0
            active = 0
            section = ""
            next
        }
        in_section {
            section = section $0 ORS
            if (!skipped && $0 ~ /^- \[ \]/) active = 1
        }
        END {
            if (!found && in_section && active) emit()
        }
    ' "$1"
}

ctx="[llm-rules 세션 경계: $source]
- 새 tool-using 작업 또는 startup·resume·clear·compact 재개에서는 실행 전에 workflow 사용 여부를 한 번 묻고 답을 기다립니다. 현재 요청이 이미 선택했거나 /llm-rules:workflow를 직접 호출했으면 중복 질문하지 않습니다.
- handoff·PROCESS·prepare-new 기반 재개는 SessionStart source가 아니므로 해당 Command·재개 프롬프트의 첫 단계에서 같은 질문을 수행합니다. 사용하지 않으면 main이 직접 수행합니다.
- workflow 사용 시 Fable main, Sonnet 구현·조사·주 검증, Haiku의 제한된 보조 판정으로 역할을 나눕니다. 독립 작업은 병렬, 공유 파일·선행 의존 작업은 직렬로 처리합니다.
- 필수 guardrail: arrow function, any·enum·코드 주석·매직넘버·이모지, useCallback·useMemo, 시크릿·환경 파일 접근을 금지합니다.
- 변경 위험에 비례한 최소 검증만 실행하고 같은 변경 상태의 성공 결과는 재사용합니다.
- $detail 필요한 전문만 작업 직전에 읽고, 전체 규칙과 전체 PROCESS는 필요할 때만 로드합니다.
- Git은 main 오케스트레이터만 소유한다. 변경을 독립적으로 되돌릴 수 있는 논리 단위로 선별 스테이징·검토·자동 commit/push 하고, Conventional Commit·사용자 단독 author·AI 트레일러 금지·force push 금지를 지킨다. 일반 commit/push에는 승인이나 Git 전용 guard를 두지 않는다."

process_path="$cwd/docs/PROCESS.md"
if [ -f "$process_path" ]; then
    process="$(active_process_section "$process_path")"
    if [ -n "$process" ]; then
        ctx="$ctx

[활성 작업 — docs/PROCESS.md 발췌]
$process"
    else
        ctx="$ctx
- PROCESS: 활성 체크리스트가 없습니다. 새 복합 작업이면 실행 전에 생성합니다."
    fi
fi

jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
