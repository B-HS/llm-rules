# Codex 네이티브 지원 검증

검증일: 2026-09-15

## 정적·빌드 검증

- [x] `bun run typecheck` 통과
- [x] `BASE_PATH=/llm-rules/ bun run build` 통과, 컨벤션·Codex·Claude Code 22개 페이지 생성
- [x] 생성 HTML의 `/llm-rules/codex/*`, `/llm-rules/claude-code/*`, 교차 문서 링크 확인
- [x] `git diff --check` 통과
- [x] lint·format 전용 스크립트와 로컬 Prettier가 없어 별도 lint·format 검사는 생략
- [x] 저장소에 기존 테스트 파일과 `test` 스크립트가 없어 테스트 실행은 생략

## Codex 자산 검증

- [x] hook 스크립트 7개와 원격 설치기 `bash -n` 통과
- [x] 커밋 보호 브랜치, force push, 시크릿 패턴 차단이 각각 exit code 2를 반환
- [x] edit lint의 금지 패턴이 `decision: block`을 반환
- [x] SessionStart·UserPromptSubmit·Stop hook JSON 계약 확인
- [x] Skill Creator `quick_validate.py`로 Skills 9개 검증
- [x] Bun TOML parser로 Custom Agents 7개 검증
- [x] `codex execpolicy check`로 forbidden·prompt·allow 판정 확인

## 설치 검증

- [x] 글로벌 전체 설치 dry-run이 쓰기 없이 11개 전문, hook 7개, Skill 9개, Agent 7개, Rule 1개를 보고
- [x] 임시 프로젝트에서 기존 `AGENTS.md`와 비관리 hook을 보존
- [x] 로컬 CLI를 같은 대상에 두 번 실행해 결과 checksum 동일 확인
- [x] release 번들 mock으로 원격 설치기를 같은 대상에 두 번 실행해 중복 없음 확인
- [x] 현재 사용자 글로벌 Codex에 전체 자산 설치 후 수량과 `hooks.json`, Execpolicy 판정 재확인
- [x] Claude Code 전용 installer·hooks·commands·agents·output-style 파일의 diff 0건 확인

## 환경 참고

`codex doctor --summary`에서 설치·config·auth·sandbox는 정상으로 확인됐습니다. 현재 머신의 기존 Codex state database 무결성, thread inventory, provider endpoint 접근과 선택적 MCP 환경변수 경고는 별도 환경 문제로 보고됐으며 이번 자산 설치 범위에서는 변경하지 않았습니다.
