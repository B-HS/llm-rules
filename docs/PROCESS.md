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

---

## 작업: Claude Code 전용 에디션 (docs/claudecode/) + 설치 메뉴

사용자 요청 — 컨벤션 각 .md 에서 언급 가능한 Claude Code 기능(hook·command·subagent·settings·output-style)을 전부 활용하는 CC 전용 docs 를 `docs/claudecode/` 에 완성하고, CLI 설치 메뉴로 설치 가능하게. 선행: 13개 .md 전수 검사(hook-enforce/augment/other/prose 분류) + 공식 hooks 스펙(code.claude.com/docs/en/hooks) WebFetch 검증(에이전트 초안의 camelCase·blockingMode·exit code 오류 교정).

- [x] **자산(assets) — 직접 작성·검증**: `docs/claudecode/assets/settings.json`(PascalCase 이벤트, matcher=도구명, `if`로 git 한정, permissions allow/ask/deny) + hook 6종(guard-commit·lint-edit·scan-secrets·verify-on-stop·session-context·reinject-rules) + output-style(llm-rules). hook 은 `bash -n` 문법 + 기능 스모크테스트 통과(Co-Authored-By/형식위반/main 차단, useCallback·throw new Error block, 시크릿 차단, .md no-op, JSON 유효).
- [x] **CLI 설치 메뉴**: `scripts/install-claude-code.ts`(대화형 — 위치 global/project + 항목 다중선택, settings.json 비파괴 병합·멱등·.bak, hook 경로 자동치환) + `install-files/install-claude-code.sh`(curl 원격, /dev/tty 메뉴, python JSON 병합). `package.json` scripts.install-claude-code 추가. 검증: dry-run·실제설치·재실행 멱등(중복 0)·글로벌($HOME)/프로젝트($CLAUDE_PROJECT_DIR) 경로·valid JSON 전부 통과.
- [x] **콘텐츠 — 워크플로 21개 병렬 생성 후 검증·기록**: slash command 8(/llm-rules:audit-conventions·audit-fsd·audit-backend-domain·audit-query·verify·process·save-docs·log-feedback) + subagent 7(convention·fsd-dependency·type-utility·backend-convention·security·tanstack-query·desktop-security reviewer) + 문서 6(index·enforcement·hooks·commands·agents·settings). 구조 검증(frontmatter·H1) + camelCase 이벤트명 오염 0 확인. enforcement.md 가 컨벤션 11개 .md 별 규칙→메커니즘 매핑(§1~§11) + 마스터 요약.
- [x] **통합 테스트**: .ts·curl 둘 다 full 설치(6 hook+x / 8 cmd / 7 agent / output-style / valid settings) 통과.
- [x] **README** — "Claude Code 전용" 섹션 + dev 스크립트 추가.
- [ ] **후속(미실행)**: ① 사이트(vite-plugin-docs)는 `docs/convention/*.md` 만 글로빙 → claudecode 를 사이트에 노출하려면 플러그인 ORDER/LABELS·CONVENTION_DIR 확장 필요(보류). ② 사용자 직접 설치 실행 확인. ③ node_modules 불완전(tsc 부재)로 사이트 typecheck 미실행 — 기존 환경 상태, 변경 영향 없음(scripts/ 는 tsconfig include 밖).

---

## 작업: 컨벤션 프롬프트 고도화 — 에이전트 이식성 + 모호점 해소 (완료)

사용자 요청 — Fable 5 수준의 준수 성능이 opencode · Codex · pi 등 다른 에이전트에서도 유지되도록 `docs/convention/*.md` 를 자기완결·무모호하게 고도화. 사전 전수 분석 완료(11개 문서 + enforcement.md + hook 6종 + init-agents.ts).

**사용자 결정 (한 묶음 질문으로 확정)**: ① any 금지·unknown 경계한정 ② enum 금지→as const ③ @ts-expect-error 만 조건부 허용 ④ arrow 예외(클래스 메서드 축약·generator) ⑤ Context 는 provider 용도만 ⑥ QUERY_KEY 항상 배열+정렬 직렬화+staleTime 60s ⑦ barrel(index.ts) 금지 ⑧ 서버 프리페치 패턴 추가(+`queryOptions` 팩토리 적극 활용 — 사용자 추가 지시) ⑨ 폼 = react-hook-form+zodResolver ⑩ 배포 = 코어 AGENTS.md(≤32KiB) + `.llm-rules/` 전문 사본 + 글로벌 설치(codex/opencode/pi).

### A. hook-only 규칙의 prose 승격 (이식성 구멍)

- [x] A1. `git.md` §6.1 — AI 트레일러 금지·author 사용자 단독
- [x] A2. `git.md` §6 — force push 금지, 선별 스테이징(`git add -A` 금지), 커밋 전 status/diff 확인
- [x] A3. `common.md` §5.4 — any 금지·unknown 경계한정(+`as` 제한)
- [x] A4. `security.md` §1.1 — 에이전트의 `.env` 읽기/쓰기/출력 금지, `.env.example` 키만, 노출 발견 시 보고
- [x] A5. `ai-process.md` §6.2 + `comments.md` §1.1 — @ts-ignore/eslint-disable 금지, @ts-expect-error 조건부
- [x] A6. `ai-process.md` §8.1 — 최소 기계 검증 사다리(typecheck→lint→test→실행), 거짓 통과 보고 금지
- [x] A7. `ai-process.md` §1.1 — 세션 시작 시퀀스(베이스 룰→PROCESS.md→memory/acknowledge)
- [x] A8. `security.md` §4 — sanitize 없는 dangerouslySetInnerHTML 금지 명문화

### B. 모호점·불일치 해소

- [x] B1. `index.md` — "규칙 충돌·공백 시 판단 기준" 섹션(우선순위 사다리 + 침묵 시 행동) 신설, 요약 갱신
- [x] B2. `common.md` §1 — 신규=Bun 기본 / 기존=프로젝트 환경 우선(§6.7 연계) 명시
- [x] B3. `common.md` §3.1 — arrow 예외(메서드 축약·function*) 명문화
- [x] B4. `common.md` §2 — feconfig-bhs 부재 시 표 값 inline·기존 설정 우선
- [x] B5. `common.md` §5.2 — 공개 API 경계 4종 한정 목록
- [x] B6. `comments.md` §1.1·§1.2 — 도구 지시 주석 분류 + 기존 주석 처리(minimal diff)
- [x] B7. `frontend.md` §6 — Context=provider 성격만, 전역 라이브러리 금지 명확화
- [x] B8. `frontend.md` §7 — 헬퍼 부재 시 `shared/lib/fetch.ts` 생성 스펙(봉투 해석·서버 쿠키 전달)
- [x] B9. `frontend.md` §5 — "2줄" = Prettier 포매팅 결과 기준
- [x] B10. `query.md` §2 — 키 항상 배열(`['imageList']`)·직렬화 정렬, frontend.md 와 일치
- [x] B11. `fsd.md` §2.1 배치 결정 트리 + shadcn=shared/ui + §4 barrel 금지
- [x] B12. `ai-process.md` §2.1 — PROCESS.md 적용 기준(2파일/2스텝)·아카이브(300줄→docs/history)
- [x] B13. `ai-process.md` §3.1 질문 형식 통합+템플릿, §6.5 도구 중립화
- [x] B14. `backend.md` §10.3 트랜잭션(compose 격리), §13 ServiceDb 인라인 테스트 예시, §8 offset 페이지네이션 기본
- [x] B15. `frontend.md` §2 — `.query.ts` 우선, `.client.ts` 는 쿼리 외 클라 전용만

### C. 신규 규칙

- [x] C1. `common.md` §5.5 — enum 금지 → as const + union
- [x] C2. `query.md` §1 staleTime 60s 규정화, §4 queryOptions 팩토리, §6 서버 프리페치(HydrationBoundary·요청별 QueryClient·환경중립 fetch 전제), §7 renumber
- [x] C3. `frontend.md` §8.4 — 폼 react-hook-form+zodResolver+shadcn Form (단순 입력은 useState)
- [x] C4. `common.md` §3.2 — async/await 만(.then 금지), 3.2→3.3 renumber

### D. 배포 레이어

- [x] D1. 리서치 완료(공식 문서) — 세 에이전트 모두 `@import` 미해석. **Codex 는 AGENTS.md 합산 32KiB 제한** → 기존 80KB 인라인은 잘림. 글로벌 경로: codex `~/.codex/AGENTS.md`, opencode `~/.config/opencode/AGENTS.md`(CLAUDE.md fallback 은 import 미해석이라 무의미), pi `~/.pi/agent/AGENTS.md`.
- [x] D2. `docs/agents-core.md` 신설(12.4KB, `{{LLM_RULES_DIR}}` 토큰) — 절대금지·프로세스·전 규칙 압축 + §0 전문 참조 프로토콜. `init-agents.ts` 재작성: AGENTS.md=코어 관리 블록, `.llm-rules/` 에 전문 11개 복사, Cursor .mdc 는 전문 inline 유지, 32KiB 근접 경고.
- [x] D3. 상대링크 — `.llm-rules/` 에 11개가 동일 디렉토리로 복사되므로 문서 간 `./xxx.md` 링크가 그대로 해석됨(별도 병기 불필요로 종결).
- [x] D4. 글로벌 설치 — `--global codex,opencode,pi|all` (.ts) / `LLM_RULES_GLOBAL` (.sh). README "다른 에이전트" 섹션 교정(opencode fallback 오류 정정, 코어+전문 구조, 글로벌 명령).

### E. 검증·마무리

- [x] E1. 교차참조 — common §3.2→§3.3 참조(convention-reviewer), query §6→§7 참조(tanstack-query-reviewer) 교정, `{{LLM_RULES_DIR}}` 토큰 잔여 0, 헤딩 번호 일관 확인
- [x] E2. 동기화 지점 — convention/*.md 파일 셋 불변(agents-core.md 는 docs/ 루트) → plugin·sync·install.sh 영향 없음. init-agents 계열만 신구조 반영
- [x] E3. 검증 통과 — `bash -n` OK / .ts dry-run·실설치·재실행 멱등·기존 AGENTS.md 보존·토큰 치환 완료 / .sh file:// 로컬 프로젝트+글로벌(HOME 격리) 통과, ts↔sh 산출 블록 동일 / 코어 블록 12,743B(<32KiB)
- [x] E4. 정합성 — `enforcement.md` 매핑 갱신(§5.4/§5.5/§6.1/§8.1/§1.1/queryOptions/프리페치/barrel/폼), hook 문구 교정(reinject-rules·session-context: any/enum·barrel·git add -A·검증 사다리 반영)
- [x] E5. `bun run sync` 실행 — `~/.claude/convention` 11개 최신화(diff 일치 확인), CLAUDE.md 블록 변경 없음
- [x] 후속: push 완료(d10bb59·35573af·32581c4). **로컬 머신 설치 완료** — `init-agents --global all`(~/.codex · ~/.config/opencode · ~/.pi/agent 에 AGENTS.md+llm-rules/ 11개) + `install-claude-code --global --all`(hooks 6·commands 8·agents 7·output-style·settings 병합, .bak 백업, valid JSON·실행권한 확인). 각 에이전트에서의 실동작 확인은 다음 사용 시.
- [x] guard-commit main 차단 우회 옵션(사용자 결정 B): 커맨드 접두 `LLM_RULES_ALLOW_MAIN=1`(1회성) · `git config llm-rules.allow-main true`(레포 합의) · hook env(전역) 3종. 트레일러·시크릿·형식 검사는 허용과 무관하게 유지. 기능 테스트 5종 통과, 재설치 완료. **이 레포는 main 직접 커밋 합의 → `llm-rules.allow-main true` 설정됨.**

---

## 작업: 컨벤션 확장 2차 — 메모리 발굴 + 클린코드 (완료)

사용자 요청 — 이 컴퓨터의 Claude 메모리(44개 프로젝트 feedback/project 노트)·클린코드 모범 사례를 조사해 후보 20개를 항목별 개별 질문으로 확정. **채택 17 / 제외 3**(완료 전 브라우저 인터랙션 확인·디버깅 로컬 재현 우선·prettier-plugin-tailwindcss).

### 채택·반영 내역

- [x] 1. 이모지·아스키아트 전면 금지 (bcrawler-next·split-65 메모리) → `ai-process.md` §0.1, `common.md` §1, index 요약
- [x] 2. 매직넘버 금지·상수화 (storage 메모리 "여러 번 지적") → `common.md` §4.1
- [x] 3. 실제 파일 > 메모리·문서 (keyboard 메모리) → `ai-process.md` §6.1
- [x] 5. invalidate 는 entities 훅 onSuccess 책임 **기본(권장)** — 다중 mutation 오케스트레이션은 widgets 허용 (pawa-up + 사용자 보완 지시) → `query.md` §5
- [x] 7. Python = uv (+PEP 723) (Luck·esp32-wireguard 메모리) → `common.md` §1
- [x] 8. 분할 커밋은 한 커밋씩 staging→확인 (mobidays 메모리) → `git.md` §6
- [x] 9. early return + 삼항 중첩 금지 → `common.md` §3.4
- [x] 10. const 우선·비파괴 연산 → `common.md` §3.5
- [x] 11. dead code 삭제(주석 보관 금지, 요청 밖은 보고만) → `comments.md` §1.2 + `ai-process.md` §6.8
- [x] 12. `??` 우선 + `satisfies` 활용 → `common.md` §3.5·§5.3
- [x] 13. `&&` 0-렌더링 함정 → `frontend.md` §5
- [x] 14. key = 안정된 id (재정렬 목록 index 금지) → `frontend.md` §5
- [x] 15. useEffect 최소화(외부 동기화만) + return 바로 위 배치 (pawa-up) → `frontend.md` §3.2·§3.3
- [x] 17. 날짜·시간 — UTC 원칙 + **기존 DB 는 timezone 설정 확인 후 결정** + `dayjs` 기본 (사용자 보완 지시) → `common.md` §9
- [x] 18. 라이브러리 프로젝트 SSR-first/isomorphic 코어 (furigana-ts 메모리) → `common.md` §10
- [x] 19. 접근성 최소선(시맨틱·button/a·alt·label, 나머지 Radix/shadcn) (besign 메모리, 라이트판) → `frontend.md` §8.5
- [x] 20. 공통 DTO `dto/common.ts` + boolean 쿼리 `z.enum().transform()` (hyun-hub 노트) → `backend.md` §5

### 정합성·검증

- [x] `index.md` 요약, `docs/agents-core.md` 코어 에디션, `enforcement.md` 매핑, hook 문구(reinject·session-context) 동반 갱신
- [x] 검증: 코드펜스 짝·코어 크기(<32KiB)·`bash -n`·`init-agents --dry-run`·`bun run sync` → `~/.claude/convention` 반영

### 추가 (사용자 지시): 커밋 언어·스타일 히스토리 우선

- [x] `git.md` §1.1 신설 — 별도 지시 없으면 그 레포의 과거 커밋(git log)을 읽어 스타일·언어를 맞춘다. 히스토리 없으면 기본값(Conventional + 한국어). **섞여 있으면 사용자에게 질문 → 결정을 `docs/acknowledge` 에 기록 → 이후 커밋·푸시에 계속 적용.** index 요약·agents-core·enforcement 동반 갱신 + sync.

---

## 작업: 컨벤션 전수조사 3차 — 삭제·고도화·추가 결정 리스트 (완료)

사용자 요청 — frontend.md §6 전역 상태 라이브러리 금지 재검토를 계기로, `docs/convention/` 11개 문서 + enforcement 레이어를 전수조사한다. 삭제·고도화·추가 후보를 추천과 함께 결정 리스트로 제시하고, **사용자 결정을 받은 항목만** 반영한다.

- [x] 컨벤션 11개 문서 전수 검토 — 버전 민감 항목은 공식 문서로 확인 완료: TanStack Query v5 쿼리 키 결정적 해싱·prefix 무효화, Zod 4 `z.stringbool()`, Next.js 15 `params` Promise 화(16 에서 동기 접근 제거)
- [x] enforcement 레이어 인벤토리 — 5개 층(훅 grep·주입 텍스트·에이전트/커맨드 프롬프트·agents-core·claudecode 문서) 매핑 완료. 발견 공백: 전역상태 금지의 리뷰어 매핑 불일치(enforcement.md:156), boolean 접두사 미점검, Electron 보안 구체값이 desktop-security-reviewer 단일 지점, 주입 요약 4~5개 복제본 문구 상이
- [x] 결정 리스트 작성·제시 — `docs/acknowledge/2026-07-10-convention-audit.md` (35개 항목: 삭제·완화 1 / 고도화 12 / 추가 13 / 정합 수정 9)
- [x] 사용자 결정 수령 — 1=B안(zustand 조건부), 2~12 적용·13 패스(dayjs 표준 확정), 14~22 적용(보완: 테스트 DOM 환경 상황별·lint 비필수·i18n 선택지 표·drizzle push 예외), 23~25 보류(흔적 불요), 27~35 전부 적용. 상세: `docs/acknowledge/2026-07-10-convention-audit.md` 결정 기록
- [x] 반영 완료 — convention 11개 + agents-core + claudecode(guard-commit claude-session 차단 추가·리뷰어 4·커맨드 2·output-style 오기 교정·enforcement/hooks/agents 문서). 26 은 방식 조정: 생성 스크립트 대신 "훅 = 주입 문구 단일 출처, hooks.md 복제 제거" (사유는 acknowledge)
- [x] `bun run sync` + `init-agents --global all` + `install-claude-code --global --all` 전파 완료. 검증: guard-commit bash -n·기능 테스트(트레일러 차단/정상 통과), 코드펜스 짝, 코어 17.7KB(<32KiB), 구 표기 잔존 0. typecheck 는 기존 환경 문제(node_modules 불완전)로 사이트 에러 — 이번 변경(.md·.sh)과 무관
- [x] 커밋·푸시 (사용자 요청) — feat(convention) / feat(claudecode) / docs(process) 3커밋

기록: 이전 결정 번복 2건 확정 — ⑤ Context provider 한정(→ zustand 조건부 허용), ⑥ QUERY_KEY 정렬 직렬화(→ 계층 키 + 객체 그대로, v5 결정적 해싱 공식 확인). 범위 밖 관찰이던 claudecode 문서의 타 머신 절대경로 하드코딩(hooks.md·agents.md 3곳)은 사용자 지시로 후속 커밋에서 레포 상대 경로로 정리 완료.

---

## 작업: session-context.sh 컨벤션 경로 자동 감지 (완료)

사용자 확인 — 훅이 `~/.claude/convention/*.md` 를 하드코딩해, 미설치/프로젝트 설치/커스텀 경로에서 유령 경로를 안내하던 문제. 선택지 제시 후 [1] 자동 감지 + env 오버라이드로 결정.

- [x] `assets/hooks/session-context.sh` — `세부:` 경로 자동 감지: `LLM_RULES_CONVENTION_DIR` → `$CLAUDE_PROJECT_DIR/.claude/convention`(미설정 시 cwd) → `~/.claude/convention` 순. 각 후보는 `index.md` 존재로 검증, 전부 없으면 미설치 안내 문구로 대체. 홈 하위 경로는 `~` 표기
- [x] `assets/output-styles/llm-rules.md` — 하드코딩 경로 2곳을 "세션 컨텍스트의 `세부:` 경로" 참조로 교체
- [x] `docs/claudecode/hooks.md` §5 — 감지 우선순위·미설치 동작 문서화
- [x] 로컬 설치본 동기화 — `~/.claude/hooks/llm-rules/session-context.sh`, `~/.claude/output-styles/llm-rules.md`
- [x] 검증 — `bash -n` + 기능 테스트 5케이스(미설치/글로벌/프로젝트 우선/env 오버라이드/무효 env 폴스루) 통과. 이 머신은 convention 미설치 상태라 훅이 미설치 안내를 정확히 출력함 (`bun run sync` 실행 시 해소)

---

## 작업: /prepare-new 세션 핸드오프 커맨드 추가 (완료)

사용자 요청 — 세션 종료 전 컨텍스트를 docs/ 로 고정(Phase 0 인벤토리 → 정합성 검증 → docs 최신화 → HANDOFF.md → 유실 검증 → 재개 프롬프트)하는 커맨드. 호출명은 네임스페이스 없는 `/prepare-new` 로 확정 → 커맨드 설치 경로 이원화(기존 8개는 `commands/llm-rules/` 네임스페이스, prepare-new 는 `commands/` 루트).

- [x] `docs/claudecode/assets/commands/prepare-new.md` 신설 — 사용자 제공 스펙 그대로 (frontmatter: description·argument-hint·disable-model-invocation)
- [x] `scripts/install-claude-code.ts` — `ROOT_COMMANDS`/`ROOT_COMMANDS_DEST` 신설, `copyTree` 에 skip 파라미터. 루트 커맨드는 네임스페이스 복사에서 제외 후 `commands/` 루트에 개별 복사(rm -rf 없음 — 사용자의 다른 커맨드 보존)
- [x] `install-files/install-claude-code.sh` — `ROOT_COMMANDS` 목록 + 루트 복사 루프. `bash -n` 통과
- [x] 문서 — `claudecode/commands.md`(9개로 갱신·한눈에 보기 행·"세션 핸드오프 커맨드" 섹션 신설) · `claudecode/index.md`(루트 커맨드 안내)
- [x] `.prettierrc` 신설 — lint-edit 훅이 prettier config 부재로 기본 스타일(2칸·더블쿼트·세미콜론) 전체 재포맷하던 문제의 근본 해결. `common.md §2` 표 값 inline(감사 B4 결정과 동일 방침). 부수: `install-claude-code.ts` 2곳(체인 줄바꿈·150자 초과 줄)이 레포 설정 기준으로 정규 포맷됨
- [x] 로컬 글로벌 설치 — dry-run(8+1 분리 확인) 후 실설치: `~/.claude/commands/prepare-new.md` 배치. 새 세션부터 `/prepare-new` 사용 가능
- 참고: 원격(curl) 설치는 release 번들(docs+install-files) 기반 → main push 후 다음 릴리스부터 자동 포함. README 는 사용자 지시 전 미수정 원칙 유지

---

## 작업: docs/ 갱신 훅 점검 — reinject-rules 리마인더 보강 (완료)

사용자 지적 — "각 스텝마다 docs/ 고도화하는 훅이 안 도는 느낌". 점검 결과 훅 고장이 아니라 **해당 역할의 훅이 부재**: docs 갱신은 prose(ai-process §2·§9) + 수동 커맨드(process·save-docs)뿐이고, 훅의 docs 동작은 session-context 의 읽기(주입)와 mkdir 이 전부. 추가로 enforcement.md:251 이 reinject-rules 가 작업 프로세스를 "보강"한다고 주장하지만 실제 주입 문구에 docs/PROCESS 항목이 없던 문서-구현 불일치 확인. 6개 훅 자체는 이 세션에서 전부 실동작 확인(주입·재포맷·Stop block).

사용자 결정 — 선택지(Stop 차단+리마인더 / Stop만 / 리마인더만 / 현행+문서정정) 중 **리마인더만(soft)**.

- [x] `assets/hooks/reinject-rules.sh` — 주입 문구에 "스텝마다 docs/PROCESS.md 체크 갱신, 작업 끝나면 docs/ 분류 저장(/llm-rules:process·save-docs)" 추가
- [x] `enforcement.md` — ai-process §2·§9 매핑 행에 `hook:reinject-rules` 보강 반영 (251행 클레임과 실제가 일치하게 됨). hooks.md 는 "문구 단일 출처 = 스크립트" 원칙이라 무변경
- [x] 검증·동기화 — `bash -n` + 실행 JSON 출력 확인, `~/.claude/hooks/llm-rules/` 설치본 diff 일치. 다음 프롬프트부터 적용

---

## 작업: session-context 에 "작업 개시 프로토콜" 5칙 주입 (완료)

사용자 요청 — SessionStart(세션당 1회) 시점에 5칙을 주입: ① 프롬프트 정확 분석 + 애매한 점 사전 질문 ② 사소한 애매함도 물어 확정 후 진행 ③ 스택 미명시 시 컨벤션 기본 + 후보 기능의 장단점을 짧게 요약해 합의 ④ 확정 내용은 docs/ 에도 기록 ⑤ 전긍정 금지·기술 타당성 객관 판단.

- [x] `assets/hooks/session-context.sh` — ctx 에 `[작업 개시 프로토콜 — 세션 첫 요청부터 적용]` 블록 추가 (컨벤션 요약과 PROCESS.md 주입 사이)
- [x] `hooks.md` §5 — 동작 요약·주입 단계(4번 신설, 5→6 renumber)·커버 규칙(§3·§4·§7 보강) 갱신. 원문 단일 출처 = 스크립트 원칙 유지
- [x] `enforcement.md` — ai-process §3(멈춤)·§7(신규 스택 합의) 행에 `hook:session-context`(작업 개시 프로토콜) 보강 반영
- [x] 검증·동기화 — `bash -n` + 실행 JSON 에 블록 포함 확인, `~/.claude/hooks/llm-rules/` 설치본 diff 일치. 다음 새 세션(startup·resume)부터 주입. matcher 는 기존 `startup|resume` 유지(clear·compact 확장은 미결정)

---

## 작업: 주입 프롬프트 점검·고도화 10건 (완료)

주입 프롬프트 3종(session-context·reinject-rules·/prepare-new) 점검 후 결정 리스트 10건 제시, 사용자 항목별 지시대로 반영. 결정: 1 통합 / 2 질문 방식 보강 / 3 스택 합의 범위 한정 / 4 기록처 구체화 / 5 근거+대안 보강 / 6 요약 1줄 추가 / 7 reinject 유지 / 8 matcher 확장 / 9 prepare-new 를 §9 분류로 정렬 / 10 이모지 제거.

- [x] `assets/hooks/session-context.sh` — 프로토콜 5칙→4칙: ①(구1+2 통합) 사소한 애매함도 사전 질문 + "한 번에 모아 객관식, 애매함 없으면 바로 진행" ②(구3) "신규 프로젝트·새 기능/라이브러리 도입 시"로 한정(기존 레포 스택 재논의 방지, ai-process §6.7 정합) ③(구4) 기록처 구체화(결정=docs/acknowledge, 상태=PROCESS.md) ④(구5) "문제 시 근거+대안 제시" 추가. 컨벤션 요약에 "FC<Props>·SFC·본문 순서 useRef→useState→함수/로직→useEffect" 1줄 추가
- [x] matcher 확장 — `assets/settings.json` SessionStart `startup|resume` → `startup|resume|clear|compact` (컴팩션·/clear 후 주입 유실 방지). 문서 4곳(hooks.md §5·요약표, index.md, settings.md) 동반 갱신
- [x] `assets/commands/prepare-new.md` — Phase 2 최소 문서에서 `DECISIONS.md` 제거 → `docs/acknowledge/`(결정 1건=파일 1개, ai-process §9 분류 준수·병렬 체계 금지 명시), Phase 3 템플릿 링크 동반 수정. 이모지 3곳(경고 접두·X/O) 텍스트 치환. commands.md 설명 동기화
- [x] `enforcement.md` — 프로토콜 renumber(§3→1, §7→2) 반영
- [x] 검증·동기화 — `bash -n`·실행 JSON·settings jq valid·이모지 잔존 0 확인. 로컬 설치본: 훅·커맨드 cp + `install-claude-code --global --settings` 재병합(설치된 matcher `startup|resume|clear|compact` 확인)
- reinject-rules 는 무변경(7 유지). 향후 리마인더 추가는 reinject 가 아닌 session-context(1회) 우선 원칙

---

## 작업: 커밋·푸시 세션 시작 위임(optional) 규칙화 (완료)

사용자 요청 — "요청 전 commit/push 금지"를 세션 시작 시 옵셔널로 위임 합의할 수 있게. SSOT 먼저 수정 후 enforce 레이어 동기화(레포 철학).

- [x] `convention/git.md` §6 — 예외 조항 신설: 커밋이 예상되는 세션이면 첫 확인 질문 묶음에 진행 방식 포함(① 매번 확인=기본 ② 커밋 위임·푸시 확인 ③ 커밋+푸시 위임). 합의는 `docs/acknowledge` 기록·그 세션 한정, 미합의 시 ①. 위임해도 형식·논리 단위·선별 스테이징·§6.1 유지
- [x] `convention/ai-process.md` — §10 안티패턴·§11 체크리스트에 예외 문구 반영
- [x] `assets/hooks/session-context.sh` — 작업 개시 프로토콜 5번 신설(위임 확인·acknowledge 기록·기본값 동작) + 컨벤션 요약 커밋 라인에 "(세션 위임 합의 시 예외)"
- [x] `assets/hooks/reinject-rules.sh` — 리마인더 동일 예외 표기
- [x] `agents-core.md` — 절대금지·git 섹션 2곳 예외 반영 (타 에이전트 이식성)
- [x] `enforcement.md` git §6 행·`hooks.md` §5(프로토콜 4→5칙) 갱신
- [x] 전파 — 훅 2종 `~/.claude/hooks/llm-rules/` cp, `bun run sync --yes`(convention 11개 → `~/.claude/convention`, git.md diff 일치), `init-agents --global all`(코어 18.5KB<32KiB, codex·opencode·pi)
- [x] 검증 — `bash -n` 2종·주입 JSON 에 위임 선택지 포함 확인
- 참고: permissions ask(`git commit`/`push`)는 하네스 레이어라 별개 — 위임 세션에서도 첫 실행 시 권한 프롬프트 1회는 뜨며 "세션 동안 허용" 선택으로 해소. ask 영구 제거는 안전상 유지 권장
- 부수: sync 케이스 C 로 `~/.claude/CLAUDE.md` 에 관리 블록 추가됨 — 기존 수동 import 목록과 중복(무해, Claude Code 는 1회만 로드). 정리 여부 사용자 확인 대기

---

## 작업: 자동커밋/푸시 — 권한 프롬프트 세션 초반 결정 + co-author 훅 확인 (완료)

사용자 정정 — 앞선 "세션 위임"은 오해였고 실제 요구는 ① **하네스 권한 프롬프트**("실행하시겠습니까?")를 처음에 자동/수동으로 정해 생략, ② co-author 차단 훅. ②는 기존 `guard-commit.sh` 가 이미 수행(트레일러 exit 2 — 스모크 테스트로 재확인). ①은 사용자 결정: **레포 단위 git config + 커밋/푸시 각각 키**.

- [x] `guard-commit.sh` — 검사 5단계 추가: `git config llm-rules.auto-commit true` 레포는 **전 검사(형식·트레일러·시크릿·main) 통과 시** `permissionDecision:"allow"` 출력 → ask 프롬프트 생략
- [x] `guard-push.sh` 신설(7번째 훅) — force push 를 **플래그 위치 무관** exit 2 차단(permission deny 는 접두 매칭이라 `git push origin main --force` 못 잡는 구멍 보완). `llm-rules.auto-push true` 레포의 비-force 푸시는 자동 승인, `--force-with-lease` 는 차단하지 않되 자동 승인도 제외(항상 확인)
- [x] `assets/settings.json` — PreToolUse Bash 에 guard-push 연결(`if "Bash(git push*)"`). `install-claude-code.sh` HOOKS 목록·ts 메뉴(7종) 갱신
- [x] SSOT 재정렬 — `git.md` §6 예외를 "세션 한정 위임" → **auto-commit/push git config 합의**로 교체, `ai-process.md` §10·§11, `agents-core.md` 2곳, `session-context.sh` 프로토콜 5(미설정 레포 첫 확인 때 자동/수동 확정 후 config 기록)·요약, `reinject-rules.sh` 문구 동기화
- [x] CC 문서 — `enforcement.md`(메커니즘 표 guard-push 행, git §6 두 행), `hooks.md`(7개·§1 자동커밋 단락·§7 guard-push 신설·요약표), `index.md`(표·7개)
- [x] 검증 — 기능 테스트 8케이스 전부 기대 일치(auto 미설정 무출력/auto allow JSON/트레일러 차단/후치 force·-f 차단/force-with-lease 확인 유지). 테스트 중 설치본 guard-commit 이 테스트 명령 문자열의 `git commit` 을 잡아 차단한 건 오탐이지만 정상 동작(테스트를 파일 실행으로 우회)
- [x] 전파 — 훅 4종 cp + settings 재병합(설치본에 guard-push 배선 확인) + `sync --yes`(케이스 B 멱등) + `init-agents --global all`
- [x] 이 레포 `llm-rules.allow-main` 이 기록과 달리 비어 있어 **합의대로 복원**(`git config llm-rules.allow-main true`)
- 사용법: 합의 레포에서 `git config llm-rules.auto-commit true`(·`auto-push`) → 가드 통과 커밋(·푸시)은 확인 없이 진행. 해제는 `git config --unset`

---

## 작업: 릴리스 전 전수 재점검 (완료)

- [x] 잔존 구표현 0 — "세션 위임/세션 한정/DECISIONS" grep 청정(의도적 금지 문구 1건 제외), 개수 표기(7 hooks·9 commands) 문서 전체 일치
- [x] 미반영 발견·수정 3곳 — `settings.md` ask 행(guard-push·auto 승인)·PreToolUse 표(guard-push 행 추가)·다층 방어 문구, `enforcement.md` 마스터 요약(force push 행 신설·auto 합의 승인)
- [x] 검증 — 훅 7종 `bash -n`, settings 템플릿 jq valid, `bun run typecheck` 통과, 설치본 훅 7개, 풀 dry-run(7 hooks/8+1 commands/7 agents/output-style) 정상
- [x] README 는 stale 2곳(hooks (6)·커맨드 목록에 prepare-new 없음) — 미수정 원칙이라 사용자 결정 대기
- 배포 확인: main push → release.yml 이 `docs/`·`install-files/` 변경 감지 → 버전 자동 산정 + `llm-rules.tar.gz`(docs+install-files) 릴리스 → curl 설치 스크립트가 latest 번들 다운로드. 새 머신 설치 = install.sh(컨벤션) + install-claude-code.sh(훅·커맨드·에이전트·settings) (+ 선택 init-agents.sh)
- [x] 최종 결정 4건(사용자): 분할 커밋+푸시 진행 / README 갱신(hooks 7·prepare-new) / `~/.claude/CLAUDE.md` 수동 import 제거(관리 블록만 유지) / 이 레포 auto-commit+auto-push true. 결정 상세: `docs/acknowledge/2026-07-29-claudecode-handoff-autocommit.md`
