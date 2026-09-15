# Codex Hooks

`docs/codex/assets/hooks.json`과 `assets/hooks/*.sh`가 컨벤션의 기계적 강제 계층을 구성합니다. Codex의 현재 command hook 계약인 stdin JSON, exit code 2, `hookSpecificOutput`, `decision: "block"`을 사용합니다.

| Hook                 | 이벤트                     | 동작                                                                                                                            |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `guard-commit.sh`    | `PreToolUse(Bash)`         | main·master 직접 커밋, AI 트레일러, 금지 파일 staging, Conventional Commit 위반을 차단하고 검사 가능한 인라인 `-m` 한 개만 허용 |
| `guard-push.sh`      | `PreToolUse(Bash)`         | 모든 형태의 force push를 차단하고 일반 push의 안전 검사를 통과시킴                                                              |
| `scan-secrets.sh`    | `PreToolUse(apply_patch)`  | 새로 추가되는 코드의 고신뢰 시크릿 패턴 차단                                                                                    |
| `lint-edit.sh`       | `PostToolUse(apply_patch)` | 변경 TS·JS에 Prettier 적용 후 명백한 위반은 재작업, 휴리스틱은 경고                                                             |
| `session-context.sh` | `SessionStart`             | 컨벤션 요약, 작업 개시 프로토콜, `docs/PROCESS.md` 앞부분 주입                                                                  |

## Claude Hook과의 차이

Codex의 파일 편집은 `apply_patch`의 `tool_input.command`로 전달되므로 secret·lint hook이 patch header에서 여러 파일을 추출합니다. PreToolUse의 허용은 `permissionDecision: "allow"`, 차단은 exit 2를 사용합니다. PostToolUse와 Stop의 재작업은 `decision: "block"`을 사용합니다.

여러 matching hook은 동시에 시작될 수 있으므로 각 Git hook이 입력 명령을 다시 검사해 자신의 대상이 아니면 즉시 종료합니다. guard는 commit·push를 실행하지 않는 validator이며, 안전 검사를 통과한 일반 commit·push만 허용합니다. Hook은 완전한 보안 경계가 아니라 Rules, sandbox, AGENTS 지침과 함께 쓰는 guardrail입니다.

## 신뢰와 적용 범위

- 글로벌: `~/.codex/hooks.json`, `~/.codex/hooks/llm-rules/`
- 프로젝트: `.codex/hooks.json`, `.codex/hooks/llm-rules/`
- 프로젝트 hook은 trusted 저장소에서만 로드됩니다.
- 비관리 hook은 새 설치나 변경 후 `/hooks`에서 hash 기반 신뢰 승인이 필요합니다.
- 자동화에서 `--dangerously-bypass-hook-trust`를 쓰는 것은 외부에서 hook source를 이미 검증한 경우로 제한합니다.
