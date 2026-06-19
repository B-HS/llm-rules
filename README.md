# llm-rules

개인 프로젝트 **코딩 컨벤션 표준**. 단일 출처(`docs/convention/`)를 여러 AI 코딩 에이전트가 항상 참조하도록 배포한다 — **Claude Code**(`~/.claude/`), **Codex · Cursor**(`AGENTS.md` · `.cursor/rules`).

📖 **문서 사이트**: https://b-hs.github.io/llm-rules/

---

## 설치

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
```

컨벤션 문서를 `~/.claude/convention/` 으로 내려받고, `~/.claude/CLAUDE.md` 가 이를 `@import` 하도록 한다.
기존 컨벤션이 있으면 실행 중 **`[a] 추가 / [r] 교체 / [c] 취소`** 를 묻는다. (쓰기 전 `.bak` 백업)

비대화형:

```bash
LLM_RULES_MODE=replace bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
```

---

## 다른 에이전트 (Codex · Cursor)

Claude 외 에이전트는 `CLAUDE.md` 의 `@import` 가 통하지 않는다. 프로젝트 루트에 컨벤션 전문을 inline 한 `AGENTS.md` 와 `.cursor/rules/llm-rules.mdc` 를 생성한다. **대상 프로젝트 디렉토리에서** 실행한다.

```bash
cd /path/to/project
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/init-agents.sh)"
```

- `AGENTS.md` — Codex · Cursor 공통 (관리 블록으로 멱등 갱신, 기존 내용 보존, `.bak` 백업)
- `.cursor/rules/llm-rules.mdc` — Cursor 네이티브 (`alwaysApply: true`)
- opencode 는 `CLAUDE.md` fallback 을 쓰므로 별도 설치 불필요.
- 옵션: `LLM_RULES_TARGET=<dir>` · `LLM_RULES_NO_CURSOR=1` · `LLM_RULES_NO_AGENTS=1`

---

## 컨벤션 문서

[ai-process](./docs/convention/ai-process.md) · [common](./docs/convention/common.md) · [comments](./docs/convention/comments.md) · [security](./docs/convention/security.md) · [git](./docs/convention/git.md) · [frontend](./docs/convention/frontend.md) · [fsd](./docs/convention/fsd.md) · [query](./docs/convention/query.md) · [backend](./docs/convention/backend.md) · [desktop](./docs/convention/desktop.md)

---

## 개발

```bash
bun install
bun run dev      # 문서 사이트 로컬 실행
bun run build    # 정적 빌드 (→ dist/)
bun run sync          # 레포 클론 후 CLAUDE.md 동기화 (설치 스크립트와 동일 결과)
bun run init-agents   # AGENTS.md + .cursor/rules 생성 (--target <dir> · --dry-run)
```
