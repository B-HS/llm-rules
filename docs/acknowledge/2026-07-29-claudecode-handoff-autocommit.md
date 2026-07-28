# 2026-07-29 — /prepare-new · 작업 개시 프로토콜 · 자동 커밋/푸시 합의

> CC 에디션 확장 세션의 사용자 결정 기록. 같은 주제 재론 시 이 결정을 따른다.

## 커맨드

- **`/prepare-new` 는 네임스페이스 없이 설치**한다(`<claudeDir>/commands/prepare-new.md`). 이를 위해 설치 경로를 이원화(기존 8개 = `commands/llm-rules/`, 루트 커맨드 = `ROOT_COMMANDS`).
- prepare-new 의 docs 체계는 **ai-process §9 분류를 따른다** — `DECISIONS.md` 를 만들지 않고 `docs/acknowledge/` 사용(결정 1건 = 파일 1개). `ARCHITECTURE.md`·`HANDOFF.md` 는 유지. 지시문 이모지는 텍스트(X/O·KNOWN ISSUE)로 치환.

## 주입 프롬프트

- **작업 개시 프로토콜(SessionStart 주입) 5칙**: ① 사소한 애매함도 한 번에 모아 객관식 사전 질문(없으면 바로 진행) ② 신규 프로젝트·신규 도입 시에만 스택 장단점 요약 합의 ③ 결정=`docs/acknowledge`·상태=`docs/PROCESS.md` 기록 ④ 전긍정 금지, 문제 시 근거+대안 제시 ⑤ 커밋/푸시 자동/수동을 미설정 레포 첫 확인 때 확정.
- **SessionStart matcher 는 `startup|resume|clear|compact`** — /clear·컴팩션 후에도 재주입.
- **docs/ 갱신 강제는 soft 리마인더로**(reinject 1줄). Stop 차단은 채택하지 않음(반복 미준수 시 재검토).
- 향후 리마인더 추가는 reinject(매 프롬프트)가 아니라 session-context(세션 1회)에 우선 배치.

## 자동 커밋/푸시 (권한 프롬프트 생략)

- 저장 방식: **레포 단위 git config** — `llm-rules.auto-commit true` / `llm-rules.auto-push true` (각각 독립 키).
- 동작: guard-commit/guard-push 가 **전 검사(Conventional Commits·트레일러·시크릿·보호 브랜치·force) 통과 시에만** `permissionDecision: allow` 로 ask 를 생략. 검사 실패는 자동 모드에서도 차단.
- **force push 는 플래그 위치 무관 차단**, `--force-with-lease` 는 차단하지 않되 자동 승인에서도 제외(항상 확인).
- co-author 차단은 기존 guard-commit 이 담당(신설 불요) — 자동 모드에서도 선행.

## 이 레포(llm-rules)

- `llm-rules.allow-main true`(기존 합의 복원) + **`auto-commit true` + `auto-push true`** 설정.
- README 는 이번에 한해 갱신 승인(hooks 7종·guard-push·/prepare-new 반영). CLAUDE.md 의 수동 convention import 목록은 제거하고 sync 관리 블록만 유지.
