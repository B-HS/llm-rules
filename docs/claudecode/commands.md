# 슬래시 커맨드 (`/llm-rules:*` · `/prepare-new`)

llm-rules Claude Code 에디션이 설치하는 **9개 슬래시 커맨드**입니다. 8개는 `/llm-rules:` 네임스페이스(`<claudeDir>/commands/llm-rules/`)를 쓰고, `/prepare-new` 는 네임스페이스 없이 `<claudeDir>/commands/` 루트에 설치됩니다. 각 커맨드는 컨벤션 prose(SSOT: `docs/convention/*.md`)를 직접 복제하지 않고, 해당 규칙을 **점검·검증·기록**하는 enforce 레이어로 동작합니다.

`<claudeDir>` 은 설치 위치에 따라 global(`~/.claude/`) 또는 project(`<repo>/.claude/`) 입니다.

---

## 한눈에 보기

| 커맨드 | 분류 | 목적 | 인자 |
|--------|------|------|------|
| `/llm-rules:audit-conventions` | 감사 | 공통/프론트 컨벤션 전반(arrow function·주석 금지·타입 유도·named export 등) 점검 | (선택) 점검할 경로/글롭 |
| `/llm-rules:audit-fsd` | 감사 | FSD 레이어 의존 방향(위→아래) 및 1파일 1컴포넌트 위반 점검 | (선택) 점검할 경로/글롭 |
| `/llm-rules:audit-backend-domain` | 감사 | 백엔드 도메인 계층(route/service/dto/compose) 규칙 점검 | (선택) 도메인명 또는 경로 |
| `/llm-rules:audit-query` | 감사 | TanStack Query v5 사용지침(QUERY_KEY 중앙관리·훅 위치·무효화) 점검 | (선택) 점검할 경로/글롭 |
| `/llm-rules:process` | 프로세스 | `docs/PROCESS.md` 체크리스트 생성·갱신(작업 항목 추적) | (선택) 작업 설명 |
| `/llm-rules:verify` | 검증 | 변경분 타입체크(+선택적 테스트) 검증 | (선택) 검증 범위 |
| `/llm-rules:save-docs` | 기록 | 작업 결과를 `docs/`(memory·history·bug·acknowledge·utils)에 분류 저장 | (선택) 분류/제목 |
| `/llm-rules:log-feedback` | 기록 | 사용자 피드백·결정·교정 사항을 `docs/` 에 누적 기록 | (선택) 피드백 내용 |
| `/prepare-new` | 핸드오프 | 세션 컨텍스트를 유실 없이 보존 — docs/ 최신화·정합성 검증 + `HANDOFF.md` + 재개 프롬프트 | (선택) 추가로 강조할 컨텍스트 |

> 인자는 모두 **선택**입니다. 인자를 생략하면 변경분(working tree/diff) 또는 현재 컨텍스트를 대상으로 동작합니다.

---

## 감사(audit) 커맨드

코드가 **이미 작성된 뒤** 컨벤션 위반을 찾아 보고합니다. 편집 시점에 자동으로 도는 `lint-edit.sh` 훅이 어휘적(lexical) 검사만 하는 것과 달리, audit 커맨드는 파일을 통독해 구조적 위반까지 봅니다.

### `/llm-rules:audit-conventions`
- **목적**: `common.md` · `comments.md` · `frontend.md` 의 공통 규칙 전반을 점검합니다.
  - arrow function 만 사용(`function` 키워드 금지), return type 미명시, `any`/`unknown` 금지, "2회 이상일 때만 공통화", named export 기본, 타입은 원본에서 유도(`z.infer`/`ReturnType`/`Pick`/`Omit`), 코드 주석 금지(JSDoc 만 예외), `useCallback`/`useMemo` 금지(React Compiler 위임), JSX inline 등.
- **사용법**: `/llm-rules:audit-conventions`
- **인자**: (선택) 점검할 디렉토리/파일 글롭. 생략 시 변경분 대상.

### `/llm-rules:audit-fsd`
- **목적**: `fsd.md` 의 레이어 의존(참조) 방향을 점검합니다. 참조는 `app → pages → widgets → features → entities → shared` 위→아래로만 흘러야 하며, 반대 방향(`shared → features`, `features → widgets` 등)은 금지입니다. `entities`(전역 import 가능)·`shared`(page 제외 어디서나) 예외와 1파일 1컴포넌트(SFC) 위반도 함께 봅니다.
- **사용법**: `/llm-rules:audit-fsd`
- **인자**: (선택) 점검할 경로/글롭.

### `/llm-rules:audit-backend-domain`
- **목적**: `backend.md` 의 백엔드 계층 규칙을 점검합니다. Route(DTO 검증·인증·`createAppError` throw) → Service(HTTP·Drizzle 모름, 입력 DTO 받음) → ServiceDb(compose 의 Drizzle 구현) 흐름, Factory 패턴, `throw new Error` 금지(→ `createAppError`), `process.env` 직접접근 금지(→ `getEnv()`), 응답 헬퍼 사용 등.
- **사용법**: `/llm-rules:audit-backend-domain`
- **인자**: (선택) 도메인명(예: `blog`) 또는 경로. 생략 시 변경된 백엔드 도메인 대상.

### `/llm-rules:audit-query`
- **목적**: `query.md` 의 TanStack Query v5 사용지침을 점검합니다. 쿼리 키는 `QUERY_KEY` 상수로 중앙 관리(인라인 배열 키 금지), 훅은 `entities/<entity>.query.ts` 에 위치, `clientFetch` 사용, `onSuccess` 에서 관련 쿼리만 `invalidateQueries`, 캐시 직접 조작 대신 무효화 후 재조회 등.
- **사용법**: `/llm-rules:audit-query`
- **인자**: (선택) 점검할 경로/글롭.

---

## 프로세스 · 검증 커맨드

### `/llm-rules:process`
- **목적**: `ai-process.md` §1·§2 에 따라 `docs/PROCESS.md` 를 생성·갱신합니다. 작업 a·b·c·d 항목을 markdown 체크리스트로 정리하고, 매 스텝의 상태를 체크합니다. 세션이 바뀌어도 작업 연속성을 보장하기 위한 단일 작업 상태 파일입니다.
- **사용법**: `/llm-rules:process`
- **인자**: (선택) 새로 추가할 작업 설명. 생략 시 현재 `PROCESS.md` 상태를 점검·갱신.
- **연계**: `session-context.sh` 훅이 세션 시작/재개 시 `docs/PROCESS.md` 앞부분을 컨텍스트로 자동 주입합니다.

### `/llm-rules:verify`
- **목적**: `ai-process.md` §7(검증 후 다음 스텝)에 따라 변경분을 검증합니다. 변경된 TS/JS 가 있을 때 타입체크(`tsc --noEmit`, 또는 `typecheck` 스크립트)를 돌리고, 실패 시 무엇을 고쳐야 하는지 보고합니다. 테스트는 환경변수 `LLM_RULES_STOP_TEST=1` 일 때만 동작하는 `verify-on-stop.sh` 훅과 동일 정책을 따릅니다.
- **사용법**: `/llm-rules:verify`
- **인자**: (선택) 검증 범위.
- **연계**: `verify-on-stop.sh`(Stop 훅)가 종료 시 같은 검증을 자동 실행하므로, 작업 도중 명시적으로 돌리고 싶을 때 이 커맨드를 씁니다.

---

## 기록(docs) 커맨드

### `/llm-rules:save-docs`
- **목적**: `ai-process.md` §8 의 결과물 분류 저장을 수행합니다. 하나의 작업이 끝날 때 내용을 아래 디렉토리에 분류해 기록합니다.

  | 경로 | 용도 |
  |------|------|
  | `docs/PROCESS.md` | 현재/누적 작업 상태·체크리스트 |
  | `docs/memory` | 장기 기억(결정·맥락·재사용 지식) |
  | `docs/history` | 작업 이력(시간순) |
  | `docs/bug` | 버그(증상·원인·해결) |
  | `docs/acknowledge` | 인지·확인 사항(사용자 결정·합의) |
  | `docs/utils` | 보조 툴·util·스크립트 |
- **사용법**: `/llm-rules:save-docs`
- **인자**: (선택) 저장 분류/제목. 생략 시 직전 작업을 적절한 분류로 저장.

### `/llm-rules:log-feedback`
- **목적**: 세션에서 사용자가 내린 교정·선호·결정을 `docs/`(주로 `acknowledge`/`memory`)에 누적 기록합니다. 같은 지적이 재발하지 않도록 결정과 그 이유를 남깁니다.
- **사용법**: `/llm-rules:log-feedback`
- **인자**: (선택) 기록할 피드백 내용. 생략 시 직전 대화에서 받은 피드백을 정리.

---

## 세션 핸드오프 커맨드

### `/prepare-new`
- **목적**: 현재 세션을 종료하고 새 세션에서 유실 없이 이어가기 위한 준비를 수행합니다. Phase 0(대화 전수 인벤토리 — 요약 아닌 목록화) → Phase 1(코드↔문서 정합성 대조) → Phase 2(`docs/` 최신화·고도화, `ARCHITECTURE.md`·`docs/acknowledge` 보장 — ai-process §9 분류 준수) → Phase 3(`docs/HANDOFF.md` 세션 스냅샷) → Phase 4(유실 자체 검증) → Phase 5(새 세션 복사-붙여넣기용 재개 프롬프트 출력) 순서로 진행합니다.
- **사용법**: `/prepare-new`
- **인자**: (선택) 추가로 강조할 컨텍스트.
- **특징**: 유일하게 네임스페이스 없이 설치됩니다(`<claudeDir>/commands/prepare-new.md`). `disable-model-invocation: true` 라 모델이 임의 호출하지 못하고 사용자가 명시적으로만 실행합니다. 문서와 재개 프롬프트만 산출하며 애플리케이션 코드는 수정하지 않습니다.
- **연계**: `session-context.sh` 훅의 `docs/PROCESS.md` 주입, `/llm-rules:save-docs` 의 분류 저장과 보완 관계입니다 — save-docs 가 작업 단위 기록이라면 prepare-new 는 세션 전체의 스냅샷·인수인계입니다.

---

## 훅과의 관계

슬래시 커맨드는 **명시적 호출**이고, 훅은 **자동 실행**입니다. 둘은 같은 컨벤션을 공유하지만 시점이 다릅니다.

- `lint-edit.sh`(PostToolUse): 편집 직후 `useCallback`/`useMemo`·백엔드 `throw new Error`·`process.env` 직접접근을 즉시 차단(HARD), `function` 키워드·코드 주석·잘못된 default export·`HACK`/`FIXME`/`@ts-ignore`·sanitize 없는 `dangerouslySetInnerHTML` 를 경고(SOFT)합니다. → `audit-conventions` 의 자동화 부분.
- `guard-commit.sh`(PreToolUse): 커밋 시 Conventional Commits 위반·`Co-Authored-By`/Claude 트레일러·`main`/`master` 직접 커밋·스테이지의 `.env`/secrets/dist/node_modules/key 파일을 차단합니다.
- `verify-on-stop.sh`(Stop): 종료 시 변경분 타입체크. → `verify` 의 자동화 부분.
- `session-context.sh`(SessionStart)·`reinject-rules.sh`(UserPromptSubmit): 컨벤션 요약과 `docs/PROCESS.md` 를 컨텍스트로 주입. → `process`/`save-docs` 와 연동.

세부 동작은 `docs/claudecode/hooks.md` 와 `settings.json` 을, 컨벤션 본문은 `docs/convention/*.md` 를 참고하세요.
