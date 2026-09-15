---
name: llm-rules-save-docs
description: 완료한 작업의 결과와 검증을 llm-rules 분류 체계에 따라 `docs/` 아래에 기록하고 PROCESS 상태를 정리할 때 사용합니다.
---

# 작업 결과 문서화

`docs/convention/ai-process.md`의 결과 저장 분류를 따릅니다.

1. 직전 작업과 `docs/PROCESS.md`를 확인해 저장할 사실을 식별합니다.
2. 장기 지식은 `docs/memory`, 작업 이력은 `history`, 버그는 `bug`, 사용자 결정은 `acknowledge`, 도구는 `utils`, 지적은 `feedback`, 검증 체크리스트는 `quality-assurance`에 기록합니다.
3. 여러 분류에 해당하면 목적별 파일로 나눕니다. 파일명은 kebab-case이며 시간순 기록은 `YYYY-MM-DD-<제목>.md`를 사용합니다.
4. 각 문서에 대상 파일, 리포트, 상세를 포함하고 실제 검증 방법과 결과를 적습니다.
5. `docs/PROCESS.md`의 완료 항목을 갱신합니다.

검증하지 않은 내용을 검증 완료로 쓰지 않습니다. 기록한 경로와 한 줄 요약을 보고합니다.
