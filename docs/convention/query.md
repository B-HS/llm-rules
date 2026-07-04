# QUERY — TanStack Query 사용지침 (v5)

> [common.md](./common.md) · [frontend.md](./frontend.md) · [fsd.md](./fsd.md) 를 전제로 한다.
> **서버 상태는 TanStack React Query v5 로만 다룬다.** 로컬 상태는 `useState`, 전역 상태 라이브러리는 쓰지 않는다. ([frontend.md 6](./frontend.md#6-상태-관리))

---

## 1. Provider

앱 최상위(`app`)에서 `QueryClient` 를 한 번 만들어 `QueryClientProvider` 로 감싼다.

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })

export const TanstackQueryProvider: FC<PropsWithChildren> = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
```

- 기본 `staleTime` 은 **60초(`60_000`)로 명시**한다. (과도한 refetch 방지 — v5 표준 권장) 데이터 성격상 다른 값이 필요한 쿼리는 개별 `queryOptions` 에서 덮어쓴다.
- 서버 프리페치(§6)를 쓰는 경우, 서버에서는 요청마다 새 `QueryClient` 를 만든다. (클라이언트 싱글톤과 혼용 금지)

---

## 2. QUERY_KEY 중앙 관리

> 쿼리 키는 컴포넌트에 흩지 않고 **`shared` 의 `QUERY_KEY` 상수 한 곳**에서 도메인별로 관리한다. ([frontend.md 6](./frontend.md#6-상태-관리))

```typescript
export const QUERY_KEY = {
    AUTH: { SESSION: ['session'] },
    IMAGE: { LIST: ['imageList'] },
    POST: {
        GET: (id: string) => ['post', id],
        LIST: (params: Record<string, unknown>) =>
            ['postList', Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}-${v}`).join('-')],
    },
    COMMENT: { LIST: (postId: string) => ['commentList', postId] },
}
```

- **키는 항상 배열이다.** 문자열 단독 키를 만들지 않는다.
- **파라미터가 없는 키**는 정적 배열(`['session']`), **파라미터가 있는 키**는 함수(`GET: (id) => ['post', id]`)로 만든다.
- 목록처럼 검색/필터 파라미터가 있으면 **파라미터를 키에 직렬화**해 캐시를 구분한다. 이때 **키를 정렬(sort)** 해 파라미터 순서가 달라도 같은 캐시를 가리키게 한다.
- 무효화(`invalidateQueries`)도 같은 `QUERY_KEY` 를 써서 키 문자열을 손으로 적지 않는다.

---

## 3. 위치 · 네이밍

- 쿼리 훅(`useQuery`/`useMutation`)은 `entities` 데이터 레이어의 **`entities/<entity>.query.ts`** 에 둔다. ([fsd.md 4](./fsd.md#4-레이어별-파일--네이밍)) 클라이언트에서 도는 훅이므로 최상단에 `'use client'` 를 명시한다.
- 실제 API 요청은 `entities/<entity>.api.ts` 또는 **`clientFetch`** 헬퍼로 한다. ([frontend.md 7](./frontend.md#7-api-호출))
- 훅 이름은 **`use` + 동작 + Feature**: `useGetPost`, `useCreatePost`, `useUpdatePost`, `useGetCommentList`, `useCreateComment`. ([common.md 4](./common.md#4-네이밍))

---

## 4. 조회 — `queryOptions` + `useQuery`

> 조회 옵션은 **`queryOptions` 팩토리로 한 번만 정의**하고, `useQuery` · 프리페치(§6) · `invalidateQueries` 가 전부 이것을 재사용한다. (v5 표준 — 키·fn·타입이 한곳에 묶여 타입이 자동 추론된다)

```typescript
export const postQueryOptions = (id: string) =>
    queryOptions({
        queryKey: QUERY_KEY.POST.GET(id),
        queryFn: async () => {
            const data = await clientFetch<{ post: PostDetail }>(`/api/blog/posts/${id}`)
            return data.post
        },
    })

export const useGetPost = (id: string) => useQuery(postQueryOptions(id))
```

- `queryOptions` 팩토리는 훅과 같은 파일(`entities/<entity>.query.ts`)에 두고, 네이밍은 **`<entity>QueryOptions`** (파라미터 있으면 함수).
- `queryKey` 는 항상 `QUERY_KEY` 에서 가져온다. (queryOptions 안에서만 사용)
- `queryFn` 은 `clientFetch` 로 응답을 받아 **필요한 데이터만 꺼내** 반환한다. 반환 타입은 `queryFn` 에서 **자동 추론**되므로 제네릭을 손으로 적지 않는다. ([common.md §5.2](./common.md) 추론 우선)
- 조건부 조회·개별 `staleTime` 등 호출부 옵션은 스프레드로 합친다: `useQuery({ ...postQueryOptions(id), enabled })`
- 조회 실패 UI 는 훅을 소비하는 widget 에서 `isError` 분기 또는 error boundary 로 처리한다. (조회 실패에 mutation 처럼 toast 를 강제하지 않는다)

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
- 무효화는 **entities 의 mutation 훅(onSuccess) 책임을 기본**으로 한다(권장). widgets 에서 `useQueryClient` 로 직접 무효화하는 것은 지양한다 — 단, 여러 mutation 을 조합하는 오케스트레이션(`Promise.all` · 직렬 체인)처럼 widgets 레벨의 후속 처리가 자연스러운 경우는 허용한다.
- `onError` 에서 `toast.error` 로 실패를 알린다.
- 무효화에 변경 변수가 필요하면 `onSuccess: (_, variables) => ...` 의 두 번째 인자를 쓴다.
- 캐시는 **직접 조작하지 않고 `invalidateQueries`** 로 다시 받는 것을 기본으로 한다. (Next.js ISR 을 함께 쓰면 `revalidateTag`/`revalidatePath` 도 호출 — [frontend.md 9](./frontend.md#9-nextjs-설정))

---

## 6. 서버 프리페치 — App Router + `HydrationBoundary`

첫 화면 데이터를 서버에서 미리 채우려면 **서버 컴포넌트에서 `prefetchQuery` 후 `HydrationBoundary` 로 dehydrate 상태를 내려보낸다.** §4 의 `queryOptions` 팩토리를 그대로 재사용한다.

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

const Page = async ({ params }: PageProps) => {
    const queryClient = new QueryClient()
    await queryClient.prefetchQuery(postQueryOptions(params.id))

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <PostDetailWidget id={params.id} />
        </HydrationBoundary>
    )
}
```

- 서버에서는 **요청마다 `new QueryClient()`** 를 만든다. (사용자 간 캐시 공유 방지)
- 클라이언트 widget 은 §4 의 훅(`useGetPost`)을 그대로 쓴다 — 같은 `queryOptions` 이므로 프리페치된 캐시에 즉시 히트한다. 로딩 없는 렌더가 필요하면 `useSuspenseQuery(postQueryOptions(id))` 를 쓴다.
- **전제**: `queryFn` 의 fetch 헬퍼가 서버에서도 동작해야 한다(절대 URL·쿠키 전달 — [frontend.md 7](./frontend.md#7-api-호출)). 클라이언트 전용 헬퍼라면 프리페치를 도입하기 전에 헬퍼를 환경 중립으로 정리한다.
- 프리페치는 **첫 화면에 반드시 보이는 데이터에만** 적용한다. 모든 쿼리를 기계적으로 프리페치하지 않는다.

---

## 7. 표준 권장 (v5)

- **수동 메모이제이션 금지와 무관**하게, 캐싱·중복요청 제거는 React Query 가 담당한다. ([frontend.md 4](./frontend.md#4-usecallback--usememo-금지--react-compiler-사용))
- 키는 항상 `QUERY_KEY` 팩토리로, 조회 옵션은 항상 `queryOptions` 팩토리로 — 인라인 배열 키·중복 옵션 정의를 컴포넌트에 직접 적지 않는다.
- 캐시를 손으로 `setQueryData` 하기보다 **무효화 후 재조회**를 기본으로 한다. (낙관적 업데이트는 꼭 필요한 곳에서만)
- `staleTime` / `gcTime` 은 데이터 성격에 맞게 명시한다. (전역 기본은 §1 의 60초)
