# 자동 Git·다중 에이전트 workflow 검증

## 대상 파일

- `docs/convention/ai-process.md`, `docs/convention/git.md`, `docs/agents-core.md`
- `docs/codex/**`, `scripts/install-codex.ts`, `install-files/install-codex.sh`
- `docs/claudecode/**`, `scripts/install-claude-code.ts`, `install-files/install-claude-code.sh`
- `scripts/installers.test.ts`, `README.md`, `src/pages/home-page.tsx`

## 리포트

Codex와 Claude Code의 기존 네이티브 자산을 유지하면서 플랫폼별 main·subagent 모델, 상세 위임 계약, 병렬·직렬 실행 기준, 메인 오케스트레이터의 자동 Git을 추가했습니다. 매 프롬프트 재주입과 Stop 부분 타입체크 hook은 제거하고, 설치 시 이전 managed entry와 script를 정리하도록 양쪽 설치기를 보강했습니다.

## 검증 결과

- [x] `bun run typecheck` — 성공
- [x] 변경 TypeScript·JSON·신규/주요 Markdown `bunx prettier --check` — 성공
- [x] `bun run test` — 3개 테스트, 164개 assertion 성공
- [x] 네 설치기와 양쪽 활성 hook `bash -n` — 성공
- [x] `hooks.json`, `settings.json` `jq empty` — 성공
- [x] Codex config·agent TOML 11개 `Bun.TOML.parse` — 성공
- [x] Codex worker·reviewer 10개와 Claude Code subagent 10개의 모델·effort 계약 — 성공
- [x] 양쪽 local installer `--global --all --dry-run` — 성공
- [x] 임시 target 2회 설치 — 사용자 설정·hook 보존, retired hook 제거, byte 단위 멱등성 성공
- [x] commit guard — 정상 inline 메시지 허용, editor·file 메시지와 AI trailer 차단
- [x] push guard — 일반 push 허용, 모든 force 옵션 변형 차단
- [x] `BASE_PATH=/llm-rules/ bun run build` — 23개 정적 페이지 생성 성공
- [x] `git diff --check` — 성공
- [x] 글로벌 Codex·Claude Code 설치 적용 및 새 설정 확인 — 각 agent 10개, retired script 제거 확인
- [x] 논리 단위 commit·push — 6개 커밋을 `origin/main`에 push, AI 공동 작성 trailer 없음
- [x] GitHub Release — run `34939495913` 성공, `v1.7.0`이 `fde2fe1` 대상으로 생성
- [x] GitHub Pages — run `34939496157`의 build·deploy 성공
- [x] 배포된 Release 번들 기반 Codex·Claude Code 원격 설치 — 격리된 임시 project target에서 전체 항목 설치 성공

## 상세

- 설치기 회귀 테스트는 실제 local installer를 임시 target에 실행합니다. Codex TOML의 공백 없는 대입, 주석이 붙은 `[agents]`, 하위 table과 배열 table을 보존하고, Claude Code의 비관리 hook script도 유지하는지 검사합니다.
- guard 테스트는 실제 Git 명령을 실행하지 않고 hook stdin JSON fixture만 사용합니다.
- 원격 설치기의 네트워크 다운로드 경로는 push 후 생성된 `v1.7.0` release bundle로 다시 확인했습니다. Codex는 instructions·config·hooks 5개·skills 10개·agents 10개·rules 1개, Claude Code는 settings·hooks 5개·commands 10개·agents 10개·output style 설치에 성공했습니다.
- 기존 Claude Code 장문 설명 문서 6개는 변경 전부터 전체 Prettier 검사에 실패합니다. 기존 상세와 최소 diff를 보존하기 위해 전체 재포맷하지 않았고, 새 자산·코드·주요 문서는 별도 검사에서 통과했습니다.
- 정적 빌드는 성공했으며 기존 500 kB 초과 chunk 경고만 남았습니다.
