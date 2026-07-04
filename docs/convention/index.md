# 코딩 컨벤션 (Coding Convention)

> 개인 프로젝트 전반에 적용되는 **표준 코딩 컨벤션**이다.
> 새 코드를 작성하거나 리뷰할 때 이 문서를 기준으로 삼는다.

---

## 문서 구조

컨벤션은 적용 범위에 따라 **COMMON / FRONTEND / BACKEND** 세 갈래로 나뉜다.

| 문서 | 범위 | 내용 |
|------|------|------|
| [ai-process.md](./ai-process.md) | **AI 작업 프로세스** | AI(Claude Code 등)가 일하는 방식 — 커뮤니케이션(간결·존댓말), docs/ 기반·PROCESS.md 체크리스트, 멈춤·"한 번에 모든 경우의 수" 질문, 신규 프로젝트 스택·환경 합의, 환경 일관성, 검증, 결과 분류 저장(feedback·QA 포함) |
| [common.md](./common.md) | **공통 (FE·BE 전부)** | 언어·런타임, Prettier, 함수, 네이밍, 타입·타입추론·TS 유틸리티, export, import, path alias |
| [comments.md](./comments.md) | **공통 (FE·BE 전부)** | 코드 주석 금지, 유일한 예외 JSDoc(영어), 설명은 `docs/` 로 |
| [security.md](./security.md) | **공통 (FE·BE 전부)** | 시크릿·환경변수, 입력 검증(Zod), Injection·XSS, 인증/인가, 에러·로그, 의존성 |
| [git.md](./git.md) | **공통 (FE·BE 전부)** | Conventional Commits v1.0.0 — 커밋 형식·type·BREAKING CHANGE, 브랜치, 커밋·푸시 안전 규칙 |
| [frontend.md](./frontend.md) | **프론트엔드 (Next.js / React)** | 컴포넌트(FC·작성순서), React Compiler, JSX inline, 상태(Context 범위)/API/스타일/인증/폼(react-hook-form) |
| [fsd.md](./fsd.md) | **프론트엔드 아키텍처 (필수)** | 레이어 정의, 의존성(참조) 방향 매트릭스, 1파일 1컴포넌트(SFC), Path Alias(=레이어) |
| [query.md](./query.md) | **프론트엔드 (서버 상태)** | TanStack Query v5 사용지침 — Provider(staleTime), QUERY_KEY 중앙관리, queryOptions/useQuery/useMutation, 서버 프리페치(HydrationBoundary), 무효화 |
| [backend.md](./backend.md) | **백엔드 (Hono.js)** | 계층형 구조, Factory DI, DTO, 에러 처리, HOF, 응답 헬퍼, DB(Drizzle), 테스트, 환경변수 |
| [desktop.md](./desktop.md) | **데스크톱 앱 (Electron / Tauri 등)** | 셸·IPC 타입 계약, 권한 최소화, 프레임워크별 구조 (렌더러는 frontend 규칙 적용) |

> 적용 우선순위: **COMMON 을 항상 전제**로 하고, 그 위에 FE / BE 문서를 얹는다.

---

## 규칙 충돌 · 공백 시 판단 기준

규칙끼리 부딪히거나 컨벤션이 답을 주지 않을 때, 아래 사다리를 따른다.

1. **사용자의 명시적 지시** (이번 대화에서 직접 말한 것)
2. **프로젝트 고유 룰** (그 레포의 `CLAUDE.md` · `AGENTS.md` · `docs/acknowledge` 의 합의)
3. **이 컨벤션 묶음** (index 요약과 상세 문서가 다르면 **상세 문서가 우선**)
4. **그 프로젝트의 기존 코드 패턴**

- 상위를 따르느라 이 컨벤션과 다른 선택을 했으면, **그 사실을 사용자에게 알린다.** (조용히 어기지 않는다)
- 컨벤션이 침묵하는 주제는: 기존 코드 패턴 → 해당 프레임워크의 공식 권장 → 그래도 애매하면 질문한다. ([ai-process.md §3.1](./ai-process.md)) **임의로 새 컨벤션을 만들지 않는다.**

---

## 핵심 원칙 (요약)

아래는 자주 어기기 쉬운 **반드시 지켜야 할 규칙**의 요약이다. 상세는 각 문서를 본다.

### AI 작업 ([ai-process.md](./ai-process.md))

- **항상 간결하게, 존댓말로** 답한다. 미사여구·빈말 금지. (Claude 외 에이전트는 이 컨벤션을 룰 파일에 명시 로드)
- **이모지·아스키아트 금지** — 응답·코드·UI·커밋 전부. 시각 설명은 실제 렌더·스크린샷으로 한다.
- 프로젝트 상태는 기억·과거 문서보다 **실제 파일을 신뢰**하고, 어긋난 기록은 즉시 갱신한다.
- **신규 프로젝트는 스택·환경**(런타임·패키지매니저·FE/BE·DB·배포)을 **먼저 합의**한 뒤 시작한다.
- 확인이 필요하면 **한 번에 모든 경우의 수**를 모아 묻는다. (검증 절차가 길면 `docs/quality-assurance` 체크리스트로)
- **HACK · TRICK · 우회 금지** — 항상 근본 원인을 해결한다. `@ts-ignore` · `eslint-disable` 로 검사기를 끄는 것도 우회다.
- 모든 문제는 **그 프로젝트의 환경 안에서** 해결한다. (예: Drizzle 이 있으면 `mysql` 직접 호출 금지)
- 세션 시작 시 `docs/PROCESS.md` 를 먼저 읽고, 종료 전 **최소 기계 검증**(typecheck → lint → test)을 통과한다. 검증 없이 "통과했다"고 보고하지 않는다.
- 지적받은 내용은 `docs/feedback` 에 (왜 틀렸나·어떻게 고치나·언제 적용하나) 리포트로 남긴다. 보편 규칙이 되면 컨벤션/`docs/memory` 로 승격.
- **컨텍스트가 길어져도** 이 컨벤션을 무조건 유지한다.

### 공통 ([common.md](./common.md))

- **Arrow function 만** 사용한다. `function` 키워드 금지.
- **함수 공통화는 "2회 이상" 사용될 때만** 한다. 조기 추상화 금지. 1번이면 inline.
- **타입은 최대한 추론에 맡긴다.** `: Promise<void>`, `: string` 같은 자명한 반환/변수 타입을 명시하지 않는다.
- **`any` · `enum` 금지.** `unknown` 은 외부 경계에서만 받아 즉시 좁히고, enum 은 `as const` + union 으로 대체한다.
- **TypeScript 유틸리티 타입을 1000% 활용**한다. `ReturnType` · `Parameters` · `Awaited` · `ComponentProps` · `Omit` · `Pick` · Union · `z.infer` · `$inferSelect` 등으로 타입을 손으로 다시 적지 말고 **원본에서 유도**한다.
- **매직넘버 금지**(의미 있는 값은 상수·prop 로), **early return + 삼항 중첩 금지**, **`const` 우선·비파괴 연산**, 기본값은 `??`.
- **코드 주석 금지** ([comments.md](./comments.md)). 설명은 `docs/` 문서로 남기고, 유일한 예외인 JSDoc 만 영어로 작성한다. dead code 는 주석 보관 대신 삭제.
- TypeScript strict + Bun 런타임(Python 은 `uv`). 날짜·시간은 UTC 기준 + `dayjs` 기본. 문서·커뮤니케이션은 한국어.

### 보안 · Git ([security.md](./security.md) · [git.md](./git.md))

- **시크릿은 코드·저장소·로그·클라이언트 어디에도 노출하지 않는다.** `.env` + `.gitignore`, 백엔드는 `getEnv()` 검증으로만 접근.
- 외부 입력은 **경계에서 Zod 로 검증**한다. DB 는 ORM 파라미터 바인딩(raw SQL 금지), 출력은 React 자동 이스케이프.
- 커밋은 **Conventional Commits v1.0.0** (`type(scope): 설명`, 기본 type 영어·설명 한국어). **사용자 요청 전 커밋·푸시 금지.**
- 커밋 언어·스타일은 별도 지시가 없으면 **그 레포의 과거 커밋을 읽고 맞춘다.** 섞여 있으면 사용자에게 묻고 결정을 `docs/acknowledge` 에 기록해 이후 적용. ([git.md §1.1](./git.md))
- **AI 트레일러(Co-Authored-By 등) 금지**, `git add -A` 금지(선별 스테이징), force push 금지. 에이전트는 `.env` 를 읽지도 쓰지도 않는다.

### 프론트엔드 ([frontend.md](./frontend.md) · [fsd.md](./fsd.md))

- **구조는 반드시 [fsd.md](./fsd.md) 의 변형 FSD 를 따른다** (별도 언급 없을 시). 의존성은 `app→pages→widgets→features→entities→shared` 위→아래로만 흐르고, 반대 방향 참조는 금지한다. `entities`(데이터)·`shared`(기반)는 광범위하게 import 가능.
- 컴포넌트는 **1파일 1 export(SFC)**, 단일 책임. (`shared` 의 constant·utils 는 예외적으로 한 파일에 여러 함수 허용)
- 특별한 이유가 없는 한 **`FC<Props>` 패턴**으로 컴포넌트를 구성한다.
- 컴포넌트 본문 작성 순서: **① `useRef` → ② `useState` → ③ 함수 및 기타 로직 → ④ `useEffect` 및 custom hooks**.
- **`useCallback` / `useMemo` 사용 금지.** 메모이제이션은 **React Compiler** 에 100% 위임한다.
- **`useEffect` 는 외부 시스템 동기화에만** 쓴다 — 파생 값은 렌더 중 계산, 이벤트 로직은 핸들러에서. 위치는 `return` 바로 위.
- JSX 에서는 **2줄 이상이 되지 않는 한 마크업에 inline** 으로 작성하는 것을 선호한다. `key` 는 안정된 id(재정렬 목록에 index 금지), `{count && ...}` 의 0-렌더링 함정 주의.
- 시맨틱 태그 우선, 클릭 요소는 `button`/`a` 구분, 이미지 `alt` — 접근성 최소선을 지킨다.
- **공통 constant · hook 은 `shared/` 단**에 작성한다 (FSD). barrel(index.ts)은 만들지 않는다.
- **전역 상태 라이브러리 금지.** React Context 는 provider 성격(테마·i18n·세션)에만. 서버 상태는 [query.md](./query.md) 의 **`queryOptions` 팩토리 + `QUERY_KEY` 배열 키**로 다룬다.
- 폼은 **react-hook-form + `zodResolver`** (shadcn Form). 단순 한두 필드는 `useState`.

### 백엔드 ([backend.md](./backend.md))

- 계층형 구조: **Route(DTO 검증) → Service(로직) → DB 추상화 → Drizzle**.
- 의존성 주입은 **Factory 패턴**, Service 타입은 `ReturnType<typeof createXxxService>` 로 유도.
- 횡단 관심사는 미들웨어가 아니라 **HOF**(`withErrorHandling`, `withAuth` ...)로 처리.
- 에러는 **중앙화된 `createAppError`** 로 던지고, 응답은 `successResponse` / `paginatedResponse` / `errorResponse` 헬퍼로.

### 데스크톱 ([desktop.md](./desktop.md))

- 렌더러 화면은 frontend 규칙 그대로, **셸(메인 프로세스)·IPC 는 타입 계약**으로 통신한다.
- 렌더러에 노출하는 네이티브 API 는 preload(bridge)로 **최소화**한다.

---

## 디렉토리

```
rules/docs/convention/
├── index.md       ← (이 문서) 진입점·요약
├── ai-process.md  ← AI 작업 프로세스 (Claude Code 등)
├── common.md      ← 공통 컨벤션
├── comments.md    ← 주석 컨벤션 (코드 주석 금지 · JSDoc · docs/)
├── security.md    ← 보안 · 시크릿 (FE·BE 공통)
├── git.md         ← Git · 커밋 (Conventional Commits)
├── frontend.md    ← 프론트엔드 컨벤션
├── fsd.md         ← 프론트엔드 아키텍처 (필수)
├── query.md       ← TanStack Query 사용지침 (서버 상태)
├── backend.md     ← 백엔드 컨벤션
└── desktop.md     ← 데스크톱 앱 컨벤션 (Electron / Tauri 등)
```

---

## 적용 (다른 컴퓨터 포함)

이 레포를 클론한 뒤, 글로벌 `~/.claude/CLAUDE.md` 가 이 컨벤션을 참조하도록 동기화한다.

```bash
bun run sync            # = bun run scripts/sync-claude-md.ts
bun run sync --dry-run  # 변경 미리보기 (파일 수정 안 함)
```

스크립트는 멱등(idempotent)이라 여러 번 실행해도 안전하다. 자세한 동작은 [scripts/sync-claude-md.ts](../../scripts/sync-claude-md.ts) 상단 주석 참고.
