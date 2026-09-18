# Codex workflow 모델 고정 피드백

## 왜 틀렸나

기존 설치기가 main의 `model = "gpt-5.6-sol"`과 `model_reasoning_effort = "high"`를 항상 덮어써서, 문서에 역할별 Terra·Luna 배정이 있어도 모든 새 세션의 시작 비용과 추론 강도가 Sol high로 고정됐습니다. 작업 난도에 따라 모델과 effort를 선택하라는 공식 기준과도 맞지 않았습니다.

## 어떻게 고쳤나

- installer의 main 모델 관리 키를 제거하고 사용자가 정한 main 설정을 보존합니다.
- 이전 llm-rules가 넣은 정확한 Sol high 쌍만 마이그레이션합니다.
- workflow Skill이 subagent 생성 시 model과 reasoning effort를 모두 명시하도록 하고, Custom Agent 기본값을 역할별 medium/high로 조정했습니다.
- 설치기 회귀 테스트에 사용자 main 설정 보존과 이전 고정값 제거를 각각 추가했습니다.

## 언제 적용하나

새 workflow 세션을 만들거나 subagent를 배정할 때마다 작업의 모호성, 범위, 반복성, 보안·통합 위험을 먼저 분류한 뒤 Sol·Terra·Luna와 effort를 선택합니다. 모델 선택 근거가 없으면 상위 설정을 그대로 상속하거나 일괄 high로 올리지 않습니다.
