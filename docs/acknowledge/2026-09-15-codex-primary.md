# 2026-09-15 — Codex 기본 실행 환경 전환

## 사용자 결정

- llm-rules의 본진과 기본 설치 경로를 Codex로 전환합니다.
- Claude Code 기능은 제거하지 않고 호환 에디션으로 유지합니다.
- Codex에서는 `AGENTS.md`, Hooks, Skills, Custom Agents, Execpolicy Rules로 Claude Code의 instructions, hooks, commands, subagents, permissions, output style을 대응합니다.
- 이번 변경은 검증 후 현재 저장소에 커밋하고 원격 `main`에 푸시합니다.

## 구현 기준

- Codex의 deprecated Custom Prompts 대신 Skills를 사용합니다.
- 여러 자산군을 모두 포함하지 못하는 플러그인 패키징 대신 Codex 전용 설치 CLI를 완전한 설치 단위로 사용합니다.
- 기존 사용자 `AGENTS.md` 내용과 비관리 hook을 보존하며, 관리 자산만 멱등 갱신합니다.
