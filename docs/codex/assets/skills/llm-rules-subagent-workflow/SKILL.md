---
name: llm-rules-subagent-workflow
description: 모든 tool-using 실행 작업에서 Codex Subagent workflow로 요구사항 분해, 상세 위임, 병렬·직렬 조율, 통합과 자동 Git을 수행할 때 사용합니다. 단순 대화 답변에는 사용하지 않습니다.
---

# Codex Subagent workflow

tool을 사용해 구현, 조사, 검증, 문서화, 설치 또는 배포를 수행하는 작업은 시작 전에 이 Skill을 적용합니다. 단순한 대화 답변과 tool이 필요 없는 설명에는 강제하지 않습니다.

## 역할과 모델

- main orchestrator는 요구사항 확인, 작업 분해, 파일 소유권 결정, 결과 통합, 최종 검증, Git을 소유합니다. 기본 모델은 `gpt-5.6-sol`, reasoning effort는 `high`입니다.
- 복합 구현, 의미론적 검토, 공식 문서 조사는 `implementation_worker`, `research_worker` 또는 `gpt-5.6-terra` high에 배정합니다.
- 범위가 좁고 반복 가능한 검사와 검증은 `verification_worker` 또는 `gpt-5.6-luna` high에 배정합니다.
- subagent는 Git staging, commit, push, rebase, merge를 수행하지 않습니다.

## 작업 분해와 순서

1. 적용 AGENTS.md, `docs/PROCESS.md`, 관련 docs와 실제 파일을 읽어 완료 조건과 변경 범위를 확정합니다.
2. 파일 소유권과 데이터·제어 의존성을 기준으로 subtask를 나눕니다. 서로 다른 파일을 읽거나 수정하는 독립 task는 병렬로 실행합니다. 같은 파일을 수정하거나 결과가 선행 조건인 task는 명시적으로 직렬 실행하고 선행 결과를 확인한 뒤 다음 task를 시작합니다.
3. 단일 구현처럼 직렬 작업이어도 main이 모든 tool 작업을 직접 수행하지 않습니다. 조사, 구현, 검증 중 최소 하나의 경계가 분명한 subtask를 배정하고 결과를 통합합니다. 안전상 위임할 수 없는 단일 명령은 사유를 기록합니다.
4. main은 subagent 결과를 실제 diff와 검증 출력으로 다시 확인하고 충돌·누락을 해결합니다. 검증 뒤에만 독립적으로 되돌릴 수 있는 행동 단위로 선별 staging, Conventional Commit, push를 수행합니다.

## delegation packet

각 subagent 요청은 아래 항목을 모두 포함합니다. 낮은 비용 모델에도 모호함이 남지 않도록 구체적인 경로·심볼·명령·판정 기준을 씁니다.

1. 정확한 목표와 Definition of Done
2. 확인한 실제 파일·심볼·현재 동작과 의존성 근거
3. 수정 가능한 파일 소유권, 읽기 범위, 수정 금지 파일과 비목표
4. 반드시 읽을 AGENTS.md, 규칙 전문, 적용 Skill과 공식 문서
5. 순서가 있는 세부 구현 또는 조사 단계
6. edge case, 호환성 조건, 금지된 우회와 안전 제약
7. 실행할 검증 명령, 순서, 각 명령의 합격·실패 기준
8. 수정 파일·근거·검증 결과·미실행 사유·남은 위험을 포함한 보고 형식
9. Git staging, commit, push, rebase, merge를 하지 않는다는 명시
10. 병렬 실행 가능 여부, 공유 파일, 선행 결과 대기 조건과 결과 전달 대상

## 완료 기준

main은 각 subagent의 보고만으로 완료를 선언하지 않습니다. 실제 변경 파일, diff, 검증 출력을 확인하고 `docs/PROCESS.md`를 갱신한 뒤 사용자에게 완료·실패·미실행 사유를 사실대로 보고합니다.
