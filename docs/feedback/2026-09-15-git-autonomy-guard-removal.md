# Git 자율 실행에서 승인·차단기 제거

## 대상 파일

- `docs/codex/assets/hooks.json`과 Git hook 자산
- `docs/claudecode/assets/settings.json`과 Git hook 자산
- 양쪽 설치기와 Git 운영 문서

## 지적

자동 commit·push를 규정하면서도 `guard-commit`·`guard-push`와 Claude Code의 `ask` 권한을 유지해 Git 실행 전에 승인·차단 계층이 계속 개입했습니다.

## 교정

일반 commit·push는 llm-rules가 추가한 사전 hook 없이 무조건 허용하고 메인 오케스트레이터가 자동 실행합니다. Conventional Commit, 선별 staging, 사용자 단독 author는 운영 계약으로 유지합니다. Force push는 파괴적 작업 예외이므로 일반 Git 자율화에 포함하지 않습니다.

## 적용 시점

자동 Git을 제공하는 모든 Codex·Claude Code 설치와 이후 관련 규칙 변경에 적용합니다.

## 승격

사용자가 공통 규칙 반영을 명시적으로 요청하고 충돌 확인 뒤 승인했으므로 `docs/convention/git.md`와 플랫폼 workflow로 승격합니다.
