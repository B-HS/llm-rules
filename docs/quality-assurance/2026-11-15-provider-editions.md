# 프로바이더별 에디션 검증 체크리스트

- 작성일: 2026-11-15
- 대상: `docs/{claudecode,codex,opencode,pi}/` · `scripts/install-*.ts` · `install-files/install.sh`
- 관련 결정: `docs/acknowledge/2026-11-15-provider-optimization-audit.md`

## 실행한 검증

- [x] `bun test` — 설치기 9개, 가드 6개, 동등성 6개 테스트 통과
- [x] `bun run typecheck` — 문서 사이트 타입체크 통과
- [x] `BASE_PATH=/llm-rules/ bun run build` — 정적 경로 44개 생성, 에디션 간 링크와 토큰 치환 확인
- [x] 설치기 4종을 임시 디렉터리에 실행 — 사용자 파일 보존, 구형 구성 정리, 재실행 시 변경 없음 확인
- [x] OpenCode 2.1.2 격리 서비스에서 `opencode plugin list --builtin` 에 `llm-rules` 플러그인이 로드됨을 확인
- [x] 2026-11-15 이 머신에 4개 에디션을 글로벌 설치 — `config.toml` · `hooks.json` · `settings.json` 파싱 통과, 사용자 agent·플러그인 보존, 구형 `CLAUDE.md` @import · `~/.claude/convention` · `~/AGENTS.md` 관리 블록 정리(각 `.bak` 보존)
- [x] 글로벌 설치 후 OpenCode 실서비스에서 `llm-rules` 플러그인과 `llm-rules/*` subagent 11종 등록, 기존 `oh-pencode` 플러그인과 사용자 agent 유지, 로그에 관련 ERROR·WARN 0건 확인

## 테스트 부채

실제 세션이 필요해 이번 작업에서 실행하지 못한 항목이다. 해당 에디션을 글로벌 설치한 뒤 첫 사용 때 확인한다.

### Claude Code

- [ ] 새 세션의 `/context all` 에 `rules/llm-rules/core.md` 가 상시 로드되고, TypeScript 파일을 읽은 뒤 `common.md` · `comments.md` · `security.md` 가 추가된다
    - 생략 이유: 실행 중인 세션은 설치 이전 구성을 쓰고 있어 새 세션에서만 확인할 수 있다
    - 남은 위험: 사용자 수준 `paths:` 규칙이 기대와 다르게 로드되면 도메인 상세 규칙이 빠진다. 코어의 코드 규칙 요약과 lint hook 이 최소선을 지킨다
- [ ] `/doctor prompt-audit` 가 충돌이나 낡은 지시를 보고하지 않는다

### Codex

- [ ] 새 세션의 `/hooks` 에서 hook 3종을 신뢰 승인한 뒤 SessionStart 가 진행 중인 PROCESS 작업을 주입한다
- [ ] `$llm-rules-subagent-workflow` 호출 시 custom agent 가 토큰이 치환된 모델로 시작된다
    - 생략 이유: 모델 호출이 필요하다
    - 남은 위험: 계정에서 쓸 수 없는 슬러그면 subagent 시작이 실패한다. `--sol-model` · `--luna-model` 로 다시 설치한다

### OpenCode

- [x] subagent 목록에 `llm-rules/*` 11종이 보인다 — 글로벌 설치 후 `opencode debug agents` 로 확인
- [ ] 코드 파일에 시크릿 패턴을 쓰려 하면 플러그인이 도구 호출을 거부한다
- [ ] 편집 후 도구 결과에 `[llm-rules]` lint 피드백이 붙는다
    - 생략 이유: 모델 호출이 필요하다. 플러그인은 도구 입력의 경로 키(`filePath` · `path` · `file_path` · `file`)와 결과의 `content` 문자열을 가정한다
    - 남은 위험: 키 이름이 다르면 lint 피드백이 붙지 않는다. 시크릿 검사는 입력 전체 문자열을 보므로 영향이 없다

### Pi

- [ ] Pi 시작 시 `~/.pi/agent/extensions/llm-rules.ts` 로드 오류가 없다
- [ ] `.env` 읽기 요청이 `[llm-rules] 차단` 으로 거부된다
- [ ] `/skill:llm-rules-verify` 가 실행된다
    - 생략 이유: 작업한 머신에 Pi CLI 가 없고, 패키지를 내려받아 실행하는 것은 허용되지 않았다
    - 남은 위험: Extension 은 1.5.2 문서의 `tool_call` · `tool_result` · `before_agent_start` · `session_start` 계약을 기준으로 작성했다. 계약이 다르면 차단과 피드백이 동작하지 않고, 이 경우에도 `AGENTS.md` 의 규칙은 그대로 적용된다
