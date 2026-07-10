# 서브에이전트 (Subagents)

> llm-rules Claude Code 에디션의 서브에이전트 7종을 설명합니다. 설치 위치는 `<claudeDir>/agents/` 입니다.
> 서브에이전트는 **hook 이 못 잡는 "판단 필요" 영역을 메우는 리뷰어**입니다. 컨벤션 prose 원본은 `docs/convention/*.md` 이며, 서브에이전트는 그 prose 를 복제하지 않고 판단 레이어만 더합니다.

---

## hook 과 서브에이전트의 역할 분담

같은 컨벤션을 두 층위로 강제합니다.

| 층위 | 수단 | 검사 방식 | 한계 |
|------|------|-----------|------|
| **결정론적 강제** | hook (`guard-commit`·`lint-edit`·`scan-secrets`·`verify-on-stop`) | grep 기반 **어휘적(lexical)** 패턴 매칭 | 문맥·구조·의도를 못 봄 |
| **판단 리뷰** | 서브에이전트 7종 | 코드를 **읽고 맥락으로 판단** | 자동 차단은 못 함(권고) |

hook 이 잡는 것은 정확히 다음과 같은 **문자열 단위 위반**뿐입니다 (자산 스크립트 기준):

- `lint-edit.sh`: `useCallback`/`useMemo` 호출, backend 경로의 `throw new Error(` · `process.env.` 직접접근(HARD=block). `function ` 키워드, `//`·`/*` 주석, page/layout 외 `export default`, `HACK|FIXME|XXX|TODO|@ts-ignore|eslint-disable`, sanitize 없는 `dangerouslySetInnerHTML`(SOFT=경고).
- `guard-commit.sh`: Conventional Commits 헤더, `Co-Authored-By`/Claude 트레일러, `main`/`master` 직접 커밋, 스테이지의 `.env`·`secrets/`·`dist/`·`node_modules/`·`.pem`·`id_rsa`.
- `scan-secrets.sh`: `AKIA…`·`gh[pousr]_…`·`sk-…`·`PRIVATE KEY`·`xox…` 고신뢰 시크릿.
- `verify-on-stop.sh`: `tsc --noEmit` 성공 여부.

hook 이 **구조적으로 못 잡는 것**(서브에이전트가 메우는 영역):

- FSD 레이어 **의존성 방향** 위반 — import 경로의 레이어 관계는 grep 으로 판정 불가.
- 타입을 **손으로 다시 적었는지** vs `ReturnType`/`z.infer` 등으로 유도했는지 — 의미 판단 필요.
- backend 의 **계층 책임 분리**(Service 가 HTTP/Drizzle 을 아는지, compose 격리 여부) — 파일 간 관계.
- 입력 검증 **경계**·인가의 **서버 재확인** 여부 — 데이터 흐름 추적 필요.
- QUERY_KEY **중앙관리**·무효화 정합성 — 키 직렬화·invalidate 짝 판단.
- IPC **타입 계약**·preload **권한 최소화** — 노출면 판단.

---

## 자동 위임 vs 수동 호출

- **자동 위임(automatic delegation)**: 작업 맥락이 해당 서브에이전트의 설명(description)과 맞으면 Claude 가 알아서 위임합니다. 예: backend `route/`·`service/` 파일을 수정하면 backend-convention-reviewer 로, React 컴포넌트를 다루면 convention-reviewer/fsd-dependency-reviewer 로.
- **수동 호출(explicit invocation)**: 이름을 직접 지정해 부릅니다. 예: "fsd-dependency-reviewer 로 이 import 들을 점검해줘". 대응하는 슬래시 커맨드(`/llm-rules:audit-fsd`, `/llm-rules:audit-backend-domain`, `/llm-rules:audit-query` 등)로 트리거할 수도 있습니다.
- 변경 직후가 아니라 **PR 단위·범위 전체**를 검토하고 싶을 때 수동 호출이 유용합니다.

---

## 1. convention-reviewer

- **언제**: 프론트엔드/공통 TS·JS 코드를 작성·수정한 뒤. 일반 코드 리뷰가 필요할 때 자동 위임됩니다. `/llm-rules:audit-conventions` 로 수동 호출.
- **무엇을 리뷰**: common·comments·frontend 컨벤션의 **판단 영역**.
  - **함수 공통화 "2회 이상" 룰** — 1회만 쓰이는 로직을 미리 함수로 뺐는지(조기 추상화), 또는 2회 이상인데 inline 중복인지. (grep 으로 판정 불가)
  - **JSX inline 규칙** — 한 줄짜리 핸들러·조건·매핑을 굳이 밖으로 뺐는지, 2줄 이상인데 inline 으로 길게 늘어졌는지.
  - **컴포넌트 작성 순서** — `useRef → useState → 함수/파생 → useEffect/custom hooks` 순서 위반.
  - **`FC<Props>` 패턴**·Props 타입 네이밍(`컴포넌트명 + Props`).
  - **네이밍**(폴더·파일 kebab-case, 컴포넌트 PascalCase, boolean `is/has/can/should` 접두사, 핸들러 `handle`, hook `use`, HOF `with`, factory `create`).
  - **코드 주석**·`function` 키워드·default export — hook 이 SOFT 경고만 내는 항목을 맥락으로 재확인(JSDoc 예외 판단 포함).

## 2. fsd-dependency-reviewer

- **언제**: import 구조·레이어 배치가 바뀌었을 때. `/llm-rules:audit-fsd` 로 수동 호출. **hook 이 전혀 못 잡는 영역**이라 FSD 프로젝트에서 특히 중요합니다.
- **무엇을 리뷰**: fsd.md 의 아키텍처 규칙.
  - **의존성(참조) 방향** — `app→pages→widgets→features→entities→shared` 위에서 아래로만 흐르는지. 반대 방향(`shared→features`, `features→widgets`) import 차단. 참조 허용 매트릭스(행→열) 위반 탐지.
  - **`entities`/`shared` 예외** — entities 는 모든 상위 레이어에서, shared 는 page 제외 모든 레이어에서 import 가능. 이를 위반으로 오판하지 않게 판단.
  - **레이어 책임** — `features` 에 `fetch`/TanStack Query 등 비즈니스 로직이 들어갔는지(features 는 순수 컴포넌트, widgets 부터 로직 허용).
  - **1파일 1 export(SFC)** — 컴포넌트 파일에 여러 컴포넌트 export(shared 의 constant·utils 는 예외).
  - **공통 constant·hook 의 `shared/` 배치**, path alias(=레이어) 일치.

## 3. type-utility-reviewer

- **언제**: 타입 정의를 추가·수정했을 때. `/llm-rules:audit-conventions` 와 함께 또는 수동 호출.
- **무엇을 리뷰**: common.md §5(타입)의 **유도(derive) 판단** — hook 이 못 보는 핵심 영역.
  - **타입을 손으로 다시 적었는지** — `ReturnType`·`Parameters`·`Awaited`·`ComponentProps`·`Omit`·`Pick`·Union·`z.infer`·`$inferSelect` 로 원본에서 유도해야 할 것을 중복 선언했는지.
  - **불필요한 타입 명시** — 추론 가능한 반환/변수 타입(`: Promise<void>`, `: string`)을 명시했는지. 단 공개 API 경계(라이브러리 export, DTO 입력)는 명시가 맞다는 예외 판단.
  - **`type` 우선** — `interface` 는 HTML 속성 확장이 필요할 때만.
  - Service 타입 `ReturnType<typeof createXxxService>`, DTO 타입 `z.infer<typeof schema>`, DB 모델 `$inferSelect`/`$inferInsert` 유도 패턴 준수.

## 4. backend-convention-reviewer

- **언제**: backend(Hono.js) `route/`·`service/`·`dto/`·`compose/` 파일을 다룰 때 자동 위임. `/llm-rules:audit-backend-domain` 으로 도메인 단위 수동 호출.
- **무엇을 리뷰**: backend.md 의 **계층 책임 분리**(hook 은 `throw new Error`·`process.env` 두 패턴만 잡음).
  - **데이터 흐름** — `Route(DTO 검증·인증·에러 throw) → Service(도메인 로직) → ServiceDb(compose 의 Drizzle 구현)`. Service 가 HTTP `Context` 를 받거나 Drizzle 을 직접 호출하면 위반.
  - **Factory DI** — `createXxxService(deps)` 패턴, `*ServiceDb` 가 의미 단위 메서드 인터페이스인지(범용 CRUD 아님), compose 가 `*ServiceDb` 를 인라인 구현해 Drizzle 을 격리했는지.
  - **에러 중앙화** — `createAppError('CODE')` 만 throw, 새 에러는 3-파일(error-code·error-message·error)에 모두 추가, 도메인 접두사 네이밍, "없음"은 `null` 반환(throw 는 Route 가).
  - **HOF 합성** — 모든 핸들러를 `withErrorHandling` 으로 감쌌는지, 인증은 `withAuth`/`withAdmin`, 합성 순서(바깥 error → 안쪽 auth).
  - **응답 헬퍼** — `successResponse`/`paginatedResponse`/`errorResponse` 만 사용(`c.json` 임의 구조 금지).
  - **DTO** — Zod 스키마만, `z.coerce`+`.default`, 입력 타입 `z.infer` 유도. **환경변수** `getEnv()` 싱글톤(hook 의 `process.env` 차단을 구조 차원에서 재확인).

## 5. security-reviewer

- **언제**: 입력 처리·인증/인가·외부 콘텐츠 렌더·환경변수·DB 접근 코드를 다룰 때. `security-review` 류 작업에 자동 위임하거나 수동 호출.
- **무엇을 리뷰**: security.md 의 **위협 판단**(hook 은 고신뢰 시크릿 문자열과 sanitize 없는 `dangerouslySetInnerHTML` 만 잡음).
  - **시크릿** — 하드코딩 여부, `NEXT_PUBLIC_*` 에 시크릿이 들어갔는지(클라 번들 노출), 백엔드 `getEnv()` 검증 경유.
  - **입력 검증 경계** — 외부 입력(바디·쿼리·폼)을 신뢰 경계에서 Zod 로 검증하는지. 검증 안 된 값을 DB·파일경로·셸·HTML 로 흘리는지.
  - **Injection** — raw SQL 문자열 결합(ORM 파라미터 바인딩 위반), 파일 경로·외부 명령에 사용자 입력 직접 주입(path traversal·command injection).
  - **XSS** — 외부 콘텐츠 `dangerouslySetInnerHTML` 주입 시 sanitize 여부·신뢰 경계 판단.
  - **인증·인가** — 최소 권한, 보호 핸들러 `withAuth`/`withAdmin`, **인가를 클라이언트에만 의존하지 않고 서버에서 재확인**하는지.
  - **에러·로그** — `details` 프로덕션 노출 금지, 스택트레이스·토큰·개인정보 로그 누출.

## 6. tanstack-query-reviewer

- **언제**: TanStack Query 훅(`useQuery`/`useMutation`)·`*.query.ts`·QUERY_KEY 를 다룰 때. `/llm-rules:audit-query` 로 수동 호출.
- **무엇을 리뷰**: query.md 의 **서버 상태 정합성**(hook 으로 검사 불가).
  - **QUERY_KEY 중앙관리** — 컴포넌트에 인라인 배열 키를 적었는지. 도메인 계층 키 구조, 파라미터 없는 키는 정적 값, 있는 키는 함수, 목록은 파라미터 객체가 키에 그대로 포함됐는지(v5 결정적 해싱 — 수동 직렬화는 위반).
  - **위치·네이밍** — 훅을 `entities/<entity>.query.ts` 에 뒀는지, `'use client'` 명시, `use`+동작+Feature 네이밍.
  - **조회** — `queryKey` 를 `QUERY_KEY` 에서 가져오는지, `queryFn` 이 `clientFetch` 로 필요한 데이터만 반환하는지, 조건부는 `enabled`.
  - **변경·무효화** — `onSuccess` 에서 **관련 쿼리만 `invalidateQueries`**(같은 `QUERY_KEY` 사용), 캐시 직접 `setQueryData` 대신 무효화 후 재조회, `toast` 피드백, 무효화에 `variables` 필요 시 두 번째 인자 사용.
  - `staleTime`/`gcTime` 데이터 성격에 맞는 명시.

## 7. desktop-security-reviewer

- **언제**: 데스크톱(Electron/Tauri) 셸·메인 프로세스·IPC·preload 코드를 다룰 때.
- **무엇을 리뷰**: desktop.md + security.md §7 의 **셸 경계 판단**(hook 은 셸/IPC 를 전혀 모름).
  - **렌더러 = 프론트엔드** — 화면 코드가 frontend.md 규칙(FSD·`FC<Props>`·hook 순서·React Compiler·JSX inline)을 따르는지.
  - **IPC 타입 계약** — 프로세스 간 통신이 타입 정의된 이벤트/커맨드 맵(`EVENTS_TYPE`)을 통해서만 이뤄지는지. 메인·preload·렌더러가 같은 타입을 공유하고 핸들러 시그니처를 `Parameters`/`ReturnType` 으로 유도하는지.
  - **권한 최소화** — 렌더러에 네이티브 전권을 넘기지 않고 preload(bridge)로 필요한 API 만 노출하는지.
  - Electron 구조(`main.ts`·`preload/`·`events/`·`renderer/`) 준수. (Tauri 도입 시 command/event 타입 계약·capabilities 점검으로 확장.)

---

## 요약

| 서브에이전트 | 대응 컨벤션 | hook 이 못 메우는 핵심 |
|---|---|---|
| convention-reviewer | common·comments·frontend | "2회 이상" 룰, JSX inline, 작성 순서, 네이밍 맥락 |
| fsd-dependency-reviewer | fsd | 레이어 의존성 방향·책임(완전히 hook 사각지대) |
| type-utility-reviewer | common §5 | 타입 손작성 vs 유틸리티 유도 판단 |
| backend-convention-reviewer | backend | 계층 책임 분리·Factory DI·에러 중앙화 |
| security-reviewer | security | 입력 경계·인가 서버 재확인·Injection 흐름 |
| tanstack-query-reviewer | query | QUERY_KEY 중앙관리·무효화 정합성 |
| desktop-security-reviewer | desktop | IPC 타입 계약·preload 권한 최소화 |

관련 파일(절대 경로):
- 자산 정의: `/Users/gkn/llm-rules/docs/claudecode/assets/settings.json`, `/Users/gkn/llm-rules/docs/claudecode/assets/hooks/*.sh`
- 컨벤션 SSOT: `/Users/gkn/llm-rules/docs/convention/{common,comments,frontend,fsd,query,backend,security,desktop}.md`
- 서브에이전트 설치 위치: `<claudeDir>/agents/`
