# 검증 비용과 중복 실행 제한

## 대상 파일

- `docs/convention/ai-process.md`
- Codex·Claude Code workflow와 verification worker
- 설치기 회귀 테스트

## 지적

하위 작업의 검증 결과를 메인이 같은 명령으로 다시 실행하고, 모든 변경에 전체 검증 사다리를 적용해 위험과 무관하게 토큰과 실행 자원을 반복 소비했습니다.

## 교정

변경 위험과 영향 경로를 기준으로 가장 작은 결정적 검증 집합을 한 번만 실행합니다. 입력과 환경이 바뀌지 않은 성공 결과는 통합 단계에서 재사용하며, 실패 원인에 영향을 준 수정 뒤에는 관련 검사만 한 번 다시 실행합니다. 애매한 보조 판정은 Codex Luna xhigh 또는 Claude Code Haiku xhigh에 맡기고, 지나치게 특수한 엣지케이스는 실행하지 않은 이유와 위험을 테스트 부채로 기록합니다.

## 적용 시점

모든 구현·수정·검증 workflow와 QA 문서 작성에 적용합니다.

## 승격

사용자가 추천 해석을 확정했으므로 `docs/convention/ai-process.md`와 양쪽 플랫폼 workflow로 승격합니다.
