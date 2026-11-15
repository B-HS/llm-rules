# llm-rules

같은 결과물을 내는 코딩 컨벤션을 Claude Code · Codex · OpenCode · Pi 각각의 공식 권장사항에 맞춰 따로 제공합니다. 에디션마다 전체 룰을 소유하며 공통 룰 문서는 없습니다.

문서 사이트: https://b-hs.github.io/llm-rules/

## 설치

원격 설치에는 Bun 이 필요합니다. 마지막 인자를 빼면 위치와 항목을 대화형으로 고릅니다.

| 에디션 | 설치 명령 |
| --- | --- |
| Claude Code | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules claude-code --global --all` |
| Codex | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules codex --global --all` |
| OpenCode | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules opencode --global --all` |
| Pi | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules pi --global --all` |

저장소를 클론한 경우:

| 에디션 | 글로벌 | 프로젝트 |
| --- | --- | --- |
| Claude Code | `bun run install-claude-code --global --all` | `bun run install-claude-code --project --all` |
| Codex | `bun run install-codex --global --all` | `bun run install-codex --project --all` |
| OpenCode | `bun run install-opencode --global --all` | `bun run install-opencode --project --all` |
| Pi | `bun run install-pi --global --all` | `bun run install-pi --project --all` |

모든 설치기는 `--dry-run` 으로 변경 내용을 미리 보여 주고, 사용자 소유 파일을 보존하며, 덮어쓰기 전에 `.bak` 를 만듭니다.

## 에디션 구성

| 역할 | Claude Code | Codex | OpenCode | Pi |
| --- | --- | --- | --- | --- |
| 상시 지침 | `rules/llm-rules/core.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| 도메인 규칙 | 경로 범위 규칙 | 조건부 참조 문서 | 조건부 참조 문서 | 조건부 참조 문서 |
| 반복 절차 | Commands | Skills | Skills · Commands | Skills |
| 응답 형식 | Output Style | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| 위임 | Subagents (요청 시) | Custom Agents (요청 시) | Subagents (요청 시) | 직접 수행 |
| 강제 계층 | Hooks · Permissions | Hooks · Execpolicy | Permissions · Plugin | Extension |

상세 구성과 변경 근거는 각 에디션 문서에 있습니다: [Claude Code](./docs/claudecode/index.md) · [Codex](./docs/codex/index.md) · [OpenCode](./docs/opencode/index.md) · [Pi](./docs/pi/index.md)

## 같은 결과물, 다른 과정

네 에디션이 공통으로 지키는 결과물 계약(응답 형식, 코드 규칙, `docs/` 기록, Git, 결정 지점, 검증)과 프로바이더별 점검 결과는 [점검 기록](./docs/acknowledge/2026-11-15-provider-optimization-audit.md)에 있습니다. 계약 항목이 에디션에서 빠지지 않았는지는 `scripts/rule-parity.test.ts` 가 검사합니다.

- 다중 에이전트 workflow 는 사용자가 요청하거나 workflow 커맨드·Skill 을 호출했을 때만 씁니다.
- 룰과 자산에는 모델 이름만 적습니다. Codex 의 실제 모델 슬러그는 `scripts/install-codex.ts` 한 곳에서 관리합니다.

## 개발

```bash
bun install
bun test
bun run typecheck
bun run build
```
