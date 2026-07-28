# Claude Code 에디션 (llm-rules CC)

> llm-rules 코딩 컨벤션을 **Claude Code 환경에서 결정론적으로 강제(enforce)** 하는 레이어입니다.
> 컨벤션 prose 원본(SSOT)은 [`docs/convention/*.md`](../convention/index.md) 이며, 이 에디션은 그것을 **대체하지 않고 보완**합니다.

---

## 무엇인가

llm-rules 의 컨벤션은 본래 `~/.claude/CLAUDE.md` 에서 참조되는 **산문(prose) 문서**입니다. 사람과 LLM 이 읽고 따르는 규칙이지만, 컨텍스트가 길어지면 LLM 이 규칙을 잊거나(드리프트) 일부만 지키는 일이 생깁니다.

**CC 에디션**은 이 산문 규칙을 Claude Code 의 **hook · slash command · subagent · settings · output style** 로 옮겨, 읽기에 의존하지 않고 **기계가 강제**하도록 만든 enforce 레이어입니다. 컨벤션 본문을 복제하지 않고, 그 위에 "차단/경고/검증/재주입" 만 얹습니다.

## 왜 필요한가 — 산문 드리프트 vs 결정론 hook

| | 산문 컨벤션(읽기 기반) | CC 에디션(hook 기반) |
|---|---|---|
| 적용 시점 | LLM 이 기억하는 동안 | 매 도구 호출·커밋·정지 시점 |
| 위반 처리 | 알아서 안 하길 기대 | `exit 2` / `{"decision":"block"}` 로 **차단** |
| 드리프트 | 컨텍스트가 길면 잊음 | `UserPromptSubmit` 마다 핵심 규칙 **재주입** |
| 검증 | 수동 | `Stop` 에서 변경 시 `tsc --noEmit` 자동 |

즉, 컨벤션이 "이렇게 작성하라"를 정의한다면, CC 에디션은 "어기면 멈춘다"를 **결정론적으로** 보장합니다. 파싱 실패·도구 부재 등 애매한 상황은 **fail-open**(허용)으로 두어 작업을 막지 않습니다.

## 설치 방법

대화형 설치 스크립트로 설치 위치(global `~/.claude` / project `.claude`)와 항목을 선택합니다.

```bash
bun run install-claude-code
```

원격(레포 클론 없이)으로는 curl 설치 스크립트를 사용합니다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"
```

설치 메뉴에서 hooks · slash commands · subagents · settings · output style 을 다중 선택할 수 있습니다.

## 설치되는 항목 요약

### Hooks — `<claudeDir>/hooks/llm-rules/`, `settings.json` 으로 연결

| hook | 이벤트 | 동작 |
|---|---|---|
| `guard-commit.sh` | PreToolUse(Bash, `git commit*`) | `exit 2` 로 차단 — Conventional Commits 헤더 위반 / `Co-Authored-By`·Claude 트레일러 / `main`·`master` 직접 커밋 / 스테이지의 `.env`·secrets·`dist`·`node_modules`·키 파일. 파싱 실패는 fail-open. `llm-rules.auto-commit` 합의 레포는 전 검사 통과 시 권한 프롬프트 자동 승인 |
| `guard-push.sh` | PreToolUse(Bash, `git push*`) | force push(`--force`/`-f`, 플래그 위치 무관) `exit 2` 차단. `llm-rules.auto-push` 합의 레포는 비-force 푸시 권한 프롬프트 자동 승인(`--force-with-lease` 는 항상 확인) |
| `scan-secrets.sh` | PreToolUse(Edit·Write·MultiEdit) | 새로 쓰는 내용에 고신뢰 시크릿(`AKIA…`, `gh[pousr]_…`, `sk-…`, PRIVATE KEY, `xox…`) 이 있으면 `exit 2` 차단. `.md`/`.mdx`/`.txt` 는 예시 오탐 방지로 건너뜀 |
| `lint-edit.sh` | PostToolUse(Edit·Write·MultiEdit) | TS/JS 만 대상(아니면 no-op). `prettier --write` 후 검사. **HARD**(`{"decision":"block"}`): `useCallback`/`useMemo`, backend 경로의 `throw new Error`·`process.env` 직접접근. **SOFT**(systemMessage 경고): `function` 키워드, 코드 주석, page/layout 외 `export default`, HACK/FIXME/`@ts-ignore`, sanitize 없는 `dangerouslySetInnerHTML` |
| `verify-on-stop.sh` | Stop | 변경된 TS/JS 가 있을 때만 `tsc --noEmit`(없으면 no-op). 실패 시 `{"decision":"block"}` 으로 계속 작업 유도. 테스트는 `LLM_RULES_STOP_TEST=1` 일 때만. `stop_hook_active` 가드로 무한루프 방지 |
| `session-context.sh` | SessionStart(startup·resume·clear·compact) | 컨벤션 핵심 요약 + 작업 개시 프로토콜 + (있으면) `docs/PROCESS.md` 앞부분을 `additionalContext` 로 주입. `docs/` 디렉토리 보장 |
| `reinject-rules.sh` | UserPromptSubmit | 매 프롬프트마다 "절대 금지" 안티패턴 1줄을 `additionalContext` 로 재주입(드리프트 방지) |

### Settings — `permissions`

- **allow**: `bun`/`bunx`/`tsc`/`bun test` + `git status`·`diff`·`log`·`add`
- **ask**: `git commit`/`push`/`merge`/`rebase`, `npm`/`pnpm`/`yarn add`
- **deny**: `.env` Read/Write/Edit, `secrets/**`, `rm -rf`, `git push --force`/`-f`, `git add .env`

### Slash Commands — `/llm-rules:<name>`, `<claudeDir>/commands/llm-rules/`

`audit-conventions` · `audit-fsd` · `audit-backend-domain` · `audit-query` · `process` · `verify` · `save-docs` · `log-feedback`

네임스페이스 없는 `/prepare-new`(세션 핸드오프 — docs/ 최신화 + `HANDOFF.md` + 재개 프롬프트)는 `<claudeDir>/commands/prepare-new.md` 에 설치됩니다.

### Subagents — `<claudeDir>/agents/`

`convention-reviewer` · `fsd-dependency-reviewer` · `type-utility-reviewer` · `backend-convention-reviewer` · `security-reviewer` · `tanstack-query-reviewer` · `desktop-security-reviewer`

### Output Style — `llm-rules`

한국어·존댓말·간결(자축/이모지/장황한 서론 금지). 설치 위치: `<claudeDir>/output-styles/llm-rules.md`.

## 컨벤션을 대체하지 않습니다

CC 에디션은 **enforce 레이어일 뿐**, 규칙의 내용·근거·예시는 전부 컨벤션 원본에 있습니다. hook 의 차단 메시지도 `common §3.1`, `frontend §4`, `git §6` 처럼 원본 조항을 가리킵니다. 규칙을 바꾸려면 hook 이 아니라 **컨벤션 원본을 먼저 고치고**, CC 에디션은 그에 맞춰 enforce 만 갱신합니다.

## 관련 문서

### CC 에디션 세부

- [enforcement.md](./enforcement.md) — 각 컨벤션 .md 의 규칙 → 메커니즘 매핑 + 강제 모델(HARD/SOFT, exit code, fail-open)
- [hooks.md](./hooks.md) — 7개 hook 의 입력·판정·출력 상세
- [commands.md](./commands.md) — slash command 사용법
- [agents.md](./agents.md) — subagent 역할과 트리거
- [settings.md](./settings.md) — `permissions`·hook 연결(`settings.json`) 상세

### 컨벤션 원본(SSOT)

- [index.md](../convention/index.md) — 컨벤션 진입점·요약
- [ai-process.md](../convention/ai-process.md) · [common.md](../convention/common.md) · [comments.md](../convention/comments.md) · [security.md](../convention/security.md) · [git.md](../convention/git.md)
- [frontend.md](../convention/frontend.md) · [fsd.md](../convention/fsd.md) · [query.md](../convention/query.md) · [backend.md](../convention/backend.md) · [desktop.md](../convention/desktop.md)
