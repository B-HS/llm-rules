#!/usr/bin/env bash
set -euo pipefail

export BASE_URL="${LLM_RULES_BASE_URL:-https://raw.githubusercontent.com/B-HS/llm-rules/main}"
export TARGET_DIR="${LLM_RULES_TARGET:-$PWD}"
export DOCS="index ai-process common comments security git frontend fsd query backend desktop"
export NO_CURSOR="${LLM_RULES_NO_CURSOR:-}"
export NO_AGENTS="${LLM_RULES_NO_AGENTS:-}"

echo "▶ LLM Rules — AGENTS.md / .cursor/rules 생성"
echo "  소스 : $BASE_URL/docs/convention"
echo "  대상 : $TARGET_DIR"

command -v curl >/dev/null 2>&1 || { echo "✗ curl 가 필요합니다."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "✗ python3 가 필요합니다."; exit 1; }

TMP="$(mktemp -d)"
export TMP
trap 'rm -rf "$TMP"' EXIT

echo "▶ 컨벤션 문서 다운로드"
for name in $DOCS; do
    curl -fsSL "$BASE_URL/docs/convention/$name.md" -o "$TMP/$name.md"
    echo "  ✓ $name.md"
done

python3 <<'PY'
import os, shutil

tmp = os.environ["TMP"]
target = os.environ["TARGET_DIR"]
docs = os.environ["DOCS"].split()
no_cursor = os.environ.get("NO_CURSOR", "")
no_agents = os.environ.get("NO_AGENTS", "")

BEGIN = "<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->"
END = "<!-- END: llm-rules -->"

sections = []
for name in docs:
    with open(os.path.join(tmp, name + ".md"), encoding="utf-8") as f:
        sections.append(f.read().strip())
inlined = "\n\n".join(sections)

intro = (
    "# 코딩 컨벤션 (LLM Rules)\n\n"
    "> 아래는 `llm-rules` 가 생성·관리하는 코딩 컨벤션 전문이다. 이 블록은 자동 생성되므로 직접 수정하지 않는다.\n"
    "> Claude 외 에이전트(Codex · Cursor 등)는 이 파일을 베이스 룰로 읽는다. 모든 코드 작업에서 아래 규칙을 따른다."
)
block = "%s\n\n%s\n\n%s\n\n%s" % (BEGIN, intro, inlined, END)

if not no_agents:
    agents_path = os.path.join(target, "AGENTS.md")
    orig = ""
    if os.path.exists(agents_path):
        with open(agents_path, encoding="utf-8") as f:
            orig = f.read()
    bi, ei = orig.find(BEGIN), orig.find(END)
    if bi != -1 and ei != -1 and ei > bi:
        before, after = orig[:bi].rstrip(), orig[ei + len(END):].lstrip()
        nxt = "\n\n".join(x for x in [before, block, after] if x) + "\n"
        label = "관리 블록 갱신"
    elif orig.strip() == "":
        nxt, label = block + "\n", "생성"
    else:
        nxt, label = orig.rstrip() + "\n\n" + block + "\n", "기존 보존 + 추가"
    if nxt != orig:
        if os.path.exists(agents_path):
            shutil.copyfile(agents_path, agents_path + ".bak")
            print("  🗄  백업: AGENTS.md.bak")
        with open(agents_path, "w", encoding="utf-8") as f:
            f.write(nxt)
        print("  ✓ AGENTS.md %s" % label)
    else:
        print("  ✓ AGENTS.md 이미 최신 (변경 없음)")

if not no_cursor:
    cursor_dir = os.path.join(target, ".cursor", "rules")
    os.makedirs(cursor_dir, exist_ok=True)
    mdc = "---\ndescription: 프로젝트 코딩 컨벤션 (LLM Rules) — 항상 적용\nalwaysApply: true\n---\n\n%s\n" % inlined
    with open(os.path.join(cursor_dir, "llm-rules.mdc"), "w", encoding="utf-8") as f:
        f.write(mdc)
    print("  ✓ .cursor/rules/llm-rules.mdc 생성")
PY

echo "✓ 완료 — Codex(AGENTS.md) · Cursor(.cursor/rules) 가 컨벤션($(echo $DOCS | wc -w | tr -d ' ')개 문서)을 따릅니다."
