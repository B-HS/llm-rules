---
description: FSD 레이어 의존 방향·구조 점검 (역참조·pages 격리·SFC·alias·순환)
argument-hint: "[점검 대상 경로 (생략 시 src 전체)]"
allowed-tools: Bash, Read, Grep, Glob
---

프론트엔드 FSD 아키텍처를 점검합니다. 기준은 @docs/convention/fsd.md (§2 의존성 매트릭스, §3 SFC, §5 alias=레이어)입니다. 점검 대상은 `$ARGUMENTS`(생략 시 `src` 전체, 없으면 프로젝트 루트의 레이어 디렉토리)입니다.

다음 순서로 진행하세요. 각 단계는 grep/glob 결과를 그대로 보고하지 말고, 실제 파일을 Read 로 통독·검증한 뒤 위반/정상으로 분류합니다.

## 1. 레이어 구조 파악
- `app` `pages` `widgets` `features` `entities` `shared` 디렉토리 위치를 Glob 으로 확인합니다. Next.js App Router 라 `pages` 가 `app` 에 통합됐는지(=`pages` 부재) 먼저 식별합니다.

## 2. import 역참조(상향 참조) 위반 grep
fsd.md §2 매트릭스상 **금지된 방향**(아래 레이어가 위 레이어를 import)을 찾습니다. alias(`@shared/` `@entities/` `@features/` `@widgets/` `@pages/` `@app/`)와 상대경로 import 둘 다 봅니다.
- `shared` → `entities`/`features`/`widgets`/`pages`/`app` (shared 는 shared 끼리만)
- `entities` → `features`/`widgets`/`pages`/`app` (entities 는 shared·entities 만)
- `features` → `widgets`/`pages`/`app`
- `widgets` → `pages`/`app`
- `pages` → `app`

위반 후보를 grep 으로 모은 뒤 해당 파일을 Read 로 확인합니다. **`import type` 만으로 들어오는 도메인 타입 공유(특히 entities)는 위반으로 단정하지 말고** 값 import 인지 타입 import 인지 구분해 보고합니다.

## 3. pages ↔ pages import 금지
- `pages`(또는 `app` 의 page 단위) 끼리 서로 import 하는지 확인합니다(§2: `pages` 끼리 ⛔). 위반 시 위젯/공통으로 추출 제안.

## 4. features 의 비즈니스 로직 혼입(보조 점검)
- `features` 에서 `fetch`/`useQuery`/`useMutation`/`*.query` import 등 데이터 로직이 있는지 grep 합니다(§1: features 는 비즈니스 로직 X → widgets 로 올려야 함).

## 5. 1파일 1 export(SFC) 위반
- `widgets`/`features` 의 `.tsx` 파일에서 컴포넌트(`export const X` PascalCase)가 2개 이상 export 되는지 점검합니다(§3). `shared` 의 constant·utils 는 **예외**(한 파일 다중 export 허용)이니 제외합니다.

## 6. Path alias = 레이어 확인
- `tsconfig.json`(또는 `jsconfig.json`)의 `compilerOptions.paths` 를 Read 해 alias 가 레이어와 1:1 매핑되는지 확인합니다(§5). 레이어 alias 누락, 또는 레이어가 아닌데 alias 를 남발한 보조 모듈이 있는지 봅니다.

## 7. 순환참조 검사 (가능할 때)
- madge 가 있으면 순환참조를 검사합니다. 인라인 bash 로 시도하세요: !`npx madge --circular --extensions ts,tsx ${ARGUMENTS:-src} 2>/dev/null || echo "madge 미설치 — 건너뜀(npx madge 설치 후 재실행 권장)"`
- 출력에 순환 사이클이 있으면 fsd.md §1(entities 끼리 순환 주의)·conventions 의 "state→label 맵은 타입 정의 파일에 둔다(역배치 시 런타임 순환)" 관점에서 원인을 짚습니다.

## 8. 결과 보고
한국어·존댓말·간결하게 분류해 보고합니다.
- **위반 (수정 대상)**: 파일 경로 + 위반 방향(예: `features/x → widgets/y`) + fsd.md 근거(§번호) + 수정 방향.
- **정상/예외 (유지)**: `import type` 도메인 타입 공유, shared 다중 export 등 위반 아닌 것과 그 이유.
- 추측하지 말고, 모호하면 해당 파일을 Read 로 확인한 사실만 적습니다. 자축·이모지는 쓰지 않습니다.
