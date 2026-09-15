# 슬래시 커맨드 (`/llm-rules:*` · `/prepare-new`)

llm-rules Claude Code 에디션이 설치하는 **10개 슬래시 커맨드**입니다. 9개는 `/llm-rules:` 네임스페이스(`<claudeDir>/commands/llm-rules/`)를 쓰고, `/prepare-new` 는 네임스페이스 없이 `<claudeDir>/commands/` 루트에 설치됩니다. 각 커맨드는 컨벤션 prose(SSOT: `docs/convention/*.md`)를 직접 복제하지 않고, 해당 규칙을 **점검·검증·기록**하는 enforce 레이어로 동작합니다.

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
| `/llm-rules:workflow` | 오케스트레이션 | Fable main과 Sonnet high 서브에이전트로 도구 사용 작업을 분해·위임·통합 | (선택) 작업 설명 또는 현재 사용자 요청 |
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

### `/llm-rules:workflow`
- **목적**: 파일 조사·구현·테스트·리서치 같은 도구 사용 작업을 Claude Code subagent workflow로 수행합니다. Fable high 메인이 요구사항·작업 분해·의존성·파일 소유권·통합·최종 검증·Git을 소유하고, Sonnet high 작업자는 구현·검증·조사를 수행합니다.
- **사용법**: `/llm-rules:workflow <작업 설명>`
- **예시**: `/llm-rules:workflow 결제 API의 입력 검증과 관련 테스트를 추가해 주세요`
- **위임 계약**: 메인은 작업자에게 목표·완료 조건, 실제 파일·심볼 근거, 소유 범위·비목표, 적용 규칙·커맨드, 실행 순서, 엣지 케이스·금지 우회, 검증 명령·합격 기준, 보고 형식, Git 금지, 병렬/직렬 의존·대기 관계를 구체적으로 전달합니다. 작업자는 다른 소유 파일이나 Git 이력을 변경하지 않습니다.
- **통합**: 메인은 결과를 실제 diff·명령 출력으로 재검증한 뒤 독립적으로 되돌릴 수 있는 논리 단위로 선별 스테이징하고, AI 트레일러 없이 자동 commit/push합니다.

### `/llm-rules:process`
- **목적**: `ai-process.md` §1·§2 에 따라 `docs/PROCESS.md` 를 생성·갱신합니다. 작업 a·b·c·d 항목을 markdown 체크리스트로 정리하고, 매 스텝의 상태를 체크합니다. 세션이 바뀌어도 작업 연속성을 보장하기 위한 단일 작업 상태 파일입니다.
- **사용법**: `/llm-rules:process`
- **인자**: (선택) 새로 추가할 작업 설명. 생략 시 현재 `PROCESS.md` 상태를 점검·갱신.
- **연계**: `session-context.sh` 훅이 세션 시작/재개 시 `docs/PROCESS.md` 앞부분을 컨텍스트로 자동 주입합니다.

### `/llm-rules:verify`
- **목적**: `ai-process.md` §8.1(검증 후 다음 스텝)에 따라 변경분의 typecheck·lint/format·관련 테스트·가능한 실행 확인을 수행하고, 실패 시 무엇을 고쳐야 하는지 보고합니다.
- **사용법**: `/llm-rules:verify`
- **인자**: (선택) 검증 범위.
- **연계**: workflow의 `verification-worker`가 같은 검증 계약을 수행하고, 메인이 실제 결과를 최종 확인합니다.

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
- `guard-commit.sh`·`guard-push.sh`(PreToolUse): 각각 커밋 안전 규칙·force push 금지를 검증합니다. 두 guard는 Git을 실행하지 않는 validator이며, 안전 검사를 통과한 Git 작업을 allow합니다.
- `scan-secrets.sh`(PreToolUse)·`session-context.sh`(SessionStart): 시크릿 편집을 차단하고, 세션 시작·재개 시 컨벤션 요약과 `docs/PROCESS.md`를 주입합니다.
- `/llm-rules:workflow`와 `verification-worker`: 이전 종료 시 검증 대신 명시된 검증 계약을 수행하고 메인이 결과를 통합합니다.

세부 동작은 `docs/claudecode/hooks.md` 와 `settings.json` 을, 컨벤션 본문은 `docs/convention/*.md` 를 참고하세요.
