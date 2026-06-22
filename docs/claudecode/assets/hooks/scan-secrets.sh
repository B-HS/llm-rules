#!/usr/bin/env bash
# scan-secrets.sh — PreToolUse(Edit|Write|MultiEdit)
# 작성하려는 내용에 고신뢰 시크릿 패턴이 있으면 차단(exit 2). security §1.
# .md(문서 예시)·기존 검사 대상 외 확장자는 오탐 방지를 위해 건너뛴다.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
case "$file" in
    *.md | *.mdx | *.txt) exit 0 ;; # 문서 내 예시 패턴 오탐 방지
esac

# 새로 쓰는 텍스트만 검사 (Write=content, Edit=new_string, MultiEdit=edits[].new_string)
payload="$(printf '%s' "$input" | jq -r '
  [ .tool_input.content // empty,
    .tool_input.new_string // empty,
    ( .tool_input.edits // [] | map(.new_string) | join("\n") ) ]
  | join("\n")' 2>/dev/null)"
[ -z "$payload" ] && exit 0

hit=""
printf '%s' "$payload" | grep -Eq 'AKIA[0-9A-Z]{16}' && hit="AWS Access Key"
printf '%s' "$payload" | grep -Eq 'gh[pousr]_[A-Za-z0-9]{30,}' && hit="GitHub token"
printf '%s' "$payload" | grep -Eq 'sk-[A-Za-z0-9]{20,}' && hit="API secret key (sk-)"
printf '%s' "$payload" | grep -Eq '\-\-\-\-\-BEGIN [A-Z ]*PRIVATE KEY\-\-\-\-\-' && hit="Private key block"
printf '%s' "$payload" | grep -Eq 'xox[baprs]-[A-Za-z0-9-]{10,}' && hit="Slack token"

if [ -n "$hit" ]; then
    echo "차단: 작성하려는 코드에 시크릿으로 보이는 값이 있습니다 ($hit)." >&2
    echo "→ security §1: 시크릿은 코드에 하드코딩하지 말고 .env + getEnv() 로 분리하세요." >&2
    exit 2
fi
exit 0
