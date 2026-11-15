# Codex 에디션

Codex 전용으로 다시 쓴 룰과 네이티브 자산이다. 다른 에디션과 결과물(코드·문서·커밋·응답)은 같고, 전달 방식과 작업 과정은 OpenAI 의 GPT-6 계열 권장에 맞췄다.

## 설치

```bash
bun run install-codex --global --all
bun run install-codex --project --all
bun run install-codex --global --all --dry-run
```

클론 없이 설치하려면 아래 명령을 쓴다. Bun 이 필요하다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules codex --global --all
```

## 구성

| 항목 | 설치 위치 | 역할 |
| --- | --- | --- |
| `instructions` | `~/.codex/AGENTS.md` · `~/.codex/llm-rules/` | [코어](./rules/core.md) 관리 블록과 조건부로 읽는 참조 문서 9개 |
| `skills` | `~/.agents/skills/llm-rules-*` | 반복 절차 10종 |
| `agents` | `~/.codex/agents/*.toml` | workflow 작업자 4종과 reviewer 7종 |
| `hooks` | `~/.codex/hooks.json` · `~/.codex/hooks/llm-rules/` | 시크릿 차단, 편집 후 lint, 진행 중인 PROCESS 작업 주입 |
| `config` | `~/.codex/config.toml` 의 `[agents]` | subagent 기본 모델과 동시 실행 수 |
| `rules` | `~/.codex/rules/llm-rules.rules` | Execpolicy: 일반 Git 허용, force push · `rm -rf` 금지 |

설치기는 `AGENTS.md` 의 관리 블록만 교체하고 `config.toml` · `hooks.json` 의 사용자 값을 보존한다. hook 은 새 세션의 `/hooks` 에서 신뢰 승인해야 실행된다.

## 이 에디션에서 달라진 것

| 변경 | 근거 |
| --- | --- |
| 코어를 23KB 에서 11KB 로 축소 | Codex 는 전역과 프로젝트 `AGENTS.md` 합산 32KiB 에서 읽기를 멈춘다. 본문은 간결히 두고 작업별 문서를 가리킨다 ([AGENTS.md](https://developers.openai.com/codex/guides/agents-md) · [Best practices](https://learn.chatgpt.com/docs/learn/best-practices)) |
| "항상 전문을 읽는다"를 작업별 조건부 포인터로 교체 | 매 편집 전에 문서를 읽게 하면 컨텍스트를 태운다 ([Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)) |
| workflow 질문 게이트 삭제, 완료 기준과 승인 없이 진행하는 일 명시 | 리뷰 대기 요구는 조기 중단을 부르고 강한 경계 문구는 계속해도 되는 곳에서 멈추게 한다 (같은 글 "Decision boundaries" · "Persistence", [Prompting best practices](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra) "Initiative and follow-through") |
| 검증 규칙을 한 곳에만 기술, 통과 후 넓히는 조건 명시 | GPT-6 은 스스로 검증하므로 반복 지시는 불필요한 테스트를 만든다 (같은 문서 "Testing and verification") |
| Skill 설명과 본문 축약 | 설명은 짧게 쓰고 언제 쓰는지 분명히 한다 (같은 글 "Better skills") |
| agent TOML 의 `sandbox_mode` 제거 | custom agent 파일의 `sandbox_mode` 는 부모 설정을 덮지 못한다 ([Subagents](https://developers.openai.com/codex/subagents)) |
| SessionStart matcher 에 `fork` 추가 | source 값은 `startup` · `resume` · `clear` · `compact` · `fork` 다 ([Hooks](https://developers.openai.com/codex/hooks)) |

## 모델

| 역할 | 모델 | reasoning effort |
| --- | --- | --- |
| main | 세션에서 고른 모델을 그대로 쓴다 | 세션 설정 |
| 구현, 백엔드·Query reviewer | Sol | medium |
| 보안·데스크톱 reviewer | Sol | high |
| 조사, 검증, 보조 판정, 컨벤션·FSD·타입 reviewer | Luna | high |

룰과 Skill 에는 모델 이름만 적는다. 실제 슬러그는 `scripts/install-codex.ts` 의 `DEFAULT_MODEL_SLUGS` 한 곳에 있고, 설치할 때 `--sol-model` · `--luna-model` 로 바꿀 수 있다.

## 확인

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

새 세션에서 `/hooks` 로 hook 3종을 신뢰 승인하고 `/skills` 에서 `llm-rules-*` 10종을 확인한다.
