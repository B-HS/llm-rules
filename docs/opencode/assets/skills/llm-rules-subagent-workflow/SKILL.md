---
name: llm-rules-subagent-workflow
description: 현재 작업을 main 과 subagent 로 나눠 병렬로 진행합니다. 사용자가 subagent·다중 에이전트 진행을 요청했을 때만 사용합니다.
---

# Subagent workflow

main 이 요구사항 해석, 분해, 통합, 최종 판정, Git 을 맡고 subagent 가 배정받은 범위를 수행합니다. OpenCode 의 subagent 는 새 컨텍스트의 child session 에서 백그라운드로 실행되고, 끝나면 main 에 보고가 돌아옵니다.

## 무엇을 위임할지

subagent 는 자기 컨텍스트를 새로 쌓고 따로 토큰을 씁니다. 병렬로 시간을 줄일 수 있거나 품질이 좋아지는 일만 위임합니다.

- 서로 의존하지 않는 조사·구현·검증은 동시에 시작합니다.
- 같은 파일을 고치거나 앞 단계 결과가 필요한 일은 순서대로 진행합니다.
- 한 파일 수정이나 짧은 순차 작업은 main 이 직접 합니다.

## subagent

| subagent | 쓰는 경우 |
| --- | --- |
| `llm-rules/research-worker` | 코드베이스·공식 문서의 사실 확인 (편집 불가) |
| `llm-rules/implementation-worker` | 소유 파일이 분명한 구현·수정 |
| `llm-rules/verification-worker` | 타입체크·테스트·실행 확인 |
| `llm-rules/edge-case-verification-worker` | 주 검증 뒤에 남은 모호성 하나의 판정 (편집 불가) |
| `llm-rules/*-reviewer` 7종 | 구현 뒤 해당 영역의 의미 리뷰 (편집 불가) |

subagent 는 모델을 지정하지 않아 main 세션의 모델을 물려받습니다. 넓은 읽기 전용 탐색은 내장 `explore` 를 써도 됩니다.

## 위임할 때 전달할 내용

main 이 실제 파일을 읽어 확인한 내용으로 채웁니다. 확인하지 않은 파일명·API·명령은 적지 않습니다.

1. 목표와 완료 조건
2. 확인한 사실과 배제한 가설: 관련 파일·심볼·현재 동작·선행 결정
3. 소유 범위: 수정할 수 있는 파일, 건드리지 않을 영역, 다른 subagent 와의 순서와 대기 조건
4. 검증: 실행할 최소 명령과 합격 기준, 다시 실행하지 않을 기존 성공 결과
5. 반환할 요약 형식: 변경 파일과 근거, 명령별 실제 결과, 미검증 사항과 남은 위험

## 통합

1. 시작한 subagent 의 보고가 모두 돌아온 뒤 실제 diff 와 검증 출력을 확인합니다. 같은 변경 상태에서 성공한 검증은 다시 실행하지 않습니다.
2. 주 검증 뒤에도 결과를 바꿀 모호성이 남을 때만 `llm-rules/edge-case-verification-worker` 를 씁니다. 작은 검사로 판정할 수 없으면 `docs/quality-assurance` 에 테스트 부채로 남깁니다.
3. `docs/PROCESS.md` 를 갱신하고, main 이 논리 단위로 선별 staging 해 커밋하고 push 합니다. subagent 의 git add · commit · push 는 권한 규칙으로 거부됩니다.
4. 완료 결과, 변경 범위, 실제 검증 결과, 커밋과 푸시 상태, 남은 위험을 보고합니다.
