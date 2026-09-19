# llm-rules

하나의 코딩 컨벤션을 Codex와 Claude Code에서 각각 네이티브 기능으로 실행합니다. 공통 규칙의 단일 출처는 `docs/convention/`이며 Cursor, opencode, pi용 호환 배포도 유지합니다.

문서 사이트: https://b-hs.github.io/llm-rules/

## 설치

| 환경              | 설치 명령                                                                                                            | 설치 범위                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Codex             | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"`       | `AGENTS.md`, Config, Hooks, Skills, Custom Agents, Execpolicy Rules |
| Claude Code 1단계 | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"`             | `CLAUDE.md`와 공통 컨벤션                                           |
| Claude Code 2단계 | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"` | Settings, Hooks, Commands, Subagents, Output Style                  |
| Pi Agent          | `LLM_RULES_GLOBAL=pi bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"` | `~/.pi/agent/AGENTS.md`, 전문 사본 11개                            |

Claude Code는 1단계와 2단계를 순서대로 실행합니다. Codex와 Claude Code 설치기는 글로벌과 프로젝트 범위를 대화형으로 선택합니다.

저장소를 클론한 경우:

| 환경        | 글로벌 전체 설치                                               | 프로젝트 전체 설치                            |
| ----------- | -------------------------------------------------------------- | --------------------------------------------- |
| Codex       | `bun run install-codex --global --all`                         | `bun run install-codex --project --all`       |
| Claude Code | `bun run sync` 후 `bun run install-claude-code --global --all` | `bun run install-claude-code --project --all` |
| Pi Agent    | `bun run init-agents --global pi`                              | `bun run init-agents`                         |

상세 옵션과 검증 방법은 [Codex 에디션](./docs/codex/index.md), [Claude Code 에디션](./docs/claudecode/index.md)에서 확인합니다.

## 지원 구조

| 공통 역할              | Codex                         | Claude Code               |
| ---------------------- | ----------------------------- | ------------------------- |
| 기본 지침              | `AGENTS.md`                   | `CLAUDE.md`               |
| 생명주기 자동화        | `hooks.json` Hooks            | `settings.json` Hooks     |
| 다중 에이전트 workflow | Subagent workflow Skill       | Workflow Command          |
| 하위 작업              | Terra medium/high · Luna low/medium, 필요 시 high/xhigh | Sonnet high · Haiku xhigh |
| 메인 모델              | 작업별 Sol high 또는 Terra medium | Fable high                |
| 명령 정책              | Execpolicy Rules              | Permissions               |
| 응답 규칙              | `AGENTS.md` 커뮤니케이션 규칙 | Output Style              |

Claude Code 전용 자산은 기존 구조를 유지하고 Codex 자산은 별도 경로에 병렬 관리합니다. 메인 오케스트레이터가 상세한 하위 작업 계약을 작성하고, 독립 작업은 병렬로 실행한 뒤 위험에 비례한 최소 검증 결과를 재사용해 추가 승인 없이 자동 커밋·푸시합니다.

## 범용 에이전트 호환

Codex, opencode, pi에는 `AGENTS.md` 압축 코어와 전문 사본을 설치하고 Cursor에는 always-on rule을 설치합니다. 이 공통 코어에는 새 chat/task/session, reopen/resume, clear/reset, compact/summarize, handoff/process를 같은 workflow 선택 경계로 취급하는 규칙이 포함됩니다. opencode·pi·Cursor는 이 저장소가 별도 SessionStart hook을 설치하지 않으므로 룰 파일과 재개 프롬프트가 질문을 수행합니다. Copilot·Windsurf는 각 제품의 룰 파일에서 `docs/convention/`을 직접 참조해야 합니다.

### Pi Agent

Pi 전역 설치는 `~/.pi/agent/AGENTS.md`와 `~/.pi/agent/llm-rules/`에 압축 코어와 전문 사본 11개를 설치합니다. Pi는 `~/.agents/skills/`도 기본 탐색합니다.

원격 설치기는 Pi 코어와 전문만 설치합니다.

```bash
LLM_RULES_GLOBAL=pi bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

저장소를 클론한 설치기는 위 자산에 더해 예전 설치가 남긴 `~/AGENTS.md`의 `rules-convention` 관리 블록만 백업 후 제거하고, 사용자 소유 내용은 유지합니다.

```bash
bun run init-agents --global pi
```

Pi는 Codex Hooks, Custom Agents, Execpolicy Rules를 읽지 않으므로 Codex와 동일한 네이티브 자동화·권한 정책·하위 에이전트 실행을 제공하지 않습니다. 해당 기능이 필요하면 Codex 전용 설치기를 사용합니다.

```bash
cd /path/to/project
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

```bash
LLM_RULES_GLOBAL=all bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

## 컨벤션

[AI 프로세스](./docs/convention/ai-process.md) · [공통](./docs/convention/common.md) · [주석](./docs/convention/comments.md) · [보안](./docs/convention/security.md) · [Git](./docs/convention/git.md) · [프론트엔드](./docs/convention/frontend.md) · [FSD](./docs/convention/fsd.md) · [TanStack Query](./docs/convention/query.md) · [백엔드](./docs/convention/backend.md) · [데스크톱](./docs/convention/desktop.md)

## 개발

```bash
bun install
bun run dev
bun run typecheck
bun run build
```
