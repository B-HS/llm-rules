# llm-rules

하나의 코딩 컨벤션을 Codex와 Claude Code에서 각각 네이티브 기능으로 실행합니다. 공통 규칙의 단일 출처는 `docs/convention/`이며 Cursor, opencode, pi용 호환 배포도 유지합니다.

문서 사이트: https://b-hs.github.io/llm-rules/

## 설치

| 환경              | 설치 명령                                                                                                            | 설치 범위                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Codex             | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"`       | `AGENTS.md`, Hooks, Skills, Custom Agents, Execpolicy Rules |
| Claude Code 1단계 | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"`             | `CLAUDE.md`와 공통 컨벤션                                   |
| Claude Code 2단계 | `bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"` | Settings, Hooks, Commands, Subagents, Output Style          |

Claude Code는 1단계와 2단계를 순서대로 실행합니다. 각 설치기는 글로벌과 프로젝트 범위를 대화형으로 선택합니다.

저장소를 클론한 경우:

| 환경        | 글로벌 전체 설치                                               | 프로젝트 전체 설치                            |
| ----------- | -------------------------------------------------------------- | --------------------------------------------- |
| Codex       | `bun run install-codex --global --all`                         | `bun run install-codex --project --all`       |
| Claude Code | `bun run sync` 후 `bun run install-claude-code --global --all` | `bun run install-claude-code --project --all` |

상세 옵션과 검증 방법은 [Codex 에디션](./docs/codex/index.md), [Claude Code 에디션](./docs/claudecode/index.md)에서 확인합니다.

## 지원 구조

| 공통 역할       | Codex                         | Claude Code           |
| --------------- | ----------------------------- | --------------------- |
| 기본 지침       | `AGENTS.md`                   | `CLAUDE.md`           |
| 생명주기 자동화 | `hooks.json` Hooks            | `settings.json` Hooks |
| 반복 워크플로   | Skills                        | Slash Commands        |
| 전문 리뷰       | Custom Agents                 | Subagents             |
| 명령 정책       | Execpolicy Rules              | Permissions           |
| 응답 규칙       | `AGENTS.md` 커뮤니케이션 규칙 | Output Style          |

Claude Code 전용 자산은 기존 구조를 유지하고 Codex 자산은 별도 경로에 병렬 관리합니다.

## 범용 에이전트 호환

Codex, opencode, pi에는 `AGENTS.md` 압축 코어와 전문 사본을 설치하고 Cursor에는 always-on rule을 설치합니다. Codex 전체 네이티브 기능이 필요하면 위의 Codex 전용 설치기를 사용합니다.

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
