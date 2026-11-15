#!/usr/bin/env bash
set -euo pipefail

REPO="${LLM_RULES_REPO:-B-HS/llm-rules}"
VERSION="${LLM_RULES_VERSION:-latest}"
[ "$VERSION" != "latest" ] && VERSION="v${VERSION#v}"
EDITION="${1:-${LLM_RULES_EDITION:-}}"
[ $# -gt 0 ] && shift

usage() {
    echo "사용법: bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/$REPO/main/install-files/install.sh)\" llm-rules <에디션> [설치 옵션]"
    echo "에디션: claude-code | codex | opencode | pi"
    echo "예: ... llm-rules codex --global --all"
}

case "$EDITION" in
    claude-code | codex | opencode | pi) ;;
    *)
        usage
        exit 1
        ;;
esac

for required in curl tar bun; do
    command -v "$required" >/dev/null 2>&1 || {
        echo "오류: $required 가 필요합니다."
        [ "$required" = "bun" ] && echo "Bun 설치: https://bun.sh"
        exit 1
    }
done

SOURCE_DIR="$(mktemp -d)"
trap 'rm -rf "$SOURCE_DIR"' EXIT
INSTALLER="$SOURCE_DIR/scripts/install-$EDITION.ts"

if [ "$VERSION" = "latest" ]; then
    BUNDLE_URL="https://github.com/$REPO/releases/latest/download/llm-rules.tar.gz"
else
    BUNDLE_URL="https://github.com/$REPO/releases/download/$VERSION/llm-rules.tar.gz"
fi

curl -fsSL --retry 3 "$BUNDLE_URL" 2>/dev/null | tar -xz -C "$SOURCE_DIR" 2>/dev/null || true
if [ ! -f "$INSTALLER" ]; then
    [ "$VERSION" != "latest" ] && {
        echo "오류: $VERSION 번들에 $EDITION 설치기가 없습니다."
        exit 1
    }
    curl -fsSL --retry 3 "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$SOURCE_DIR" --strip-components=1
fi

echo "llm-rules $EDITION 에디션 설치 ($REPO $VERSION)"
if [ -r /dev/tty ]; then
    bun run "$INSTALLER" "$@" </dev/tty
else
    bun run "$INSTALLER" "$@"
fi
