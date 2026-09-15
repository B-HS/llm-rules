# 자율 Git·검증 예산·응답 규칙 검증

## 대상

- 일반 `git commit`·`git push`의 프로젝트 승인·차단기 제거
- Codex Luna xhigh·Claude Code Haiku xhigh 엣지 검증 worker 추가
- 위험비례 최소 검증, 성공 결과 재사용, 특수 엣지케이스 테스트 부채 계약
- 다음 행동·현재 상태·구체적 결과 중심의 응답 규칙

## 검증 결과

- [x] 양쪽 installer 회귀 테스트 — 2개 테스트, 69개 assertion 성공
- [x] Codex JSON·TOML·활성 hook 3개와 Claude Code JSON·agent frontmatter·활성 hook 3개 파싱 성공
- [x] 양쪽 global `--all --dry-run`과 범위 diff 검사 성공
- [x] 변경 TypeScript·TSX·Markdown Prettier 검사와 원격 shell installer `bash -n` 성공
- [x] `BASE_PATH=/llm-rules/ bun run build` — 23개 정적 경로 생성 성공
- [x] `git diff --check` 성공
- [x] 글로벌 Codex·Claude Code 재설치 — guard 4개 제거, Git guard handler 없음, agent 각 11개 확인

## 검증 예산 결정

`bun run typecheck`는 별도로 실행하지 않았습니다. 변경된 installer TypeScript는 실제 installer를 실행하는 회귀 테스트와 dry-run으로, TSX는 프로덕션 정적 빌드로 직접 검증했습니다. 같은 입력과 환경에서 성공한 검사를 다시 실행하지 않았고, 설치기 병합 수정 뒤에는 직접 영향받는 회귀 테스트만 한 번 실행했습니다.

## 테스트 부채

### force 옵션의 임의 위치

- 대상: `git push origin main --force`처럼 force 옵션이 뒤에 오는 명령
- 보류 이유: 현재 플랫폼의 prefix 정책만으로 모든 인자 위치를 결정적으로 판별하려면 사용자가 제거하도록 지정한 Git guard를 다시 도입해야 함
- 현재 방어: 대표적인 선행 force 형식은 네이티브 정책으로 거부하고, 모든 force push는 공통 Git 규칙에서 계속 금지
- 최소 재현: Codex는 `codex execpolicy check --pretty --rules docs/codex/assets/rules/llm-rules.rules -- git push origin main --force`, Claude Code는 permission 정책의 동등한 dry check
- 재개 조건: 플랫폼이 임의 인자 위치 매칭을 지원하거나 사용자가 비차단형 force 전용 네이티브 정책을 요청할 때
- 위험: 오케스트레이터의 규칙 준수와 원격 브랜치 보호가 최종 방어이며, 프로젝트 수준의 일반 commit·push 흐름은 차단하지 않음

## 공식 기준

- OpenAI GPT-5.6 Luna 모델 문서의 `xhigh` reasoning 지원
- Claude Code subagent 문서의 `haiku` model과 `effort: xhigh` frontmatter 지원
- Claude Code model configuration 문서의 모델 alias·effort 동작
