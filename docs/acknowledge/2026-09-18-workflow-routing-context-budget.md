# workflow 모델 라우팅·컨텍스트 예산 합의

## 결정

- 일반 commit·push의 자율 실행, main 전담, 하위 에이전트 금지, force push 금지 규칙은 변경하지 않는다.
- llm-rules 설치기는 Codex main을 Sol high로 고정하지 않는다. 기존 설치에서 llm-rules가 넣은 정확한 Sol high 쌍은 제거하고, 사용자의 다른 main 설정은 보존한다.
- Codex workflow는 모호한 다단계·고위험 통합에 Sol high, 범위가 분명한 조율·분석·일반 구현에 Terra medium, 복잡한 구현·보안 판단에 Terra high, 좁고 반복적인 조사·검증에 Luna low/medium을 명시 배정한다. high·xhigh 이상은 실제 추론 난도 근거가 있을 때만 사용한다.
- SessionStart는 전체 컨벤션 요약과 `PROCESS.md` 앞부분을 복제하지 않는다. workflow 선택 게이트, 재개 경계, 모델 라우팅, 규칙 원문 포인터와 첫 활성 작업만 주입한다.
- `startup|resume|clear|compact`는 네이티브 SessionStart source로 처리한다. handoff·PROCESS·prepare-new는 Skill·Command·재개 프롬프트가 처리하며, 다른 에이전트의 chat/task/reopen/reset/summarize도 의미가 같으면 같은 경계로 취급한다.

## 이유

main 모델을 전역 고정하면 단순한 작업도 최고 비용 경로를 사용하고 사용자가 선택한 세션 모델을 덮어쓴다. 반대로 모든 규칙과 완료 이력을 세션마다 주입하면 실제 작업에 필요한 정보가 묻힌다. 모델은 작업 난도에 맞춰 명시적으로 라우팅하고, 초기 컨텍스트는 불변 계약과 현재 활성 상태만 유지한 뒤 상세 원문을 필요 시 읽는 편이 정확도와 비용을 함께 보존한다.

## 호환성

Codex와 Claude Code는 네이티브 SessionStart hook을 사용한다. Cursor·Copilot·Windsurf·opencode·pi 등은 설치된 룰 파일의 플랫폼 중립 경계 계약을 사용하며, 네이티브 hook이 없으면 재개 프롬프트가 선택 질문을 담당한다.

동일한 저장소·resume 입력에서 raw `additionalContext`는 Codex 26,817B → 1,951B, Claude Code 28,134B → 1,714B로 줄었습니다. 핵심 선택 게이트·guardrail·Git 계약·활성 작업 이름은 유지하고 완료 이력과 상세 설명만 필요 시 읽도록 전환했습니다.
