#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
source="$(printf '%s' "$input" | jq -r '.source // "startup"' 2>/dev/null)"
[ -z "$cwd" ] && cwd="$PWD"

convention_dir=""
for candidate in "${LLM_RULES_CONVENTION_DIR:-}" "$cwd/.llm-rules" "$cwd/.codex/llm-rules" "$HOME/.codex/llm-rules"; do
    if [ -n "$candidate" ] && [ -f "$candidate/index.md" ]; then
        convention_dir="$candidate"
        break
    fi
done

if [ -n "$convention_dir" ]; then
    case "$convention_dir" in "$HOME"/*) convention_dir="~${convention_dir#"$HOME"}" ;; esac
    detail="규칙 원문: $convention_dir/*.md"
else
    detail="규칙 원문 미설치: install-codex의 instructions 항목을 설치하세요."
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
- 새 tool-using 작업 또는 startup·resume·clear·compact 재개에서는 실행 전에 workflow 사용 여부를 한 번 묻고 답을 기다립니다. 현재 요청이 이미 선택했거나 workflow Skill을 직접 호출했으면 중복 질문하지 않습니다.
- handoff·PROCESS·prepare-new 기반 재개는 SessionStart source가 아니므로 해당 Skill·Command·재개 프롬프트의 첫 단계에서 같은 질문을 수행합니다. 사용하지 않으면 main이 직접 수행합니다.
- workflow 사용 시 현재 세션 모델을 강제 교체하지 않습니다. 복잡·고위험 통합은 Sol high, 일반 분석·구현은 Terra medium/high, 좁고 반복적인 조사·검증은 Luna low/medium, 특히 어려운 판정만 high 이상으로 명시 배정합니다.
- 사용을 선택하면 Codex Subagent workflow를 적용합니다. main은 요구사항·분해·통합·Git을 소유하고 subagent는 commit·push하지 않습니다. 사용하지 않으면 main이 직접 수행하되 나머지 규칙은 유지합니다.
- arrow function, any·enum·코드 주석·매직넘버·이모지, AI 트레일러·git add -A·force push를 금지합니다. .env와 키 파일을 읽거나 쓰지 않습니다.
- 변경 위험에 비례한 최소 검증만 실행하고 같은 변경 상태의 성공 결과는 재사용합니다.
- $detail 필요한 전문만 작업 직전에 읽고, 전체 규칙과 전체 PROCESS는 필요할 때만 로드합니다.
- main은 검증 뒤 독립적으로 되돌릴 수 있는 단위로 선별 staging하고 Conventional Commit을 별도 승인 없이 자동 commit·push합니다. 모든 force push는 금지합니다."

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

jq -nc --arg context "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$context}}'
