# Codex Skills

Codex의 반복 절차는 Skills로 제공합니다. tool을 사용하는 실행 작업에는 `$llm-rules-subagent-workflow`를 먼저 적용합니다.

| Skill                             | 역할                                                                |
| --------------------------------- | ------------------------------------------------------------------- |
| `$llm-rules-audit-conventions`    | 변경 TS·JS의 타입·포맷·금지 패턴과 실제 코드 감사                   |
| `$llm-rules-audit-fsd`            | FSD 레이어 방향·배치·SFC·alias·순환 감사                            |
| `$llm-rules-audit-backend-domain` | 특정 백엔드 도메인의 route·service·dto·compose 감사                 |
| `$llm-rules-audit-query`          | TanStack Query 키·무효화·신선도·게이팅 감사                         |
| `$llm-rules-verify`               | typecheck→lint·format→관련 테스트→실행 확인                         |
| `$llm-rules-process`              | `docs/PROCESS.md` 체크리스트 생성·갱신                              |
| `$llm-rules-save-docs`            | 완료 결과를 docs 분류 체계에 저장                                   |
| `$llm-rules-log-feedback`         | 사용자 교정을 `docs/feedback`에 기록                                |
| `$llm-rules-prepare-new`          | `docs/HANDOFF.md`와 새 세션 재개 프롬프트 생성                      |
| `$llm-rules-subagent-workflow`    | 상세 위임, 병렬·직렬 조율, 통합과 자동 Git을 위한 Subagent workflow |

Skills는 이름과 description만 먼저 노출되고, 선택될 때 `SKILL.md` 전문을 읽습니다. `$skill-name`으로 명시 호출하거나 요청이 description과 맞을 때 Codex가 자동 적용할 수 있습니다.

글로벌 Skills는 `~/.agents/skills`, 프로젝트 Skills는 저장소의 `.agents/skills`에 설치됩니다. 동일한 이름의 Skill이 여러 scope에 있으면 병합되지 않으므로 한 scope에서 관리하는 것을 권장합니다.
