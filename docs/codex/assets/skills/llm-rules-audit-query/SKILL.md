---
name: llm-rules-audit-query
description: TanStack Query v5의 query key, queryOptions, invalidateQueries, staleTime, enabled 게이팅과 파일 배치를 감사할 때 사용합니다.
---

# TanStack Query 감사

`docs/convention/query.md`, `frontend.md`, `fsd.md`를 먼저 읽습니다. 사용자가 범위를 지정하지 않으면 저장소 전체의 TanStack Query 사용처를 검사합니다.

1. `queryKey`, `mutationKey`, `QUERY_KEY` 정의와 사용처를 찾아 키가 shared 단일 출처와 도메인·동작·파라미터 계층을 따르는지 확인합니다.
2. 파라미터 객체를 수동 직렬화하거나 식별 파라미터를 누락하지 않았는지 확인합니다.
3. 조회 옵션이 `queryOptions` 팩토리로 재사용되고, 훅이 `entities/<entity>.query.ts`에 있으며 `'use client'`가 있는지 확인합니다.
4. `setQueryData`·`setQueriesData`가 꼭 필요한 낙관적 업데이트인지, rollback 없는 직접 조작인지 확인합니다.
5. `invalidateQueries`가 관련 캐시를 빠짐없이 무효화하면서도 지나치게 넓지 않은지 실제 데이터 관계로 판단합니다.
6. `staleTime`, `gcTime`, hydration key, 의존 값의 `enabled` 게이팅을 확인합니다.
7. 서버 상태가 zustand나 Context로 복제되지 않았는지 확인합니다.

결과를 키 설계, 무효화, 신선도, 게이팅, 위치·네이밍으로 나눠 `파일:라인`, 근거 절, 권고를 보고합니다. grep 결과만으로 단정하거나 자동 수정하지 않습니다.
