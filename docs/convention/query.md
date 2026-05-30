# QUERY — TanStack Query 사용지침 (v5)

> [common.md](./common.md) · [frontend.md](./frontend.md) · [fsd.md](./fsd.md) 를 전제로 한다.
> **서버 상태는 TanStack React Query v5 로만 다룬다.** 로컬 상태는 `useState`, 전역 상태 라이브러리는 쓰지 않는다. ([frontend.md 6](./frontend.md#6-상태-관리))

---

## 1. Provider

앱 최상위(`app`)에서 `QueryClient` 를 한 번 만들어 `QueryClientProvider` 로 감싼다.

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export const TanstackQueryProvider: FC<PropsWithChildren> = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
```

> **v5 표준 권장**: 과도한 refetch 를 줄이려면 기본 `staleTime` 을 명시하는 것을 권장한다. (예: `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })`)

---

## 2. QUERY_KEY 중앙 관리

> 쿼리 키는 컴포넌트에 흩지 않고 **`shared` 의 `QUERY_KEY` 상수 한 곳**에서 도메인별로 관리한다. ([frontend.md 6](./frontend.md#6-상태-관리))

```typescript
export const QUERY_KEY = {
    AUTH: { SESSION: ['session'] },
    IMAGE: { LIST: 'imageList' },
    POST: {
        GET: (id: string) => ['post', id],
        LIST: (params: Record<string, unknown>) => ['postList', Object.entries(params).map(([k, v]) => `${k}-${v}`).join('-')],
    },
    COMMENT: { LIST: (postId: string) => ['commentList', postId] },
}
```

- **파라미터가 없는 키**는 정적 값(`['session']` / `'imageList'`), **파라미터가 있는 키**는 함수(`GET: (id) => ['post', id]`)로 만든다.
- 목록처럼 검색/필터 파라미터가 있으면 **파라미터를 키에 직렬화**해 캐시를 구분한다.
- 무효화(`invalidateQueries`)도 같은 `QUERY_KEY` 를 써서 키 문자열을 손으로 적지 않는다.

---

## 3. 위치 · 네이밍

- 쿼리 훅(`useQuery`/`useMutation`)은 `entities` 데이터 레이어의 **`entities/<entity>.query.ts`** 에 둔다. ([fsd.md 4](./fsd.md#4-레이어별-파일--네이밍)) 클라이언트에서 도는 훅이므로 최상단에 `'use client'` 를 명시한다.
- 실제 API 요청은 `entities/<entity>.api.ts` 또는 **`clientFetch`** 헬퍼로 한다. ([frontend.md 7](./frontend.md#7-api-호출))
- 훅 이름은 **`use` + 동작 + Feature**: `useGetPost`, `useCreatePost`, `useUpdatePost`, `useGetCommentList`, `useCreateComment`. ([common.md 4](./common.md#4-네이밍))

---

## 4. 조회 — `useQuery`

```typescript
export const useGetPost = (id: string) =>
    useQuery<PostDetail>({
        queryKey: QUERY_KEY.POST.GET(id),
        queryFn: async () => {
            const data = await clientFetch<{ post: PostDetail }>(`/api/blog/posts/${id}`)
            return data.post
        },
    })
```

- `queryKey` 는 항상 `QUERY_KEY` 에서 가져온다.
- `queryFn` 은 `clientFetch` 로 응답을 받아 **필요한 데이터만 꺼내** 반환한다.
- 반환 타입은 제네릭(`useQuery<PostDetail>`)으로 고정한다.
- 조건부 조회는 `enabled` 옵션을 쓴다. (예: `useGetCommentList(postId, enabled)`)

---

## 5. 변경 — `useMutation`

```typescript
export const useCreateComment = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { postId: number; comment: string }) =>
            clientFetch('/api/blog/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.COMMENT.LIST(String(variables.postId)) })
            toast.success('댓글이 작성되었습니다')
        },
        onError: () => toast.error('댓글 작성에 실패했습니다'),
    })
}
```

- `mutationFn` 은 `clientFetch` 로 변경 요청을 보낸다.
- `onSuccess` 에서 **관련 쿼리만 `invalidateQueries`** 로 무효화하고, `sonner` `toast` 로 피드백한다. ([frontend.md 8.2](./frontend.md#82-에러-피드백))
- `onError` 에서 `toast.error` 로 실패를 알린다.
- 무효화에 변경 변수가 필요하면 `onSuccess: (_, variables) => ...` 의 두 번째 인자를 쓴다.
- 캐시는 **직접 조작하지 않고 `invalidateQueries`** 로 다시 받는 것을 기본으로 한다. (Next.js ISR 을 함께 쓰면 `revalidateTag`/`revalidatePath` 도 호출 — [frontend.md 9](./frontend.md#9-nextjs-설정))

---

## 6. 표준 권장 (v5)

- **수동 메모이제이션 금지와 무관**하게, 캐싱·중복요청 제거는 React Query 가 담당한다. ([frontend.md 4](./frontend.md#4-usecallback--usememo-금지--react-compiler-사용))
- 키는 항상 `QUERY_KEY` 팩토리로 — 인라인 배열 키를 컴포넌트에 직접 적지 않는다.
- 캐시를 손으로 `setQueryData` 하기보다 **무효화 후 재조회**를 기본으로 한다. (낙관적 업데이트는 꼭 필요한 곳에서만)
- `staleTime` / `gcTime` 은 데이터 성격에 맞게 명시한다.
