# Hooks — llm-rules Claude Code 에디션

> 컨벤션 prose(SSOT)는 `/Users/gkn/llm-rules/docs/convention/*.md` 에 있습니다. CC 에디션은 그 prose 를 복제하지 않고, 아래 6개 hook 으로 **enforce 레이어**만 더합니다.
> 설치 위치: `<claudeDir>/hooks/llm-rules/`. `settings.json` 의 `hooks` 가 각 이벤트에 연결합니다.

---

## 전제 — jq 의존성

**6개 hook 모두 `jq` 에 의존합니다.** 각 스크립트는 첫 줄에서 `command -v jq >/dev/null 2>&1 || exit 0` 으로 `jq` 가 없으면 **즉시 통과(no-op, exit 0)** 합니다. `jq` 는 hook 입력(JSON, stdin)을 파싱하고 출력 JSON(`{"decision":...}` / `additionalContext` 등)을 만드는 데 쓰입니다. 따라서 **`jq` 가 설치돼 있지 않으면 모든 enforce 가 조용히 비활성화**됩니다. 설치를 권장합니다(`brew install jq` 등).

공통 동작:

- 모든 스크립트는 `set -uo pipefail` 로 시작합니다.
- 입력은 stdin 의 JSON 으로 받습니다.
- **차단**은 `exit 2`(+stderr 가 Claude 에게 전달) 또는 stdout 의 `{"decision":"block","reason":...}` JSON 으로 합니다.
- **경고**는 stdout 의 `{"systemMessage":...}` JSON 으로 합니다(차단 아님).
- **컨텍스트 주입**은 stdout 의 `{"hookSpecificOutput":{... additionalContext ...}}` JSON 으로 합니다.

---

## 1. guard-commit.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `PreToolUse` (matcher `Bash`, `if "Bash(git commit*)"`, timeout 20s) |
| 동작 | 위반 시 **`exit 2` 로 커밋 차단**, stderr 로 사유 전달. 통과 시 `exit 0`. **파싱 실패는 fail-open(허용)** |

`git commit` 실행 직전에 4가지를 결정론적으로 검사합니다(`if` 필터가 1차로 거르지만, 스크립트가 `git[[:space:]]+commit` 으로 방어적 재확인 후 아니면 통과).

차단(`exit 2`)하는 위반:

1. **보호 브랜치 직접 커밋** — `git rev-parse --abbrev-ref HEAD` 결과가 `main` / `master` 이면 차단. (git.md §6) **명시적 허용 3종**이 있으면 이 검사만 생략한다: ① 1회성 — 커맨드에 `LLM_RULES_ALLOW_MAIN=1` 접두, ② 레포 단위(합의 기록) — `git config llm-rules.allow-main true`, ③ 전역 — hook 환경변수 `LLM_RULES_ALLOW_MAIN=1`. 나머지 검사(2~4)는 허용과 무관하게 항상 적용된다.
2. **Co-Authored-By / Claude 트레일러** — 커밋 명령에 `co-authored-by`, `generated with`, `🤖 generated`, `claude <` / `claude.ai <`, `noreply@anthropic` 패턴(대소문자 무시)이 있으면 차단. author 는 사용자 단독이어야 합니다. (개인 절대규칙)
3. **스테이지의 시크릿/빌드 산출물** — `git diff --cached --name-only` 결과에 `.env`(또는 `.env.*`), `secrets/`, `dist/`, `node_modules/`, `*.pem`, `id_rsa` 가 포함되면 차단. (git.md §6 · security.md §1)
4. **Conventional Commits 헤더 위반** — 첫 `-m`/`--message` 값을 헤더로 보고, `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(scope)?!?: .+` 패턴에 맞지 않으면 차단. (git.md §1·§2·§3)

**커버 규칙**: git.md §1·§2·§3·§6, security.md §1, 개인 절대규칙(Co-Authored-By 금지).

**오탐/한계 주의**:

- `-F`(파일) 커밋이나 **에디터로 메시지를 쓰는 커밋**은 `-m` 헤더가 없으므로 **Conventional Commits 검증을 생략(fail-open)** 합니다. `-m` 이 있을 때만 헤더를 검사합니다.
- `cmd` 가 비었거나 `jq` 파싱이 실패하면 통과합니다(fail-open). 즉 안전 쪽이 아니라 **허용 쪽으로 실패**합니다.

---

## 2. scan-secrets.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `PreToolUse` (matcher `Edit\|Write\|MultiEdit`, timeout 15s) |
| 동작 | 새로 쓰는 내용에 고신뢰 시크릿이 있으면 **`exit 2` 로 쓰기 차단**, stderr 로 사유. 없으면 `exit 0` |

파일에 **쓰려는(new) 텍스트만** 검사합니다: `Write` 는 `content`, `Edit` 는 `new_string`, `MultiEdit` 는 `edits[].new_string` 을 합쳐서 봅니다(기존 파일 내용은 검사하지 않음).

차단하는 고신뢰 패턴:

- AWS Access Key: `AKIA[0-9A-Z]{16}`
- GitHub token: `gh[pousr]_[A-Za-z0-9]{30,}`
- API secret key: `sk-[A-Za-z0-9]{20,}`
- Private key block: `-----BEGIN ... PRIVATE KEY-----`
- Slack token: `xox[baprs]-[A-Za-z0-9-]{10,}`

**커버 규칙**: security.md §1(시크릿 하드코딩 금지 → `.env` + `getEnv()`).

**오탐 주의**:

- **`.md` / `.mdx` / `.txt` 는 검사를 건너뜁니다(`exit 0`).** 문서 안의 예시 시크릿 패턴이 오탐으로 차단되는 것을 막기 위함입니다. 따라서 시크릿 차단은 코드 파일에만 적용됩니다.
- 페이로드가 비었거나 `jq` 가 없으면 통과합니다.

---

## 3. lint-edit.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `PostToolUse` (matcher `Edit\|Write\|MultiEdit`, timeout 60s) |
| 동작 | 편집은 이미 끝났으므로 `exit 2` 는 무의미 → **HARD 는 `{"decision":"block"}` 로 재수정 요구**, **SOFT 는 `{"systemMessage":...}` 로 경고만** |

대상이 TS/JS(`.ts .tsx .js .jsx .mts .cts`)가 **아니면 즉시 no-op(`exit 0`)**. 대상이면 먼저 **prettier `--write`** 로 자동 정렬(로컬 `./node_modules/.bin/prettier` 우선, 없으면 전역 `prettier`, 둘 다 없으면 건너뜀)한 뒤 어휘적으로 검사합니다.

**HARD (→ `{"decision":"block"}`, 즉시 수정 요구)**:

- `useCallback(` / `useMemo(` — frontend.md §4(React Compiler 위임).
- **백엔드 경로**(`*service/*`, `*route/*`, `*compose/*`, `*dto/*`, `*/server/*`)에서만:
  - `throw new Error(` — backend.md §6.1(`createAppError('CODE')` 사용).
  - `process.env.` 직접 접근 — backend.md §14 · security.md §1(`getEnv()` 싱글톤).

**SOFT (→ `{"systemMessage":...}`, 경고만 / 오탐 가능)**:

- `export default` (단 `*page.tsx`, `*layout.tsx`, `*route.ts`, `*app/*`, `*pages/*` 는 제외) — common.md §6(named export 기본).
- **`function` 키워드** (`function ` 선언 또는 `= function(`) — common.md §3.1(arrow function).
- **코드 주석** (`//`, `/* */`. 단 파일에 `/**`(JSDoc)가 있으면 제외) — comments.md §1.
- `HACK` / `FIXME` / `XXX` / `TODO` / `@ts-ignore` / `eslint-disable` — ai-process.md §6.2.
- sanitize 없는 `dangerouslySetInnerHTML` (`sanitize` / `DOMPurify` 가 없을 때만) — security.md §4.

HARD 가 하나라도 있으면 SOFT 를 같은 reason 의 "(참고: …)" 로 덧붙여 block 합니다. HARD 가 없고 SOFT 만 있으면 systemMessage 로 경고합니다.

**커버 규칙**: common.md §2·§3·§6, comments.md §1, frontend.md §4, backend.md §6.1·§14, security.md §4, ai-process.md §6.2.

**오탐 주의 (왜 function/주석이 HARD 가 아니라 SOFT 인가)**:

- `function` 키워드, 코드 주석, `export default`, `dangerouslySetInnerHTML` 등은 **문자열·JSDoc·정상 케이스에서 오탐 가능**하므로 차단하지 않고 **경고(systemMessage)** 만 합니다.
- 주석 검사는 파일에 `/**`(JSDoc)가 있으면 통째로 면제되어, JSDoc 을 쓰는 파일에서 인라인 주석을 못 잡을 수 있습니다(보수적으로 fail-open).
- 백엔드 HARD(`throw new Error` / `process.env`)는 **경로 휴리스틱**에 의존하므로, 위 경로 패턴 밖의 서버 코드는 검사되지 않습니다.

---

## 4. verify-on-stop.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `Stop` (timeout 600s) |
| 동작 | 변경된 TS/JS 가 있을 때만 타입체크. 실패 시 **`{"decision":"block"}` 로 계속 작업 유도**. 통과 시 `exit 0` |

게이팅 순서(하나라도 해당 없으면 검증 생략):

1. `stop_hook_active` 가 `true` 면 즉시 통과 — **stop-hook 으로 재개된 턴이면 재검증하지 않습니다(무한루프 방지).**
2. `git status --porcelain` 에 변경된 `.ts/.tsx/.js/.jsx/.mts/.cts` 가 **없으면 생략**(no-op).
3. `tsconfig.json` 이 없으면 타입체크 불가 → 생략.

타입체크 실행 우선순위:

- `package.json` 에 `"typecheck"` 스크립트가 있으면: bun lock(`bun.lockb`/`bun.lock`) → `bun run typecheck`, pnpm lock → `pnpm run typecheck`, 그 외 → `npm run typecheck`.
- 없으면 `./node_modules/.bin/tsc --noEmit` → 전역 `tsc --noEmit` → `npx --no-install tsc --noEmit` 순으로 시도.

실패하면 출력 마지막 40줄을 reason 에 담아 `{"decision":"block"}` 로 끝내기를 막고 수정을 유도합니다.

**커버 규칙**: ai-process.md §8(검증 후 다음 스텝).

**튜닝 — `LLM_RULES_STOP_TEST`**:

- 기본값 `0`(비활성). 테스트는 느려서 기본으로 돌리지 않습니다.
- **`LLM_RULES_STOP_TEST=1`** 일 때만 타입체크 통과 후 테스트를 추가 실행합니다: bun lock 이 있으면 `bun test`, 없으면 `npx --no-install vitest run`. 실패 시 마지막 40줄을 담아 block 합니다.

**주의**: timeout 이 600s 로 가장 깁니다(타입체크/테스트가 느릴 수 있음). 변경 게이팅 덕분에 코드 변경이 없는 턴에서는 비용이 들지 않습니다.

---

## 5. session-context.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `SessionStart` (matcher `startup\|resume`, timeout 15s) |
| 동작 | 컨벤션 핵심 요약 + (있으면) `docs/PROCESS.md` 앞부분을 **`additionalContext` 로 주입**(`exit 0`) |

세션 시작/재개 시:

1. **`docs/` 디렉토리를 보장**(`mkdir -p docs`) — comments.md §3 / ai-process.md §1.
2. 컨벤션 핵심 요약(arrow function only, return type 미명시, `any`/`unknown` 금지, 주석 금지, 2회 이상일 때만 공통화, named export, 타입 유도, `useCallback`/`useMemo` 금지, FSD 의존 방향, Conventional Commits, Co-Authored-By 금지, 시크릿은 `.env`+`getEnv()`, 모호하면 1줄 객관식 질문)을 컨텍스트로 만듭니다.
3. `docs/PROCESS.md` 가 있으면 **앞 200줄(`head -n 200`)** 을 "현재 작업 상태"로 덧붙입니다.
4. `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":...}}` 로 출력합니다.

**커버 규칙**: ai-process.md §1·§14(`docs/PROCESS.md` 기반 작업, 세션 간 연속성).

---

## 6. reinject-rules.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `UserPromptSubmit` (timeout 10s) |
| 동작 | 매 프롬프트마다 "절대 금지" 안티패턴 1줄을 **`additionalContext` 로 재주입**(`exit 0`) |

매 사용자 프롬프트 제출 시, 짧은 리마인더 한 줄(arrow-fn only · 주석 금지(JSDoc 만) · `any`/`unknown` 금지 · `useCallback`/`useMemo` 금지 · named export · FSD 의존 방향 위→아래 · Conventional Commits · Co-Authored-By 금지 · 요청 전 commit/push 금지 · 시크릿 하드코딩 금지 · 모호하면 1줄 객관식 질문)을 `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":...}}` 로 주입합니다.

**목적**: 긴 컨텍스트에서 규칙 드리프트(망각)를 막습니다. **토큰 절약을 위해 의도적으로 짧게** 유지합니다.

---

## 요약 표

| hook | 이벤트 | enforce/경고 | 차단 방식 | 핵심 커버 |
|------|--------|--------------|-----------|-----------|
| guard-commit.sh | PreToolUse(Bash, git commit) | 강제(차단) | `exit 2`, fail-open | git.md §1·§2·§3·§6, 트레일러 금지 |
| scan-secrets.sh | PreToolUse(Edit/Write/MultiEdit) | 강제(차단) | `exit 2` | security.md §1 |
| lint-edit.sh | PostToolUse(Edit/Write/MultiEdit) | HARD 차단 + SOFT 경고 | `{"decision":"block"}` / `{"systemMessage"}` | common·comments·frontend §4·backend §6.1·§14·security §4 |
| verify-on-stop.sh | Stop | 강제(작업 유도) | `{"decision":"block"}` | ai-process.md §8 |
| session-context.sh | SessionStart(startup/resume) | 주입 | `additionalContext` | ai-process.md §1·§14 |
| reinject-rules.sh | UserPromptSubmit | 주입 | `additionalContext` | 드리프트 방지(전반) |

> 전체 hook 은 `jq` 가 없으면 비활성화됩니다. `settings.json` 의 `permissions`(allow: bun/bunx/tsc/bun test/git status·diff·log·add / ask: git commit·push·merge·rebase·패키지 add / deny: `.env` Read·Write·Edit·`secrets/**`·`rm -rf`·`git push --force`)와 함께 동작해 권한·커밋·시크릿·타입안정성을 다층으로 방어합니다.
