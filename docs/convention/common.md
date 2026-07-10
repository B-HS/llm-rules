# COMMON — 공통 컨벤션

> FE / BE 를 가리지 않고 **모든 코드베이스에 공통으로 적용**되는 규칙이다.
> 프로젝트별 세부 규칙은 [frontend.md](./frontend.md), [backend.md](./backend.md) 를 따른다.

---

## 1. 언어 & 런타임

- **TypeScript strict mode** 를 기본으로 한다.
- **Bun** 런타임을 기준으로 한다. 런타임·패키지매니저·스크립트 실행·테스트 러너에서 `node` / `npm` / `pnpm` 대신 `bun` 을 쓴다. (번들러·dev 서버는 프레임워크 기본 — Next.js·Vite 등 — 을 그대로 쓴다)
    - 단, 이는 **신규 프로젝트의 기본값**이다. 런타임·패키지매니저가 이미 정해진 기존 프로젝트는 **그 프로젝트의 환경을 따른다.** ([ai-process.md §6.7](./ai-process.md) 환경 일관성이 이 규칙보다 우선)
- **Python 프로젝트는 `uv`** 로 의존성·실행을 관리한다. (`pip install` 금지) 단발 스크립트는 PEP 723 인라인 메타(`# /// script`)로 self-contained 하게 작성하고 `uv run` 으로 실행한다.
- 응답·커뮤니케이션·문서는 **한국어**로 작성한다.
- **이모지·아스키아트(유니코드 박스 다이어그램)를 사용하지 않는다.** 코드 · UI 텍스트 · 커밋 메시지 · 문서 · 응답 전부에 적용된다. ([ai-process.md §0.1](./ai-process.md))
- **코드 주석은 작성하지 않는다.** 유일한 예외인 JSDoc 은 영어로 쓴다. → [comments.md](./comments.md)

---

## 2. Prettier

`feconfig-bhs` 패키지의 설정을 확장한다.

```javascript
module.exports = {
    ...require('feconfig-bhs/prettier.config.js'),
}
```

| 설정 | 값 |
|------|-----|
| printWidth | `150` |
| tabWidth | `4` (스페이스) |
| semi | `false` |
| singleQuote | `true` |
| jsxSingleQuote | `true` |
| trailingComma | `'all'` |
| bracketSpacing | `true` |
| arrowParens | `'always'` |
| bracketSameLine | `true` |
| endOfLine | `'lf'` |

- `feconfig-bhs` 가 없는 프로젝트에서는 패키지를 새로 설치하지 않고, **위 표의 값을 `prettier.config.js` 에 직접 작성**한다.
- 프로젝트에 이미 다른 Prettier 설정이 있으면 그것을 따른다. (기존 설정을 이 표로 임의 교체하지 않는다)

---

## 3. 함수

### 3.1 Arrow function 만 사용

`function` 키워드를 사용하지 않는다.

```typescript
// O
const handleSave = () => { ... }
const createPostService = (deps: Deps) => ({ ... })

// X
function handleSave() { ... }
```

**예외 (arrow 로 표현이 불가능한 경우만):**

- 클래스 내부 메서드는 **메서드 축약 문법**을 사용한다. (`class A { run() { ... } }`)
- generator 가 꼭 필요한 경우에 한해 `function*` 을 허용한다.
- 그 외(선언·콜백·핸들러·팩토리·HOF 등)는 전부 arrow function 이다. "습관"을 이유로 예외를 늘리지 않는다.

### 3.2 비동기 — async/await 만 사용

- 비동기 코드는 **`async` / `await`** 로 작성한다. `.then()` / `.catch()` 체이닝을 새로 만들지 않는다.
- 에러 처리는 `try / catch` 로 한다. (백엔드 핸들러는 [backend.md §7.1](./backend.md) 의 `withErrorHandling` 이 담당)
- 병렬 실행이 필요하면 `Promise.all` / `Promise.allSettled` 에 await 한다.

### 3.3 함수 공통화 규칙 — "2회 이상" 룰

> **같은 로직이 2번 이상 사용될 때에만 함수로 공통화한다.**

- 1번만 쓰이는 로직을 미리 함수로 빼지 않는다. (조기 추상화 금지)
- 2번째 사용처가 생기는 순간 공통 함수로 추출한다.
- 한 번만 쓰이는 로직은 사용처에 inline 으로 둔다.
- 이 규칙은 **중복 횟수 기준**이다. 한 번만 쓰여도 블록이 길어 가독성을 해치면 분리할 수 있다 — 단 그 경우에도 "재사용될 것 같아서" 가 아니라 "지금 읽기 어려워서" 가 근거여야 한다. (JSX 의 길이 기준은 [frontend.md §5](./frontend.md) 별도)

```typescript
// X — 한 번만 쓰이는데 굳이 함수로 분리
const getFullName = (u: User) => `${u.first} ${u.last}`
const label = getFullName(user)

// O — 한 번이면 inline
const label = `${user.first} ${user.last}`

// O — 2곳 이상에서 쓰이면 그때 공통화
const getFullName = (u: User) => `${u.first} ${u.last}`
const a = getFullName(user1)
const b = getFullName(user2)
```

### 3.4 제어 흐름 — early return

- 예외·엣지 케이스는 함수 상단에서 **early return(가드 클로즈)** 으로 먼저 끝낸다. 중첩 깊이를 낮추고 본 로직을 평평하게 유지한다.
- early return 으로 대체 가능한 `else` 는 쓰지 않는다.
- **삼항 연산자 중첩(2단 이상) 금지** — early return 또는 lookup 객체로 대체한다.

```typescript
// X — 삼항 중첩
const getLabel = (s: Status) => (s === 'done' ? '완료' : s === 'doing' ? '진행 중' : '대기')

// O — lookup 객체
const STATUS_LABEL = { done: '완료', doing: '진행 중', todo: '대기' } as const
const getLabel = (s: Status) => STATUS_LABEL[s]
```

### 3.5 불변성 — const 우선

- **`const` 를 기본**으로 한다. `let` 은 재할당이 불가피할 때만 쓰고, `var` 는 금지한다.
- 배열·객체는 **mutation(`push` · `splice` · 직접 필드 대입) 대신 비파괴 연산**(spread · `map` · `filter` · `toSorted` · `toReversed`)을 우선한다. 대용량 처리 등 성능 임계 구간만 예외로 하고, 그 사유를 `docs/` 에 남긴다.
- 기본값 처리는 `||` 대신 **`??`** 를 쓴다. (`0` · `''` 를 유효값으로 보존해야 하므로 — `||` 는 falsy 전부를 덮어쓴다)

---

## 4. 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 폴더 | kebab-case | `post-form`, `mail-sync` |
| 파일 | kebab-case | `post-card.tsx`, `error-handler.ts` |
| 컴포넌트 | PascalCase | `PostCard`, `UserCard` |
| 변수 / 함수 | camelCase | `postId`, `handleSave` |
| 상수 | UPPER_SNAKE_CASE | `QUERY_KEY`, `API_URL` |
| 타입 | PascalCase | `PostDetail`, `ButtonProps` |
| Boolean | `is` / `has` / `can` / `should` 접두사 | `isPublished`, `hasPermission`, `canEdit`, `shouldRetry` |
| State setter | `set` + PascalCase | `setTitle`, `setCurrency` |
| 이벤트 핸들러 | `handle` + Action | `handleSave`, `handlePageChange` |
| Hook | `use` + Feature | `useGetPost`, `useDebounce` |
| HOF | `with` + Feature | `withErrorHandling`, `withAuth` |
| Factory | `create` + Name | `createPostService`, `createPostRoute` |

### 4.1 매직넘버 금지 — 상수화

- 타이밍(`300`ms) · 크기 · 임계값 · 반복 횟수 등 **의미 있는 리터럴을 코드에 직접 넣지 않는다.** UPPER_SNAKE_CASE 상수로 분리(FE 는 `shared/constants`, 컴포넌트 전용이면 파일 상단)하거나 prop/파라미터로 외부화한다.
- `0` · `1` · 빈 문자열처럼 맥락상 자명한 값은 예외다.

```typescript
// X
setTimeout(close, 300)

// O
const TOOLTIP_CLOSE_DELAY_MS = 300
setTimeout(close, TOOLTIP_CLOSE_DELAY_MS)
```

---

## 5. 타입

### 5.1 type 우선

- **`type` 을 기본으로 사용한다.**
- `interface` 는 **HTML 속성 확장이 필요한 경우에만** 사용한다.

```typescript
// 기본
type PostDetail = { postId: number; title: string }

// HTML 확장 시에만 interface
interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
}
```

### 5.2 타입 추론 최대 활용

> **TypeScript 가 추론할 수 있는 타입은 명시하지 않는다.**

- 함수 반환 타입(`: void`, `: Promise<void>`, `: string` 등)은 추론에 맡기고 **명시하지 않는다.**
- 변수 타입도 초기값으로 추론 가능하면 생략한다.
- 단, **계약을 고정해야 하는 "공개 API 경계"** 는 명시한다. 이에 해당하는 것은 아래로 **한정**한다.
    1. 라이브러리/패키지로 배포되어 외부에 노출되는 함수 시그니처
    2. DTO 입력 타입 — 단 손으로 적지 않고 `z.infer` 로 유도 (§5.3)
    3. `*ServiceDeps` / `*ServiceDb` 같은 의존성 계약 타입 ([backend.md §2](./backend.md))
    4. IPC 이벤트 맵 ([desktop.md](./desktop.md))
- 위 4가지 외에서 반환/변수 타입을 명시하고 싶어지면, 대개 타입 유도(§5.3)로 풀 수 있는지 먼저 확인한다.

```typescript
// X — 불필요한 명시 (ts 가 추론함)
const handleSave = async (): Promise<void> => { ... }
const count: number = items.length

// O — 추론에 맡김
const handleSave = async () => { ... }
const count = items.length
```

### 5.3 TypeScript 유틸리티 타입 — 100% 활용

> 타입을 손으로 다시 적지 않는다. **원본에서 유도(derive)** 한다. 아래 유틸리티를 빠짐없이, 정확하게 활용한다.

- `z.infer<typeof schema>` — Zod 스키마에서 타입 추출
- `ReturnType<typeof func>` — 반환 타입 추출 (Factory / Service 타입의 표준)
- `Parameters<typeof func>` — 파라미터 타입 추출
- `Awaited<ReturnType<typeof func>>` — async 함수의 실제 반환 타입
- `ComponentProps<typeof Component>` — 컴포넌트 props 타입 추출
- `Omit` / `Pick` — 기존 타입에서 빼거나 골라서 파생
- Union / Intersection (`A | B`, `A & B`) — 조합
- `as const` — 리터럴 상수의 타입 안전성 확보
- `satisfies` — 리터럴 추론을 유지하면서 타입 적합성만 검증 (타입 명시로 리터럴이 넓어지는 것을 방지)

```typescript
// Service 타입은 Factory 결과에서 유도
export const createPostService = (deps: PostServiceDeps) => ({ ... })
export type PostService = ReturnType<typeof createPostService>

// DTO 타입은 스키마에서 유도
export type PostCreateInput = z.infer<typeof postCreateSchema>

// 응답 요약 타입은 원본에서 Omit 으로 파생
type MailMessageSummary = Omit<MailMessage, 'bodyHtml' | 'bodyText'>

// 외부 함수 시그니처 재사용
getSession: Parameters<typeof withAuth>[0]['getSession']
```

### 5.4 `any` 금지 · `unknown` 은 경계에서만

> **`any` 는 사용하지 않는다.** 명시적 `any` 는 물론, 시그니처를 비워 두는 암시적 `any` 도 strict 옵션으로 차단한다.

- `unknown` 은 **신뢰 경계에서만** 허용한다: 외부 API 응답, `catch (error)`, `JSON.parse` 결과 등 타입을 알 수 없는 입구.
- 경계에서 받은 `unknown` 은 **받은 즉시 Zod 파싱 또는 타입 가드로 좁힌 뒤** 사용한다. `unknown` 을 내부 로직·함수 시그니처로 전파하지 않는다.
- 타입 단언(`as`)으로 검증을 대체하지 않는다. `as` 는 컴파일러가 알 수 없는 정보를 개발자가 보증하는 극소수 지점(예: [backend.md §4](./backend.md) 의 `c.req.valid(...)` 패턴)으로 제한한다.

```typescript
// X — any 로 흘려보냄
const data: any = await res.json()
return data.post

// O — 경계에서 unknown 으로 받고 즉시 좁힘
const data: unknown = await res.json()
const post = postSchema.parse(data)
return post
```

### 5.5 `enum` 금지 — `as const` + union

> `enum` 을 사용하지 않는다. **`as const` 객체 + union 유도**로 대체한다. (§5.3 의 `ERROR_CODE` 패턴과 동일)

```typescript
// X
enum Role {
    Admin = 'admin',
    User = 'user',
}

// O
const ROLE = { ADMIN: 'admin', USER: 'user' } as const
type Role = (typeof ROLE)[keyof typeof ROLE]
```

- 값 순회·런타임 참조가 필요 없으면 객체 없이 **순수 union 리터럴**로 충분하다: `type Role = 'admin' | 'user'`

---

## 6. Export

- **Named export 를 기본으로 사용한다.**
- Default export 는 **Next.js 페이지 / 레이아웃**에서만 사용한다.

```typescript
// 기본
export const PostCard: FC<PostCardProps> = ({ ... }) => { ... }

// 페이지만 default
export default Page
```

---

## 7. Import 순서

1. `'use client'` / `'use server'` 디렉티브
2. React / Next.js / 프레임워크
3. 외부 라이브러리
4. `import type { ... }`
5. Path alias import (`@app/`, `@lib/` 등)
6. 상대 경로 import

---

## 8. Path Alias

`@` 접두사 alias 를 사용한다. **상대 경로보다 alias 를 우선**한다.

```json
{
    "@/*": ["./src/*"]
}
```

- 프론트엔드(FSD) 프로젝트에서는 **alias 가 곧 레이어**다. 레이어 ↔ alias 매핑은 [fsd.md 5](./fsd.md#5-path-alias--alias--레이어) 를 따른다.

---

## 9. 날짜 · 시간

- **저장·서버·API 교환은 UTC 기준**으로 한다. (DB `timestamp`, API 응답은 ISO 8601) 로컬 타임존 변환은 **표시 계층(프론트엔드)에서만** 한다.
- 단, **기존 DB 가 있으면 그 DB 의 timezone 설정을 먼저 확인**하고 그에 맞춘다. 이미 다른 기준으로 운영 중인 스키마를 임의로 UTC 로 바꾸지 않는다. ([ai-process.md §6.7](./ai-process.md) 환경 일관성 — 변경이 필요하면 사용자에게 묻는다)
- 날짜 라이브러리는 **`dayjs` 를 기본**으로 한다. 포매팅 한두 곳뿐이면 도입 전에 `Intl.DateTimeFormat` 으로 충분한지 먼저 확인한다. ([ai-process.md §6.6](./ai-process.md) 의존성 다이어트)

---

## 10. 라이브러리 프로젝트 (배포용 패키지)

npm 등으로 **배포하는 라이브러리**를 작성할 때만 적용한다.

- **코어 모듈은 실행 환경 전역을 참조하지 않는다** — `window` · `document` · `localStorage` 등 브라우저 전역과 `fs` · `Buffer` 등 Node 전용 API 모두 금지한다. (SSR · Edge · Workers 호환 보장)
- DOM 등 환경 의존 기능은 **별도 export 경로**(`pkg/dom` 등)로 격리해, 서버 환경에서는 로드되지 않게 한다.
- `package.json` `exports` 에 conditional export(`node` / `browser` 등)를 명시하고, SSR 환경(Next.js 등)의 **실제 빌드로 검증**한다. (hydration 에러 0)

---

## 11. 로그

- **디버그용 `console.log` 를 커밋하지 않는다.** 확인이 끝나면 제거한다.
- 남겨야 하는 서버 로그는 프로젝트의 로깅 경로(로거 · 에러 리포팅 — [backend.md §7.1](./backend.md))로 남긴다. 로그 내용의 보안 규칙은 [security.md §6](./security.md) 을 따른다.
