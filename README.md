# llm-rules

개인 프로젝트용 코딩 컨벤션과 Codex 실행 정책입니다. `docs/convention/`을 단일 출처로 두고 Codex의 `AGENTS.md`, Hooks, Skills, Custom Agents, Execpolicy Rules에 배포합니다. Claude Code, Cursor, opencode, pi용 호환 배포도 유지합니다.

문서 사이트: https://b-hs.github.io/llm-rules/

---

## Codex 설치

클론 없이 글로벌 또는 프로젝트 범위에 설치합니다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"
```

설치 항목:

- `AGENTS.md`와 컨벤션 전문 11개
- lifecycle hook 7종과 기존 `hooks.json` 비파괴 병합
- 감사·검증·문서화 Skill 9종
- 읽기 전용 reviewer Custom Agent 7종
- Git·삭제·검증 명령 Execpolicy Rules

저장소를 클론했다면 기능 선택, 대상 지정, dry-run을 지원하는 Bun CLI를 사용할 수 있습니다.

```bash
bun run install-codex --global --all
bun run install-codex --project --hooks --skills --agents --rules
bun run install-codex --target /path/to/project --all --dry-run
```

글로벌 설치는 `~/.codex`와 `~/.agents/skills`, 프로젝트 설치는 `AGENTS.md`, `.llm-rules`, `.codex`, `.agents/skills`를 사용합니다. 기존 사용자 지침과 비관리 hook은 보존하고 변경 전에 `.bak` 파일을 만듭니다. 새 hook은 새 Codex 세션의 `/hooks`에서 내용을 검토하고 신뢰 승인해야 실행됩니다.

구성과 검증 방법은 [Codex 에디션 문서](./docs/codex/index.md)를 참고하세요.

---

## 범용 에이전트 호환 설치

Codex, opencode, pi에는 `AGENTS.md` 압축 코어와 전문 사본을 설치하고 Cursor에는 always-on rule을 설치합니다. Codex 전체 기능이 필요하면 위의 Codex 전용 설치기를 사용하세요.

프로젝트 설치:

```bash
cd /path/to/project
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

글로벌 설치:

```bash
LLM_RULES_GLOBAL=all bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

옵션: `LLM_RULES_TARGET=<dir>` · `LLM_RULES_GLOBAL=codex,opencode,pi|all` · `LLM_RULES_NO_CURSOR=1` · `LLM_RULES_NO_AGENTS=1` · `LLM_RULES_VERSION=v1.2.3`

---

## Claude Code 호환

Claude Code용 `CLAUDE.md` import 설치와 hooks·commands·agents 배포는 계속 지원합니다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"
```

Claude Code 전용 매핑은 [Claude Code 문서](./docs/claudecode/index.md)를 참고하세요.

---

## 컨벤션 문서

[ai-process](./docs/convention/ai-process.md) · [common](./docs/convention/common.md) · [comments](./docs/convention/comments.md) · [security](./docs/convention/security.md) · [git](./docs/convention/git.md) · [frontend](./docs/convention/frontend.md) · [fsd](./docs/convention/fsd.md) · [query](./docs/convention/query.md) · [backend](./docs/convention/backend.md) · [desktop](./docs/convention/desktop.md)

---

## 개발

```bash
bun install
bun run dev
bun run typecheck
bun run build
bun run install-codex
bun run init-agents
bun run install-claude-code
bun run sync
```
