# BACKEND — 백엔드 컨벤션 (Hono.js)

> [common.md](./common.md) 의 모든 규칙을 전제로 한다. 여기서는 **백엔드 전용** 규칙만 다룬다.
> 핵심 철학: **Service 는 HTTP·DB 구현을 모른다. Route 가 HTTP 경계, compose 가 조립 경계다.**

---

## 1. 프로젝트 구조 (계층형)

```
index.ts        - 부트스트랩 (compose → router → middleware → mount)
route/          - HTTP 엔드포인트 (createXxxRoute 팩토리 → Hono 인스턴스 반환)
  index.ts      - 모든 route 팩토리를 조립 (createRouter)
service/        - 비즈니스 로직 (HTTP·Drizzle 모름)
  domain/       - 도메인별 서비스 (blog/, mail/, spotify/ ...)
  shared/       - 횡단 서비스 (storage, auth-provider, cache, image ...)
dto/            - Zod 스키마 (검증 + OpenAPI 응답 정의)
db/             - DB 클라이언트 싱글톤(index.ts) + 스키마(schema.ts)
middleware/     - Hono 미들웨어 (전역·경로 단위: CORS·보안·인증 게이트)
lib/            - 에러 체계, 응답 헬퍼, HOF(with-*), env, 순수 유틸
compose/        - 의존성 조립 (도메인별 composeXxx → ServiceDb 구현 제공)
masterdata/     - 정적 데이터 (JSON)
drizzle/        - 마이그레이션 산출물 (drizzle.config.ts)
tests/          - Bun 테스트 (route/service/dto/middleware/lib 대응)
```

- 한 도메인은 **route / service/domain / dto / compose** 4곳에 같은 이름으로 흩어져 대응된다.
- 도메인 간 직접 import 를 만들지 않는다. 공유가 필요하면 `service/shared/` 또는 `lib/` 로 올린다.

### 1.1 부트스트랩 순서 (`index.ts`)

```typescript
const app = new Hono<AuthContext>()
const composed = compose()                       // ① 의존성 전체 조립
const { api, caldav } = createRouter(composed)   // ② route 팩토리 조립

createMiddleware(app, { allowedDomains, securityExcludePaths, ... })  // ③ 전역 미들웨어
app.route('', createPage({ ... }))               // ④ 라우트 mount
app.route('/api', api)
```

- 순서는 **조립(compose) → 라우터(router) → 미들웨어(middleware) → mount** 로 고정한다.
- OpenAPI 스펙(`/docs`)·Swagger UI(`/swagger`)는 **비프로덕션에서만** 노출한다.

---

## 2. 의존성 주입 (Factory 패턴)

### 2.1 Service 팩토리 + `*ServiceDb` 추상화

> Service 는 **DB 구현(Drizzle)을 모른다.** `*ServiceDb` 는 **도메인 동작 단위의 메서드 인터페이스**다 (범용 CRUD 가 아니라 `getPostList` / `insertPost` 처럼 의미 단위).

```typescript
type PostServiceDb = {
    getPostList: (params: { offset: number; limit: number; keyword?: string }) => Promise<{ data: PostDetail[]; total: number }>
    getPostById: (id: number) => Promise<PostDetail | null>
    insertPost: (data: { title: string; description: string; categoryId: number }) => Promise<{ postId: number }>
    deletePost: (postId: number) => Promise<{ postId: number }>
}

type PostServiceDeps = {
    db: PostServiceDb
}

export const createPostService = (deps: PostServiceDeps) => ({
    list: async (query: PostListQuery) => { ... },
    getById: async (id: number) => {
        const post = await deps.db.getPostById(id)
        if (!post) return null
        return post
    },
    create: async (input: PostCreateInput) => deps.db.insertPost(input),
})

export type PostService = ReturnType<typeof createPostService>
```

- Service 메서드는 **DTO 입력 타입**(`PostListQuery`, `PostCreateInput`)을 받고, **HTTP `Context` 를 받지 않는다.**
- "없음"은 **`null` 반환**으로 표현한다. **에러 변환(throw)은 Route 가** 담당한다. (Service 는 도메인 사실만 반환)
- Service 타입은 손으로 적지 않고 `ReturnType<typeof createXxxService>` 로 export 한다. (→ [common.md 5.3](./common.md#53-typescript-유틸리티-타입--100-활용))

### 2.2 compose 가 `*ServiceDb` 를 구현한다 (Drizzle 격리)

> **Drizzle 쿼리는 `service/` 가 아니라 `compose/` 에 둔다.** compose 가 `*ServiceDb` 인터페이스를 **인라인 구현**해 주입한다. 이렇게 하면 Service 는 순수 로직, 쿼리는 조립부에 격리된다.

```typescript
// compose/blog.ts
export const composeBlog = ({ db, env, storageService, imageProcessor }: ComposeBlogArgs) => {
    const postService = createPostService({
        db: {
            getPostList: async (params) => {
                const rows = await db.select({ ... }).from(posts)/* drizzle 쿼리 */
                return { data: rows, total }
            },
            getPostById: async (id) => { ... },
            insertPost: async (data) => { ... },
        },
    })
    return { postService /* , ... */ }
}
```

### 2.3 compose 루트 — 중첩 조립 후 스프레드 병합

```typescript
// compose/index.ts
export const compose = () => {
    const core = { db: getDb(), env: getEnv() }

    const shared = composeShared(core)                                       // ① 공유 먼저
    const blog = composeBlog({ ...core, storageService: shared.storageService })  // ② 도메인은 core + shared 주입
    const mail = composeMail({ ...core, storageService: shared.storageService })

    return { ...shared, ...blog, ...mail }                                    // ③ 플랫 병합
}
```

- `core = { db, env }` 를 만들고, **shared → domain** 순으로 조립한다.
- 반환은 **스프레드로 평탄화**해 `composed.postService` 처럼 단일 객체로 노출한다.

---

## 3. 데이터 흐름

```
Route (DTO 검증 · 인증 · 에러 throw) → Service (도메인 로직) → ServiceDb (compose의 Drizzle 구현)
```

- **Route**: DTO 검증, 인증/권한, `null → createAppError(...)` 변환, 응답 직렬화. 비즈니스 로직 금지.
- **Service**: HTTP·Drizzle 모름. 입력 DTO 타입을 받아 도메인 결과/`null` 반환.
- **ServiceDb**: compose 가 제공하는 Drizzle 구현. Service 외부에서 DB 에 닿는 유일한 통로.

---

## 4. Route 정의 (Hono 팩토리 + OpenAPI)

> Route 는 **`createXxxRoute(deps) => Hono` 팩토리**다. `hono-openapi` 로 검증과 문서를 함께 선언한다.

```typescript
type PostRouteDeps = {
    postService: PostService
    getSession: (c: { req: { raw: { headers: Headers } } }) => Promise<{ user: { id: string; role: string | null } } | null>
}

export const createPostRoute = (deps: PostRouteDeps) => {
    const route = new Hono()

    route.get(
        '/',
        describeRoute({ tags: ['Blog'], summary: '게시글 목록 조회', responses: { 200: { description: '목록' } } }),
        validator('query', postListQuerySchema),
        withErrorHandling(async (c) => {
            const query = c.req.valid('query' as never) as z.infer<typeof postListQuerySchema>
            const result = await deps.postService.list(query)
            return c.json(paginatedResponse(result.data, { page: result.page, limit: result.limit, total: result.total }))
        }),
    )

    route.get(
        '/:id',
        describeRoute({ tags: ['Blog'], summary: '상세', responses: { 200: { description: '상세' }, ...errorResponses(['BLOG_POST_NOT_FOUND']) } }),
        withErrorHandling(async (c) => {
            const post = await deps.postService.getById(Number(c.req.param('id')))
            if (!post) throw createAppError('BLOG_POST_NOT_FOUND')
            return c.json(successResponse({ post }))
        }),
    )

    return route
}
```

규칙:

- 모든 핸들러는 **`withErrorHandling` 으로 감싼다.** (§6)
- 검증은 **`validator('query' | 'json', zSchema)`** (`hono-openapi/zod`), 값은 **`c.req.valid(...)`** 로 꺼내 `z.infer<>` 로 타입 고정.
- 응답에 나타날 수 있는 에러는 **`errorResponses([...ErrorCode])`** 로 OpenAPI 에 함께 선언한다.
- route 팩토리는 **반드시 `new Hono()` 인스턴스를 반환**한다. 조립은 `route/index.ts` 의 `createRouter` 가 한다.

---

## 5. DTO

> DTO 는 **Zod 스키마만** 둔다 (별도 validator 클래스 금지). 검증은 Route 의 `validator()` 가, 타입은 `z.infer` 가 담당한다.

```typescript
export const postListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().optional(),
})
export const postCreateSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    categoryId: z.coerce.number().int().positive(),
})

export type PostListQuery = z.infer<typeof postListQuerySchema>
export type PostCreateInput = z.infer<typeof postCreateSchema>
```

| 접미사 | 용도 | 예시 |
|--------|------|------|
| `*ListQuerySchema` / `*Query` | GET 쿼리 + 그 타입 | `postListQuerySchema`, `PostListQuery` |
| `*CreateSchema` / `*Input` | POST 바디 + 입력 타입 | `postCreateSchema`, `PostCreateInput` |
| `*UpdateSchema` | PUT/PATCH 바디 | `postUpdateSchema` |
| `*ResponseSchema` | 응답 구조 (OpenAPI) | `postResponseSchema` |
| `*ServiceDeps` / `*ServiceDb` | 의존성 / DB 추상화 타입 | `PostServiceDeps`, `PostServiceDb` |

- 쿼리 파라미터는 **`z.coerce`** + `.default(...)` 로 문자열을 안전하게 강제 변환한다.
- 단, 쿼리 파라미터의 **boolean 은 Zod 4 의 `z.stringbool()`** 로 변환한다. (`z.coerce.boolean()` 은 문자열 `'false'` 도 `true` 로 만들므로 금지) 기본 truthy/falsy 셋(`1`·`yes`·`on` 등)이 넓으므로 `'true'`/`'false'` 만 허용하려면 `z.stringbool({ truthy: ['true'], falsy: ['false'] })` 로 좁힌다. Zod 3 프로젝트는 기존 `z.enum(['true', 'false']).transform((v) => v === 'true')` 를 유지한다.
- 여러 도메인이 공유하는 스키마(`idParamSchema` · `paginationQuerySchema` 등)는 **`dto/common.ts`** 에 모은다.
- 입력 타입(`*Query`, `*Input`)은 **반드시** `z.infer<typeof *Schema>` 로 유도한다. 손으로 적지 않는다.

---

## 6. 에러 처리

### 6.1 3-파일 중앙화

에러는 **세 파일로 분리**해 중앙 관리한다.

| 파일 | 책임 |
|------|------|
| `lib/error-code.ts` | `ERROR_CODE` 상수 객체 + `ErrorCode` union 타입 |
| `lib/error-message.ts` | `ERROR_MESSAGE: Record<ErrorCode, string>` (한국어 메시지) |
| `lib/error.ts` | `AppError` 타입, `STATUS_MAP`, `getStatusCode`, `createAppError`, `isAppError` |

```typescript
// lib/error-code.ts
export const ERROR_CODE = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    BLOG_POST_NOT_FOUND: 'BLOG_POST_NOT_FOUND',
} as const
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

// lib/error.ts
export type AppError = {
    code: ErrorCode
    message: string
    statusCode: number
    details?: Record<string, unknown>
}
export const createAppError = (code: ErrorCode, details?: Record<string, unknown>): AppError => ({
    code,
    message: ERROR_MESSAGE[code],
    statusCode: getStatusCode(code),
    details,
})
export const isAppError = (error: unknown): error is AppError =>
    typeof error === 'object' && error !== null && 'code' in error && 'message' in error && 'statusCode' in error
```

규칙:

- 에러 코드는 **도메인 접두사**로 네이밍한다. (`BLOG_*`, `MAIL_*`, `WEATHER_*`, 공통은 `UNAUTHORIZED`·`VALIDATION_ERROR` 등)
- HTTP 상태는 **코드→상태 매핑(`STATUS_MAP`)** 으로 코드 한 곳에서 결정한다. 핸들러에서 상태코드를 직접 쓰지 않는다.
- 던질 때는 **`throw createAppError('CODE')`** 만 사용한다. `new Error()` 직접 throw 금지.
- 새 에러는 **세 파일(코드·메시지·상태) 모두**에 추가한다.

### 6.2 최상위 변환

처리되지 않은 예외는 `withErrorHandling`(§7.1)에서 `INTERNAL_ERROR(500)` 로 변환하고, `isAppError` 인 것만 해당 `statusCode` 로 응답한다.

---

## 7. HOF 패턴 (횡단 관심사)

> **라우트 핸들러 레벨의 횡단 관심사는 미들웨어가 아니라 HOF(`with*`)로 감싼다.** 전역·경로 단위 게이트만 Hono 미들웨어(`middleware/`)로 둔다.

### 7.1 `withErrorHandling` — 모든 핸들러 필수

```typescript
export const withErrorHandling = (handler: Handler) => async (c: Context) => {
    try {
        return await handler(c)
    } catch (error) {
        if (isAppError(error)) return c.json(errorResponse(error.code, error.message, error.details), error.statusCode as 400)
        captureException(error)
        return c.json(errorResponse('INTERNAL_ERROR', ERROR_MESSAGE.INTERNAL_ERROR), 500)
    }
}
```

- `captureException` 은 에러 리포팅 도구(Sentry 등)의 전송 함수다. 리포팅 도구가 없는 프로젝트는 서버 로그 기록으로 대체한다.

### 7.2 인증 HOF — `withAuth` / `withAdmin` / `withApiToken`

```typescript
export const withAuth = (deps: { getSession: GetSessionFn }) => (handler: AuthHandler) => async (c: Context) => {
    const session = await deps.getSession(c)
    if (!session) throw createAppError('UNAUTHORIZED')
    return handler(c, session.user)         // 인증된 user 를 두 번째 인자로 전달
}
export const withAdmin = (deps: { getSession: GetSessionFn }) => (handler: AuthHandler) => async (c) => {
    const session = await deps.getSession(c)
    if (!session) throw createAppError('UNAUTHORIZED')
    if (session.user.role !== 'admin') throw createAppError('FORBIDDEN')
    return handler(c, session.user)
}
export const withApiToken = (deps: { validateToken: (token: string) => Promise<boolean> }) => (handler: Handler) => async (c: Context) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token || !(await deps.validateToken(token))) throw createAppError('UNAUTHORIZED')
    return handler(c)
}
```

- HOF 는 `with` + Feature 네이밍. ([common.md 4](./common.md#4-네이밍))
- 인증이 필요한 핸들러는 `withErrorHandling(withAuth({ getSession })(async (c, user) => { ... }))` 형태로 합성한다.
- 합성 순서: **바깥 `withErrorHandling` → 안쪽 `withAuth`/`withAdmin`**. (인증 실패의 `UNAUTHORIZED` 도 에러 핸들러가 받게)
- 전역/그룹 단위 보호는 `middleware/`(예: `requireAuth`)로 `app.use('/admin/*', ...)` 처럼 건다.

---

## 8. 응답 헬퍼

`lib/api-response.ts` 의 헬퍼로만 응답 봉투를 만든다. `c.json` 에 임의 구조를 직접 넣지 않는다.

```typescript
successResponse(data)                 // { success: true, data }
paginatedResponse(data, pagination)   // { success: true, data, pagination: { ...pagination, totalPages } }
errorResponse(code, message, details) // { success: false, error: { code, message, details? } }
```

- `paginatedResponse` 는 `{ page, limit, total }` 만 받아 **`totalPages` 를 자동 계산**한다.
- `errorResponse` 의 `details` 는 **비프로덕션에서만** 직렬화한다 (정보 노출 방지).
- OpenAPI 문서용 응답 스키마(`successResponseSchema`, `paginatedResponseSchema`, `errorResponseDto`)도 같은 파일에서 Zod 로 제공한다.
- 목록 조회의 페이지네이션은 **offset 기반(`page`/`limit`)을 기본**으로 한다 (§5 의 `*ListQuerySchema`). 무한스크롤 등 커서 기반이 꼭 필요한 경우에만 도입하고, 그 결정을 `docs/acknowledge` 에 기록한다.

---

## 9. URL 구조

```
/api/[domain]/[resource]
```

- 도메인·리소스는 kebab-case. 인증은 `/api/auth/*`(better-auth), 토큰 관리는 `/api/auth/token`.

---

## 10. DB (Drizzle ORM + MySQL)

### 10.1 클라이언트 — 싱글톤

```typescript
// db/index.ts
let dbInstance: ReturnType<typeof createDrizzleDb> | null = null
export const getDb = () => {
    if (dbInstance) return dbInstance
    const pool = mysql.createPool({ uri: process.env.DATABASE_URL })
    dbInstance = createDrizzleDb(pool)
    return dbInstance
}
export type Database = ReturnType<typeof getDb>
```

### 10.2 스키마 — snake_case 컬럼 / camelCase 필드

```typescript
export const user = mysqlTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().$onUpdate(() => new Date()).notNull(),
})

type User = typeof user.$inferSelect
type NewUser = typeof user.$inferInsert
type UserSummary = Omit<User, 'passwordHash'>   // 민감 필드 제외
type UserPublic = Pick<User, 'id' | 'name'>
```

- 테이블·컬럼명은 **DB 레벨 snake_case**, TS 필드명은 **camelCase** 로 매핑한다.
- 모델 타입은 손으로 적지 않고 **`$inferSelect` / `$inferInsert`** 에서 유도하고, 파생은 `Omit`/`Pick`/Union 으로 만든다. (→ [common.md 5.3](./common.md#53-typescript-유틸리티-타입--100-활용))
- 마이그레이션은 `drizzle.config.ts`(`schema: './db/schema.ts'`, `dialect: 'mysql'`) 기준으로 `drizzle/` 에 생성한다.

### 10.3 트랜잭션

> 트랜잭션도 Drizzle 격리 원칙(§2.2)을 따른다. **Service 는 트랜잭션의 존재를 모른다.**

- 다중 쓰기의 원자성이 필요하면 **compose 의 `*ServiceDb` 구현 내부**에서 `db.transaction(async (tx) => { ... })` 으로 묶는다.
- `*ServiceDb` 메서드 하나가 **원자적 도메인 동작 단위**가 되도록 인터페이스를 설계한다. (예: `createPostWithTags` — Service 가 `insertPost` + `insertTags` 를 이어 부르며 원자성을 흉내내지 않는다)
- 여러 도메인에 걸친 원자성이 필요하면, 주 도메인의 compose 에서 하나의 트랜잭션으로 구현하고 그 도메인의 `*ServiceDb` 메서드로 노출한다.

```typescript
// compose/blog.ts — ServiceDb 구현 내부에서만 트랜잭션
insertPostWithTags: async (data) =>
    db.transaction(async (tx) => {
        const [{ insertId }] = await tx.insert(posts).values(data.post)
        await tx.insert(postTags).values(data.tagIds.map((tagId) => ({ postId: insertId, tagId })))
        return { postId: insertId }
    }),
```

### 10.4 마이그레이션 운영

- 스키마 변경은 **`drizzle-kit generate` 로 마이그레이션 파일을 만들고 `migrate` 로 적용**한다. 마이그레이션 파일은 커밋해 히스토리를 남긴다.
- **프로덕션 DB 에 `drizzle-kit push` 를 쓰지 않는다.** (히스토리 없는 스키마 변경)
- 단, **이미 `push` 방식으로 운영되어 마이그레이션 추적이 없는 기존 DB** 는 임의로 전환하지 않는다 — 사용자에게 물어 `push` 유지 또는 베이스라인 마이그레이션 생성을 결정하고, 결정을 `docs/acknowledge` 에 기록한다. ([ai-process.md §6.7](./ai-process.md) 환경 일관성)

---

## 11. 인증 / 세션 (better-auth)

- `service/shared` 의 `createAuthProvider` 로 **better-auth** 인스턴스를 만든다 (GitHub·Google OAuth, 세션).
- compose 에서 **`getSession(c)` 어댑터**를 만들어, `auth.api.getSession({ headers })` 결과를 `{ user: { id, name, email, role, image } }` 로 **정규화**해 노출한다.
- Route / HOF 는 이 정규화된 `getSession` 만 의존한다. (better-auth 세부 타입에 직접 의존 금지)

---

## 12. 선택적 서비스 — Stub(Proxy) 패턴

라우터 의존성은 `Partial<ReturnType<typeof compose>>` 로 받고, 미구성 서비스는 **Proxy 로 감싸 호출 시 에러**를 던진다.

```typescript
const stub = <T>(obj?: T): T =>
    obj ?? (new Proxy({}, { get: () => () => { throw createAppError('SERVICE_NOT_CONFIGURED') } }) as T)

router.route('/badge', createBadgeRoute({ badgeService: stub(deps.badgeService) }))
```

- 환경변수 부족 등으로 일부 서비스가 빠져도 **나머지 라우트는 동작**하고, 미구성 서비스 호출만 `SERVICE_NOT_CONFIGURED(503)` 로 실패한다.

---

## 13. 테스트

- **Bun 내장 러너**(`bun:test`) 사용. `describe` / `test` 설명은 **한국어**.
- DTO 스키마, 미들웨어, `lib` 유틸을 우선 대상으로 한다.

```typescript
import { describe, expect, test } from 'bun:test'

describe('postListQuerySchema', () => {
    test('기본값으로 파싱한다', () => {
        const result = postListQuerySchema.parse({})
        expect(result.page).toBe(1)
        expect(result.limit).toBe(20)
    })
    test('limit 최대값을 초과하면 실패한다', () => {
        expect(() => postListQuerySchema.parse({ limit: '101' })).toThrow()
    })
})
```

- **Service 테스트는 mocking 라이브러리 없이** `*ServiceDb` 를 인라인 객체로 대체해 작성한다. Factory DI(§2)의 목적이 바로 이것이다.

```typescript
describe('postService.getById', () => {
    test('없는 게시글이면 null 을 반환한다', async () => {
        const service = createPostService({ db: { ...postServiceDbStub, getPostById: async () => null } })
        expect(await service.getById(1)).toBeNull()
    })
})
```

---

## 14. 환경변수

- **`getEnv()` 싱글톤 + Zod `safeParse`** 로 런타임 검증한다.
- 필수는 `.min(1)`/`.url()`, 선택은 `.optional()` 로 구분하고, 실패 시 누락 키를 모아 즉시 던진다.

```typescript
const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    BASE_URL: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})
export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null
export const getEnv = () => {
    if (cachedEnv) return cachedEnv
    const result = envSchema.safeParse(process.env)
    if (!result.success) throw new Error(`Missing or invalid env: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`)
    cachedEnv = result.data
    return cachedEnv
}
```

- 환경변수는 **`getEnv()` 를 통해서만** 접근한다. `process.env` 직접 접근은 부트스트랩/싱글톤 내부로 제한한다.
