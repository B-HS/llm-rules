# 컨벤션 전수조사 3차 — 결정 리스트 (2026-07-10)

> 상태: **결정 완료 · 반영 완료** (결정 내역은 문서 하단 "결정 기록" 참조. 본문은 제안 원문 보존)
> 조사 범위: `docs/convention/` 11개 문서 전체 + enforcement 레이어(docs/claudecode assets 훅 6·에이전트 7·커맨드 8·settings, docs/agents-core.md, scripts, install-files).
> 외부 근거는 공식 문서로 확인 완료: ① TanStack Query v5 — 쿼리 키는 결정적 해싱(객체 속성 순서 무관)·prefix 부분 매칭 무효화 지원 ② Zod 4 — `z.stringbool()` 제공 ③ Next.js 15 — `params`/`searchParams` Promise 화, 16 에서 동기 접근 완전 제거.

## 회신 방법

- "전부 추천대로" 한마디로 일괄 적용 가능.
- 개별 지정: "1 은 A안, 2·3 적용, 23 제외" 형태.

---

## A. 삭제·완화 후보

### 1. frontend.md §6 — 전역 상태 라이브러리 금지 (사용자 제기)

- 현재: "전역 상태 라이브러리(zustand·jotai·redux 등)를 도입하지 않는다. Context 는 provider 성격(테마·i18n·세션)에만."
- 문제: Context 는 고빈도 갱신 상태에 부적합(값이 바뀌면 모든 consumer 리렌더 — React Compiler 로도 해소 불가)한데, 전역 라이브러리까지 금지하면 "고빈도 갱신·위젯 간 공유 클라이언트 상태"의 갈 곳이 없다. prop drilling 또는 Context 남용을 유도한다.
- 선택지:
    - **A안 — 완전 삭제**: 금지 문구 제거, 상태 표만 유지.
    - **B안 — 완화 (추천)**: 기본 사다리(서버=TanStack Query, 로컬=useState, 저빈도 크로스커팅=Context)는 유지하되, 그 밖의 전역 클라이언트 상태(고빈도 갱신·위젯 간 공유)가 실제로 필요하면 **zustand 를 표준으로 허용**. 서버 상태를 store 에 넣는 것은 계속 금지. store 위치 규칙 신설: 도메인 store 는 `entities/<entity>.store.ts`, UI 전역 store 는 `shared/store/`.
    - C안 — 현행 유지.
- B안 추천 근거: 완전 삭제하면 에이전트가 세션마다 임의 라이브러리(redux 등)를 들일 수 있다. 표준 1개를 지정해야 결정론이 유지된다.
- 참고: 이전 세션 결정 "⑤ Context 는 provider 용도만"의 부분 번복 — 본 문서가 갱신 기록이 된다.
- 리플: frontend.md §6 표·불릿, query.md 서문, index.md 요약 2곳, ai-process.md §10, agents-core.md:36·:125, enforcement.md:156(+ tanstack-query-reviewer 매핑 공백 해소), fsd.md §2.1 결정 트리(선택).

---

## B. 고도화 후보 (기존 룰 개선)

### 2. query.md §2 — QUERY_KEY 정렬 직렬화 → 객체 그대로 + 계층 키 (추천: 적용)

- 현재: 목록 키를 `Object.entries(params).sort(...).join('-')` 로 문자열 직렬화. frontend.md §6 예제(`['post','list']`)와도 불일치.
- 근거: v5 는 키 안의 객체를 속성 순서와 무관하게 결정적으로 해싱한다(공식 문서 확인). 수동 직렬화는 프레임워크가 이미 해결한 문제의 재구현이고, prefix 부분 매칭 무효화 능력을 잃는다.
- 제안: 도메인 계층 키로 통일 — `ALL: ['post']` / `LIST: (params) => ['post', 'list', params]` / `DETAIL: (id) => ['post', 'detail', id]`. 도메인 전체 무효화는 `QUERY_KEY.POST.ALL` prefix 로.
- 참고: 이전 세션 결정 "⑥ 정렬 직렬화"의 번복 — 당시 정렬로 풀려던 문제(파라미터 순서)가 해싱으로 이미 해결됨을 확인.
- 리플: query.md §2·§7, frontend.md §6 예제, agents-core.md:133, tanstack-query-reviewer, audit-query, enforcement.md:182-188.

### 3. common.md §4 — Boolean 접두사 `is` → `is/has/can/should` (추천: 적용)

- `hasPermission`·`canEdit`·`shouldRetry` 를 `is` 로 강제하면 부자연스럽다. 리플: agents-core.md:78, claudecode/agents.md:51.

### 4. backend.md §5 — boolean 쿼리에 Zod 4 `z.stringbool()` (추천: 적용)

- 현재: `z.enum(['true','false']).transform((v) => v === 'true')`.
- 제안: Zod 4 프로젝트는 `z.stringbool()` (공식 API, 기본 truthy/falsy 셋은 `1/yes/on` 등 넓음 — strict 가 필요하면 `{ truthy: ['true'], falsy: ['false'] }` 커스텀). Zod 3 프로젝트는 기존 패턴 유지 조항 병기. `z.coerce.boolean()` 금지는 그대로.
- 리플: agents-core.md:147, backend-convention-reviewer:42, audit-backend-domain:47, enforcement.md:202.

### 5. frontend.md §4·§9 — React Compiler 전제의 일반화 (추천: 적용)

- 현재: 활성화 안내가 "Next.js 설정에서"로 한정. useCallback/useMemo 금지는 컴파일러 활성화가 전제인데, Vite·데스크톱 렌더러 프로젝트의 활성화 의무가 불명확.
- 제안: "모든 React 프로젝트에서 React Compiler 를 활성화한다(Next: next.config, Vite: babel-plugin-react-compiler)" 로 일반화.

### 6. desktop.md §2 — Electron 보안 기본값 명문화 (추천: 적용)

- `contextIsolation: true` / `nodeIntegration: false` / `sandbox: true` / `contextBridge` 로 최소 노출. 현재 desktop-security-reviewer 에이전트만 이 값을 검사하고 SSOT 문서에는 없다(조사에서 확인된 단일 지점 공백). 문서가 근거를 제공해야 한다.

### 7. git.md §6 — force push 승인 시에도 `--force-with-lease` 만 (추천: 적용)

- 히스토리 재작성을 사용자에게 물어 승인받은 경우에도 `--force` 대신 `--force-with-lease` 를 쓰도록 형태를 지정.

### 8. git.md §6.1 + guard-commit.sh — 금지 트레일러에 세션 링크류 추가 (추천: 적용)

- `Claude-Session:` 등 AI 세션 URL 트레일러가 현행 훅 패턴(`co-authored-by|generated with|...`)에 안 걸린다. 문서 예시와 훅 정규식(guard-commit.sh:39)에 추가.

### 9. common.md §5.5 — 순수 union 허용 명시 (추천: 적용)

- 값 순회(런타임 객체)가 필요 없으면 `as const` 객체 없이 `type Role = 'admin' | 'user'` 로 충분함을 한 줄 명시.

### 10. common.md §1 — "(node/npm/pnpm/vite 대신 bun)" 문구 정리 (추천: 적용)

- bun 은 런타임·패키지매니저·테스트 러너 기준이고, 번들러/dev 서버는 프레임워크 기본(Vite 등)을 그대로 쓴다는 의미로 명확화. 현행 문구는 에이전트가 "Vite 자체를 피해야 한다"로 오독할 수 있다.

### 11. comments.md §1.1 — 설정 파일 주석 취급 명시 (추천: 허용으로 명시)

- CI 워크플로(yml)·toml 등 도구 설정 파일의 짧은 설명 주석을 금지 대상에서 제외한다고 명시. 현행 문구("코드 파일 내부")는 애매하다.

### 12. backend.md §7.1 — `captureException` 전제 명시 (추천: 적용, 낮음)

- withErrorHandling 예시에 등장하는 에러 리포팅(Sentry 등) 사용 전제를 한 줄로 명시.

### 13. common.md §9 — dayjs 에 Temporal 재검토 노트 (추천: 패스)

- Temporal API 안정화가 아직 진행 중이라 지금 넣을 실익이 낮다.

---

## C. 추가 후보 (신규 규칙)

### 14. 프론트엔드 테스트 표준 — frontend.md 신설 § (추천: 적용)

- 단위·컴포넌트 = `bun:test` + Testing Library(+happy-dom), describe/test 설명 한국어(backend §13 과 통일), E2E 는 필요한 프로젝트에서만 Playwright. 현재 BE 테스트 규정만 있고 FE 는 공백 — ai-process §8("검증의 가장 좋은 수단은 테스트")과의 간극.

### 15. Server Actions 규칙 — frontend.md (추천: 적용)

- fsd.md 에 `entities/<entity>.action.ts` 파일명만 있고 규칙이 없다. 기본은 API(route handler/Hono) 경유, Next 단독 프로젝트의 폼 제출 등에서 server action 사용 시: `'use server'` + 입력 Zod 검증 필수 + 완료 후 revalidateTag/invalidateQueries 연계.

### 16. console.log 위생 — common.md (추천: 적용)

- 디버그용 `console.log` 를 커밋하지 않는다. 서버 로그는 의도된 로깅 경로로만.

### 17. package.json 표준 스크립트 — ai-process §8.1 연계 (추천: 적용)

- 모든 프로젝트는 `typecheck`·`lint`·`test` 스크립트를 제공한다. 검증 사다리와 verify-on-stop 훅이 결정적으로 동작하는 전제 조건.

### 18. 로딩·에러 UI 기준 — query.md §4 보강 (추천: 적용)

- 산재한 문구(isError 분기, useSuspenseQuery 언급)를 기준으로 정리: 첫 화면은 프리페치+`useSuspenseQuery`, 그 외 `isPending` 분기, 에러는 ErrorBoundary 또는 `isError`.

### 19. i18n 표준 — frontend.md (결정 필요: 사용 라이브러리 확인)

- 예제에 `useTranslations` 만 등장하고 표준 미지정. next-intl 을 표준으로 명시할지, 사용 중인 라이브러리 회신 필요.

### 20. 이미지 최적화 — frontend.md 한 줄 (추천: 적용, 낮음)

- Next 프로젝트는 `next/image` 를 기본으로 한다.

### 21. security.md — rate limiting·업로드 검증 (추천: 적용, 낮음)

- 공개 엔드포인트 rate limit 고려 + 파일 업로드는 MIME·크기 화이트리스트 검증. 각 한 줄.

### 22. drizzle-kit 운영 규칙 — backend.md §10 (추천: 적용)

- 스키마 변경은 `generate` → `migrate` 경로로만. 프로덕션에서 `push` 금지.

### 23. git.md — PR 제목·머지 전략 (추천: 보류)

- 개인 레포는 main 직접 커밋 합의가 있어 실익 불확실. 필요해지는 시점에 도입.

### 24. CI 규정 — ai-process §8.1 연계 한 줄 (추천: 보류)

### 25. FE 환경변수 Zod 검증 (env.ts 스키마) (추천: 보류)

### 26. (인프라) 주입 요약 문구 단일 출처화 (추천: 적용, 별도 작업)

- session-context.sh · reinject-rules.sh · agents-core.md · claudecode/hooks.md 에 컨벤션 요약이 문구가 조금씩 다른 4~5개 복제본으로 존재 — 이번 조사에서 확인된 최상위 드리프트 위험. 단일 소스에서 생성하는 스크립트로 정리.

---

## D. 정합 수정 (문서 버그 — 일괄 승인 가능)

27. fsd.md §2 참조 매트릭스의 이모지 기호를 O/X 텍스트로 — 자체 "이모지 금지(문서 포함)" 규칙 위반.
28. query.md §6 프리페치 예제 `params.id` → `await params` (Next 15+ Promise, 16 에서 동기 접근 제거 — 공식 확인).
29. frontend.md §6 ↔ query.md §2 QUERY_KEY 예제 모양 불일치(`['post','list']` vs `['postList']`) 통일 — 2번 채택 시 그 체계로, 미채택 시에도 한쪽으로 통일.
30. desktop.md §2.1 renderer 트리(components/hooks/lib)가 §1 "렌더러는 frontend 규칙(FSD 필수)"과 모순 — 추천: FSD 레이어 트리로 수정 (대안: 데스크톱 렌더러는 FSD 예외로 명시).
31. backend.md §7.2 헤딩의 `withApiToken` 이 본문에 없음 — 시그니처 예시 추가 (대안: 헤딩에서 제거).
32. index.md 하단 디렉토리 트리 `rules/docs/convention/` → 실제 경로 `docs/convention/`.
33. enforcement.md:156 — 전역 상태 금지를 tanstack-query-reviewer 에 매핑했으나 해당 에이전트 프롬프트에 없음 (1번 결정에 따라 해소).
34. claudecode/agents.md:51 — boolean 접두사 점검이 실제 에이전트 프롬프트에 없음 (3번과 함께 정리).
35. output-styles/llm-rules.md:21 — "inline export" 표현을 "named export" 로 통일.

---

## E. 검토했으나 미채택 권고 (결정 불필요, 참고)

- Biome 전환 (Prettier 유지 — 훅·컨벤션 전반이 Prettier 전제), Temporal/date-fns 전환 (dayjs 유지), `FC<Props>` 폐지 (스타일 일관성 가치 유지), 정통 FSD segment(ui/model/api) 도입 (변형 FSD 유지), 커서 페이지네이션 기본화 (offset 기본 유지), 테스트 커버리지 목표 수치, 모노레포 규칙·구조적 로거(pino)·infiniteQuery 표준 (수요 발생 시 재론).
- 과거 명시 제외 3종(완료 전 브라우저 확인·디버깅 로컬 재현·prettier-plugin-tailwindcss)은 재제안하지 않음.

---

## 공통 리플 (채택 항목 반영 시 항상 함께)

1. `docs/convention/*.md` 본문 + `index.md` 요약
2. `docs/agents-core.md` (타 에이전트 전파 코어)
3. `docs/claudecode/enforcement.md` 매핑 + 관련 훅 주입 문구·리뷰어·커맨드
4. `bun run sync` (~/.claude/convention 미러) + 필요 시 `init-agents`·`install-claude-code` 재실행

## 결정 기록 (2026-07-10 확정 · 반영 완료)

- [x] **1 (전역 상태)**: **B안 채택** — zustand 조건부 허용(실수요 + acknowledge 기록), 서버 상태 store 반입 금지 유지, store 위치 규칙 신설. 이전 결정 "⑤ Context provider 한정·전역 라이브러리 금지"의 부분 번복으로 본 문서가 갱신 기록이다.
- [x] **2~12 (고도화)**: 전부 적용. **13 은 패스** — dayjs 는 사용자의 표준 라이브러리로 확정, Temporal 재검토 노트 불필요 (사용자 지시).
- [x] **14 (FE 테스트)**: 적용 — 단, DOM 환경을 happy-dom 으로 고정하지 않고 **상황에 맞게 선택** (사용자 보완).
- [x] **15·16·18·20·21·26**: 적용.
- [x] **17 (표준 스크립트)**: 적용 — 단 **lint 는 필수 아님**(거의 사용하지 않음, 사용자 보완). `typecheck`·`test` 만 제공 의무, lint 는 설정된 프로젝트에서만.
- [x] **19 (i18n)**: 적용 — 단일 표준 지정 대신 **조사 기반 선택지 표**(next-intl · react-i18next · Paraglide · Lingui · FormatJS)를 제시하고 프로젝트별로 그때그때 선택 + acknowledge 기록 (사용자 지시. 조사 출처: 2026 비교 자료 다수 — dev.to/erayg, tolgee.io, simplelocalize.io 등).
- [x] **22 (drizzle push)**: 적용 — 단 **이미 push 방식으로 운영되어 마이그레이션 추적이 불가능한 기존 DB 는 사용자에게 물어보고 push 유지 가능** (사용자 보완).
- [x] **23·24·25**: 보류 확정 — 문서에 흔적을 남기지 않음 (사용자 지시).
- [x] **27~35 (정합)**: 전부 적용 (30 은 FSD 트리로 수정, 31 은 withApiToken 예시 추가).

### 26 적용 방식 조정 (근본 해결 우선)

제안 원문은 "생성 스크립트로 단일화"였으나, 반영 시점 판단으로 방식을 조정했다: session-context(6줄 요약)·reinject(1줄 리마인더)·agents-core(코어 전문)는 **목적·granularity 가 서로 다른 텍스트**라 단일 소스 생성이 부자연스럽고, 실제 드리프트는 claudecode 문서(hooks.md)가 훅 문구를 재복제한 데서 발생하고 있었다(예: "any/unknown 금지" 오기). 따라서 **훅 스크립트를 주입 문구의 단일 출처로 명시하고 hooks.md 의 원문 복제를 제거**하는 방식으로 해결했다. 별도 생성 스크립트는 만들지 않았다.

### 8번 구현 노트 — 패턴 정밀화

최초 훅 패턴(`claude-session` 단순 포함)은 커밋 메시지에서 그 단어를 **언급**만 해도 오탐했다(반영 커밋 자체가 차단되며 field-test 로 확인). 실제 트레일러 형식만 잡도록 **`claude-session *:` 콜론 필수 매칭**으로 정밀화 — 실트레일러 차단(exit 2) / prose 언급 통과 / 정상 커밋 통과 3종 테스트 확인.

### 반영 완료 내역

- `docs/convention/*.md` 11개 + `docs/agents-core.md`(17.7KB < 32KiB 한도) + `docs/claudecode/`(guard-commit.sh·리뷰어 4·커맨드 2·output-style·enforcement.md·hooks.md·agents.md)
- 검증: guard-commit `bash -n` + 기능 테스트(Claude-Session 트레일러 차단 exit 2 / 정상 커밋 통과), 코드펜스 짝 정상, fsd 매트릭스 이모지 0, 구 표기(정렬 직렬화·POST.GET·rules/ 경로) 잔존 0
- 전파: `bun run sync`(~/.claude/convention 11개), `init-agents --global all`(codex·opencode·pi, 코어 18.3KB), `install-claude-code --global --all`(hooks 6·commands 8·agents 7·output-style·settings 병합)
- typecheck: 실행됨 — 기존 환경 문제(node_modules 불완전·tsc 버전)로 사이트 에러 존재하나 이번 변경(.md·.sh)과 무관 (PROCESS.md 기존 기록과 동일 상태)

### 관찰 (범위 밖 — 보고 후 사용자 지시로 처리)

- `docs/claudecode/hooks.md` · `agents.md` 3곳에 타 머신 절대경로 하드코딩이 기존부터 존재했음 — 사용자 지시(2026-07-10)로 레포 상대 경로 표기로 정리 완료.
