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
        printf "항목 [1]instructions [2]config [3]hooks [4]skills [5]agents [6]rules, 기본 a=전체: " > /dev/tty
        read -r selection < /dev/tty || selection=a
        case "$selection" in
            a* | "") ITEMS="instructions config hooks skills agents rules" ;;
            *)
                ITEMS=""
                case "$selection" in *1*) ITEMS="$ITEMS instructions" ;; esac
                case "$selection" in *2*) ITEMS="$ITEMS config" ;; esac
                case "$selection" in *3*) ITEMS="$ITEMS hooks" ;; esac
                case "$selection" in *4*) ITEMS="$ITEMS skills" ;; esac
                case "$selection" in *5*) ITEMS="$ITEMS agents" ;; esac
                case "$selection" in *6*) ITEMS="$ITEMS rules" ;; esac
                ;;
        esac
    else
        ITEMS="instructions config hooks skills agents rules"
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
import re
import shutil
try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None

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
current_hook_scripts = ["scan-secrets.sh", "lint-edit.sh", "session-context.sh"]
retired_hook_scripts = ["reinject-rules.sh", "verify-on-stop.sh", "guard-commit.sh", "guard-push.sh"]
managed_hook_scripts = current_hook_scripts + retired_hook_scripts
root_config_keys = ["model", "model_reasoning_effort"]
agent_config_keys = ["enabled", "default_subagent_model", "default_subagent_reasoning_effort", "max_concurrent_threads_per_session"]
root_config_lines = ["model = \"gpt-5.6-sol\"", "model_reasoning_effort = \"high\""]
agent_config_lines = [
    "enabled = true",
    "default_subagent_model = \"gpt-5.6-terra\"",
    "default_subagent_reasoning_effort = \"high\"",
    "max_concurrent_threads_per_session = 4",
]

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

def is_managed_hook(handler):
    return any(
        re.search(r"/hooks/llm-rules/" + re.escape(name) + r"(?:[\"'\s]|$)", handler.get("command", ""))
        for name in managed_hook_scripts
    ) if isinstance(handler, dict) else False

def prune_managed_hooks(entry):
    hooks = [handler for handler in entry.get("hooks", []) if not is_managed_hook(handler)]
    if not hooks:
        return None
    return dict(entry, hooks=hooks)

def remove_toml_assignments(source, keys):
    return "\n".join(line for line in source.split("\n") if not any(re.match(r"^\s*" + re.escape(key) + r"\s*=", line) for key in keys))

def is_table_header(line):
    return re.match(r"^\s*(?:\[[^\]\r\n]+\]|\[\[[^\]\r\n]+\]\])\s*(?:#.*)?$", line) is not None

def is_agents_header(line):
    return re.match(r"^\s*\[agents\]\s*(?:#.*)?$", line) is not None

def merge_managed_config(original):
    lines = original.splitlines(keepends=True)
    first_table = next((index for index, line in enumerate(lines) if is_table_header(line)), len(lines))
    root = remove_toml_assignments("".join(lines[:first_table]), root_config_keys)
    tables = "".join(lines[first_table:])
    root_with_managed_keys = ("\n".join(root_config_lines) + "\n" + root.lstrip()).rstrip()
    table_lines = tables.splitlines(keepends=True)
    agent_index = next((index for index, line in enumerate(table_lines) if is_agents_header(line)), None)
    if agent_index is None:
        suffix = "\n\n" + tables.strip() if tables else ""
        return root_with_managed_keys + suffix + "\n\n[agents]\n" + "\n".join(agent_config_lines) + "\n"
    agent_end = next((index for index in range(agent_index + 1, len(table_lines)) if is_table_header(table_lines[index])), len(table_lines))
    before_agent = "".join(table_lines[:agent_index]).rstrip()
    agent_header = table_lines[agent_index].strip()
    agent_body = remove_toml_assignments("".join(table_lines[agent_index + 1:agent_end]), agent_config_keys).strip()
    after_agent = "".join(table_lines[agent_end:]).strip()
    agent_section = "\n".join(value for value in [agent_header, "\n".join(agent_config_lines), agent_body] if value)
    prefix = root_with_managed_keys + "\n\n" + (before_agent + "\n" if before_agent else "")
    return prefix + agent_section + ("\n" + after_agent if after_agent else "") + "\n"

def install_config():
    config_path = os.path.join(codex_dir, "config.toml")
    if tomllib:
        with open(os.path.join(assets_dir, "config.toml"), "rb") as file:
            tomllib.load(file)
    original = ""
    if os.path.exists(config_path):
        with open(config_path, encoding="utf-8") as file:
            original = file.read()
        if tomllib:
            tomllib.loads(original)
    updated = merge_managed_config(original)
    if tomllib:
        tomllib.loads(updated)
    os.makedirs(codex_dir, exist_ok=True)
    if original and updated != original:
        shutil.copyfile(config_path, config_path + ".bak")
    if updated != original:
        with open(config_path, "w", encoding="utf-8") as file:
            file.write(updated)
    print("config 설치 완료: 관리 main·subagent 기본값 병합")

def install_hooks():
    source_hooks = os.path.join(assets_dir, "hooks")
    destination_hooks = os.path.join(codex_dir, "hooks", "llm-rules")
    os.makedirs(destination_hooks, exist_ok=True)
    hook_files = [name for name in os.listdir(source_hooks) if name.endswith(".sh")]
    for name in retired_hook_scripts:
        destination = os.path.join(destination_hooks, name)
        if os.path.exists(destination):
            os.remove(destination)
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
    for event, entries in list(current["hooks"].items()):
        preserved = [pruned for entry in entries if (pruned := prune_managed_hooks(entry)) is not None]
        if preserved:
            current["hooks"][event] = preserved
        else:
            del current["hooks"][event]
    for event, entries in template["hooks"].items():
        current["hooks"][event] = current["hooks"].get(event, []) + entries
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
if "config" in items:
    install_config()
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
echo "새 세션에서 /hooks와 /skills를 확인하세요. 편집·세션 hook은 신뢰 승인 후 실행되며 일반 commit·push에는 llm-rules hook이 없습니다."
