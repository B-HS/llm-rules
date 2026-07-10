# 코딩 컨벤션 코어 (llm-rules Agent Edition)

> 이 문서는 `llm-rules` 코딩 컨벤션 **전문의 압축 코어**다. 여기 있는 규칙은 전부 **절대 규칙**이며 모든 코드 작업에 적용된다.
> 전문(상세 규칙·예시·근거)은 `{{LLM_RULES_DIR}}/` 의 11개 문서다. **§0 의 매핑에 따라, 해당 주제를 작업하기 전에 반드시 그 전문 문서를 파일로 읽는다.**

---

## 0. 전문 문서 참조 프로토콜

| 작업 상황 | 작업 전에 읽을 전문 문서 |
|---|---|
| 모든 작업 (항상) | `{{LLM_RULES_DIR}}/ai-process.md` |
| TS/JS 코드 작성 전반 | `{{LLM_RULES_DIR}}/common.md` · `{{LLM_RULES_DIR}}/comments.md` |
| 프론트엔드 (React / Next.js) | `{{LLM_RULES_DIR}}/frontend.md` · `{{LLM_RULES_DIR}}/fsd.md` |
| 서버 상태 / TanStack Query | `{{LLM_RULES_DIR}}/query.md` |
| 백엔드 (Hono / Drizzle) | `{{LLM_RULES_DIR}}/backend.md` |
| 커밋 · 브랜치 | `{{LLM_RULES_DIR}}/git.md` |
| 시크릿 · 입력 검증 · 인증 | `{{LLM_RULES_DIR}}/security.md` |
| 데스크톱 (Electron / Tauri) | `{{LLM_RULES_DIR}}/desktop.md` |

- 이 코어와 전문 문서가 다르면 **전문 문서가 우선**한다.
- 규칙 충돌 사다리: **사용자 명시 지시 > 프로젝트 고유 룰 > 이 컨벤션 > 기존 코드 패턴.** 컨벤션과 다른 선택을 했으면 사용자에게 알린다.
- 컨벤션이 침묵하는 주제: 기존 코드 패턴 → 프레임워크 공식 권장 → 그래도 애매하면 질문. **임의로 새 컨벤션을 만들지 않는다.**

---

## 1. 절대 금지 (안티패턴)

- **`function` 키워드** — arrow function 만. (예외: 클래스 메서드 축약, 불가피한 `function*`)
- **`any` / `enum` / `as` 로 검증 대체** — `unknown` 은 외부 경계에서만 + 즉시 좁힘, enum 은 `as const` + union.
- **매직넘버 하드코딩** — 타이밍·크기·임계값은 UPPER_SNAKE 상수(FE 는 `shared/constants`)나 prop 으로. (0·1·빈 문자열은 예외)
- **이모지·아스키아트** — 코드·UI·커밋·응답 전부 금지. 시각 설명은 실제 렌더·스크린샷으로.
- **`@ts-ignore` · `eslint-disable`** — 검사기 끄기는 우회다. 불가피 시 `@ts-expect-error` 만 + `docs/` 사유 기록 + 사용자 보고.
- **코드 주석** — 유일 예외는 공개 API 의 영어 JSDoc. (shebang·`'use client'`·triple-slash 는 도구 지시라 허용)
- **`useCallback` · `useMemo`** — React Compiler 에 100% 위임.
- **임의 전역 상태 라이브러리 도입** — zustand 만 frontend.md §6 의 실수요 조건(고빈도 갱신·위젯 간 공유)에서 허용. redux·jotai 등 금지, 서버 상태의 store 반입 금지.
- **FSD 역방향 import** (아래층이 위층을 참조).
- **1회성 조기 추상화** — 공통화는 "2회 이상" 쓰일 때만.
- **자명한 반환/변수 타입 명시** (`: Promise<void>` 등) — 추론에 맡긴다.
- **HACK · TRICK · 임시 우회** — 항상 근본 원인 해결.
- **추측 진행** — 코드베이스·공식 문서 확인 없이 가정 금지.
- **프로젝트 환경 우회** — Drizzle 있는데 raw SQL, bun 인데 npm 등.
- **요청 범위 밖 수정** — 무관한 리팩토링·리네임·재포맷 금지 (minimal diff).
- **임의 의존성 추가** — 기존/표준으로 되는지 먼저 확인.
- **시크릿 하드코딩 / `.env` 읽기·쓰기 / 미검증 입력 사용.**
- **사용자 요청 전 commit·push / AI 트레일러(`Co-Authored-By` 등) / `git add -A` / force push.**
- **검증 없이 "통과했다" 보고.**
- **확인 사항을 하나씩 끊어 묻기** — 한 번에 모아 질문.
- **컨텍스트가 길다는 이유로 규칙 완화.**

---

## 2. 작업 프로세스 (ai-process)

- 응답은 **한국어 + 존댓말, 간결하게.** 미사여구·빈말 금지.
- **세션 시작 시퀀스**: ① 베이스 룰 확인 → ② `docs/PROCESS.md` 읽기(진행 중 체크리스트 파악) → ③ 필요 시 `docs/memory` · `docs/acknowledge`.
- **2개 파일 / 2스텝 이상 작업**은 `docs/PROCESS.md` 에 체크리스트를 만들고 스텝마다 체크한다. 체크리스트 밖 행동 금지 — 필요해지면 멈추고 물은 뒤 추가한다.
- **모호한 지시**("리팩토링해줘")는 즉시 실행하지 않는다 — 역질문으로 구체화하고 `docs/` 에 기록.
- 질문은 **결정 1개면 1줄 객관식, 2개 이상이면 한 묶음**(추천안 먼저, "전부 추천안대로" 답변 가능하게).
- **신규 프로젝트**는 스택·환경(런타임·패키지매니저·FE/BE·DB·배포)을 먼저 합의.
- **공식 문서 확인 후 구현** (문서 조회 도구 또는 웹 검색). 기억만으로 API 를 쓰지 않는다. 의존성은 최신 버전, 추가 전 필요성 검토, 충돌 시 사용자 확인.
- **프로젝트 상태는 실제 파일이 단일 출처** — 메모리·과거 문서와 다르면 파일을 신뢰하고 기록을 갱신한다.
- **버그는 재현이 먼저** — 가능하면 실패하는 테스트 작성 후 수정.
- **종료 전 최소 기계 검증**: typecheck(`tsc --noEmit`) → lint/format → 기존 테스트 → 가능하면 실행 확인. 프로젝트는 `package.json` 에 `typecheck`·`test` 스크립트를 제공한다(lint 는 설정된 경우만). 실행기가 없으면 사실대로 보고. 실패는 고치고 재검증 후에만 완료 보고.
- **결과 분류 저장**: `docs/PROCESS.md`(상태) · `memory`(장기 결정) · `history`(이력) · `bug` · `acknowledge`(합의) · `utils` · `feedback`(지적 리포트) · `quality-assurance`(검증 체크리스트).

---

## 3. 공통 코드 규칙 (common)

- **TS strict.** 신규 프로젝트는 Bun 기본, 기존 프로젝트는 그 환경을 따른다. Python 은 **uv**(pip 금지, 단발 스크립트는 PEP 723 + `uv run`).
- **Prettier**: printWidth 150 · tab 4(스페이스) · semi false · singleQuote · jsxSingleQuote · trailingComma all · arrowParens always · bracketSameLine · lf. (설정 없으면 이 값으로 `prettier.config.js` 생성, 기존 설정 있으면 그것 우선)
- **async/await 만** — `.then()` 체이닝 신규 작성 금지. 병렬은 `Promise.all`.
- **early return(가드 클로즈)** 로 중첩을 낮추고, 대체 가능한 `else`·**삼항 중첩(2단 이상) 금지** — lookup 객체로.
- **`const` 우선**(`let` 은 불가피할 때만, `var` 금지). 배열/객체는 mutation 대신 **비파괴 연산**(spread·map·filter·toSorted). 기본값은 `||` 대신 **`??`**.
- **날짜·시간**: 저장·서버·API 는 UTC(ISO 8601), 로컬 변환은 표시 계층에서만. 기존 DB 는 timezone 설정 확인 후 그에 맞춘다. 라이브러리는 `dayjs` 기본(간단하면 `Intl` 먼저).
- **배포용 라이브러리**: 코어에 `window`/`document`/`fs` 등 환경 전역 금지, DOM 의존은 별도 export 경로 격리, `exports` conditional 명시. (SSR·Edge 호환)
- **네이밍**: 폴더/파일 kebab-case · 컴포넌트/타입 PascalCase · 변수/함수 camelCase · 상수 UPPER_SNAKE_CASE · Boolean `is/has/can/should~` · 핸들러 `handle~` · Hook `use~` · HOF `with~` · Factory `create~`. **이름은 길어도 정확하게.**
- **타입**: `type` 우선 (interface 는 HTML 속성 확장만). 추론 우선 — 명시는 공개 API 경계(패키지 export · DTO · `*ServiceDeps`/`*ServiceDb` · IPC 맵)로 한정.
- **유틸리티 타입으로 원본에서 유도**: `z.infer` · `ReturnType` · `Parameters` · `Awaited` · `ComponentProps` · `Omit`/`Pick` · `$inferSelect` · `as const`. 타입을 손으로 다시 적지 않는다.
- **named export 기본** (default 는 Next.js 페이지/레이아웃만).
- **import 순서**: 디렉티브 → 프레임워크 → 외부 라이브러리 → `import type` → alias → 상대 경로. **alias 를 상대 경로보다 우선.**
- **디버그 `console.log` 커밋 금지.** 남길 서버 로그는 로깅 경로(로거·에러 리포팅)로만 — 시크릿·개인정보 금지.

---

## 4. 주석 (comments)

- 코드 주석 금지 — 이름·구조·타입으로 설명한다. 설명이 필요하면 `docs/` 문서로 (대상 파일 · 리포트 · 상세). 도구 설정 파일(CI yml·toml 등)의 짧은 주석은 예외.
- 유일 예외: 공개 API 의 **JSDoc (영어)**.
- 기존 코드의 주석은 요청 밖이면 유지, 지금 수정하는 코드의 주석은 개선으로 대체 후 제거.
- **dead code 는 주석 처리 보관 대신 삭제** (git 이 히스토리 보관). 내 변경으로 생긴 미사용 import·변수도 함께 제거. 요청 밖 기존 dead code 는 보고만.

---

## 5. 보안 (security)

- 시크릿 하드코딩 금지. `.env` + `.gitignore`. 백엔드는 `getEnv()` 싱글톤 + Zod 로만 접근. `NEXT_PUBLIC_*` 에 시크릿 금지.
- **에이전트는 `.env`·키 파일을 읽지도, 쓰지도, 출력하지도 않는다.** 새 변수는 `.env.example` 에 키 이름만 추가하고 값은 사용자에게 안내. 노출된 시크릿 발견 시 즉시 보고.
- 외부 입력은 **경계에서 Zod 검증.** DB 는 ORM 파라미터 바인딩(raw SQL 금지). 파일 경로·셸 명령에 사용자 입력 직접 주입 금지.
- `dangerouslySetInnerHTML` 은 sanitize(DOMPurify 등) 후에만. 인가는 클라이언트에 의존하지 않고 서버에서 재확인. 로그에 시크릿·토큰·개인정보 금지.
- 파일 업로드는 MIME·확장자·크기 화이트리스트 검증. 남용 가능한 공개 엔드포인트에는 rate limit.

---

## 6. Git (git)

- **Conventional Commits v1.0.0**: `type(scope): 설명` — type 영어(feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert), 마침표 없이 50자 이내. BREAKING CHANGE 는 `!` 또는 대문자 footer. 기본 언어는 한국어 명사형(`~추가`).
- **언어·스타일은 히스토리 우선**: 별도 지시가 없으면 커밋 전에 `git log --oneline -30` 으로 과거 커밋을 읽고 그 언어·형식에 맞춘다. 히스토리가 없으면 기본값(한국어). **섞여 있으면 사용자에게 묻고**, 결정을 `docs/acknowledge` 에 기록해 이후 커밋·푸시에 계속 적용한다.
- 브랜치 `<type>/<요약>` kebab-case. `main` 직접 커밋 금지.
- **요청 전 커밋·푸시 금지.** 논리 단위 1커밋. **선별 스테이징**(`git add -A`/`.` 금지), 커밋 전 `git status`/`git diff` 확인. **force push 금지**(승인 시에도 `--force-with-lease` 만).
- 커밋을 여러 개로 나눌 때는 **한 커밋분만 스테이징 → 완료 확인 → 다음** 순서로 진행한다.
- **author 는 사용자 단독** — `Co-Authored-By`·`Generated with`·`Claude-Session:` 등 세션 링크·🤖 등 AI 서명·트레일러 금지.

---

## 7. 프론트엔드 (frontend · fsd)

- **변형 FSD 필수**: `app → pages → widgets → features → entities → shared`, 의존은 위→아래로만. `entities` 는 모든 레이어에서, `shared` 는 page 제외 어디서나 import 가능.
- **배치 결정 트리**: 도메인 데이터·API·쿼리 훅 → `entities` / 범용 UI·util·hook(shadcn 포함) → `shared`(`shared/ui`) / fetch·query·조립 → `widgets` / props 만 받는 도메인 UI → `features` / 라우팅 단위 → `pages`(Next.js 는 `app`). 애매하면 더 아래층.
- **barrel(index.ts) 금지** — alias 로 파일 직접 경로 import. alias = 레이어 (`@widgets/*` 등).
- 컴포넌트: **1파일 1 export(SFC)**, `FC<Props>` 패턴, 본문 순서 **useRef → useState → 함수/로직 → useEffect·custom hooks**(useEffect 는 `return` 바로 위).
- **useCallback/useMemo 금지** (전제: 모든 React 프로젝트에서 React Compiler 활성화 — Next 는 next.config, Vite·데스크톱 렌더러는 babel-plugin-react-compiler). **useEffect 는 외부 시스템 동기화에만** — 파생 값은 렌더 중 계산, 이벤트 로직은 핸들러에서, fetch 는 TanStack Query 로.
- JSX 로직은 포매팅 기준 **2줄 미만이면 inline**. `{count && <X/>}` 의 0-렌더링 함정 주의(`count > 0 &&`). **`key` 는 안정된 id** — 재정렬 목록에 index 금지.
- 접근성 최소선: 시맨틱 태그 우선, 클릭 요소는 `button`(동작)/`a`(이동) 구분(`div` onClick 금지), 이미지 `alt`·폼 label. 나머지는 Radix/shadcn 이 커버.
- 서버 컴포넌트 우선, 클라이언트는 `'use client'` 명시. 스타일 **Tailwind + shadcn/ui + CVA + `cn()`**. 에러 피드백 `sonner` toast. 인증 better-auth.
- 상태 사다리: 서버=TanStack Query · 로컬=`useState` · 저빈도 크로스커팅=Context(provider 한정 — 고빈도 값 금지) · 그 외 전역 클라이언트 상태만 **zustand**(실수요 시 + `docs/acknowledge` 기록, 서버 상태 반입 금지. store 위치: 도메인=`entities/<entity>.store.ts` · UI=`shared/store/`).
- **폼: react-hook-form + `zodResolver`** (+ shadcn Form). 한두 필드 단순 입력은 `useState`.
- Server Action 은 `entities/<entity>.action.ts` + `'use server'`, 본문에서 Zod 재검증, 완료 후 revalidate/invalidate. 데이터 변경은 API 경유가 기본.
- i18n 은 프로젝트별 선택(next-intl · react-i18next · Paraglide · Lingui · FormatJS) 후 `docs/acknowledge` 기록. 문자열 하드코딩 대신 메시지 카탈로그.
- 테스트: `bun:test` + Testing Library(DOM 환경은 상황에 맞게 선택), E2E 는 Playwright(도입은 합의 후). describe/test 설명 한국어.
- Next.js 이미지는 `next/image` 기본.

---

## 8. TanStack Query v5 (query)

- QueryClient 기본 **`staleTime: 60_000`** 명시. 서버에서는 요청마다 새 QueryClient.
- **`QUERY_KEY` 중앙 관리**(shared) — 키는 항상 배열, **도메인 → 동작 → 파라미터 계층**(`['post', 'list', params]`). 파라미터 객체는 직렬화하지 않고 그대로 넣는다(v5 결정적 해싱 — 속성 순서 무관). 도메인 전체 무효화는 prefix(`ALL: ['post']`). 무효화도 같은 상수 사용.
- **조회 옵션은 `queryOptions` 팩토리**(`<entity>QueryOptions`)로 한 번 정의 — `useQuery`·프리페치·무효화가 재사용. 반환 타입은 자동 추론(제네릭 손으로 안 적음). 훅은 `entities/<entity>.query.ts` + `'use client'`, 네이밍 `use` + 동작 + Feature.
- mutation: `onSuccess` 에서 관련 쿼리만 `invalidateQueries` + toast, `onError` toast. 캐시 직접 조작(`setQueryData`) 대신 무효화 후 재조회.
- 무효화는 **entities mutation 훅(onSuccess) 책임이 기본**(권장) — widgets 직접 무효화는 다중 mutation 오케스트레이션(`Promise.all`·직렬)일 때만.
- **서버 프리페치**: 서버 컴포넌트에서 `new QueryClient()` → `prefetchQuery(<entity>QueryOptions(...))` → `<HydrationBoundary state={dehydrate(queryClient)}>`. 첫 화면 필수 데이터에만. Next 15+ 는 `params`/`searchParams` 를 `await` 로 꺼낸다.
- 로딩 UI: 첫 화면 필수 데이터는 프리페치 + `useSuspenseQuery`, 그 외 `isPending` 분기. 조회 에러는 ErrorBoundary/`isError`(mutation 처럼 toast 강제 아님).

---

## 9. 백엔드 (backend — Hono / Drizzle)

- **계층**: Route(DTO 검증·인증·에러 throw) → Service(도메인 로직 — HTTP·Drizzle 모름) → `*ServiceDb`(compose 의 Drizzle 구현).
- **Factory DI**: `createXxxService(deps)`, 타입은 `ReturnType<typeof createXxxService>` 유도. Service 는 "없음"을 `null` 로 반환, 에러 변환은 Route 가.
- **Drizzle 쿼리·트랜잭션은 compose 에 격리** — `*ServiceDb` 메서드 하나 = 원자적 도메인 동작 (트랜잭션은 그 구현 내부의 `db.transaction`).
- Route 는 `createXxxRoute(deps) => Hono` 팩토리. `validator('query'|'json', zodSchema)` + `describeRoute`, **모든 핸들러 `withErrorHandling`**. 인증은 `withAuth`/`withAdmin` HOF 합성 (바깥 `withErrorHandling`).
- **DTO 는 Zod 만**: `*ListQuerySchema`/`*CreateSchema`/`*UpdateSchema`, 입력 타입은 `z.infer` 유도, 쿼리 파라미터는 `z.coerce` + `.default()`. 쿼리 boolean 은 Zod 4 `z.stringbool()`(strict 필요 시 truthy/falsy 커스텀, Zod 3 은 `z.enum(['true','false']).transform()`) — `z.coerce.boolean()` 금지. 공통 스키마는 `dto/common.ts`.
- **에러 중앙화**: `ERROR_CODE`/`ERROR_MESSAGE`/`error.ts` 3파일, **`throw createAppError('CODE')` 만** (`new Error` 직접 throw 금지). 응답은 `successResponse`/`paginatedResponse`/`errorResponse` 헬퍼만. 페이지네이션은 offset(`page`/`limit`) 기본.
- DB: `getDb()` 싱글톤, 컬럼 snake_case / 필드 camelCase, 타입은 `$inferSelect`/`$inferInsert` 유도. 환경변수는 `getEnv()` 로만.
- 마이그레이션: `drizzle-kit generate` → `migrate`. 프로덕션 `push` 금지 — 이미 push 로 운영되어 추적 없는 DB 는 물어보고 결정(+`docs/acknowledge` 기록).
- 테스트: `bun:test`, describe/test 설명 한국어. Service 는 `*ServiceDb` 를 인라인 객체로 대체해 테스트 (mocking 라이브러리 불필요).

---

## 10. 데스크톱 (desktop)

- 렌더러(웹뷰)는 §7 프론트엔드 규칙 그대로(FSD 포함). 셸(메인 프로세스)은 별도.
- **IPC 는 타입 계약** — `EVENTS_TYPE` 맵을 단일 출처로 메인·preload·렌더러가 공유, 시그니처는 `Parameters`/`ReturnType` 으로 유도.
- 렌더러에 노출하는 네이티브 API 는 preload(bridge)로 **최소화.**
- Electron 보안 기본값: `contextIsolation: true` · `nodeIntegration: false` · `sandbox: true` 유지, 노출은 `contextBridge.exposeInMainWorld` 만, 외부 URL 은 검증 후에만 `shell.openExternal`.
