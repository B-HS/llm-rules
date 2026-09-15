#!/usr/bin/env bash
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
direct_file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
patch="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
files="$({ printf '%s\n' "$direct_file"; printf '%s\n' "$patch" | sed -nE 's/^\*\*\* (Add|Update) File: //p'; } | awk 'NF && !seen[$0]++')"

if [ -n "$files" ]; then
    should_scan=0
    while IFS= read -r file; do
        case "$file" in
            *.md | *.mdx | *.txt) ;;
            *) should_scan=1 ;;
        esac
    done <<< "$files"
    [ "$should_scan" -eq 0 ] && exit 0
fi

payload="$(printf '%s' "$input" | jq -r '[.tool_input.content // empty, .tool_input.new_string // empty, (.tool_input.edits // [] | map(.new_string) | join("\n"))] | join("\n")' 2>/dev/null)"
if [ -n "$patch" ]; then
    added="$(printf '%s\n' "$patch" | sed -nE '/^\+\+\+/d; s/^\+//p')"
    payload="$payload
$added"
fi
[ -z "$payload" ] && exit 0

hit=""
printf '%s' "$payload" | grep -Eq 'AKIA[0-9A-Z]{16}' && hit="AWS Access Key"
printf '%s' "$payload" | grep -Eq 'gh[pousr]_[A-Za-z0-9]{30,}' && hit="GitHub token"
printf '%s' "$payload" | grep -Eq 'sk-[A-Za-z0-9]{20,}' && hit="API secret key"
printf '%s' "$payload" | grep -Eq -- '-----BEGIN [A-Z ]*PRIVATE KEY-----' && hit="Private key block"
printf '%s' "$payload" | grep -Eq 'xox[baprs]-[A-Za-z0-9-]{10,}' && hit="Slack token"

if [ -n "$hit" ]; then
    echo "차단: 작성하려는 코드에 시크릿으로 보이는 값이 있습니다 ($hit)." >&2
    echo "security.md에 따라 값은 저장소 밖에서 관리하세요." >&2
    exit 2
fi
