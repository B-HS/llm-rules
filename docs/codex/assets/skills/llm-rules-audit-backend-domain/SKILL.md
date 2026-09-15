---
name: llm-rules-audit-backend-domain
description: Hono·Drizzle 백엔드의 특정 도메인을 route, service, dto, compose 계층과 llm-rules 계약에 따라 감사할 때 사용합니다. 도메인명이 없으면 먼저 확인해야 합니다.
---

# 백엔드 도메인 감사

사용자가 지정한 도메인명을 대상으로 `docs/convention/backend.md`, `common.md`, `security.md`를 먼저 읽습니다. 도메인명이 없으면 한 줄로 질문하고 멈춥니다.

1. route, service/domain, dto, compose에서 해당 도메인 파일을 찾고 실제 내용을 읽어 결손을 판정합니다.
2. Service가 `createXxxService(deps)` Factory DI와 `ReturnType` 유도를 쓰는지, HTTP·Drizzle을 모르는지, 없음은 `null`로 반환하는지 확인합니다.
3. Drizzle 쿼리와 트랜잭션이 compose의 `*ServiceDb` 구현에 격리됐는지 확인합니다.
4. `throw createAppError('CODE')`, 에러 코드·메시지·팩토리 3파일 중앙화, 도메인 접두사를 확인합니다.
5. 모든 handler의 `withErrorHandling`, 인증 HOF 합성 순서, 응답 헬퍼 사용을 확인합니다.
6. DTO가 Zod 단일 출처인지, 타입을 `z.infer`로 유도하는지, query coercion과 boolean 파싱이 규칙에 맞는지 확인합니다.

결손, 위반, 준수로 구분해 `파일:라인`과 backend 문서 절을 적습니다. 자동 수정하지 않습니다. 범위가 넓으면 `backend_convention_reviewer` custom agent 사용을 제안할 수 있습니다.
