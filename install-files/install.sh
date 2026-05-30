#!/usr/bin/env bash
set -euo pipefail

export BASE_URL="${LLM_RULES_BASE_URL:-https://raw.githubusercontent.com/B-HS/llm-rules/main}"
export CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
export TARGET="$CLAUDE_DIR/CLAUDE.md"
export DEST="$CLAUDE_DIR/convention"
export MODE="${LLM_RULES_MODE:-}"
export DOCS="index ai-process common comments frontend fsd query backend desktop"

echo "▶ LLM Rules 컨벤션 설치"
echo "  소스 : $BASE_URL/docs/convention"
echo "  대상 : $TARGET"
echo "  사본 : $DEST"

command -v curl >/dev/null 2>&1 || { echo "✗ curl 가 필요합니다."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "✗ python3 가 필요합니다."; exit 1; }

mkdir -p "$DEST"
echo "▶ 컨벤션 문서 다운로드"
for name in $DOCS; do
    curl -fsSL "$BASE_URL/docs/convention/$name.md" -o "$DEST/$name.md"
    echo "  ✓ $name.md"
done

echo "▶ CLAUDE.md 갱신"
python3 <<'PY'
import os, re, sys, shutil

target = os.environ["TARGET"]
mode = os.environ.get("MODE", "")
docs = os.environ["DOCS"].split()

BEGIN = "<!-- BEGIN: rules-convention (managed by rules/scripts/sync-claude-md.ts) -->"
END = "<!-- END: rules-convention -->"
imports = "\n".join("@~/.claude/convention/%s.md" % d for d in docs)
block = "%s\n## 코드 컨벤션\n아래 컨벤션 문서를 항상 참고하여 코드를 작성한다.\n%s\n%s" % (BEGIN, imports, END)

orig = ""
if os.path.exists(target):
    with open(target, encoding="utf-8") as f:
        orig = f.read()

def strip_legacy(s):
    pat = re.compile(r"\n*#{1,6}[^\n]*컨벤션[^\n]*\n(?:(?!\s*#{1,6}\s)[^\n]*\n?)*?\s*@\S*convention\S*\.md[^\n]*")
    if pat.search(s):
        return pat.sub("", s)
    return "\n".join(l for l in s.split("\n") if not re.search(r"@\S*convention\S*\.md", l))

bi, ei = orig.find(BEGIN), orig.find(END)
if bi != -1 and ei != -1 and ei > bi:
    before, after = orig[:bi].rstrip(), orig[ei + len(END):].lstrip()
    nxt = "\n\n".join(x for x in [before, block, after] if x) + "\n"
    label = "관리 블록 갱신"
elif orig.strip() == "":
    nxt, label = block + "\n", "신규 생성"
elif re.search(r"@\S*convention\S*\.md|코드\s*컨벤션|컨벤션", orig):
    choice = mode
    if choice not in ("add", "replace"):
        sys.stderr.write("\n────────── 기존 CLAUDE.md ──────────\n%s\n────────────────────────────────────\n" % orig.rstrip())
        try:
            tty = open("/dev/tty")
            sys.stderr.write("이미 컨벤션 내용이 있습니다.  [a] 추가(기존 보존) / [r] 교체 / [c] 취소  (기본 a): ")
            sys.stderr.flush()
            ans = tty.readline().strip().lower()
        except Exception:
            ans = "a"
        choice = {"r": "replace", "c": "cancel", "a": "add"}.get(ans, "add")
    if choice == "cancel":
        sys.stderr.write("취소했습니다. CLAUDE.md 변경 없음.\n")
        raise SystemExit(0)
    base = (strip_legacy(orig) if choice == "replace" else orig).rstrip()
    nxt = (base + "\n\n" if base else "") + block + "\n"
    label = "교체" if choice == "replace" else "추가"
else:
    nxt = orig.rstrip() + "\n\n" + block + "\n"
    label = "기존 보존 + 추가"

if nxt != orig:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if os.path.exists(target):
        shutil.copyfile(target, target + ".bak")
        sys.stderr.write("  🗄  백업: %s.bak\n" % target)
    with open(target, "w", encoding="utf-8") as f:
        f.write(nxt)
    sys.stderr.write("  ✓ CLAUDE.md %s\n" % label)
else:
    sys.stderr.write("  ✓ CLAUDE.md 이미 최신 (변경 없음)\n")
PY

echo "✓ 설치 완료 — ~/.claude/CLAUDE.md 가 컨벤션(9개 문서)을 참조합니다."
