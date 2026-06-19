# PROCESS — 현재 세션 작업 상태

> **베이스 룰**: `CLAUDE.md` → `@docs/convention/` (ai-process.md · common.md · comments.md · frontend.md · fsd.md · backend.md · desktop.md)
> 이 파일은 [ai-process.md](./convention/ai-process.md) 규칙 #2·#14 에 따라 작업 상태를 기록한다.

---

## 작업: legacy/convention.md 9개 항목 → docs/convention/ 고도화 점검

legacy 원본과 현재 사이트 문서를 대조해, 고도화할 가치가 있는 항목만 반영한다.

- [x] **1. 함수 + 네이밍** — `common.md §3·§4` 에 이미 포함 (＋"2회 이상" 룰까지 확장). 추가 없음
- [x] **2. 타입(as const)** — `common.md §5` 가 legacy 의 superset (타입추론 §5.2, TS 유틸리티 §5.3 에 `as const` 포함). 추가 없음
- [x] **3. export** — `common.md §6` 동일. 추가 없음
- [x] **4. import** — `common.md §7` 동일. 추가 없음
- [x] **5. path alias → FSD** — `fsd.md` 에 "레이어 = alias" 매핑 섹션 신설, `common.md §8` 은 일반 원칙 + fsd 참조로 정리
- [x] **6. 스타일링** — `frontend.md §8` 에 이미 포함. 스타일링을 독립 소섹션으로 분리해 명확화
- [x] **7. DB 테이블/컬럼/필드명** — `backend.md §10.2` 에 이미 포함 (snake_case 컬럼 / camelCase 필드 / `$inferSelect`). 추가 없음
- [x] **8. 상태관리 → TanStack Query 사용지침** — 사용자 결정(새 문서 + BBlog·v5표준 둘 다 분석)에 따라 **`query.md` 신설**. BBlog 실제 패턴(QUERY_KEY·entities/*.client.ts·useQuery/useMutation·invalidateQueries) + v5 표준 권장 결합. 사이드바 `프론트엔드 · FSD · TanStack Query` 순으로 편입
- [x] **9. Electron** — `desktop.md §2` 에 이미 포함 (구조 + `EVENTS_TYPE` IPC, 더 상세). 추가 없음

---

## 추가 작업

- **ai-process.md 규칙 추가** (사용자 요청): §6.5 레퍼런스—공식 문서 우선(context7/웹, best practice) (원칙 15), §6.6 의존성·버전 관리(최신 버전, 충돌 시 사용자 확인) (원칙 16). §9 요약 체크리스트에도 반영.

---

## 작업: 로컬 CLAUDE.md 동기화 (sync-claude-md.ts 개선)

사용자 요청 — 완성된 컨벤션을 로컬 `~/.claude/CLAUDE.md` 에 정확히 반영.

- [x] **rule #16 준수**: Claude Code `@import` 동작을 공식 문서로 확인 (claude-code-guide). 마크다운 링크 미추적 → 문서별 개별 `@import` 필요, 다중 import 가능, `@~/` 지원, 재귀 4 hop, 와일드카드 미지원.
- [x] **복사 기반으로 변경**: `docs/convention/*.md` → `~/.claude/convention/` 미러링 후, 관리 블록에서 9개 문서를 `@~/.claude/convention/<file>.md` 로 개별 import. (레포 경로 독립)
- [x] **add/replace CLI 선택**: 기존 `@convention.md` 감지 시 대화형 `[a]/[r]/[c]` 프롬프트 유지. 교체는 옛 컨벤션 섹션 통째 제거(중복 헤딩 방지).
- [x] **.bak 백업** 유지, **사본 매 실행 갱신** (CLAUDE.md 동일해도 복사).
- [x] README sync 섹션 + 컨벤션 표(ai-process·query 누락분) 갱신.
- [x] **원격 설치 스크립트**: `install-files/install.sh` 추가. `bash -c "$(curl -fsSL .../install-files/install.sh)"` 로 클론 없이 설치 (curl+python3). 9개 문서 → `~/.claude/convention/`, CLAUDE.md `@import` 블록 주입, `/dev/tty` 로 add/replace 선택, `.bak` 백업. file:// 베이스로 교체/추가/멱등/신규생성 전 케이스 로컬 검증 완료.
- [x] **배포**: git init(main) + commit → GitHub `B-HS/llm-rules` **public** 생성·push. `legacy/` 는 사용자 결정으로 제외(.gitignore, 로컬엔 보존). Pages Source=GitHub Actions 활성화. 배포 워크플로 성공. 라이브: https://b-hs.github.io/llm-rules/ , raw install.sh·문서·Pages 200 확인.
- [ ] **실제 적용**: 사용자가 직접 설치 명령 실행해 확인 예정 (대화형 [a]/[r]/[c]).

---

## 후속 확인 (rule #4) — 해결됨

- **쿼리 훅 위치 통일**: 사용자 결정 → **`*.query.ts`** 로 통일. (BBlog 가 `*.client.ts` 를 쓰는 건 `serverFetcher` 분리 때문인 특수 케이스이며, 개념상 클라이언트 쿼리 훅 = `.query.ts`.) `query.md §3` 을 `entities/<entity>.query.ts` 기준으로 수정해 `fsd.md §4` 와 일치시킴.

---

## 작업: ai-process 가이드라인 확장 (다른 코딩 에이전트 대응)

Claude 외 에이전트는 컨벤션이 자동 주입되지 않으므로, AI 작업 규칙을 더 명시적으로 보강한다. 사용자 결정: 상황별 지적 폴더 = `docs/feedback`, 항상-적용 교훈 = 기존 `docs/memory` + 컨벤션 승격(별도 learning 폴더 미신설).

- [x] **§0.1 커뮤니케이션 (원칙 17)** — 한국어·존댓말·간결, 미사여구 금지. §0 에 Claude 외 에이전트 룰 파일 명시 로드 안내 추가.
- [x] **§3.1 한 번에 모든 경우의 수 (원칙 18)** — 결정 지점을 한 묶음으로 질문. 검증 절차가 길면 `docs/quality-assurance` 체크리스트로 안내.
- [x] **§5 긴 컨텍스트 준수** — 대화가 길어져도 컨벤션 무조건 유지 (원칙 6 강화).
- [x] **§6.2 HACK·TRICK·우회 금지** — 키워드 명시, 근본 해결 (원칙 8 강화).
- [x] **§6.7 환경 일관성 (원칙 19)** — 프로젝트가 가진 환경 안에서만 해결. Drizzle 있는데 mysql 직접 호출 금지 등.
- [x] **§7 신규 프로젝트 스택·환경 합의 (원칙 20)** — 구현 전 런타임·패키지매니저·FE/BE·DB·배포를 먼저 확정. (검증→§8, 저장→§9, 요약→§10 으로 renumber)
- [x] **§9 저장 분류** — `docs/feedback`(원칙 21)·`docs/quality-assurance`(원칙 22) 행 추가 + 9.1/9.2 포맷 정의.
- [x] **§10 요약 체크리스트** — 신규 항목 6개 반영.
- [x] **index.md** — 문서 구조 표 ai-process 행 갱신 + "핵심 원칙 요약" 에 "AI 작업" 소섹션 신설.
- [x] **검증** — 섹션·원칙 번호 일관성, 교차참조 점검 완료. 새 .md 미추가라 sync DOC_ORDER 영향 없음. 사용자에게 추가 가이드라인 6종 의견 제시 완료.

---

## 작업: 추가 가이드라인 2~5 구현 + git/security 신규 문서

사용자 채택: 2(안티패턴+최소변경)·3(Conventional Commits)·4(보안)·5(의존성 다이어트+버그 재현). 6(접근성) 패스. 1(AGENTS.md/Codex·Cursor)은 마지막.

- [x] **git.md 신설** — Conventional Commits v1.0.0 공식 스펙(WebFetch 확인) 기반. 형식·type 표·BREAKING CHANGE·브랜치·커밋/푸시 안전 규칙. type 영어/description 한국어.
- [x] **security.md 신설** — 시크릿·환경변수, 입력 검증(Zod 경계), Injection·XSS, 인증/인가, 에러·로그, 의존성. backend/frontend/desktop 교차참조.
- [x] **ai-process §6.6 보강** — 의존성 다이어트(추가 전 기존/표준 확인 + 근거).
- [x] **ai-process §6.8 신설 (원칙 23)** — 변경 최소화(minimal diff).
- [x] **ai-process §8 보강** — 버그 재현 우선(실패 테스트 먼저).
- [x] **ai-process §10 신설 (원칙 24)** — "절대 하지 말 것" 안티패턴 통합 리스트. 요약은 §11 로 재배치.
- [x] **동기화 4지점 갱신** — plugin ORDER/LABELS, sync DOC_ORDER, install.sh DOCS(+개수 동적화). 순서: …comments→security→git→frontend…
- [x] **index.md** — 문서 구조 표·디렉토리·핵심 원칙(보안·Git 소섹션) 갱신.
- [x] **검증** — 4지점 == 실제 파일 11개 일치. `sync --dry-run`: 11개 @import·케이스 B 멱등. `typecheck` exit 0.
- [x] **1. AGENTS.md / .cursor/rules 배포** — 완료. 공식 문서(WebFetch) 확인: AGENTS.md 는 프로젝트 단위·import 없음 → inline 필수, Cursor 는 .mdc(frontmatter) 또는 AGENTS.md. 사용자 결정: AGENTS.md + .cursor/rules 둘 다 / bun + curl 둘 다 / 컨벤션 전문 inline.
    - `scripts/init-agents.ts` 신설 — 대상(--target, 기본 CWD)에 AGENTS.md(관리 마커 멱등, 기존 보존, .bak) + `.cursor/rules/llm-rules.mdc`(alwaysApply, 덮어쓰기) 생성. --dry-run/--no-cursor/--no-agents.
    - `install-files/init-agents.sh` 신설 — curl 원격판(GitHub raw → CWD). LLM_RULES_TARGET/NO_CURSOR/NO_AGENTS.
    - `package.json` scripts.init-agents 추가. README "다른 에이전트" 섹션 추가.
    - 검증: bun 생성(AGENTS.md 80KB·마커·11문서)·멱등 재실행·사용자 콘텐츠 보존(마커 1쌍)·curl(file:// 로컬) 전부 통과. opencode 제외(CLAUDE.md fallback).
