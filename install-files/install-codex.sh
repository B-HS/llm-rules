#!/usr/bin/env bash
set -euo pipefail

REPO="${LLM_RULES_REPO:-B-HS/llm-rules}"
VERSION="${LLM_RULES_VERSION:-latest}"
[ "$VERSION" != "latest" ] && VERSION="v${VERSION#v}"
LOCATION="${LLM_RULES_CODEX_LOCATION:-}"
TARGET="${LLM_RULES_CODEX_TARGET:-}"
ITEMS="${LLM_RULES_CODEX_ITEMS:-}"

command -v curl >/dev/null 2>&1 || { echo "오류: curl이 필요합니다."; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "오류: tar가 필요합니다."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "오류: python3가 필요합니다."; exit 1; }

if [ -z "$LOCATION" ] && [ -z "$TARGET" ]; then
    if [ -r /dev/tty ]; then
        printf "설치 위치 [1] 글로벌 [2] 프로젝트, 기본 1: " > /dev/tty
        read -r choice < /dev/tty || choice=1
        [ "$choice" = "2" ] && LOCATION="project" || LOCATION="global"
    else
        LOCATION="global"
    fi
fi

if [ -n "$TARGET" ]; then
    LOCATION="project"
elif [ "$LOCATION" = "project" ]; then
    TARGET="$PWD"
else
    LOCATION="global"
    TARGET="$HOME/.codex"
fi

if [ -z "$ITEMS" ]; then
    if [ -r /dev/tty ]; then
        printf "항목 [1]instructions [2]hooks [3]skills [4]agents [5]rules, 기본 a=전체: " > /dev/tty
        read -r selection < /dev/tty || selection=a
        case "$selection" in
            a* | "") ITEMS="instructions hooks skills agents rules" ;;
            *)
                ITEMS=""
                case "$selection" in *1*) ITEMS="$ITEMS instructions" ;; esac
                case "$selection" in *2*) ITEMS="$ITEMS hooks" ;; esac
                case "$selection" in *3*) ITEMS="$ITEMS skills" ;; esac
                case "$selection" in *4*) ITEMS="$ITEMS agents" ;; esac
                case "$selection" in *5*) ITEMS="$ITEMS rules" ;; esac
                ;;
        esac
    else
        ITEMS="instructions hooks skills agents rules"
    fi
fi

SOURCE_DIR="$(mktemp -d)"
trap 'rm -rf "$SOURCE_DIR"' EXIT

echo "LLM Rules Codex 설치"
echo "소스: $REPO ($VERSION)"
echo "위치: $LOCATION ($TARGET)"
echo "항목:$ITEMS"

if [ "$VERSION" = "latest" ]; then
    BUNDLE_URL="https://github.com/$REPO/releases/latest/download/llm-rules.tar.gz"
else
    BUNDLE_URL="https://github.com/$REPO/releases/download/$VERSION/llm-rules.tar.gz"
fi

if curl -fsSL --retry 3 "$BUNDLE_URL" 2>/dev/null | tar -xz -C "$SOURCE_DIR" 2>/dev/null; then
    echo "release 번들 다운로드 완료"
else
    [ "$VERSION" != "latest" ] && { echo "오류: $VERSION 번들을 받지 못했습니다."; exit 1; }
    curl -fsSL --retry 3 "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$SOURCE_DIR" --strip-components=1
    echo "main 소스 다운로드 완료"
fi

export LLM_RULES_INSTALL_SOURCE="$SOURCE_DIR"
export LLM_RULES_INSTALL_LOCATION="$LOCATION"
export LLM_RULES_INSTALL_TARGET="$TARGET"
export LLM_RULES_INSTALL_ITEMS="$ITEMS"

python3 <<'PY'
import json
import os
import shutil

source = os.environ["LLM_RULES_INSTALL_SOURCE"]
location = os.environ["LLM_RULES_INSTALL_LOCATION"]
target = os.path.abspath(os.environ["LLM_RULES_INSTALL_TARGET"])
items = set(os.environ["LLM_RULES_INSTALL_ITEMS"].split())
home = os.path.expanduser("~")
codex_dir = os.path.join(home, ".codex") if location == "global" else os.path.join(target, ".codex")
root_dir = codex_dir if location == "global" else target
skills_dir = os.path.join(home, ".agents", "skills") if location == "global" else os.path.join(target, ".agents", "skills")
assets_dir = os.path.join(source, "docs", "codex", "assets")
convention_dir = os.path.join(source, "docs", "convention")
core_path = os.path.join(source, "docs", "agents-core.md")
docs = ["index", "ai-process", "common", "comments", "security", "git", "frontend", "fsd", "query", "backend", "desktop"]
begin = "<!-- BEGIN: llm-rules (managed by llm-rules/scripts/install-codex.ts) -->"
legacy_begin = "<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->"
end = "<!-- END: llm-rules -->"

def install_instructions():
    agents_path = os.path.join(codex_dir, "AGENTS.md") if location == "global" else os.path.join(root_dir, "AGENTS.md")
    docs_dir = os.path.join(codex_dir, "llm-rules") if location == "global" else os.path.join(root_dir, ".llm-rules")
    model_docs_dir = docs_dir if location == "global" else ".llm-rules"
    with open(core_path, encoding="utf-8") as file:
        core = file.read().strip().replace("{{LLM_RULES_DIR}}", model_docs_dir)
    intro = "# 코딩 컨벤션 (LLM Rules)\n\n> 이 블록은 install-codex가 관리합니다. §0 참조 프로토콜에 따라 전문 문서를 읽습니다."
    block = "\n\n".join([begin, intro, core, end])
    original = ""
    if os.path.exists(agents_path):
        with open(agents_path, encoding="utf-8") as file:
            original = file.read()
    marker = begin if begin in original else legacy_begin
    start = original.find(marker)
    finish = original.find(end)
    if start >= 0 and finish > start:
        before = original[:start].rstrip()
        after = original[finish + len(end):].lstrip()
        updated = "\n\n".join(value for value in [before, block, after] if value) + "\n"
    elif original.strip():
        updated = original.rstrip() + "\n\n" + block + "\n"
    else:
        updated = block + "\n"
    os.makedirs(os.path.dirname(agents_path), exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)
    if original and updated != original:
        shutil.copyfile(agents_path, agents_path + ".bak")
    if updated != original:
        with open(agents_path, "w", encoding="utf-8") as file:
            file.write(updated)
    for name in docs:
        shutil.copyfile(os.path.join(convention_dir, name + ".md"), os.path.join(docs_dir, name + ".md"))
    print("instructions 설치 완료: %s" % agents_path)

def is_managed_hook(entry):
    return any("/hooks/llm-rules/" in handler.get("command", "") for handler in entry.get("hooks", []) if isinstance(handler, dict))

def install_hooks():
    source_hooks = os.path.join(assets_dir, "hooks")
    destination_hooks = os.path.join(codex_dir, "hooks", "llm-rules")
    os.makedirs(destination_hooks, exist_ok=True)
    hook_files = [name for name in os.listdir(source_hooks) if name.endswith(".sh")]
    for name in hook_files:
        destination = os.path.join(destination_hooks, name)
        shutil.copyfile(os.path.join(source_hooks, name), destination)
        os.chmod(destination, 0o755)
    hooks_path = os.path.join(codex_dir, "hooks.json")
    current = {}
    if os.path.exists(hooks_path):
        with open(hooks_path, encoding="utf-8") as file:
            current = json.load(file)
        shutil.copyfile(hooks_path, hooks_path + ".bak")
    with open(os.path.join(assets_dir, "hooks.json"), encoding="utf-8") as file:
        template_text = file.read()
    hook_base = "$HOME/.codex/hooks/llm-rules" if location == "global" else "$(git rev-parse --show-toplevel)/.codex/hooks/llm-rules"
    template = json.loads(template_text.replace("{{HOOKS_DIR}}", hook_base))
    current.setdefault("hooks", {})
    for event, entries in template["hooks"].items():
        preserved = [entry for entry in current["hooks"].get(event, []) if not is_managed_hook(entry)]
        current["hooks"][event] = preserved + entries
    current.setdefault("description", template["description"])
    os.makedirs(codex_dir, exist_ok=True)
    with open(hooks_path, "w", encoding="utf-8") as file:
        json.dump(current, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print("hooks 설치 완료: %d개" % len(hook_files))

def install_skills():
    source_skills = os.path.join(assets_dir, "skills")
    os.makedirs(skills_dir, exist_ok=True)
    names = [name for name in os.listdir(source_skills) if os.path.isdir(os.path.join(source_skills, name))]
    for name in names:
        destination = os.path.join(skills_dir, name)
        if os.path.exists(destination):
            shutil.rmtree(destination)
        shutil.copytree(os.path.join(source_skills, name), destination)
    print("skills 설치 완료: %d개" % len(names))

def install_files(source_name, destination_name, suffix, label):
    source_dir = os.path.join(assets_dir, source_name)
    destination_dir = os.path.join(codex_dir, destination_name)
    os.makedirs(destination_dir, exist_ok=True)
    names = [name for name in os.listdir(source_dir) if name.endswith(suffix)]
    for name in names:
        shutil.copyfile(os.path.join(source_dir, name), os.path.join(destination_dir, name))
    print("%s 설치 완료: %d개" % (label, len(names)))

if "instructions" in items:
    install_instructions()
if "hooks" in items:
    install_hooks()
if "skills" in items:
    install_skills()
if "agents" in items:
    install_files("agents", "agents", ".toml", "agents")
if "rules" in items:
    install_files("rules", "rules", ".rules", "rules")
PY

echo "Codex 설치 완료"
echo "새 세션에서 /hooks와 /skills를 확인하세요. 새 hook은 /hooks에서 신뢰 승인 후 실행됩니다."
