# llm-rules

개인 프로젝트 **코딩 컨벤션 표준**. 단일 출처(`docs/convention/`)를 여러 AI 코딩 에이전트가 항상 참조하도록 배포한다 — **Claude Code**(`~/.claude/`), **Codex · Cursor**(`AGENTS.md` · `.cursor/rules`).
추가로 **Claude Code 전용 에디션**([`docs/claudecode/`](./docs/claudecode/index.md))은 컨벤션을 읽기에만 맡기지 않고 **hook·command·subagent 로 결정론적으로 강제**한다.

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

## Claude Code 전용 (hooks · commands · agents)

컨벤션을 **결정론적으로 강제·자동화**하는 Claude Code 레이어다. `@import`(수동 prose)와 달리 hook 은 매 편집·커밋·세션마다 실행된다. 컨벤션 원본(`docs/convention/`)을 그대로 두고 enforce 레이어만 더한다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"
```

설치 위치(글로벌 `~/.claude` / 프로젝트 `./.claude`)와 항목을 **메뉴로 선택**한다. 레포를 클론했다면 `bun run install-claude-code` 로 동일하게 설치할 수 있다.

설치 항목:

- **settings.json** — `permissions`(allow/ask/deny) + `hooks` 를 기존 설정에 **비파괴 병합**(`.bak`, 멱등)
- **hooks (6)** — 커밋 가드(Conventional Commits·Co-Authored-By 차단·main 차단·시크릿 차단), 편집 lint(prettier·금지패턴), 시크릿 스캔, Stop 검증(tsc), 세션 컨텍스트 주입, 규칙 재주입
- **commands** — `/llm-rules:audit-conventions` · `audit-fsd` · `audit-backend-domain` · `audit-query` · `verify` · `process` · `save-docs` · `log-feedback`
- **agents** — `convention-reviewer` · `fsd-dependency-reviewer` · `type-utility-reviewer` · `backend-convention-reviewer` · `security-reviewer` · `tanstack-query-reviewer` · `desktop-security-reviewer`
- **output-style** — `llm-rules` (한국어·존댓말·간결)

자세한 매핑·동작은 [docs/claudecode](./docs/claudecode/index.md) 참고. 옵션: `LLM_RULES_CC_LOCATION=global|project` · `LLM_RULES_CC_TARGET=<dir>` · `LLM_RULES_CC_ITEMS="settings hooks commands agents output-style"`

---

## 컨벤션 문서

[ai-process](./docs/convention/ai-process.md) · [common](./docs/convention/common.md) · [comments](./docs/convention/comments.md) · [security](./docs/convention/security.md) · [git](./docs/convention/git.md) · [frontend](./docs/convention/frontend.md) · [fsd](./docs/convention/fsd.md) · [query](./docs/convention/query.md) · [backend](./docs/convention/backend.md) · [desktop](./docs/convention/desktop.md)

---

## 개발

```bash
bun install
bun run dev      # 문서 사이트 로컬 실행
bun run build    # 정적 빌드 (→ dist/)
bun run sync                 # 레포 클론 후 CLAUDE.md 동기화 (설치 스크립트와 동일 결과)
bun run init-agents          # AGENTS.md + .cursor/rules 생성 (--target <dir> · --dry-run)
bun run install-claude-code  # Claude Code hooks·commands·agents 설치 메뉴 (--global/--project · --all · --dry-run)
```
