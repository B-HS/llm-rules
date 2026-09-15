# Codex Custom Agents와 Rules

## Custom Agents

Claude Code reviewer 7종을 Codex Custom Agent TOML로 이식했습니다. 모두 `sandbox_mode = "read-only"`이며 코드 변경 없이 근거가 있는 검토 결과만 반환합니다.

| Agent | 검토 영역 |
|---|---|
| `convention_reviewer` | TypeScript·React 공통 컨벤션 |
| `fsd_dependency_reviewer` | FSD 의존 방향과 구조 |
| `type_utility_reviewer` | 타입 원본 유도 가능성 |
| `backend_convention_reviewer` | Hono·Drizzle 계층 경계 |
| `security_reviewer` | 시크릿·입력 경계·injection·인가·로그 |
| `tanstack_query_reviewer` | Query v5 캐시 의미와 서버 상태 경계 |
| `desktop_security_reviewer` | Electron·Tauri preload·IPC·외부 URL 경계 |

글로벌 파일은 `~/.codex/agents`, 프로젝트 파일은 `.codex/agents`에 설치됩니다. 특정 reviewer 이름을 요청해 위임할 수 있고, Codex는 `AGENTS.md` 또는 Skill 지침에 따라 적합한 agent를 선택할 수도 있습니다.

## Execpolicy Rules

`llm-rules.rules`는 다음 정책을 적용합니다.

- `rm -rf`는 forbidden입니다.
- `git push --force`와 `git push -f`는 forbidden입니다. 후치 force flag는 `guard-push.sh`가 추가로 차단합니다.
- `git commit`, `push`, `merge`, `rebase`는 prompt입니다.
- `git status`, `diff`, `log`와 프로젝트의 `bun run typecheck`, `bun run build`, `bun test`는 allow입니다.

규칙은 명령 인자 prefix를 평가하고 여러 규칙이 맞으면 `forbidden > prompt > allow` 중 가장 제한적인 결정을 사용합니다. 설치 전후에 다음처럼 실제 판정을 검사할 수 있습니다.

```bash
codex execpolicy check --pretty --rules ~/.codex/rules/llm-rules.rules -- git push --force origin main
```

Rules의 allow는 sandbox 밖 실행 허용을 의미하므로 읽기·검증 명령처럼 범위가 명확한 prefix만 허용합니다. Hooks의 내용 검사와 Rules의 prefix 판정을 함께 사용합니다.
