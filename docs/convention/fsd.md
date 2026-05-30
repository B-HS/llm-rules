# FSD — 프론트엔드 아키텍처 (필수)

> **별도의 유저 언급이 없는 한, 모든 프론트엔드 프로젝트는 아래의 변형 FSD(Feature-Sliced Design) 아키텍처를 따른다.**
> 이 문서는 프론트엔드 구조의 **단일 출처(SSOT)** 이며, [frontend.md](./frontend.md) 작업 시 **반드시 함께 참조**한다.

---

## 1. 레이어

빌드는 **아래(기반)에서 위(진입점)로** 쌓아 올린다. (bottom → up)

```
app        ← 최상위 진입점
pages      ← 페이지 (Next.js 면 app 에 통합되어 사라질 수 있음)
widgets    ← 본격적 부분 설계도 (비즈니스 로직 O)
features   ← 프로젝트의 근간 컴포넌트 (비즈니스 로직 X)
entities   ← 데이터 layer (독립적)
shared     ← 공유 기반 layer
```

| 레이어 | 역할 | fetch / query 등 비즈니스 로직 |
|--------|------|:---:|
| **app** | 프로젝트 최상위 layer. `pages` 를 가져와 react-router 등으로 서빙한다. 프로바이더 모음·wrapper 를 `shared` 에서 끌어오거나 여기서 직접 작성하여 **앱의 진입점**을 잡는다. | 조립만 |
| **pages** | 프로젝트의 페이지. **Next.js 프로젝트에서는 없어지고 `app` 에 통합**될 수 있다. | △ |
| **widgets** | 프로젝트의 **본격적 부분 설계도**. 이 단계부터 `fetch`, TanStack Query 등 **비즈니스 로직이 들어갈 수 있다.** | **O** |
| **features** | 프로젝트의 **근간이 되는 컴포넌트**. **비즈니스 로직이 없는** 순수 컴포넌트다. | **X** |
| **entities** | 프로젝트의 **데이터 layer**. `*.api.ts`, `*.query.ts`, `*.action.ts`, `*.type.ts` 등 **데이터 계층이 모두 여기**에 들어간다. 독립적인 layer 로 **모든 레이어에서 import 될 수 있다.** | O (데이터) |
| **shared** | 프로젝트의 **공유 layer**. `page` 를 제외한 **모든 layer 에서 참조될 수 있다.** constant·utils·공통 hook 등을 둔다. | X |

> `features` 는 데이터를 직접 가져오지 않는다. 데이터는 `entities` 에서 오고, `widgets` 가 이를 조립해 `features` 컴포넌트에 내려준다.
> 공통 constant·hook 은 [common.md](./common.md) / [frontend.md](./frontend.md) 규칙대로 `shared` 에 둔다.

---

## 2. 의존성(참조) 방향 — 가장 중요

**참조는 위 레이어가 아래 레이어를 향한다.** (`widgets → features → shared`)
반대 방향(`shared → features`, `features → widgets`)은 **금지**한다. 즉 **bottom → up 으로만 쌓고, 의존은 top → down 으로만 흐른다.**

- **`entities`** 는 예외적으로 **모든 상위 레이어에서 import 가능**한 독립 데이터 layer 다.
- **`shared`** 는 `page` 를 제외한 **모든 레이어에서 import 가능**하다.

### 참조 허용 매트릭스 (행 → 열)

| from \ to | shared | entities | features | widgets | pages | app |
|-----------|:------:|:--------:|:--------:|:-------:|:-----:|:---:|
| **shared**   | ✅ 끼리 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **entities** | ✅ | ✅ 끼리 | ❌ | ❌ | ❌ | ❌ |
| **features** | ✅ | ✅ | ✅ 끼리 | ❌ | ❌ | ❌ |
| **widgets**  | ✅ | ✅ | ✅ | ✅ 끼리 | ❌ | ❌ |
| **pages**    | ✅ | ✅ | ✅ | ✅ | ⛔ 끼리 금지 | ❌ |
| **app**      | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ 끼리 지양 |

### 동일 레이어 내 참조

- `shared` ↔ `shared` : **가능**
- `entities` ↔ `entities` : 가능 (순환 의존 주의)
- `features` ↔ `features` : **가능**
- `widgets` ↔ `widgets` : **가능**
- `app` ↔ `app` : 가능하지만 **피하는 방향으로** 간다
- `pages` ↔ `pages` : **금지**

---

## 3. 컴포넌트 — 단일 책임 (SFC)

- 컴포넌트는 **단일 책임**을 가진다. (Single-File Component / Single Responsibility)
- **하나의 파일에는 하나의 컴포넌트만 export** 하는 것을 기준으로 한다.
- 컴포넌트는 [frontend.md](./frontend.md) 의 `FC<Props>` 패턴·작성 순서·React Compiler 규칙을 그대로 따른다.

### 예외 — shared 의 constant / utils

`shared` 의 **constant·utils 등은 하나의 파일에 여러 함수가 속할 수 있다.** 이는 공유 기반 layer 라는 `shared` 의 특성을 고려한 것이다.

```typescript
// shared/lib/format.ts — 여러 util 함수가 한 파일에 모여도 됨
export const formatDate = (d: Date) => { ... }
export const formatCurrency = (n: number) => { ... }

// features/user-card/user-card.tsx — 컴포넌트는 1파일 1export
export const UserCard: FC<UserCardProps> = ({ ... }) => { ... }
```

---

## 4. 레이어별 파일 / 네이밍

```
app/                       앱 진입점, provider/wrapper, 라우팅
pages/                     페이지 단위 (Next.js 면 app/ 으로 통합)
widgets/<widget>/          비즈니스 로직 포함 조립 컴포넌트 (fetch/query)
features/<feature>/        비즈니스 로직 없는 근간 컴포넌트 (1파일 1컴포넌트)
entities/<entity>/         데이터 계층
  <entity>.api.ts          API 호출
  <entity>.query.ts        TanStack Query 훅
  <entity>.action.ts       서버 액션 등
  <entity>.type.ts         타입 정의
shared/                    공유 기반 (page 제외 어디서나 참조 가능)
  lib/ · constants/ · ui/  util·hook·상수·공통 컴포넌트
```

- 폴더·파일은 kebab-case, 컴포넌트는 PascalCase. ([common.md 4](./common.md#4-네이밍))
- `entities` 의 데이터 타입은 `*.type.ts` 에 두고, 가능한 한 추론·유틸리티 타입으로 유도한다. ([common.md 5.3](./common.md#53-typescript-유틸리티-타입--100-활용))

---

## 5. Path Alias — alias = 레이어

> FSD 에서 **`@` 접두사 alias 는 곧 레이어**다. 상대 경로보다 alias 를 우선한다. ([common.md 8](./common.md#8-path-alias))

```json
{
    "@app/*": ["./app/*"],
    "@pages/*": ["./pages/*"],
    "@widgets/*": ["./widgets/*"],
    "@features/*": ["./features/*"],
    "@entities/*": ["./entities/*"],
    "@shared/*": ["./shared/*"]
}
```

- **alias 1개 = 레이어 1개.** import 경로만 봐도 어느 레이어를 참조하는지 드러나, §2 의 의존성 방향 위반을 즉시 식별할 수 있다.
- Next.js 로 `pages` 가 `app` 에 통합된 경우 `@pages/*` 는 생략한다.
- 레이어가 아닌 보조 모듈(예: `lib`)은 해당 레이어 하위(`@shared/lib/*`)로 두고 별도 alias 를 남발하지 않는다.
