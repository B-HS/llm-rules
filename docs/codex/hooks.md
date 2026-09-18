# Codex Hooks

`docs/codex/assets/hooks.json`과 `assets/hooks/*.sh`가 편집·세션 시점의 기계적 강제 계층을 구성합니다. Codex의 현재 command hook 계약인 stdin JSON, exit code 2, `hookSpecificOutput`, `decision: "block"`을 사용합니다.

| Hook                 | 이벤트                     | 동작                                                                 |
| -------------------- | -------------------------- | -------------------------------------------------------------------- |
| `scan-secrets.sh`    | `PreToolUse(apply_patch)`  | 새로 추가되는 코드의 고신뢰 시크릿 패턴 차단                       |
| `lint-edit.sh`       | `PostToolUse(apply_patch)` | 변경 TS·JS에 Prettier 적용 후 명백한 위반은 재작업, 휴리스틱은 경고 |
| `session-context.sh` | `SessionStart`             | workflow 선택 게이트, 핵심 guardrail, 규칙 포인터, 첫 활성 작업만 주입 |

`SessionStart` matcher의 네 source는 공식 Codex 값인 `startup|resume|clear|compact`입니다. handoff·PROCESS·prepare-new는 source 이름이 아니므로 각 Skill과 재개 프롬프트가 첫 단계에서 같은 선택 질문을 담당합니다. hook은 입력 JSON의 `cwd`를 기준으로 프로젝트를 찾고, 전체 컨벤션과 PROCESS를 복제하지 않습니다. `(완료|보류)`가 아닌 첫 `## 작업:` 블록 중 `(진행 중)`이거나 미완료 체크박스가 있는 섹션에서 제목과 미완료 이름 최대 4개만 주입합니다.

## Claude Hook과의 차이

Codex의 파일 편집은 `apply_patch`의 `tool_input.command`로 전달되므로 secret·lint hook이 patch header에서 여러 파일을 추출합니다. PreToolUse의 차단은 exit 2를 사용하고 PostToolUse의 재작업은 `decision: "block"`을 사용합니다.

일반 commit·push를 가로채는 llm-rules PreToolUse hook은 없습니다. llm-rules Execpolicy는 두 명령을 allow하고 메인 오케스트레이터가 별도 승인 없이 자동 실행합니다. 모든 force push는 파괴적 예외로 Rules에서 금지합니다. 이 정책은 Codex 실행 환경 자체의 sandbox나 저장소 외부 정책을 우회하지 않습니다.

설치기는 과거의 `guard-commit.sh`, `guard-push.sh`, `reinject-rules.sh`, `verify-on-stop.sh`와 해당 관리 entry를 제거합니다. 알려진 관리 script만 정리하므로 사용자 hook 파일과 비관리 entry는 유지합니다.

## 신뢰와 적용 범위

- 글로벌: `~/.codex/hooks.json`, `~/.codex/hooks/llm-rules/`
- 프로젝트: `.codex/hooks.json`, `.codex/hooks/llm-rules/`
- 프로젝트 hook은 trusted 저장소에서만 로드됩니다.
- 남은 편집·세션 hook은 새 설치나 변경 후 `/hooks`에서 hash 기반 신뢰 승인이 필요합니다.
- 자동화에서 `--dangerously-bypass-hook-trust`를 쓰는 것은 외부에서 hook source를 이미 검증한 경우로 제한합니다.
