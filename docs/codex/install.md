# Codex 설치 CLI

`scripts/install-codex.ts`는 로컬 저장소용 Bun CLI이고 `install-files/install-codex.sh`는 release 번들 기반 원격 설치기입니다. 둘은 같은 자산을 같은 위치에 설치합니다.

## 로컬 CLI

```bash
bun run install-codex --global --all
bun run install-codex --project --config --hooks --skills --agents --rules
bun run install-codex --target /path/to/project --all
bun run install-codex --global --all --dry-run
```

| 옵션             | 의미                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `--global`       | Instructions·Hooks·Agents·Rules는 `~/.codex`, Skills는 `~/.agents/skills`에 설치 |
| `--project`      | 현재 저장소의 `AGENTS.md`, `.llm-rules`, `.codex`, `.agents/skills`에 설치       |
| `--target <dir>` | 지정한 저장소에 프로젝트 설치                                                    |
| `--all`          | 여섯 자산군 전체 설치                                                            |
| `--instructions` | `AGENTS.md` 코어와 컨벤션 전문만 설치                                            |
| `--config`       | `config.toml`의 관리 main·subagent 기본값만 병합                                 |
| `--hooks`        | hook 스크립트와 `hooks.json` 병합                                                |
| `--skills`       | `llm-rules-*` Skills 10종 설치                                                   |
| `--agents`       | worker 4종과 reviewer 7종 TOML 설치                                              |
| `--rules`        | Execpolicy Rules 설치                                                            |
| `--dry-run`      | 쓰기 없이 설치 대상 출력                                                         |
| `--no-backup`    | `AGENTS.md`, `config.toml`, `hooks.json` 백업 생략                               |

`AGENTS.md`는 관리 마커 안의 블록만 교체하므로 기존 사용자 지침을 보존합니다. 과거 `init-agents.ts`가 만든 관리 블록도 새 Codex 관리 블록으로 승계합니다. `config.toml`은 `model`, `model_reasoning_effort`, `[agents]`의 네 관리 키만 교체하고 나머지 키·섹션·주석은 보존합니다. `hooks.json`은 모든 이벤트에서 알려진 llm-rules 관리 script의 entry만 제거한 뒤 현재 3종을 삽입합니다. 이전 `guard-commit.sh`, `guard-push.sh`, `reinject-rules.sh`, `verify-on-stop.sh` entry와 script는 정리하며 사용자 hook 파일과 비관리 entry는 유지합니다. Skills, Agents, Rules도 llm-rules가 소유한 이름만 덮어씁니다.

## 원격 설치

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"
```

비대화형 환경에서는 환경변수로 설정합니다.

```bash
LLM_RULES_CODEX_LOCATION=global \
LLM_RULES_CODEX_ITEMS="instructions config hooks skills agents rules" \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"
```

- `LLM_RULES_CODEX_LOCATION=global|project`
- `LLM_RULES_CODEX_TARGET=/path/to/project`
- `LLM_RULES_CODEX_ITEMS="instructions config hooks skills agents rules"`
- `LLM_RULES_VERSION=v1.2.3`
- `LLM_RULES_REPO=owner/repo`

프로젝트 `.codex` 자산은 저장소가 Codex에서 trusted 상태일 때만 로드됩니다. 편집·세션 hook은 `/hooks`에서 정의를 검토하고 신뢰해야 실행됩니다. 일반 commit·push는 llm-rules hook 없이 Execpolicy allow로 동작하며, 모든 force push는 금지됩니다.
