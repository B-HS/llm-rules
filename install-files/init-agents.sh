#!/usr/bin/env bash
set -euo pipefail

REPO="${LLM_RULES_REPO:-B-HS/llm-rules}"
VERSION="${LLM_RULES_VERSION:-latest}"
[ "$VERSION" != "latest" ] && VERSION="v${VERSION#v}"
export TARGET_DIR="${LLM_RULES_TARGET:-$PWD}"
export DOCS="index ai-process common comments security git frontend fsd query backend desktop"
export NO_CURSOR="${LLM_RULES_NO_CURSOR:-}"
export NO_AGENTS="${LLM_RULES_NO_AGENTS:-}"
export GLOBALS="${LLM_RULES_GLOBAL:-}"

echo "▶ LLM Rules — AGENTS.md(코어) / .llm-rules(전문) / .cursor/rules 생성"
echo "  소스 : $REPO ($VERSION)"
if [ -n "$GLOBALS" ]; then
    echo "  대상 : 글로벌 ($GLOBALS)"
else
    echo "  대상 : $TARGET_DIR"
fi

command -v curl >/dev/null 2>&1 || { echo "✗ curl 가 필요합니다."; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "✗ tar 가 필요합니다."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "✗ python3 가 필요합니다."; exit 1; }

TMP="$(mktemp -d)"
export TMP
trap 'rm -rf "$TMP"' EXIT

echo "▶ 번들 다운로드"
if [ "$VERSION" = "latest" ]; then BUNDLE_URL="https://github.com/$REPO/releases/latest/download/llm-rules.tar.gz"
else BUNDLE_URL="https://github.com/$REPO/releases/download/$VERSION/llm-rules.tar.gz"; fi
if curl -fsSL --retry 3 "$BUNDLE_URL" 2>/dev/null | tar -xz -C "$TMP" 2>/dev/null; then
    echo "  ✓ release 번들 ($VERSION)"
else
    [ "$VERSION" != "latest" ] && { echo "✗ 릴리스 $VERSION 번들을 받지 못했습니다."; exit 1; }
    curl -fsSL --retry 3 "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$TMP" --strip-components=1
    echo "  ✓ main 소스 (release 없음 → 대체)"
fi
cp "$TMP/docs/agents-core.md" "$TMP/agents-core.md"
for name in $DOCS; do cp "$TMP/docs/convention/$name.md" "$TMP/$name.md"; done
echo "  ✓ agents-core.md + 컨벤션 $(echo $DOCS | wc -w | tr -d ' ')개"

python3 <<'PY'
import os, shutil

tmp = os.environ["TMP"]
target = os.environ["TARGET_DIR"]
docs = os.environ["DOCS"].split()
no_cursor = os.environ.get("NO_CURSOR", "")
no_agents = os.environ.get("NO_AGENTS", "")
globals_raw = os.environ.get("GLOBALS", "").strip()

BEGIN = "<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->"
END = "<!-- END: llm-rules -->"
DIR_TOKEN = "{{LLM_RULES_DIR}}"
CODEX_DOC_LIMIT = 32 * 1024

home = os.path.expanduser("~")
GLOBAL_TARGETS = {
    "codex": os.path.join(home, ".codex"),
    "opencode": os.path.join(home, ".config", "opencode"),
    "pi": os.path.join(home, ".pi", "agent"),
}

with open(os.path.join(tmp, "agents-core.md"), encoding="utf-8") as f:
    core_raw = f.read().strip()

sections = []
for name in docs:
    with open(os.path.join(tmp, name + ".md"), encoding="utf-8") as f:
        sections.append(f.read().strip())
inlined = "\n\n".join(sections)

intro = (
    "# 코딩 컨벤션 (LLM Rules)\n\n"
    "> 아래는 `llm-rules` 가 생성·관리하는 코딩 컨벤션 코어다. 이 블록은 자동 생성되므로 직접 수정하지 않는다.\n"
    "> 모든 코드 작업에서 아래 규칙을 따르고, §0 참조 프로토콜에 따라 전문 문서를 읽는다."
)

def write_agents_md(agents_path, docs_dir, label):
    block = "%s\n\n%s\n\n%s\n\n%s" % (BEGIN, intro, core_raw.replace(DIR_TOKEN, docs_dir), END)
    if len(block.encode("utf-8")) > CODEX_DOC_LIMIT - 2048:
        print("  ⚠️  %s: 코어 블록이 Codex 32KiB 한도에 근접/초과" % label)
    orig = ""
    if os.path.exists(agents_path):
        with open(agents_path, encoding="utf-8") as f:
            orig = f.read()
    bi, ei = orig.find(BEGIN), orig.find(END)
    if bi != -1 and ei != -1 and ei > bi:
        before, after = orig[:bi].rstrip(), orig[ei + len(END):].lstrip()
        nxt = "\n\n".join(x for x in [before, block, after] if x) + "\n"
        result = "관리 블록 갱신"
    elif orig.strip() == "":
        nxt, result = block + "\n", "생성"
    else:
        nxt, result = orig.rstrip() + "\n\n" + block + "\n", "기존 보존 + 추가"
    if nxt != orig:
        os.makedirs(os.path.dirname(agents_path) or ".", exist_ok=True)
        if os.path.exists(agents_path):
            shutil.copyfile(agents_path, agents_path + ".bak")
            print("  🗄  백업: %s.bak" % agents_path)
        with open(agents_path, "w", encoding="utf-8") as f:
            f.write(nxt)
        print("  ✓ %s %s" % (label, result))
    else:
        print("  ✓ %s 이미 최신 (변경 없음)" % label)

def copy_docs(docs_dir_path, label):
    os.makedirs(docs_dir_path, exist_ok=True)
    for name in docs:
        shutil.copyfile(os.path.join(tmp, name + ".md"), os.path.join(docs_dir_path, name + ".md"))
    print("  ✓ %s: 전문 %d개 복사 → %s" % (label, len(docs), docs_dir_path))

if globals_raw:
    names = list(GLOBAL_TARGETS) if globals_raw == "all" else [n.strip() for n in globals_raw.replace(",", " ").split()]
    for name in names:
        if name not in GLOBAL_TARGETS:
            raise SystemExit("✗ 알 수 없는 LLM_RULES_GLOBAL 대상: %s (codex | opencode | pi | all)" % name)
        base = GLOBAL_TARGETS[name]
        docs_dir = os.path.join(base, "llm-rules")
        print("▶ 글로벌: %s (%s)" % (name, base))
        write_agents_md(os.path.join(base, "AGENTS.md"), docs_dir, "%s AGENTS.md" % name)
        copy_docs(docs_dir, "%s llm-rules/" % name)
else:
    if not no_agents:
        write_agents_md(os.path.join(target, "AGENTS.md"), ".llm-rules", "AGENTS.md")
        copy_docs(os.path.join(target, ".llm-rules"), ".llm-rules/")
    if not no_cursor:
        cursor_dir = os.path.join(target, ".cursor", "rules")
        os.makedirs(cursor_dir, exist_ok=True)
        mdc = "---\ndescription: 프로젝트 코딩 컨벤션 (LLM Rules) — 항상 적용\nalwaysApply: true\n---\n\n%s\n" % inlined
        with open(os.path.join(cursor_dir, "llm-rules.mdc"), "w", encoding="utf-8") as f:
            f.write(mdc)
        print("  ✓ .cursor/rules/llm-rules.mdc 생성 (전문 inline)")
PY

echo "✓ 완료 — AGENTS.md 는 코어(≤32KiB), 전문은 llm-rules 디렉토리에서 참조됩니다."
