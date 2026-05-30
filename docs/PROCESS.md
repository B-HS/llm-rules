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
- [ ] **배포**: git init + commit 후 GitHub `B-HS/llm-rules` 생성·push (raw 설치를 위해 public 필요). Pages Source=GitHub Actions. 사용자 공개여부 확정 대기.
- [ ] **실제 적용**: 사용자가 직접 설치 명령 실행해 확인 예정.

---

## 후속 확인 (rule #4) — 해결됨

- **쿼리 훅 위치 통일**: 사용자 결정 → **`*.query.ts`** 로 통일. (BBlog 가 `*.client.ts` 를 쓰는 건 `serverFetcher` 분리 때문인 특수 케이스이며, 개념상 클라이언트 쿼리 훅 = `.query.ts`.) `query.md §3` 을 `entities/<entity>.query.ts` 기준으로 수정해 `fsd.md §4` 와 일치시킴.
