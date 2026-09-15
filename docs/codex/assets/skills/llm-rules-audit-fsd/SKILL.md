---
name: llm-rules-audit-fsd
description: React·Next.js 프로젝트의 FSD 레이어 의존 방향, pages 격리, SFC, alias, 순환 참조를 점검할 때 사용합니다. 일반 코드 리뷰보다 아키텍처 배치 검토가 핵심일 때 적용합니다.
---

# FSD 감사

`docs/convention/fsd.md`와 `frontend.md`를 먼저 읽습니다. 사용자가 지정한 경로가 없으면 `src` 또는 프로젝트의 FSD 레이어 디렉터리를 대상으로 합니다.

1. `app`, `pages`, `widgets`, `features`, `entities`, `shared`의 실제 위치와 Next.js App Router 여부를 확인합니다.
2. alias와 상대 import를 함께 추적해 아래 역방향 참조를 찾습니다.
   - `shared`에서 상위 레이어
   - `entities`에서 `features` 이상
   - `features`에서 `widgets` 이상
   - `widgets`에서 `pages`·`app`
   - `pages`에서 `app` 또는 다른 page
3. `features`의 fetch·query·mutation 혼입, `widgets`·`features`의 한 파일 다중 컴포넌트 export, `compilerOptions.paths`의 레이어 불일치를 확인합니다.
4. 설치된 순환 참조 검사기가 있으면 추가 의존성 설치 없이 실행합니다. 없으면 생략 사실을 보고합니다.
5. 후보 파일을 직접 읽고 `import type`, shared 유틸 다중 export 등 허용 예외를 구분합니다.

결과는 위반과 정상 예외로 나누고 `파일:라인`, 참조 방향, 근거 절, 수정 방향을 적습니다. 점검 요청만 받은 경우 코드를 수정하지 않습니다.
