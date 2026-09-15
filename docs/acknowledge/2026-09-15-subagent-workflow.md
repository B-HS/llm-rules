# 2026-09-15 — 자동 Git·다중 에이전트 운영 계약

> Git guard 유지, 고정 검증 사다리, 하위 모델 high 고정 결정은 [자율 Git·검증 예산·응답 계약 결정](./2026-09-15-autonomy-verification-response.md)으로 대체되었습니다.

## 사용자 결정

- 도구를 사용하는 모든 실행 작업은 Codex의 **Subagent workflow** 또는 Claude Code의 **workflow**로 수행합니다.
- 주 에이전트는 요구사항·작업 분해·의존성·결과 통합·Git을 소유합니다.
- Codex 주 에이전트는 `gpt-5.6-sol` high, Claude Code 주 에이전트는 `fable` high를 사용합니다.
- Codex 하위 작업은 `gpt-5.6-terra`와 `gpt-5.6-luna`, Claude Code 하위 작업은 `sonnet`을 역할과 난이도에 따라 배정합니다. 하위 모델의 effort는 high로 고정합니다.
- 독립적인 조사·구현·검증은 병렬 실행하고, 같은 파일이나 선행 결과를 공유하는 작업은 workflow 안에서 직렬 실행합니다.
- 하위 모델 지시는 낮은 모델에서도 같은 결과 품질을 낼 수 있도록 목표·완료 기준·실제 파일 근거·수정 범위·세부 절차·금지 사항·예외·검증 명령·보고 형식을 빠짐없이 전달합니다.
- 검증된 변경은 주 에이전트가 독립적으로 되돌릴 수 있는 논리 단위로 나누어 선별 staging하고, AI 공동 저자·도구 서명·세션 트레일러 없이 자동 commit한 뒤 일반 push합니다.

## 모델 배정

| 역할                                 | Codex                 | Claude Code    |
| ------------------------------------ | --------------------- | -------------- |
| 주 오케스트레이터                    | `gpt-5.6-sol`, high   | `fable`, high  |
| 복합 구현·통합 조사·의미 검증        | `gpt-5.6-terra`, high | `sonnet`, high |
| 좁고 명확한 수정·반복 검사·정형 검증 | `gpt-5.6-luna`, high  | `sonnet`, high |

Codex의 기본 하위 모델은 Terra high로 두고, 범위가 좁고 결정적인 작업은 주 에이전트가 Luna high를 명시합니다. Claude Code 하위 모델 목록에는 지정된 모델만 표기합니다.

## Hook 결정

- 유지: `guard-commit`, `guard-push`, `scan-secrets`, `lint-edit`, `session-context`
- 제거: `reinject-rules` — 모든 프롬프트에 압축 규칙을 중복 주입하므로 Subagent workflow와 `AGENTS.md`·`CLAUDE.md` 계약으로 대체합니다.
- 제거: `verify-on-stop` — 타입체크 일부만 Stop 시 중복 실행하므로 workflow의 전담 검증 하위 에이전트와 전체 검증 사다리로 대체합니다.
- 삭제된 hook은 신규 설치뿐 아니라 기존 설치에서도 설정 entry와 script가 남지 않도록 설치기가 관리 자산을 정리합니다.

## 근거

- OpenAI Docs는 Codex가 프로젝트·Skill 지침에 따라 Subagent workflow를 시작할 수 있고, custom agent 파일에서 모델과 reasoning effort를 지정할 수 있다고 설명합니다.
- Anthropic 공식 문서는 Claude Code의 Fable·Sonnet 모델 별칭, subagent별 model·effort, 병렬 background subagent를 지원하며 구체적인 지시와 완료 기준을 권장합니다.
