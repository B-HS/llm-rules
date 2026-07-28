# 컨벤션 → 강제 메커니즘 매핑 (Claude Code 에디션)

> 이 문서는 `docs/convention/*.md` 의 prose 규칙을 **Claude Code 에디션이 어떤 메커니즘으로 강제하는지** 1:1 로 매핑한 마스터 표입니다.
> CC 에디션은 prose 를 복제하지 않습니다. prose 는 SSOT 로 그대로 두고, 그 위에 **결정론(hook) · 경고(hook) · 사람/에이전트 점검(슬래시·서브에이전트) · 환경 차단(permission)** 레이어만 얹습니다.

---

## 0. 메커니즘 범례 · 강제 등급

각 규칙은 아래 메커니즘 중 하나 이상으로 매핑됩니다.

| 표기 | 메커니즘 | 동작 |
|------|----------|------|
| `hook:guard-commit` | PreToolUse(Bash, `git commit*`) | `exit 2` 로 커밋 **차단**. auto-commit 합의 레포는 전 검사 통과 시 권한 프롬프트 자동 승인 |
| `hook:guard-push` | PreToolUse(Bash, `git push*`) | force push(플래그 위치 무관) `exit 2` **차단**. auto-push 합의 레포는 비-force 푸시 권한 프롬프트 자동 승인 |
| `hook:scan-secrets` | PreToolUse(Edit\|Write\|MultiEdit) | 시크릿 패턴이면 `exit 2` 로 편집 **차단** |
| `hook:lint-edit (HARD)` | PostToolUse(Edit\|Write\|MultiEdit) | `{"decision":"block"}` 로 LLM 에 **수정 요구** |
| `hook:lint-edit (SOFT)` | PostToolUse(Edit\|Write\|MultiEdit) | `{"systemMessage":...}` 로 **경고만**(차단 안 함) |
| `hook:verify-on-stop` | Stop | 변경 TS/JS 있을 때 `tsc --noEmit` 실패 시 `block` |
| `hook:session-context` | SessionStart | 컨벤션 요약 + `docs/PROCESS.md` 주입, `docs/` 보장 |
| `hook:reinject-rules` | UserPromptSubmit | 매 프롬프트마다 "절대 금지" 안티패턴 재주입 |
| `permission` | settings.json `allow`/`ask`/`deny` | 도구 호출을 **자동허용 / 확인질문 / 차단** |
| `cmd:<name>` | 슬래시 커맨드 `/llm-rules:<name>` | 사용자가 명시 호출하는 점검·기록 |
| `agent:<name>` | 서브에이전트 | LLM 판단이 필요한 리뷰(어휘 검사로 못 잡는 것) |
| `prose` | 컨벤션 .md | 강제 불가, 문서로만 유지(드리프트 방지는 reinject/session-context) |

**강제 등급 3분류** (각 표의 "등급" 열):

- **결정론 졸업** — hook/permission 이 기계적으로 차단·검증. LLM 이 무시할 수 없습니다.
- **경고만** — SOFT hook 이 경고하지만 차단하지 않음. 오탐 가능성 때문에 사람이 판단.
- **prose 유지** — 코드 패턴으로 잡기 어려워 문서·서브에이전트·재주입으로만 유지.

> 결정론 hook 의 정확한 패턴·예외(fail-open 등)는 `docs/claudecode/assets/hooks/*.sh` 와 `settings.json` 이 단일 출처입니다. 아래 표는 그 동작을 그대로 기술합니다.

---

## 1. index.md — 진입점 · 요약

`index.md` 자체는 규칙 원본이 아니라 다른 문서로의 라우팅·요약입니다. CC 에디션에서는 그 "요약(자주 어기는 핵심)"이 **세션 시작·매 프롬프트에 주입**되어 컨텍스트 드리프트를 막습니다.

| 규칙 (요약 항목) | → 메커니즘 | 등급 |
|---|---|---|
| 자주 어기는 핵심 규칙 요약 상시 인지 | `hook:session-context`(시작/재개 시 핵심 6줄 주입) | 결정론 졸업(주입은 기계적) |
| 긴 컨텍스트에서도 컨벤션 유지 | `hook:reinject-rules`(매 프롬프트 안티패턴 1줄 재주입) | 결정론 졸업(주입은 기계적) |
| 적용 우선순위(COMMON 전제 + FE/BE) | `prose` | prose 유지 |
| 문서 라우팅·디렉토리 구조 | `prose` | prose 유지 |

---

## 2. ai-process.md — AI 작업 프로세스

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §0.1 간결·존댓말 커뮤니케이션 | output-style `llm-rules`(한국어·존댓말·간결) | 경고만(스타일은 기계 차단 불가, 스타일 파일로 유도) |
| §0.1 이모지·아스키아트 금지(응답·코드·UI·커밋) | output-style + `hook:reinject-rules` + guard-commit(🤖 등 커밋 차단) | 경고만(커밋 트레일러만 결정론) |
| §6.1 실제 파일 > 메모리·문서 우선 | `prose` | prose 유지 |
| §6.8 dead code — 내 변경분 미사용 코드 제거·주석 보관 금지 | `agent:convention-reviewer` | prose 유지 |
| §1·§14 모든 작업은 `docs/` 기반, `docs/` 보장 | `hook:session-context`(`mkdir -p docs`), `cmd:save-docs` | 결정론 졸업(디렉토리 보장) / 나머지 prose |
| §2 `docs/PROCESS.md` 체크리스트 운용 | `cmd:process`, `hook:session-context`(PROCESS.md 앞부분 주입), `hook:reinject-rules`("스텝마다 docs/PROCESS.md 체크 갱신") | 경고만(주입은 결정론, 작성은 사람/LLM) |
| §3 멈춤 — 의사결정 필요 시 확인 | `prose` + `hook:reinject-rules`("모호하면 1줄 객관식 질문"), `hook:session-context`(작업 개시 프로토콜 1) | prose 유지(주입으로 보강) |
| §3.1 한 번에 모든 경우의 수를 묻기 | `prose` | prose 유지 |
| §6.1 코드베이스 먼저 파악 | `prose` | prose 유지 |
| §6.2 hack/우회 금지 — 근본 해결 (`HACK`/`FIXME`/`@ts-ignore`/`eslint-disable` 금지, `@ts-expect-error` 만 조건부) | `hook:lint-edit (SOFT)` + prose(§6.2 명문화) | 경고만(주석/우회 마커는 오탐 가능) |
| §6.3 짧고 간결 / §6.4 정확한 네이밍 | `prose` | prose 유지 |
| §6.5 공식 문서(context7/웹) 우선 | `prose` | prose 유지 |
| §6.6 의존성 최신·충돌 시 확인 | `permission`(`npm install`/`pnpm add`/`yarn add` → `ask`) | 결정론 졸업(설치는 확인질문) |
| §6.7 프로젝트 환경 안에서 해결(예: Drizzle 있으면 raw SQL 금지) | `agent:backend-convention-reviewer` | prose 유지(에이전트 점검) |
| §6.8 최소 변경(minimal diff) | `prose` | prose 유지 |
| §7 신규 프로젝트 스택·환경 먼저 합의 | `prose` + `hook:session-context`(작업 개시 프로토콜 2 — 스택 장단점 요약 합의) | prose 유지(주입으로 보강) |
| §8·§8.1 검증 후 다음 스텝(최소 기계 검증 사다리 — 전제: 프로젝트가 `typecheck`·`test` 스크립트 제공, lint 는 설정된 경우만) | `hook:verify-on-stop`(`tsc --noEmit`, 옵션 테스트), `cmd:verify` — 타 에이전트는 §8.1 prose 로 직접 수행 | 결정론 졸업(타입체크 실패 시 block) |
| §1.1 세션 시작 시퀀스(PROCESS.md 먼저 읽기) | `hook:session-context` — 타 에이전트는 §1.1 prose 로 직접 수행 | 결정론 졸업(주입은 기계적) |
| §9 결과물 분류 저장(memory/history/bug/acknowledge/feedback/QA) | `cmd:save-docs`, `cmd:log-feedback`, `hook:reinject-rules`("작업 끝나면 docs/ 분류 저장") | prose 유지(기록은 사람 명령) |
| §10 안티패턴(절대 금지) 상시 인지 | `hook:reinject-rules` | 결정론 졸업(주입은 기계적) |

---

## 3. common.md — 공통 컨벤션

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1 TS strict / Bun 런타임 | `permission`(`bun`/`bunx`/`bun test`/`tsc` → `allow`) | 경고만(Bun 명령만 자동허용으로 유도) |
| §3.1 arrow function 만 (`function` 키워드 금지) | `hook:lint-edit (SOFT)` | 경고만(타입 선언·메서드 등 오탐 가능) |
| §3.3 "2회 이상"일 때만 공통화(조기 추상화 금지) | `agent:convention-reviewer` | prose 유지(중복 판단은 LLM) |
| §3.2 async/await 만(`.then` 체이닝 금지) | `agent:convention-reviewer` | prose 유지 |
| §3.4 early return·삼항 중첩 금지 / §3.5 const 우선·비파괴 연산·`??` | `agent:convention-reviewer` | prose 유지 |
| §4.1 매직넘버 금지(상수화) | `agent:convention-reviewer` + `hook:reinject-rules` | prose 유지(주입으로 보강) |
| §9 날짜·시간 UTC 기준(기존 DB 는 tz 확인)·`dayjs` 기본 | `agent:backend-convention-reviewer` | prose 유지 |
| §10 라이브러리 프로젝트 — isomorphic 코어(환경 전역 금지) | `prose` | prose 유지 |
| §5.2 타입 추론 우선(자명한 반환/변수 타입 미명시) | `agent:type-utility-reviewer` | prose 유지 |
| §5.3 TS 유틸리티 타입으로 원본에서 유도 | `agent:type-utility-reviewer` | prose 유지 |
| §5.4 `any` 금지·`unknown` 경계한정 | `agent:type-utility-reviewer` + `hook:reinject-rules` | prose 유지(주입으로 보강) |
| §5.5 `enum` 금지 — `as const` + union | `agent:type-utility-reviewer` + `hook:reinject-rules` | prose 유지(주입으로 보강) |
| §6 named export 기본(default 는 page/layout 만) | `hook:lint-edit (SOFT)`(`export default` + page/layout/app/pages 예외) | 경고만 |
| §2 Prettier 포맷 | `hook:lint-edit`(편집 후 `prettier --write` 자동 실행) | 결정론 졸업(있으면 자동 포맷) |
| §4 네이밍 규칙 | `agent:convention-reviewer` | prose 유지 |
| §7 import 순서 / §8 path alias | `prose` (prettier/eslint 가 있으면 일부 정렬) | prose 유지 |
| §11 로그(디버그 `console.log` 커밋 금지) | `agent:convention-reviewer` | prose 유지 |

---

## 4. comments.md — 주석 컨벤션

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1 코드 주석 금지(`//`, `/* */`) | `hook:lint-edit (SOFT)`(주석 패턴 검출, `/**` JSDoc 있으면 제외) | 경고만(문자열·URL `//` 오탐 때문에 SOFT) |
| §2 유일 예외 JSDoc(영어) | `hook:lint-edit (SOFT)`(JSDoc `/**` 은 주석 경고에서 면제) | 경고만 |
| §3 설명은 `docs/` 로 | `hook:session-context`(`docs/` 보장), `cmd:save-docs` | 결정론 졸업(디렉토리 보장) / 나머지 prose |

---

## 5. security.md — 보안 · 시크릿

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1 시크릿 코드 하드코딩 금지(AKIA…/gh[pousr]_…/sk-…/PRIVATE KEY/xox…) | `hook:scan-secrets`(고신뢰 패턴 시 `exit 2` 차단, `.md/.txt` 제외) | 결정론 졸업(편집 차단) |
| §1 백엔드 env 는 `getEnv()` 만(`process.env` 직접접근 금지) | `hook:lint-edit (HARD)`(backend 경로 `process.env.` → block) | 결정론 졸업(백엔드 경로) |
| §1·§1.1 `.env` 보호(에이전트 읽기/쓰기/출력/커밋 금지) | `permission`(`.env`·`.env.*`·`secrets/**` Read/Write/Edit → `deny`), `hook:guard-commit`(스테이지 `.env`/`secrets`/`.pem`/`id_rsa` 차단) — 타 에이전트는 §1.1 prose | 결정론 졸업 |
| §2 외부 입력 경계 Zod 검증 | `agent:backend-convention-reviewer`, `agent:security-reviewer` | prose 유지 |
| §2 파일 업로드 MIME·확장자·크기 화이트리스트 검증 | `agent:security-reviewer` | prose 유지 |
| §3 Injection 방지(raw SQL 금지, path/command injection) | `agent:security-reviewer` | prose 유지 |
| §4 XSS — `dangerouslySetInnerHTML` 은 sanitize 와 함께만(prose 명문화) | `hook:lint-edit (SOFT)`(sanitize/DOMPurify 없으면 경고) | 경고만 |
| §5 인가는 서버 재확인(클라 의존 금지) | `agent:security-reviewer`, `agent:backend-convention-reviewer` | prose 유지 |
| §5 남용 가능한 공개 엔드포인트 rate limit | `agent:security-reviewer` | prose 유지 |
| §6 에러 `details` 프로덕션 비노출, 로그에 시크릿 금지 | `agent:security-reviewer` | prose 유지 |
| §7 의존성 최신·취약점 점검 | `permission`(설치 명령 `ask`) | 경고만(설치 확인) |

---

## 6. git.md — Git · 커밋 (Conventional Commits)

> 이 문서의 규칙 대부분은 `hook:guard-commit` 으로 **결정론 졸업**합니다. 파싱 실패는 fail-open(허용)이며, `-F`(파일)/에디터 커밋의 헤더 검증은 생략됩니다.

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1·§2 Conventional Commits 헤더(`<type>(scope)?!?: 설명`, type ∈ feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert) | `hook:guard-commit`(첫 `-m` 헤더 정규식 위반 시 `exit 2`) | 결정론 졸업 |
| §1.1 언어·스타일 히스토리 우선(git log 확인, 섞이면 질문 + `docs/acknowledge` 기록 후 적용) | `prose` | prose 유지(언어 판단은 LLM) |
| §3 BREAKING CHANGE(`!` 표기) | `hook:guard-commit`(헤더 정규식이 `!?` 허용) | 결정론 졸업(허용 통과) |
| §5 브랜치 네이밍(`<type>/<요약>`) | `prose` | prose 유지 |
| §6 사용자 요청 전 커밋·푸시 금지(자동 커밋/푸시 합의 레포 예외) | `permission`(`git commit`/`git push`/`merge`/`rebase` → `ask`), `hook:guard-commit`/`hook:guard-push`(`git config llm-rules.auto-commit`/`auto-push` 합의 레포는 검사 통과 시 자동 승인), `hook:session-context`(작업 개시 프로토콜 5 — 미설정 레포 첫 확인 때 자동/수동 확정·acknowledge 기록) | 결정론 졸업(확인질문/합의 승인) |
| §6 `main`/`master` 직접 커밋 금지 | `hook:guard-commit`(현재 브랜치 main/master 면 `exit 2` — 합의된 레포는 `git config llm-rules.allow-main true` 또는 `LLM_RULES_ALLOW_MAIN=1` 로 이 검사만 생략) | 결정론 졸업 |
| §6 시크릿·빌드 산출물 커밋 금지(`dist/`/`node_modules/`/`.env`/`.pem`/`id_rsa`) | `hook:guard-commit`(스테이지 검사 차단), `permission`(`git add .env` deny) | 결정론 졸업 |
| §6.1 `Co-Authored-By`/Claude 트레일러·`Claude-Session:` 세션 링크 금지(author 사용자 단독) | `hook:guard-commit`(`co-authored-by\|generated with\|🤖\|claude<\|noreply@anthropic\|claude-session *:` 시 `exit 2` — 콜론 필수 매칭이라 prose 언급은 오탐 안 함) | 결정론 졸업 |
| §6 `git push --force`/`-f` 금지 | `permission`(`git push --force`/`-f` → `deny` — 접두 매칭), `hook:guard-push`(플래그 후치 변형까지 `exit 2`, `--force-with-lease` 는 차단 없이 확인 유지) | 결정론 졸업 |
| §6 선별 스테이징(`git add -A`/`.` 금지)·커밋 전 status/diff 확인 | `prose` | prose 유지 |
| §6 논리 단위 1커밋 | `prose` | prose 유지 |

---

## 7. frontend.md — 프론트엔드 (Next.js / React)

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §4 `useCallback`/`useMemo` 금지(React Compiler 위임) | `hook:lint-edit (HARD)`(`use(Callback\|Memo)(` → block), `hook:reinject-rules` | 결정론 졸업 |
| §3.1 `FC<Props>` 패턴 | `agent:convention-reviewer` | prose 유지 |
| §3.2 본문 작성 순서(useRef→useState→로직→useEffect/hooks, useEffect 는 return 바로 위) | `agent:convention-reviewer` | prose 유지 |
| §3.3 useEffect 최소화(외부 동기화만 — 파생값 렌더 계산·핸들러 우선) | `agent:convention-reviewer` | prose 유지 |
| §5 JSX inline(2줄 미만 inline 선호), `&&` 0-함정, key=안정 id(index 금지) | `agent:convention-reviewer` | prose 유지 |
| §8.5 접근성 최소선(시맨틱·button/a 구분·alt·label) | `agent:convention-reviewer` | prose 유지 |
| §2 서버/클라 분리, `'use client'` 명시 | `prose` | prose 유지 |
| §6 상태 사다리(서버=TanStack Query, Context 는 provider 성격 저빈도 값만, 그 외 전역 클라이언트 상태는 zustand 조건부 — 임의 라이브러리·서버 상태 store 반입 금지) | `agent:tanstack-query-reviewer` | prose 유지 |
| §7.1 Server Actions(`entities/*.action.ts` + `'use server'` + Zod 재검증 + revalidate/invalidate) | `agent:security-reviewer`(입력 검증), `prose` | prose 유지 |
| §8.1 스타일(Tailwind/shadcn/CVA/`cn()`) | `prose` | prose 유지 |
| §8.2 에러 피드백 `sonner` toast | `prose` | prose 유지 |
| §8.4 폼(react-hook-form + zodResolver + shadcn Form) | `agent:convention-reviewer` | prose 유지 |
| §8.6 i18n(프로젝트별 선택 + `docs/acknowledge` 기록, 메시지 카탈로그) | `prose` | prose 유지 |
| §9 이미지 `next/image` 기본 | `prose` | prose 유지 |
| §11 테스트(`bun:test` + Testing Library, E2E Playwright 합의) | `permission`(`bun test` allow), `prose` | prose 유지 |
| default export 는 page/layout 만 | `hook:lint-edit (SOFT)` | 경고만 |

---

## 8. fsd.md — 프론트엔드 아키텍처 (필수)

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §2 의존성 방향(app→pages→widgets→features→entities→shared, 역방향 금지) | `agent:fsd-dependency-reviewer`, `cmd:audit-fsd`, `hook:reinject-rules`("FSD 의존 방향 위→아래") | prose 유지(import 그래프 판단은 에이전트) |
| §2 features 는 비즈니스 로직 X / widgets 부터 fetch·query | `agent:fsd-dependency-reviewer` | prose 유지 |
| §2 entities 전역 import 가능 / shared 는 page 제외 어디서나 | `agent:fsd-dependency-reviewer` | prose 유지 |
| §2.1 배치 결정 트리(entities/shared/widgets/features 판단) | `agent:fsd-dependency-reviewer` | prose 유지 |
| §3 1파일 1 컴포넌트(SFC) | `agent:fsd-dependency-reviewer` | prose 유지 |
| §4 barrel(index.ts) 금지 — 파일 직접 경로 import | `agent:fsd-dependency-reviewer` | prose 유지 |
| §5 path alias = 레이어 | `prose` | prose 유지 |

---

## 9. query.md — TanStack Query (v5)

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1 기본 `staleTime: 60_000` 명시 | `agent:tanstack-query-reviewer` | prose 유지 |
| §2 `QUERY_KEY` 중앙관리(항상 배열, 도메인 계층 키 + 파라미터 객체 그대로 — v5 결정적 해싱, 인라인 키 금지) | `agent:tanstack-query-reviewer`, `cmd:audit-query` | prose 유지 |
| §3 쿼리 훅 위치(`entities/<entity>.query.ts`, `'use client'`) | `agent:tanstack-query-reviewer` | prose 유지 |
| §4 `queryOptions` 팩토리 + `useQuery`(queryKey=QUERY_KEY, 타입 자동 추론, `enabled`) | `agent:tanstack-query-reviewer` | prose 유지 |
| §5 `useMutation`(`onSuccess` 무효화 + toast, `onError` toast, 무효화는 entities 훅 책임 기본) | `agent:tanstack-query-reviewer` | prose 유지 |
| §6 서버 프리페치(`prefetchQuery` + `HydrationBoundary`, 요청별 QueryClient) | `agent:tanstack-query-reviewer` | prose 유지 |
| §7 캐시 직접조작 대신 `invalidateQueries`, `staleTime`/`gcTime` 명시 | `agent:tanstack-query-reviewer` | prose 유지 |

---

## 10. backend.md — 백엔드 (Hono.js)

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §6.1 `throw new Error` 금지 — `createAppError('CODE')` | `hook:lint-edit (HARD)`(backend 경로 `throw new Error(` → block) | 결정론 졸업(백엔드 경로) |
| §14 `process.env` 직접접근 금지 — `getEnv()` | `hook:lint-edit (HARD)`(backend 경로 `process.env.` → block) | 결정론 졸업(백엔드 경로) |
| §1 계층형 구조(route→service→ServiceDb→Drizzle) | `agent:backend-convention-reviewer`, `cmd:audit-backend-domain` | prose 유지 |
| §2 Factory DI(`createXxxService`, `ReturnType` 타입) | `agent:backend-convention-reviewer` | prose 유지 |
| §2.2 Drizzle 쿼리는 compose 에 격리 | `agent:backend-convention-reviewer` | prose 유지 |
| §4 Route 팩토리 + OpenAPI, 모든 핸들러 `withErrorHandling` | `agent:backend-convention-reviewer` | prose 유지 |
| §5 DTO 는 Zod 스키마 + `z.infer` 타입(공통은 `dto/common.ts`, boolean 쿼리는 Zod 4 `z.stringbool()`/Zod 3 enum+transform — `z.coerce.boolean()` 금지) | `agent:type-utility-reviewer`, `agent:backend-convention-reviewer` | prose 유지 |
| §6 에러 3-파일 중앙화(code/message/error) | `agent:backend-convention-reviewer` | prose 유지 |
| §7 HOF(`withErrorHandling`/`withAuth`/`withAdmin`/`withApiToken`) | `agent:backend-convention-reviewer` | prose 유지 |
| §8 응답 헬퍼(`successResponse`/`paginatedResponse`/`errorResponse`) | `agent:backend-convention-reviewer` | prose 유지 |
| §10 Drizzle(싱글톤, snake_case 컬럼/camelCase 필드, `$inferSelect`) | `agent:backend-convention-reviewer` | prose 유지 |
| §10.4 마이그레이션 운영(`generate`→`migrate`, 프로덕션 `push` 금지 — push 운영 중 DB 는 질문 후 결정) | `agent:backend-convention-reviewer` | prose 유지 |
| §13 테스트(`bun:test`, 한국어 설명) | `permission`(`bun test` allow), `hook:verify-on-stop`(`LLM_RULES_STOP_TEST=1` 시) | 경고만(테스트는 옵션) |

---

## 11. desktop.md — 데스크톱 앱 (Electron / Tauri)

| 규칙 | → 메커니즘 | 등급 |
|---|---|---|
| §1 IPC 는 타입 계약(`EVENTS_TYPE` 단일 출처, `Parameters`/`ReturnType` 유도) | `agent:desktop-security-reviewer` | prose 유지 |
| §1 권한 최소화(preload bridge 로만 노출) | `agent:desktop-security-reviewer` | prose 유지 |
| §2.3 보안 기본값(`contextIsolation: true`·`nodeIntegration: false`·`sandbox: true`, `contextBridge` 만, `shell.openExternal` 검증) | `agent:desktop-security-reviewer` | prose 유지 |
| 렌더러 = frontend 규칙 그대로 적용 | frontend.md 의 메커니즘 전부 상속(`hook:lint-edit` 등) | 상속 |
| §2 Electron 구조 / §3 Tauri(예정) | `prose` | prose 유지 |

---

## 12. 마스터 요약 — 무엇이 졸업했고 무엇이 남았나

### 결정론으로 졸업한 규칙 (hook/permission 이 기계적으로 강제)

- **커밋 전부**(git.md §1·§2·§3·§6 + Co-Author 금지 + main 직접커밋 + 스테이지 시크릿) → `hook:guard-commit` + `permission`. 자동 커밋/푸시 합의 레포(`llm-rules.auto-commit`/`auto-push`)는 검사 통과 시 ask 자동 승인.
- **force push**(git.md §6 — 플래그 후치 변형 포함) → `hook:guard-push` + `permission`(deny 는 접두 매칭 보조).
- **시크릿 하드코딩**(security §1) → `hook:scan-secrets`(편집 차단).
- **백엔드 `throw new Error`·`process.env` 직접접근**(backend §6.1·§14) → `hook:lint-edit (HARD)`.
- **`useCallback`/`useMemo`**(frontend §4) → `hook:lint-edit (HARD)`.
- **Prettier 포맷**(common §2) → `hook:lint-edit` 자동 실행.
- **타입체크 검증**(ai-process §8) → `hook:verify-on-stop`.
- **`.env`/`secrets` 접근·`git push --force`·설치 명령** → `permission`(deny/ask).
- **컨벤션 상시 인지**(index 요약, ai-process §10) → `hook:session-context` + `hook:reinject-rules`.

### 경고만 (SOFT — 오탐 가능, 사람이 판단)

- `function` 키워드(common §3.1), 코드 주석(comments §1), page/layout 외 `export default`(common §6), `HACK`/`FIXME`/`@ts-ignore`(ai-process §6.2), sanitize 없는 `dangerouslySetInnerHTML`(security §4).

### prose 로 남는 규칙 (코드 패턴으로 못 잡음 → 서브에이전트·슬래시·재주입으로 보강)

- **구조·아키텍처 판단**: FSD 의존 방향(fsd 전부), "2회 이상" 공통화(common §3.2), 컴포넌트 작성 순서·JSX inline(frontend), 백엔드 계층·DI·HOF·에러 중앙화(backend 대부분), TanStack Query 사용(query 전부), 타입 유도(common §5.3) → 각 `agent:*-reviewer` + `cmd:audit-*`.
- **작업 프로세스**: docs 기반·PROCESS 체크리스트·멈춤·근본해결·신규 스택 합의·결과 분류 저장(ai-process 대부분) → `cmd:process`/`save-docs`/`log-feedback` + `hook:reinject-rules` 보강.

> 결론: **"기계가 0/1 로 판정 가능한 것"은 hook·permission 으로 결정론 졸업**시키고, **"맥락·구조·의도 판단이 필요한 것"은 서브에이전트·슬래시커맨드로 사람-루프에 남기되 prose(SSOT)는 그대로 유지**합니다. 세션 시작·매 프롬프트 주입(`session-context`/`reinject-rules`)이 그 둘 사이의 드리프트를 메웁니다.