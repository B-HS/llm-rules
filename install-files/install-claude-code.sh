#!/usr/bin/env bash
# install-claude-code.sh — Claude Code 전용 원격 설치 (curl 한 줄)
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"
#
# 설치 항목: settings.json(hooks+permissions) · hooks 스크립트 · slash commands · subagents · output-style
# 위치     : 글로벌(~/.claude, 기본) 또는 프로젝트(./.claude)
# 소스     : GitHub Release 번들(llm-rules.tar.gz) 1회 다운로드 — 파일별 raw 요청 없음(429 방지)
# 환경변수 : LLM_RULES_CC_LOCATION=global|project  LLM_RULES_CC_TARGET=<dir>
#            LLM_RULES_CC_ITEMS="settings hooks commands agents output-style"
#            LLM_RULES_VERSION=v1.2.3(기본 latest)  LLM_RULES_REPO=<owner/repo>
set -euo pipefail

REPO="${LLM_RULES_REPO:-B-HS/llm-rules}"
VERSION="${LLM_RULES_VERSION:-latest}"
[ "$VERSION" != "latest" ] && VERSION="v${VERSION#v}"

HOOKS="guard-commit.sh lint-edit.sh scan-secrets.sh verify-on-stop.sh session-context.sh reinject-rules.sh"
COMMANDS="audit-conventions audit-fsd audit-backend-domain audit-query verify process save-docs log-feedback"
AGENTS="convention-reviewer fsd-dependency-reviewer type-utility-reviewer backend-convention-reviewer security-reviewer tanstack-query-reviewer desktop-security-reviewer"

command -v curl >/dev/null 2>&1 || { echo "✗ curl 가 필요합니다."; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "✗ tar 가 필요합니다."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "✗ python3 가 필요합니다."; exit 1; }

# --- 위치 선택 ---
LOCATION="${LLM_RULES_CC_LOCATION:-}"
TARGET="${LLM_RULES_CC_TARGET:-}"
if [ -z "$LOCATION" ] && [ -z "$TARGET" ]; then
    if [ -r /dev/tty ]; then
        printf "설치 위치?  [1] 글로벌(~/.claude)  [2] 프로젝트(%s/.claude)  (기본 1): " "$(pwd)" > /dev/tty
        read -r loc < /dev/tty || loc=1
        [ "$loc" = "2" ] && LOCATION="project" || LOCATION="global"
    else
        LOCATION="global"
    fi
fi
if [ -n "$TARGET" ]; then CLAUDE_DIR="$TARGET/.claude"; LOCATION="project"
elif [ "$LOCATION" = "project" ]; then CLAUDE_DIR="$(pwd)/.claude"
else CLAUDE_DIR="$HOME/.claude"; LOCATION="global"; fi

# --- 항목 선택 ---
ITEMS="${LLM_RULES_CC_ITEMS:-}"
if [ -z "$ITEMS" ]; then
    if [ -r /dev/tty ]; then
        printf "항목? 쉼표 다중선택 [1]settings [2]hooks [3]commands [4]agents [5]output-style (기본 a=전체): " > /dev/tty
        read -r sel < /dev/tty || sel="a"
        case "$sel" in
            a* | "") ITEMS="settings hooks commands agents output-style" ;;
            *) ITEMS=""
               case "$sel" in *1*) ITEMS="$ITEMS settings";; esac
               case "$sel" in *2*) ITEMS="$ITEMS hooks";; esac
               case "$sel" in *3*) ITEMS="$ITEMS commands";; esac
               case "$sel" in *4*) ITEMS="$ITEMS agents";; esac
               case "$sel" in *5*) ITEMS="$ITEMS output-style";; esac ;;
        esac
    else
        ITEMS="settings hooks commands agents output-style"
    fi
fi

echo "▶ Claude Code 전용 설치"
echo "  소스 : $REPO ($VERSION)"
echo "  위치 : $LOCATION → $CLAUDE_DIR"
echo "  항목 :$ITEMS"

# --- 번들 1회 다운로드 ---
SRC="$(mktemp -d)"
trap 'rm -rf "$SRC"' EXIT
echo "▶ 번들 다운로드"
if [ "$VERSION" = "latest" ]; then BUNDLE_URL="https://github.com/$REPO/releases/latest/download/llm-rules.tar.gz"
else BUNDLE_URL="https://github.com/$REPO/releases/download/$VERSION/llm-rules.tar.gz"; fi
if curl -fsSL --retry 3 "$BUNDLE_URL" 2>/dev/null | tar -xz -C "$SRC" 2>/dev/null; then
    echo "  ✓ release 번들 ($VERSION)"
else
    [ "$VERSION" != "latest" ] && { echo "✗ 릴리스 $VERSION 번들을 받지 못했습니다."; exit 1; }
    curl -fsSL --retry 3 "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$SRC" --strip-components=1
    echo "  ✓ main 소스 (release 없음 → 대체)"
fi
ASSETS="$SRC/docs/claudecode/assets"

has_item() { case " $ITEMS " in *" $1 "*) return 0;; *) return 1;; esac; }
dl() { cp "$ASSETS/$1" "$2"; }

if has_item hooks; then
    mkdir -p "$CLAUDE_DIR/hooks/llm-rules"
    echo "▶ hooks"
    for h in $HOOKS; do dl "hooks/$h" "$CLAUDE_DIR/hooks/llm-rules/$h"; chmod +x "$CLAUDE_DIR/hooks/llm-rules/$h"; echo "  ✓ $h"; done
fi
if has_item commands; then
    mkdir -p "$CLAUDE_DIR/commands/llm-rules"
    echo "▶ commands"
    for c in $COMMANDS; do dl "commands/$c.md" "$CLAUDE_DIR/commands/llm-rules/$c.md"; echo "  ✓ /llm-rules:$c"; done
fi
if has_item agents; then
    mkdir -p "$CLAUDE_DIR/agents"
    echo "▶ agents"
    for a in $AGENTS; do dl "agents/$a.md" "$CLAUDE_DIR/agents/$a.md"; echo "  ✓ $a"; done
fi
if has_item output-style; then
    mkdir -p "$CLAUDE_DIR/output-styles"
    dl "output-styles/llm-rules.md" "$CLAUDE_DIR/output-styles/llm-rules.md"
    echo "▶ output-style ✓ (활성화: /output-style llm-rules)"
fi

if has_item settings; then
    echo "▶ settings.json 병합"
    CC_DIR="$CLAUDE_DIR" CC_LOCATION="$LOCATION" CC_TMPL="$ASSETS/settings.json" python3 <<'PY'
import json, os, shutil

claude_dir = os.environ["CC_DIR"]
location = os.environ["CC_LOCATION"]
tmpl = json.load(open(os.environ["CC_TMPL"], encoding="utf-8"))
path = os.path.join(claude_dir, "settings.json")

base = "$HOME/.claude/hooks/llm-rules" if location == "global" else "$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules"
hooks = json.loads(json.dumps(tmpl["hooks"]).replace("$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules", base))

cur = {}
if os.path.exists(path):
    try:
        cur = json.load(open(path, encoding="utf-8"))
    except Exception:
        raise SystemExit("✗ %s 가 유효한 JSON 이 아닙니다. 수동 확인 후 다시 실행하세요." % path)

cur.setdefault("permissions", {})
for k in ("allow", "ask", "deny"):
    merged = list(dict.fromkeys((cur["permissions"].get(k) or []) + (tmpl.get("permissions", {}).get(k) or [])))
    if merged:
        cur["permissions"][k] = merged

MARK = "/hooks/llm-rules/"
def is_ours(entry):
    return any(MARK in (h.get("command") or "") for h in (entry.get("hooks") or []))

cur.setdefault("hooks", {})
for event, entries in hooks.items():
    keep = [e for e in (cur["hooks"].get(event) or []) if not is_ours(e)]
    cur["hooks"][event] = keep + entries

os.makedirs(claude_dir, exist_ok=True)
if os.path.exists(path):
    shutil.copyfile(path, path + ".bak")
    print("  🗄  백업: %s.bak" % path)
json.dump(cur, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(path, "a", encoding="utf-8").write("\n")
print("  ✓ settings.json 병합 완료")
PY
fi

echo "✓ 설치 완료. 새 세션에서 /hooks 로 확인하세요."
[ "$LOCATION" = "global" ] && echo "  (글로벌 hook 은 모든 프로젝트에 적용됩니다. 특정 레포만 원하면 LLM_RULES_CC_LOCATION=project 로 실행)"
exit 0
