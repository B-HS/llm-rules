---
name: llm-rules-process
description: 2파일·2스텝 이상 작업의 `docs/PROCESS.md` 체크리스트를 생성하거나 실제 진척에 맞춰 갱신할 때 사용합니다.
---

# PROCESS 관리

아래 1번의 선택을 받은 뒤 `docs/convention/ai-process.md`를 읽고 다음을 수행합니다.

1. 현재 실행 작업의 workflow 선택이 아직 없으면 “이번 작업을 다중 에이전트 workflow로 진행할까요? A. 사용 / B. 사용하지 않음”을 한 번 묻고 답을 기다립니다. 새 세션·resume·clear·compact·handoff·PROCESS·prepare-new 재개에서는 문서에 남은 이전 선택을 승계하지 않습니다.
2. `docs/`가 없으면 생성합니다.
3. 기존 `docs/PROCESS.md`를 읽고 현재 작업의 완료 항목만 `[x]`로 갱신합니다.
4. 새 작업이면 작업명, Markdown 체크리스트, 각 항목의 상세·참조, 기준 문서를 기록합니다.
5. 체크리스트 밖 행동이 필요해지면 임의로 추가하지 않고 사용자에게 범위 확장을 확인합니다.
6. 완료된 이력, 장기 결정, 버그, 합의 등은 `docs/history`, `memory`, `bug`, `acknowledge`로 이관할 대상을 식별합니다.

마지막에 완료 수와 전체 수, 다음 항목을 한 줄로 보고합니다. 실제 파일 상태와 대화가 다르면 파일을 단일 출처로 삼습니다.
