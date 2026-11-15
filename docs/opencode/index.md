# OpenCode 에디션

OpenCode V2 전용으로 쓴 룰과 네이티브 자산이다. 다른 에디션과 결과물(코드·문서·커밋·응답)은 같고, 전달 방식은 OpenCode 의 Instructions · Skills · Agents · Permissions · Plugins 구조에 맞췄다.

## 설치

```bash
bun run install-opencode --global --all
bun run install-opencode --project --all
bun run install-opencode --global --all --dry-run
```

클론 없이 설치하려면 아래 명령을 쓴다. Bun 이 필요하다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules opencode --global --all
```

## 구성

| 항목 | 설치 위치 | 역할 |
| --- | --- | --- |
| `instructions` | `~/.config/opencode/AGENTS.md` · `~/.config/opencode/llm-rules/` | [코어](./rules/core.md) 관리 블록과 조건부로 읽는 참조 문서 9개 |
| `skills` | `~/.config/opencode/skills/llm-rules-*` | 반복 절차 10종 |
| `commands` | `~/.config/opencode/commands/llm-rules/` | `/llm-rules/<이름>` 으로 Skill 을 불러오는 커맨드 10종 |
| `agents` | `~/.config/opencode/agents/llm-rules/` | `llm-rules/*` subagent 11종. 모델을 지정하지 않아 세션 모델을 물려받는다 |
| `plugin` | `~/.config/opencode/plugins/llm-rules/index.ts` | 시크릿 차단, 편집 후 lint 피드백, 진행 중인 PROCESS 작업 주입 |
| `config` | `~/.config/opencode/opencode.jsonc` | `permissions` 규칙과 `formatter` |

## 설치기가 다루는 기존 상태

- `AGENTS.md` 가 심볼릭 링크이면 링크 대상은 건드리지 않고 실제 파일로 교체한다. V2 는 `AGENTS.md` 만 읽고 `CLAUDE.md` 를 대신 읽지 않는다 ([Instructions](https://opencode.ai/docs/instructions/)).
- `opencode.jsonc` 는 기존 값을 보존하고 없는 권한 규칙만 뒤에 덧붙인다. 주석은 병합하면서 제거되므로 `.bak` 를 남긴다.
- `~/.claude/skills` 나 `~/.agents/skills` 에 같은 ID 의 Skill 이 있어도 `~/.config/opencode/skills` 가 우선한다 ([Skills](https://opencode.ai/docs/skills/)).

## 강제 계층

| 대상 | 수단 |
| --- | --- |
| `.env` · `.env.*` · `secrets/` · 키 파일 읽기와 편집 | `permissions` deny (`.env.example` 은 허용) |
| `git push --force` 계열, `rm -rf` | `permissions` deny |
| `git merge` · `git rebase` | `permissions` ask |
| subagent 의 `git add` · `commit` · `push`, reviewer 의 편집 | agent 별 `permissions` deny ([Agents](https://opencode.ai/docs/agents/)) |
| 코드에 쓰는 시크릿 패턴 | 플러그인 `execute.before` 가 도구 호출을 거부 |
| 편집 후 포맷 | 내장 `formatter` ([Formatters](https://opencode.ai/docs/formatters/)) |
| 컨벤션 lint | 플러그인 `execute.after` 가 도구 결과에 피드백을 덧붙임 |

## 확인

새 세션에서 `/llm-rules/verify` 가 커맨드 목록에 보이는지, subagent 목록에 `llm-rules/*` 가 보이는지 확인한다. 플러그인은 아래 명령으로 확인한다.

```bash
opencode plugin list --builtin
```

OpenCode 2.1.2 실서비스에서 `llm-rules` 플러그인이 로드되고 `llm-rules/*` subagent 11종이 등록되는 것을 확인했다. 모델 호출이 필요한 차단·피드백 동작은 `scripts/guards.test.ts` 의 가짜 컨텍스트로 검증했고, 실제 세션 확인 항목은 `docs/quality-assurance/2026-11-15-provider-editions.md` 에 있다.
