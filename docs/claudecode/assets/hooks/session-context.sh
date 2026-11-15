#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
cwd="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)"
[ -z "$cwd" ] && cwd="${CLAUDE_PROJECT_DIR:-$PWD}"

process_path="$cwd/docs/PROCESS.md"
[ -f "$process_path" ] || exit 0

process="$(
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
    ' "$process_path"
)"
[ -z "$process" ] && exit 0

context="[docs/PROCESS.md 의 진행 중인 작업]
$process
세부가 필요하면 해당 섹션을 읽습니다."

jq -nc --arg context "$context" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$context}}'
