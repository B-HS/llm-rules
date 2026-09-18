# Codex 에디션

llm-rules의 기본 실행 환경입니다. 컨벤션 본문을 `AGENTS.md`로 주입하는 것에 더해 Codex config, Hooks, Skills, Custom Agents, Execpolicy Rules로 Subagent workflow와 기계적 강제를 제공합니다.

## Claude Code 기능 대응

| Claude Code             | Codex                              |
| ----------------------- | ---------------------------------- |
| `CLAUDE.md` import      | `AGENTS.md` 코어와 주제별 전문     |
| main·subagent 모델 설정 | `config.toml`의 main·agents 기본값 |
| lifecycle hooks         | `hooks.json` command hooks         |
| slash commands          | Skills                             |
| subagents               | Custom Agents                      |
| settings permissions    | Execpolicy Rules                   |
| output style            | `AGENTS.md` 커뮤니케이션 규칙      |

## 설치

저장소를 클론한 환경에서는 다음 명령을 사용합니다.

```bash
bun run install-codex
```

클론 없이 설치할 때는 release 번들을 받는 설치기를 사용합니다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"
```

두 설치기 모두 글로벌과 프로젝트 설치, 항목 선택, 기존 파일 백업과 멱등 갱신을 지원합니다.

## 구성

| 자산          | 글로벌 위치                                        | 프로젝트 위치                                  | 역할                                                |
| ------------- | -------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Instructions  | `~/.codex/AGENTS.md`, `~/.codex/llm-rules/`        | `AGENTS.md`, `.llm-rules/`                     | 압축 코어 자동 주입과 주제별 전문 참조              |
| Config        | `~/.codex/config.toml`                             | `.codex/config.toml`                           | Sol high main, Terra high subagent, 동시 4개 기본값 |
| Hooks         | `~/.codex/hooks.json`, `~/.codex/hooks/llm-rules/` | `.codex/hooks.json`, `.codex/hooks/llm-rules/` | 편집·세션 시점 guardrail                            |
| Skills        | `~/.agents/skills/llm-rules-*/`                    | `.agents/skills/llm-rules-*/`                  | Subagent workflow·감사·검증·문서화                  |
| Custom Agents | `~/.codex/agents/*.toml`                           | `.codex/agents/*.toml`                         | 구현·검증·조사 worker와 영역별 reviewer             |
| Rules         | `~/.codex/rules/llm-rules.rules`                   | `.codex/rules/llm-rules.rules`                 | 명령의 allow·prompt·forbidden 정책                  |

## 확인

새 Codex 세션에서 `/hooks`로 편집·세션 hook을 검토하고 신뢰 승인합니다. SessionStart hook은 새 실행 작업 전에 workflow 사용 여부를 한 번 묻도록 주입하며, 새 세션·resume·clear·compact·handoff·PROCESS 재개에서는 이전 선택을 승계하지 않습니다. 사용자가 선택하거나 `$llm-rules-subagent-workflow`를 직접 호출하면 Custom Agent로 위임하고, 선택하지 않으면 main이 직접 수행합니다. 일반 commit·push에는 llm-rules hook이나 추가 승인이 없으며 Execpolicy가 allow합니다. 모든 force push는 파괴적 예외로 계속 금지합니다.

```bash
codex execpolicy check --pretty --rules ~/.codex/rules/llm-rules.rules -- git push --force origin main
codex doctor --summary
```

세부 문서:

- [설치 CLI](./install.md)
- [Hooks](./hooks.md)
- [Skills](./skills.md)
- [Custom Agents와 Rules](./agents-and-rules.md)

공식 기준: [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) · [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) · [Skills](https://learn.chatgpt.com/docs/build-skills) · [Codex CLI와 개발자 명령](https://learn.chatgpt.com/docs/developer-commands?surface=cli) · [설정 레퍼런스](https://learn.chatgpt.com/docs/config-file/config-reference)
