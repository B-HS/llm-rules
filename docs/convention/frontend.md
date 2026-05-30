# FRONTEND — 프론트엔드 컨벤션 (Next.js / React)

> [common.md](./common.md) 의 모든 규칙을 전제로 한다. 여기서는 **프론트엔드 전용** 규칙만 다룬다.
> 데스크톱 앱(Electron · Tauri 등)의 셸 규칙은 [desktop.md](./desktop.md) 를 따른다. (렌더러 화면 코드는 이 문서 규칙 그대로 적용)

---

## 1. 프로젝트 아키텍처 (FSD) — 필수

> **별도 언급이 없는 한, 프론트엔드 구조는 반드시 [fsd.md](./fsd.md) 의 변형 FSD 아키텍처를 따른다.**
> 레이어 정의 · 의존성(참조) 방향 · 1파일 1컴포넌트(SFC) 규칙의 **단일 출처는 [fsd.md](./fsd.md)** 다. 작업 전 반드시 확인한다.

요약:

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
        (의존은 위 → 아래로만. 반대 방향 참조 금지 = bottom → up 으로 쌓는다)
```

- **`features`** 는 비즈니스 로직 없는 근간 컴포넌트, **`widgets`** 부터 `fetch`/TanStack Query 등 비즈니스 로직 허용.
- **`entities`** 는 데이터 layer(`*.api.ts`·`*.query.ts`·`*.action.ts`·`*.type.ts`)로 모든 레이어에서 import 가능.
- **`shared`** 는 `page` 제외 모든 레이어에서 참조 가능 → **공통 constant·hook 은 `shared` 에 둔다.** (특정 슬라이스 전용이면 그 슬라이스에 두고, 2곳 이상 쓰이면 `shared` 로 승격 — COMMON 의 "2회 이상" 룰과 동일 맥락)
- 컴포넌트는 **1파일 1 export(SFC)**. 단 `shared` 의 constant·utils 는 한 파일에 여러 함수 허용.

자세한 규칙(참조 허용 매트릭스, 동일 레이어 참조, 네이밍)은 → **[fsd.md](./fsd.md)**

---

## 2. 서버 / 클라이언트 분리

- 파일명으로 구분한다: `post.ts`(서버) / `post.client.ts`(클라이언트)
- 기본적으로 **서버 컴포넌트 우선**.
- 클라이언트 컴포넌트에는 `'use client'` 를 명시한다.

---

## 3. 컴포넌트

### 3.1 FC<Props> 패턴

> **특별한 이유가 없는 한 `FC<Props>` 패턴으로 컴포넌트를 구성한다.**

- Props 타입 이름은 `컴포넌트명 + Props`.
- 간단한 props 는 inline 으로 받아도 된다.

```typescript
const UserCard: FC<UserCardProps> = ({ className }) => { ... }
const Layout: FC<PropsWithChildren> = ({ children }) => { ... }

// 아주 간단한 props 는 inline
const Component = ({ lang }: { lang: 'ko' | 'jp' }) => { ... }
```

### 3.2 컴포넌트 내부 작성 순서

> 컴포넌트 본문은 **아래 순서**를 지킨다.

1. **`useRef`**
2. **`useState`**
3. **함수 및 기타 로직** (파생 변수, 이벤트 핸들러 등)
4. **`useEffect` 및 custom hooks**

```typescript
const ComposeForm: FC<ComposeFormProps> = ({ defaultValues, onSubmit }) => {
    // 1. useRef
    const sentRef = useRef(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // 2. useState
    const [subject, setSubject] = useState(defaultValues?.subject ?? '')
    const [to, setTo] = useState<EmailAddress[]>([])

    // 3. 함수 및 기타 로직
    const isValid = to.length > 0
    const handleSubmit = () => { ... }

    // 4. useEffect 및 custom hooks
    const t = useTranslations()
    useEffect(() => { ... }, [])

    return ( ... )
}
```

> 참고: `useTranslations`, `useQuery` 같은 라이브러리 hook 호출은 4번 그룹(custom hooks)으로 본다.
> 단, 다른 로직의 입력으로 즉시 필요한 값(예: 라우터, 세션)은 가독성을 해치지 않는 선에서 상단에 둘 수 있다.

---

## 4. useCallback / useMemo 금지 — React Compiler 사용

> **`useCallback`, `useMemo` 의 사용을 금지한다.** 메모이제이션은 **React Compiler** 에게 100% 위임한다.

- 수동 메모이제이션을 하지 않는다. (의존성 배열 관리 비용 제거)
- 함수·파생 값은 그냥 평범하게 작성한다. 최적화는 컴파일러가 한다.
- Next.js 설정에서 **React Compiler 를 활성화**해 둔다. ([9. Next.js 설정](#9-nextjs-설정) 참고)

```typescript
// X
const handleClick = useCallback(() => doSomething(id), [id])
const total = useMemo(() => items.reduce((a, b) => a + b.price, 0), [items])

// O — 그냥 작성. React Compiler 가 최적화한다.
const handleClick = () => doSomething(id)
const total = items.reduce((a, b) => a + b.price, 0)
```

---

## 5. JSX inline 규칙

> **2줄 이상이 되지 않는 한, JSX 의 마크업 부분에 로직을 inline 으로 작성**하는 것을 선호한다.

- 한 줄로 표현 가능한 핸들러·조건·매핑은 변수로 빼지 말고 JSX 안에 inline 으로 둔다.
- 2줄 이상으로 길어지면 그때 함수/변수로 분리한다. (COMMON 의 "2회 이상" 룰과는 별개의, 길이 기준 규칙)

```tsx
// O — 한 줄짜리는 inline
<button onClick={() => setOpen(true)}>열기</button>
<Badge>{folder.unreadCount}</Badge>
{items.map((item) => <Row key={item.id} item={item} />)}

// X — 한 줄인데 굳이 밖으로 분리
const handleOpen = () => setOpen(true)
<button onClick={handleOpen}>열기</button>

// O — 2줄 이상이면 분리
const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(payload)
}
<form onSubmit={handleSubmit}> ... </form>
```

---

## 6. 상태 관리

| 종류 | 도구 |
|------|------|
| 서버 상태 | TanStack React Query v5 |
| 로컬 상태 | `useState` |
| 전역 상태 | **사용하지 않음** |

- Query Key 는 `QUERY_KEY` 상수로 중앙 관리한다.

```typescript
export const QUERY_KEY = {
    POST: {
        LIST: ['post', 'list'],
        GET: (id: string) => ['post', 'get', id],
    },
}
```

---

## 7. API 호출

서버 / 클라이언트로 분리된 fetch 함수를 사용한다.

```typescript
// 서버
serverFetchData<T>(path, init)
serverFetchPaginated<T>(path, init)

// 클라이언트
clientFetch<T>(path, init)
clientFetchRaw(path, init)
```

**API 응답 구조:**

```typescript
type ApiSuccessResponse<T> = { success: true; data: T }
type ApiErrorResponse = { success: false; error: { code: string; message: string } }
```

---

## 8. 스타일링 · 에러 피드백 · 인증

### 8.1 스타일링

- **Tailwind CSS** 를 기본으로 한다.
- 컴포넌트는 **shadcn/ui + Radix UI** 를 사용한다.
- 컴포넌트 변형(variant)은 **CVA**(`class-variance-authority`)로 관리한다.
- 클래스 병합은 **`cn()`** 유틸리티(`clsx` + `tailwind-merge`)로 한다.

```typescript
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```

### 8.2 에러 피드백

- `sonner` 의 `toast.success()` / `toast.error()` 를 사용한다.

### 8.3 인증

- **better-auth** 기반. OAuth(GitHub, Google), 세션 기반.

---

## 9. Next.js 설정

- **App Router** 사용
- **React Compiler 활성화** (→ `useCallback`/`useMemo` 금지의 전제)
- ISR + `revalidateTag()` 캐시 전략

---

## 10. 컴포넌트 / Props 타입

- Props 타입은 `ComponentProps<typeof X>` 등 [common.md 5.3](./common.md#53-typescript-유틸리티-타입--100-활용) 의 유틸리티로 최대한 유도한다.
- 직접 정의가 필요하면 `type 컴포넌트명Props = { ... }`.

---

> 데스크톱 앱(Electron · Tauri 등)의 셸·IPC 규칙은 [desktop.md](./desktop.md) 를 참고한다.
