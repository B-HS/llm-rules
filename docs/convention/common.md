# COMMON — 공통 컨벤션

> FE / BE 를 가리지 않고 **모든 코드베이스에 공통으로 적용**되는 규칙이다.
> 프로젝트별 세부 규칙은 [frontend.md](./frontend.md), [backend.md](./backend.md) 를 따른다.

---

## 1. 언어 & 런타임

- **TypeScript strict mode** 를 기본으로 한다.
- **Bun** 런타임을 기준으로 한다. (`node` / `npm` / `pnpm` / `vite` 대신 `bun` 사용)
- 응답·커뮤니케이션·문서는 **한국어**로 작성한다.
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

### 3.2 함수 공통화 규칙 — "2회 이상" 룰

> **같은 로직이 2번 이상 사용될 때에만 함수로 공통화한다.**

- 1번만 쓰이는 로직을 미리 함수로 빼지 않는다. (조기 추상화 금지)
- 2번째 사용처가 생기는 순간 공통 함수로 추출한다.
- 한 번만 쓰이는 로직은 사용처에 inline 으로 둔다.

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
| Boolean | `is` 접두사 | `isPublished`, `isTop` |
| State setter | `set` + PascalCase | `setTitle`, `setCurrency` |
| 이벤트 핸들러 | `handle` + Action | `handleSave`, `handlePageChange` |
| Hook | `use` + Feature | `useGetPost`, `useDebounce` |
| HOF | `with` + Feature | `withErrorHandling`, `withAuth` |
| Factory | `create` + Name | `createPostService`, `createPostRoute` |

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
- 단, **공개 API 경계(라이브러리 export, DTO 입력 타입 등) 처럼 계약을 고정해야 하는 곳**은 명시한다.

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
