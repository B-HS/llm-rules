# Claude Code 에디션 (llm-rules CC)

> llm-rules 코딩 컨벤션을 **Claude Code 환경에서 결정론적으로 강제(enforce)** 하는 레이어입니다.
> 컨벤션 prose 원본(SSOT)은 [`docs/convention/*.md`](../convention/index.md) 이며, 이 에디션은 그것을 **대체하지 않고 보완**합니다.

---

## 무엇인가

llm-rules 의 컨벤션은 본래 `~/.claude/CLAUDE.md` 에서 참조되는 **산문(prose) 문서**입니다. 사람과 LLM 이 읽고 따르는 규칙이지만, 컨텍스트가 길어지면 LLM 이 규칙을 잊거나(드리프트) 일부만 지키는 일이 생깁니다.

**CC 에디션**은 이 산문 규칙을 Claude Code 의 **hook · slash command · subagent · settings · output style** 로 옮겨, 읽기에 의존하지 않고 **기계가 강제·workflow로 검증**하도록 만든 enforce 레이어입니다. 컨벤션 본문을 복제하지 않고, 그 위에 "차단/경고/세션 컨텍스트/작업 분해·검증"만 얹습니다.

## 왜 필요한가 — 산문 드리프트 vs 결정론 hook

| | 산문 컨벤션(읽기 기반) | CC 에디션(hook 기반) |
|---|---|---|
| 적용 시점 | LLM 이 기억하는 동안 | 편집·세션 시작·workflow 검증 시점 |
| 위반 처리 | 알아서 안 하길 기대 | `exit 2` / `{"decision":"block"}` 로 **차단** |
| 드리프트 | 컨텍스트가 길면 잊음 | `SessionStart` 에서 컨벤션·workflow 계약 주입 |
| 검증 | 수동 | Sonnet high 위험비례 주 검증 + Haiku xhigh 최소 애매성 판정 |

즉, 컨벤션이 "이렇게 작성하라"를 정의한다면, CC 에디션은 기계로 판정 가능한 위반은 "어기면 멈춘다"로, 맥락이 필요한 실행은 workflow의 상세 위임·검증 계약으로 다룹니다. 파싱 실패·도구 부재 등 애매한 상황은 **fail-open**(허용)으로 두어 작업을 막지 않습니다.

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
| `scan-secrets.sh` | PreToolUse(Edit·Write·MultiEdit) | 새로 쓰는 내용에 고신뢰 시크릿(`AKIA…`, `gh[pousr]_…`, `sk-…`, PRIVATE KEY, `xox…`) 이 있으면 `exit 2` 차단. `.md`/`.mdx`/`.txt` 는 예시 오탐 방지로 건너뜀 |
| `lint-edit.sh` | PostToolUse(Edit·Write·MultiEdit) | TS/JS 만 대상(아니면 no-op). `prettier --write` 후 검사. **HARD**(`{"decision":"block"}`): `useCallback`/`useMemo`, backend 경로의 `throw new Error`·`process.env` 직접접근. **SOFT**(systemMessage 경고): `function` 키워드, 코드 주석, page/layout 외 `export default`, HACK/FIXME/`@ts-ignore`, sanitize 없는 `dangerouslySetInnerHTML` |
| `session-context.sh` | SessionStart(startup·resume·clear·compact) | 컨벤션 핵심 요약 + 작업 개시 프로토콜 + (있으면) `docs/PROCESS.md` 앞부분을 `additionalContext` 로 주입. `docs/` 디렉토리 보장 |

### Settings — `permissions`

- **workflow 기본 모델**: Fable high 메인이 요구사항·분해·통합·최종 판정·Git을 소유하고, Sonnet high 서브에이전트가 구현·리서치·주 검증, Haiku xhigh가 필요한 애매성 하나의 최소 보조 판정을 수행합니다.
- **allow**: `bun`/`bunx`/`tsc`/`bun test` + 일반 `git status`·`diff`·`log`·`add`·`commit`·`push`
- **ask**: `git merge`/`rebase`, `npm`/`pnpm`/`yarn add`
- **deny**: `.env` Read/Write/Edit, `secrets/**`, `rm -rf`, `git push --force`/`-f`, `git add .env`

### Slash Commands — `/llm-rules:<name>`, `<claudeDir>/commands/llm-rules/`

`workflow` · `audit-conventions` · `audit-fsd` · `audit-backend-domain` · `audit-query` · `process` · `verify` · `save-docs` · `log-feedback`

네임스페이스 없는 `/prepare-new`(세션 핸드오프 — docs/ 최신화 + `HANDOFF.md` + 재개 프롬프트)는 `<claudeDir>/commands/prepare-new.md` 에 설치됩니다.

### Subagents — `<claudeDir>/agents/`

`implementation-worker` · `verification-worker` · `edge-case-verification-worker` · `research-worker` · `convention-reviewer` · `fsd-dependency-reviewer` · `type-utility-reviewer` · `backend-convention-reviewer` · `security-reviewer` · `tanstack-query-reviewer` · `desktop-security-reviewer`

새 도구 사용 작업은 시작 전에 workflow 사용 여부를 한 번 묻고 답을 기다립니다. 새 세션·resume·clear·compact·handoff·PROCESS 재개에서는 이전 선택을 승계하지 않습니다. 사용자가 선택하거나 `/llm-rules:workflow`를 직접 호출하면 메인은 상세 위임 계약(목표·근거·소유 범위·규칙·순서·엣지 케이스·검증·보고·Git 경계·의존 관계)을 전달하고, 성공 검증을 반복하지 않은 채 검증된 변경만 논리 단위로 일반 commit/push합니다. 선택하지 않으면 main이 직접 수행합니다.

### Output Style — `llm-rules`

한국어·존댓말·간결(자축/이모지/장황한 서론 금지). 설치 위치: `<claudeDir>/output-styles/llm-rules.md`.

## 컨벤션을 대체하지 않습니다

CC 에디션은 **enforce 레이어일 뿐**, 규칙의 내용·근거·예시는 전부 컨벤션 원본에 있습니다. hook 의 차단 메시지도 `common §3.1`, `frontend §4`, `git §6` 처럼 원본 조항을 가리킵니다. 규칙을 바꾸려면 hook 이 아니라 **컨벤션 원본을 먼저 고치고**, CC 에디션은 그에 맞춰 enforce 만 갱신합니다.

## 관련 문서

### CC 에디션 세부

- [enforcement.md](./enforcement.md) — 각 컨벤션 .md 의 규칙 → 메커니즘 매핑 + 강제 모델(HARD/SOFT, exit code, fail-open)
- [hooks.md](./hooks.md) — 3개 hook 의 입력·판정·출력 상세와 이전 설치 마이그레이션
- [commands.md](./commands.md) — slash command 사용법
- [agents.md](./agents.md) — subagent 역할과 트리거
- [settings.md](./settings.md) — `permissions`·hook 연결(`settings.json`) 상세

### 컨벤션 원본(SSOT)

- [index.md](../convention/index.md) — 컨벤션 진입점·요약
- [ai-process.md](../convention/ai-process.md) · [common.md](../convention/common.md) · [comments.md](../convention/comments.md) · [security.md](../convention/security.md) · [git.md](../convention/git.md)
- [frontend.md](../convention/frontend.md) · [fsd.md](../convention/fsd.md) · [query.md](../convention/query.md) · [backend.md](../convention/backend.md) · [desktop.md](../convention/desktop.md)
