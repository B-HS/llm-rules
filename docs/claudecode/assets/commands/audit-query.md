---
description: TanStack Query 사용 규약(query.md) 점검 — inline queryKey·QUERY_KEY 중앙관리·setQueryData·use client·invalidateQueries 범위
argument-hint: "[점검 대상 경로 (생략 시 전체)]"
allowed-tools: Bash, Read, Grep, Glob
---

TanStack Query 사용 규약을 점검합니다. 기준 문서는 @docs/convention/query.md 입니다. 점검 범위는 `$ARGUMENTS` (비어 있으면 저장소 전체).

먼저 기준을 인지하세요. query.md 핵심:
- 쿼리 키는 컴포넌트에 흩지 않고 `shared` 의 `QUERY_KEY` 상수 한 곳에서 도메인별로 중앙 관리한다.
- 쿼리 훅(`useQuery`/`useMutation`)은 `entities/<entity>.query.ts` 에 두고, 클라이언트에서 도므로 최상단에 `'use client'` 를 명시한다.
- 캐시는 손으로 `setQueryData` 하기보다 무효화 후 재조회를 기본으로 한다(낙관적 업데이트는 꼭 필요한 곳만).
- `onSuccess` 에서 관련 쿼리만 `invalidateQueries` 로 무효화한다(과도한 광역 무효화 지양).

다음 항목을 휴리스틱 grep 으로 스캔하고, 각 후보를 Read 로 직접 확인해 오탐을 거른 뒤 보고하세요. grep 은 위치 파악 보조용이며, 단정 전 해당 파일을 통독합니다.

1. inline queryKey (컴포넌트가 배열 키를 직접 작성)
   - `rg -n "queryKey:\s*\[" --type ts --type tsx` 로 `queryKey: [ ... ]` 형태를 찾는다.
   - `*.query.ts` 외 파일(특히 `widgets`·`features`·컴포넌트)에서 배열 리터럴을 직접 쓰면 위반 후보. `QUERY_KEY.XXX` 팩토리 참조면 정상.
   - `invalidateQueries({ queryKey: [...] })` 의 inline 배열도 같이 본다(2번과 겹치면 함께 보고).

2. QUERY_KEY 중앙관리 누락
   - `rg -n "QUERY_KEY" --type ts --type tsx` 로 정의·사용처를 모은다. `QUERY_KEY` 가 `shared` 에 1곳으로 모여 있는지, 도메인별 구조(`POST.GET(id)` 식)인지 확인.
   - 파라미터 있는 키를 정적 배열로 둬 캐시 구분이 안 되는지, 파라미터 없는 키를 굳이 함수로 만들었는지 본다.
   - `queryKey`·`mutationKey` 를 쓰면서 `QUERY_KEY` 를 전혀 import 하지 않는 파일을 위반 후보로 표시.

3. setQueryData 직접 조작
   - `rg -n "setQueryData|setQueriesData" --type ts --type tsx` 로 찾는다.
   - 사용처마다 "꼭 필요한 낙관적 업데이트"인지 판단한다. 단순 갱신을 `invalidateQueries` 대신 `setQueryData` 로 우회하면 위반 후보. 낙관적 업데이트(`onMutate` + rollback 동반)면 정상으로 분류하되 근거를 남긴다.

4. entities/*.query.ts 의 use client 누락
   - `rg --files -g "**/entities/**/*.query.ts"` (또는 `**/*.query.ts`) 로 파일을 모은 뒤, 각 파일 첫 줄에 `'use client'` 디렉티브가 있는지 확인.
   - 누락된 파일을 전부 나열한다. (훅이 클라이언트에서 돌므로 필수)

5. invalidateQueries 범위
   - `rg -n "invalidateQueries" --type ts --type tsx` 로 찾는다.
   - 인자 없는 `invalidateQueries()` (전체 무효화)·`queryKey` 누락·과도하게 짧은 prefix(관련 없는 캐시까지 광역 무효화)를 위반 후보로 본다.
   - 관련 쿼리만 `QUERY_KEY.XXX(...)` 로 좁게 무효화하는지 확인하고, 너무 넓으면 좁힐 키를 제안한다.

보고 형식 (한국어·존댓말·간결, 코드 주석/자축/이모지 금지):
- 5개 항목별로 **위반 / 정상(유지) 이유** 로 분류해 정리합니다.
- 각 위반은 `파일:라인` + 한 줄 근거 + query.md 해당 절(예: §2 QUERY_KEY 중앙 관리) + 수정 제안.
- grep 휴리스틱 특성상 오탐 가능성이 있는 항목은 "확인 필요"로 표시하고 단정하지 않습니다.
- 자동 수정은 하지 않습니다. 위반 목록과 제안만 제시하고, 적용 여부는 사용자에게 묻습니다.
