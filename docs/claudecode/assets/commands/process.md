---
description: docs/PROCESS.md 작업 체크리스트를 읽고 갱신한다 (ai-process §2·§9)
argument-hint: "[작업 설명 (선택)]"
allowed-tools: Read, Write, Edit, Glob, Bash
---

ai-process 의 "문서 기반 작업" 원칙에 따라 `docs/PROCESS.md` 작업 체크리스트를 유지·갱신합니다. 한국어, 존댓말, 간결하게 진행하세요.

현재 PROCESS.md 상태:
!`cat docs/PROCESS.md 2>/dev/null || echo "(docs/PROCESS.md 없음)"`

인자(이번에 갱신/추가할 작업, 비어 있을 수 있음): $ARGUMENTS

다음 순서로 수행하세요.

## 1. docs/ 보장

- `docs/` 디렉토리가 없으면 생성합니다. (ai-process §1)

## 2. 현재 체크리스트 상태 갱신 (ai-process §2)

- 위에 출력된 `docs/PROCESS.md` 를 읽고, 진행 중인 작업의 체크리스트 상태를 **실제 진척에 맞게** 갱신합니다.
  - 끝난 항목은 `- [x]`, 진행 중/미착수는 `- [ ]` 로 표시합니다.
  - 각 항목 뒤에 한 줄 상세(참조: 무엇을 했는지/다음에 뭘 하는지)를 붙입니다.
- **체크리스트에 없는 행동은 추가하지 않습니다.** 범위를 벗어나는 작업이 발견되면 임의로 넣지 말고 사용자에게 알립니다. (ai-process §2·§3)
- `PROCESS.md` 상단에 **기준 문서**(CLAUDE.md·컨벤션)를 명시해 세션이 길어져도 베이스 룰을 잃지 않게 합니다. (ai-process §5)

## 3. 새 작업이면 체크리스트 생성

- `docs/PROCESS.md` 가 없거나, 인자로 받은 작업이 기존 체크리스트에 없는 새 작업이면 **새 체크리스트를 만듭니다.**
- 작업을 a, b, c, d … 단위로 쪼개 markdown 체크리스트 + 각 항목 상세 설명을 적습니다. 형식 예시:

```markdown
# PROCESS

> 기준 문서: CLAUDE.md, ~/.claude/convention/*

## 작업: <작업명>

- [ ] a. <할 일> — <상세/참조>
- [ ] b. <할 일> — <상세/참조>
```

## 4. 완료 항목 분류 이관 안내 (ai-process §9)

체크리스트가 정리된 뒤, 아래에 해당하는 내용이 있으면 적절한 문서로 분류 이관할 것을 사용자에게 제안합니다. (PROCESS.md 는 현재 진행 상태만 가볍게 유지)

- **완료된 작업 이력** → `docs/history` (무엇을 했는지 시간순)
- **사용자 결정·합의·전제** → `docs/acknowledge`
- 그 외: 장기 지식 → `docs/memory`, 버그 → `docs/bug`, 보조 스크립트 → `docs/utils`

이관 자체는 `/llm-rules:save-docs` 로도 수행할 수 있음을 안내합니다.

마지막에 갱신된 체크리스트 요약(완료 n / 전체 m)과 다음 할 항목 한 줄을 보고하세요.