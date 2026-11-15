# PROCESS — 현재 세션 작업 상태

> **베이스 룰**: 에디션별 룰 — `docs/claudecode/rules/` · `docs/codex/rules/` · `docs/opencode/rules/` · `docs/pi/rules/`
> 이 파일은 진행 중인 작업과 최근 작업의 상태를 기록한다. 오래된 완료 작업은 `docs/history/` 에 있다.

---

## 작업: 4개 에디션 글로벌 설치 적용 (완료)

사용자 요청 — 이 머신에 Claude Code · Codex · OpenCode · Pi 에디션을 글로벌로 설치한다.

- [x] 1. 설치 전 상태 확인과 4개 설치기 실행 — `bun run install-<에디션> --global --all`, 백업 사용
- [x] 2. 설치 결과 확인 — 설정 파일 파싱, 구형 구성 정리, OpenCode 실서비스의 플러그인·subagent 11종 등록 확인
- [x] 3. 결과 기록 — `docs/quality-assurance/2026-11-15-provider-editions.md` 의 OpenCode subagent 항목 해소

---

## 작업: 프로바이더별 룰 최적화 — Claude Code · Codex · OpenCode · Pi (완료)

사용자 요청 — 공통 룰을 없애고 4개 프로바이더가 각자의 모델·하네스 권장사항에 맞춘 룰을 소유한다. 최종 결과물은 현재 룰과 같아야 하고, 중간 과정의 불필요한 루프·검증을 프로바이더 권장에 맞춰 정리한다. workflow 는 사용하지 않고 main 이 직접 수행한다.

- [x] 1. 현행 자산·설치 상태 파악 — 코어 23KB, 전문 11개 140KB, Claude/Codex hook 3종·Skill 10종·agent 11종, OpenCode 는 CLAUDE.md 심볼릭 링크, Pi CLI 미설치 확인
- [x] 2. 4개 프로바이더 공식 권장사항 점검 — 근거와 결과를 `docs/acknowledge/2026-11-15-provider-optimization-audit.md` 에 기록
- [x] 3. 결정 4건 확인 — workflow 는 명시적 opt-in, 체크리스트는 범위 안이면 추가 후 계속, 모델은 공식 기준으로 갱신하되 룰에는 이름만, OpenCode 플러그인과 Pi 확장 포함
- [x] 4. Claude Code 에디션 — 103줄 코어와 경로 범위 규칙 8개를 `rules/llm-rules/` 에 설치, 응답 형식은 output-style 단일 출처, 커맨드·agent·hook 정리, `CLAUDE.md` @import 와 `convention/` 마이그레이션
- [x] 5. Codex 에디션 — 코어 23KB → 11KB, 조건부 포인터, Skill 3종 재작성, agent 모델 토큰화와 `sandbox_mode` 제거, SessionStart `fork` 추가
- [x] 6. OpenCode 에디션 — V2 코어·참조 문서·Skill 10·Command 10·Subagent 11·권한 규칙·플러그인, 심볼릭 링크 `AGENTS.md` 교체 처리
- [x] 7. Pi 에디션 — 코어·참조 문서·Skill 9·Extension, 구형 홈 블록 마이그레이션 이관
- [x] 8. 공통 룰 제거와 배포 계층 정리 — `docs/convention` · `agents-core.md` · `sync-claude-md` · `init-agents` · 구 원격 설치기 3종 삭제, `install-files/install.sh` 단일 부트스트랩, 사이트 44개 경로와 README 갱신
- [x] 9. 결과물 동등성 검사와 회귀 검증 — `bun test` 21개 통과(설치기 9 · 가드 6 · 동등성 6), typecheck, 정적 build 통과. 실제 세션이 필요한 항목은 `docs/quality-assurance/2026-11-15-provider-editions.md` 에 테스트 부채로 기록
- [x] 10. 결과 기록 · 논리 단위 커밋 · 푸시 — PROCESS 300줄 초과분을 `docs/history/2026-11-15-process-archive.md` 로 이관. 커밋 `b2e5fb8`(점검·결정 기록) · `87ec849`(에디션 전환)와 이 기록 커밋을 `origin/main` 에 push. Prettier 는 로컬 바이너리가 없고 내려받아 실행하는 것이 차단되어 실행하지 못했고, 150자를 넘는 줄은 직접 줄바꿈함

기준 문서: `docs/acknowledge/2026-11-15-provider-optimization-audit.md` · 각 프로바이더 공식 문서(같은 파일 §1).

---

## 작업: README Pi Agent 전용 설치 안내 추가 (완료)

사용자 요청 — README 설치 영역에서 Pi Agent용 글로벌 설치 명령과 설치 범위, Codex 네이티브 기능과의 차이를 바로 확인할 수 있도록 안내를 추가한다.

- [x] 1. 기존 설치 표·범용 호환 섹션과 중복 없는 배치 확정 — 상단 원격 설치 표, 클론 설치 표, 범용 호환의 Pi 전용 소제목으로 나눠 즉시 찾을 수 있게 배치
- [x] 2. Pi 전용 설치 명령·산출물·지원 한계 문서화 — `LLM_RULES_GLOBAL=pi`, `--global pi`, Pi 전역 코어·전문 11개, 공유 Skills 탐색, Codex 네이티브 자산 비호환을 명시하고 원격·클론 마이그레이션 차이를 구분
- [x] 3. Markdown 포맷·명령 정합성 검증 — 관련 Pi 명령·경로 `rg` 확인과 `git diff --check -- README.md` 통과. 프로젝트에 formatter 스크립트와 Prettier 의존성이 없어 포맷터는 미실행
- [x] 4. 결과 기록·선별 커밋·푸시 — README와 PROCESS만 선별 검토 후 커밋·푸시

기준 문서: `docs/convention/ai-process.md` · `README.md` · `scripts/init-agents.ts` · `install-files/init-agents.sh`.

---

## 작업: Pi에서 Codex llm-rules 동등 인식 방법 재조사 (완료)

사용자 요청 — 현재 프로젝트의 Pi 지원 여부를 실제 설치기와 최신 Pi 동작 기준으로 확인하고, Codex에 인식된 llm-rules 자산을 Pi에서 어디까지 동일하게 인식시킬 수 있는지 정확한 설치 절차와 한계로 설명한다.

- [x] 1. 로컬 Pi 설치기·테스트·배포 산출물 확인 — 클론 설치기는 `--global pi`로 `~/.pi/agent/AGENTS.md`와 전문 11개를 설치하며 구형 `~/AGENTS.md` 관리 블록도 백업 후 제거함을 확인. 원격 설치기는 코어·전문만 설치하고 구형 블록 마이그레이션은 하지 않는 불일치 확인
- [x] 2. 최신 Pi 공식 지침·Skills·확장 구조 확인 — Pi 0.85.1과 공식 문서에서 전역·상위·현재 경로의 `AGENTS.md`, `~/.agents/skills`와 Pi 전용 Skills 자동 탐색, TypeScript Extensions, 내장 subagent·permission 부재를 확인
- [x] 3. Codex 자산군과 Pi 대응 범위 비교 및 실행 절차 확정 — Instructions는 Pi 전용 경로 설치로 동등화하고 공유 Skills 10개는 이미 탐색 가능. Codex Hooks·Custom Agents·Execpolicy는 Pi가 직접 읽지 않아 Extensions로 별도 이식해야 함을 확정
- [x] 4. 조사 근거 검증·PROCESS 결과 기록 — 현재 머신에 Pi 전역 코어·전문이 없고 Codex 코어·전문과 공유 Skills 10개만 있음을 메타데이터·`cmp`로 확인. `bun run init-agents --global pi --dry-run`에서 Pi 파일 생성과 구형 홈 블록 제거 예정 출력 확인

기준 문서: `docs/convention/ai-process.md` · `docs/agents-core.md` · `scripts/init-agents.ts` · Pi 공식 문서.

---

## 작업: Pi 설치 시 구형 홈 AGENTS 관리 블록 마이그레이션 (완료)

사용자 요청 — Pi 전역 설치가 현재 llm-rules를 설치한 뒤에도 존재하지 않는 `.Codex/convention/`을 참조하는 과거 `~/AGENTS.md`를 함께 읽는 문제를, 사용자의 수동 정리 없이 설치기가 안전하게 해결하도록 수정한다.

- [x] 1. 마이그레이션 계약·회귀 기준 확정 — 완전한 `rules-convention` 마커 쌍만 식별하고, 사용자 소유 텍스트 보존·백업·dry-run·불완전 마커 보존을 전용 테스트로 고정
- [x] 2. Pi 글로벌 설치기 구현 — `--global pi`에서만 Pi 전역 코어·전문 설치 성공 뒤 구형 홈 관리 블록을 백업 후 제거하도록 연결
- [x] 3. 최소 검증·기록 — `bun test scripts/init-agents.test.ts` 3개 테스트·28개 assertion 통과. 새 설치·마이그레이션·멱등성·사용자 텍스트 보존·`--no-backup`을 임시 HOME에서 확인

기준 문서: `docs/convention/ai-process.md` · `common.md` · `comments.md` · `security.md` · `scripts/init-agents.ts`.

---

## 작업: Pi 환경의 llm-rules 인식 상태 점검 (완료)

사용자 요청 — Pi 시작 화면에 표시된 `~/AGENTS.md`, Skills, 도구 설치 및 모델 경고가 현재 프로젝트의 llm-rules 설치 상태와 정확히 맞는지 실제 파일·설치기·Pi 설정 기준으로 판정한다.

- [x] 1. Pi 지원 설치 경로·규칙 탐색 동작 확인 — 설치기와 Pi v0.85.1 로컬 문서가 전역 지침을 `~/.pi/agent/AGENTS.md`, 전문 사본을 `~/.pi/agent/llm-rules/`에 두는 계약임을 확인. Skill은 이름·설명만 시작 컨텍스트에 넣고 전문은 필요 시 읽음
- [x] 2. 현재 사용자 환경 상태 점검 — `~/.pi/agent/AGENTS.md`와 `llm-rules/`는 없음. Pi는 `~/AGENTS.md`를 읽었으며, 해당 파일의 모든 `@~/.Codex/convention/*.md` 참조 경로도 없음. 전역 `~/.agents/skills/`의 llm-rules Skill 10개는 존재. 모델 저장소에 모델 항목이 없고 시작 로그도 모델 미연결을 확인
- [x] 3. 결과 통합·최소 검증 — Pi 시작 로그·설치기·공식 로컬 문서·파일 메타데이터를 대조해 Skills 발견만 정상이고 현재 규칙 설치와 모델 실행은 미완료로 판정

기준 문서: `docs/convention/ai-process.md` · `docs/agents-core.md` · Pi 설치기/문서와 현재 사용자 파일 메타데이터.
