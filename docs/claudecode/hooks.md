# Hooks — llm-rules Claude Code 에디션

> 컨벤션 prose(SSOT)는 이 레포의 `docs/convention/*.md` 에 있습니다. CC 에디션은 그 prose 를 복제하지 않고, 아래 3개 hook 으로 **enforce 레이어**만 더합니다.
> 설치 위치: `<claudeDir>/hooks/llm-rules/`. `settings.json` 의 `hooks` 가 각 이벤트에 연결합니다.

---

## 전제 — jq 의존성

**3개 hook 모두 `jq` 에 의존합니다.** 각 스크립트는 첫 줄에서 `command -v jq >/dev/null 2>&1 || exit 0` 으로 `jq` 가 없으면 **즉시 통과(no-op, exit 0)** 합니다. `jq` 는 hook 입력(JSON, stdin)을 파싱하고 출력 JSON(`{"decision":...}` / `additionalContext` 등)을 만드는 데 쓰입니다. 따라서 **`jq` 가 설치돼 있지 않으면 모든 enforce 가 조용히 비활성화**됩니다. 설치를 권장합니다(`brew install jq` 등).

공통 동작:

- 모든 스크립트는 `set -uo pipefail` 로 시작합니다.
- 입력은 stdin 의 JSON 으로 받습니다.
- **차단**은 `exit 2`(+stderr 가 Claude 에게 전달) 또는 stdout 의 `{"decision":"block","reason":...}` JSON 으로 합니다.
- **경고**는 stdout 의 `{"systemMessage":...}` JSON 으로 합니다(차단 아님).
- **컨텍스트 주입**은 stdout 의 `{"hookSpecificOutput":{... additionalContext ...}}` JSON 으로 합니다.

---

## 1. scan-secrets.sh

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

## 2. lint-edit.sh

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
- **코드 주석** (`//`, `/* */`. 단 파일에 `/**`(JSDoc)가 있으면 제외. 도구 설정 파일 yml·toml 의 짧은 주석은 컨벤션상 허용 — comments.md §1.1 — 이며 이 훅은 TS/JS 만 검사하므로 영향 없음) — comments.md §1.
- `HACK` / `FIXME` / `XXX` / `TODO` / `@ts-ignore` / `eslint-disable` — ai-process.md §6.2.
- sanitize 없는 `dangerouslySetInnerHTML` (`sanitize` / `DOMPurify` 가 없을 때만) — security.md §4.

HARD 가 하나라도 있으면 SOFT 를 같은 reason 의 "(참고: …)" 로 덧붙여 block 합니다. HARD 가 없고 SOFT 만 있으면 systemMessage 로 경고합니다.

**커버 규칙**: common.md §2·§3·§6, comments.md §1, frontend.md §4, backend.md §6.1·§14, security.md §4, ai-process.md §6.2.

**오탐 주의 (왜 function/주석이 HARD 가 아니라 SOFT 인가)**:

- `function` 키워드, 코드 주석, `export default`, `dangerouslySetInnerHTML` 등은 **문자열·JSDoc·정상 케이스에서 오탐 가능**하므로 차단하지 않고 **경고(systemMessage)** 만 합니다.
- 주석 검사는 파일에 `/**`(JSDoc)가 있으면 통째로 면제되어, JSDoc 을 쓰는 파일에서 인라인 주석을 못 잡을 수 있습니다(보수적으로 fail-open).
- 백엔드 HARD(`throw new Error` / `process.env`)는 **경로 휴리스틱**에 의존하므로, 위 경로 패턴 밖의 서버 코드는 검사되지 않습니다.

---

## 3. session-context.sh

| 항목 | 값 |
|------|----|
| 이벤트 | `SessionStart` (matcher `startup\|resume\|clear\|compact`, timeout 15s) |
| 동작 | 컨벤션 핵심 요약 + 작업 개시 프로토콜 + (있으면) `docs/PROCESS.md` 앞부분을 **`additionalContext` 로 주입**(`exit 0`) |

세션 시작/재개/클리어/컴팩션 시:

1. **`docs/` 디렉토리를 보장**(`mkdir -p docs`) — comments.md §3 / ai-process.md §1.
2. **컨벤션 문서 위치를 자동 감지**해 `세부:` 라인에 반영합니다. 우선순위: `LLM_RULES_CONVENTION_DIR` 환경변수 → 프로젝트 `$CLAUDE_PROJECT_DIR/.claude/convention` (미설정 시 cwd 기준) → 글로벌 `~/.claude/convention`. 각 후보는 `index.md` 존재 여부로 검증하며, 어디에도 없으면 경로 대신 **미설치 안내**를 주입합니다.
3. 컨벤션 핵심 요약을 컨텍스트로 만듭니다. **요약 문구의 단일 출처는 스크립트(`session-context.sh`)의 주입 텍스트**이며, 드리프트 방지를 위해 이 문서에는 원문을 복제하지 않습니다. (주제: 함수·타입·주석·매직넘버/이모지·export·FSD/쿼리·커밋·시크릿·검증·질문 방식)
4. **작업 개시 프로토콜**(도구 사용 작업은 workflow로 분해, Fable high 메인과 Sonnet high 작업자 역할·소유권·상세 위임 계약, 독립 작업 병렬/의존 작업 직렬, `PROCESS.md` 갱신, 공식 문서 확인, 범위 변경만 한 번에 질문)을 덧붙입니다. 원문의 단일 출처는 스크립트입니다.
5. `docs/PROCESS.md` 가 있으면 **앞 200줄(`head -n 200`)** 을 "현재 작업 상태"로 덧붙입니다.
6. `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":...}}` 로 출력합니다.

**커버 규칙**: ai-process.md §1·§14(`docs/PROCESS.md` 기반 작업, 세션 간 연속성) + §3(멈춤)·§4(모호한 지시 구체화)·§7(신규 스택 합의) 보강.

---

## 요약 표

| hook | 이벤트 | enforce/경고 | 차단 방식 | 핵심 커버 |
|------|--------|--------------|-----------|-----------|
| scan-secrets.sh | PreToolUse(Edit/Write/MultiEdit) | 강제(차단) | `exit 2` | security.md §1 |
| lint-edit.sh | PostToolUse(Edit/Write/MultiEdit) | HARD 차단 + SOFT 경고 | `{"decision":"block"}` / `{"systemMessage"}` | common·comments·frontend §4·backend §6.1·§14·security §4 |
| session-context.sh | SessionStart(startup/resume/clear/compact) | 주입 | `additionalContext` | ai-process.md §1·§14 |

> 전체 hook 은 `jq` 가 없으면 비활성화됩니다. `settings.json` 의 `permissions`(allow: bun/bunx/tsc/bun test와 일반 git status·diff·log·add·commit·push / ask: merge·rebase·패키지 add / deny: `.env` Read·Write·Edit·`secrets/**`·`rm -rf`·force push)와 함께 동작합니다. 일반 commit·push에는 PreToolUse validator나 승인 요청이 없습니다.

## 이전 설치 마이그레이션

이전 설치의 `guard-commit.sh`, `guard-push.sh`, `verify-on-stop.sh`, `reinject-rules.sh`는 더 이상 활성 hook이 아닙니다. Git guard는 일반 commit·push의 완전 자율 실행을 위해 제거했고 force push는 permission deny와 workflow 금지 규칙으로 유지합니다. 검증과 컨텍스트 중복은 위험비례 workflow와 `session-context.sh`로 대체했습니다. 설치기는 알려진 managed hook script와 settings entry만 prune하므로 사용자가 직접 만든 다른 hook은 보존합니다.

이전 템플릿이 추가한 정확한 `Bash(git commit:*)`·`Bash(git push:*)` ask 문자열은 재설치 시 제거하고 allow로 이동합니다. 사용자가 같은 문자열을 독립적으로 추가했더라도 출처를 구분할 메타데이터가 없으므로 함께 이동되는 한계가 있습니다.
