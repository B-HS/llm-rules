# Codex Custom Agents와 Rules

## Custom Agents

Codex Subagent workflow는 main orchestrator와 worker·reviewer를 분리합니다. main은 요구사항, 분해, 결과·검증 증거 통합과 Git을 소유합니다. worker와 reviewer는 commit·push를 수행하지 않습니다.

| Worker                          | 모델·sandbox                   | 역할                                             |
| ------------------------------- | ------------------------------ | ------------------------------------------------ |
| `implementation_worker`         | Terra high, `workspace-write`  | 지정 소유 범위 구현과 관련 검증                  |
| `verification_worker`           | Luna high, `workspace-write`   | 위험 비례 최소 검증과 성공 증거 전달             |
| `edge_case_verification_worker` | Luna xhigh, `workspace-write`  | 남은 모호성의 단일 검사 또는 테스트 부채 판정    |
| `research_worker`               | Terra high, `read-only`        | 공식 문서·실제 코드 근거 조사                    |

Reviewer 7종은 코드 변경 없이 근거가 있는 검토 결과만 반환합니다. 의미론적·복합 검토에는 Terra high, 좁고 반복 가능한 검토에는 Luna high를 사용합니다.

| Agent                         | 검토 영역                                |
| ----------------------------- | ---------------------------------------- |
| `convention_reviewer`         | TypeScript·React 공통 컨벤션             |
| `fsd_dependency_reviewer`     | FSD 의존 방향과 구조                     |
| `type_utility_reviewer`       | 타입 원본 유도 가능성                    |
| `backend_convention_reviewer` | Hono·Drizzle 계층 경계                   |
| `security_reviewer`           | 시크릿·입력 경계·injection·인가·로그     |
| `tanstack_query_reviewer`     | Query v5 캐시 의미와 서버 상태 경계      |
| `desktop_security_reviewer`   | Electron·Tauri preload·IPC·외부 URL 경계 |

글로벌 파일은 `~/.codex/agents`, 프로젝트 파일은 `.codex/agents`에 설치됩니다. `$llm-rules-subagent-workflow`는 각 위임에 목표·완료 조건·파일 근거·소유권·규칙·순서·edge case·최소 검증·성공 증거·보고·Git 금지·의존 관계를 명시하도록 요구합니다.

주 검증은 변경 위험과 직접 연결된 최소 검사만 실행합니다. 같은 변경 상태에서 성공한 결과는 main과 worker가 재사용하며 다시 실행하지 않습니다. 원인 수정 뒤 관련 검사 1회로 제한하고 같은 실패가 세 번 이어지면 중단합니다. 남은 모호성이 결과를 바꿀 때만 Luna xhigh worker를 쓰며, 지나치게 특수한 사례는 `docs/quality-assurance`의 테스트 부채로 남깁니다.

## Execpolicy Rules

`llm-rules.rules`는 다음 정책을 적용합니다.

- `rm -rf`는 forbidden입니다.
- 모든 force push는 파괴적 예외로 forbidden입니다.
- 일반 `git commit`, `push`는 별도 llm-rules 승인·차단 hook 없이 allow이며 `merge`, `rebase`는 prompt입니다.
- `git status`, `diff`, `log`와 프로젝트의 `bun run typecheck`, `bun run build`, `bun test`는 allow입니다.

규칙은 명령 인자 prefix를 평가하고 여러 규칙이 맞으면 `forbidden > prompt > allow` 중 가장 제한적인 결정을 사용합니다. 설치 전후에 다음처럼 실제 판정을 검사할 수 있습니다.

```bash
codex execpolicy check --pretty --rules ~/.codex/rules/llm-rules.rules -- git push --force origin main
```

일반 commit·push의 allow와 force push의 forbidden은 llm-rules Execpolicy 내부 정책입니다. Codex 실행 환경 자체의 sandbox나 저장소 외부 정책을 우회한다는 의미는 아닙니다.
