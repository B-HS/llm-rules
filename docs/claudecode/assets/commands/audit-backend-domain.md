---
description: 백엔드 한 도메인의 계층 구조 정합성을 backend.md 기준으로 점검합니다
argument-hint: <도메인명> (예: blog, mail)
allowed-tools: Bash, Read, Grep, Glob
---

백엔드 도메인 **`$ARGUMENTS`** 의 계층 구조 정합성을 `@docs/convention/backend.md` 기준으로 점검합니다. 인자가 비어 있으면 점검할 도메인명을 1줄로 되묻고 멈춥니다.

기준 문서를 먼저 인지합니다.
- @docs/convention/backend.md
- @docs/convention/common.md

## 1. 4곳 존재 확인 (계층형 구조)

한 도메인은 **route / service/domain / dto / compose** 4곳에 같은 이름으로 대응되어야 합니다(backend.md §1). 아래로 각 위치에 `$ARGUMENTS` 도메인 파일이 있는지 확인합니다.

- route: !`find . -path '*route*' -iname "*$ARGUMENTS*" -not -path '*/node_modules/*' 2>/dev/null`
- service/domain: !`find . -path '*service*' -iname "*$ARGUMENTS*" -not -path '*/node_modules/*' 2>/dev/null`
- dto: !`find . -path '*dto*' -iname "*$ARGUMENTS*" -not -path '*/node_modules/*' 2>/dev/null`
- compose: !`find . -path '*compose*' -iname "*$ARGUMENTS*" -not -path '*/node_modules/*' 2>/dev/null`

위 결과로 누락된 계층이 있으면 **결손(missing)** 으로 분류합니다(예: route·dto·service 만 있고 compose 없음). 실제 도메인 파일이 맞는지 Read 로 통독해 확인하고, 파일명 추측만으로 단정하지 않습니다.

## 2. 계층별 컨벤션 점검

찾은 파일들을 Read 로 통독하며 backend.md 기준을 항목별로 검증합니다.

### 2.1 Service / compose — ServiceDb 추상화 (§2)
- Service 팩토리가 `createXxxService(deps)` 형태이고 타입을 `ReturnType<typeof createXxxService>` 로 export 하는가.
- Service 가 **HTTP `Context` 와 Drizzle 을 모르는가** — Service 안에 `c.json`·`db.select` 같은 직접 의존이 있으면 위반.
- Drizzle 쿼리가 `service/` 가 아니라 **`compose/` 의 `*ServiceDb` 인라인 구현**에 격리되어 있는가.
- "없음"을 **`null` 반환**으로 표현하고, throw 변환은 Route 가 하는가.

### 2.2 에러 — createAppError 3-file 중앙화 (§6)
- 던질 때 **`throw createAppError('CODE')`** 만 쓰는가. `throw new Error(...)` 직접 throw 가 있으면 위반.
- 에러 코드가 **도메인 접두사**(`$ARGUMENTS` 대문자 등)로 네이밍되고, `lib/error-code.ts`·`lib/error-message.ts`·`lib/error.ts` **세 파일 모두**에 추가되어 있는가.

### 2.3 HOF — withErrorHandling / withAuth (§7)
- 모든 라우트 핸들러가 **`withErrorHandling` 으로 감싸여** 있는가(미적용 핸들러 색출).
- 인증 핸들러가 `withErrorHandling(withAuth({ getSession })(...))` 합성 순서(바깥 withErrorHandling → 안쪽 withAuth/withAdmin)를 지키는가.

### 2.4 응답 헬퍼 (§8)
- 응답을 `successResponse` / `paginatedResponse` / `errorResponse` 헬퍼로만 만드는가. `c.json` 에 임의 구조를 직접 넣으면 위반.

### 2.5 DTO (§5)
- DTO 가 **Zod 스키마만** 두고, 입력 타입을 `z.infer<typeof *Schema>` 로 유도하는가(손으로 적은 입력 타입 색출).
- 쿼리 파라미터에 `z.coerce` + `.default(...)` 를 쓰는가. boolean 은 Zod 4 `z.stringbool()`(Zod 3 은 `z.enum().transform()`)인가 — `z.coerce.boolean()` 은 위반.

검증 보조 grep(결과는 위치 파악용이며, 반드시 파일 Read 통독으로 확인 후 분류):
- throw new Error: !`grep -rn "throw new Error" . --include="*.ts" -l 2>/dev/null | grep -i "$ARGUMENTS" || echo "(직접 매칭 없음 — 도메인 파일에서 직접 확인)"`

## 3. 보고

backend.md 위반은 단순 grep 으로 단정하지 말고 변경/대상 파일을 Read 로 통독해 **검증한 뒤** 아래로 분류해 보고합니다.

- **결손(missing)**: 4곳 중 빠진 계층
- **위반(violation)**: 항목별로 파일·라인과 어긴 규칙(backend.md 섹션 번호) 명시
- **준수(ok)**: 충족한 항목

자축·이모지 없이 사실만 담백하게, 한국어 존댓말로 보고합니다. 위반이 많거나 도메인 전반을 깊게 보려면 `backend-convention-reviewer` 서브에이전트로 위임할 수 있음을 1줄 안내합니다.
