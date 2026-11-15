# Claude Code 에디션

Claude Code 전용으로 다시 쓴 룰과 네이티브 자산이다. 다른 에디션과 결과물(코드·문서·커밋·응답)은 같고, 전달 방식과 작업 과정은 Anthropic 권장에 맞췄다.

## 설치

```bash
bun run install-claude-code --global --all
bun run install-claude-code --project --all
bun run install-claude-code --global --all --dry-run
```

클론 없이 설치하려면 아래 명령을 쓴다. Bun 이 필요하다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules claude-code --global --all
```

## 구성

| 항목 | 설치 위치 | 역할 |
| --- | --- | --- |
| `rules` | `~/.claude/rules/llm-rules/` | 상시 로드되는 [코어](./rules/core.md)와 경로 범위 도메인 규칙 8개 |
| `output-style` | `~/.claude/output-styles/llm-rules.md` | 응답 형식. `settings.json` 의 `outputStyle` 로 활성화 |
| `commands` | `~/.claude/commands/llm-rules/` · `prepare-new.md` | `/llm-rules:process` · `save-docs` · `log-feedback` · `verify` · `audit-*` · `workflow`, `/prepare-new` |
| `agents` | `~/.claude/agents/` | workflow 작업자 4종과 reviewer 7종 |
| `hooks` | `~/.claude/hooks/llm-rules/` | 시크릿 차단, 편집 후 lint, 진행 중인 PROCESS 작업 주입 |
| `settings` | `~/.claude/settings.json` | 모델·effort, 권한, hook 연결, 커밋 서명 제거 |

설치기는 사용자 소유 파일을 보존한다. `settings.json` 은 병합하고, `agents/` 에는 파일 단위로만 복사하며, 변경 전 `.bak` 를 만든다. 이전 버전이 만든 `CLAUDE.md` 의 `@import` 블록과 `~/.claude/convention/` 은 정리한다.

## 이 에디션에서 달라진 것

| 변경 | 근거 |
| --- | --- |
| 전문 11개를 `@import` 하던 구조를 200줄 이하 코어와 `paths:` 규칙으로 전환 | CLAUDE.md 는 200줄 이하가 권장이고 import 는 컨텍스트 비용을 줄이지 않는다. 일부 코드에만 해당하는 규칙은 경로 범위 규칙으로 둔다 ([Memory](https://code.claude.com/docs/en/memory)) |
| 강조 표현과 금지 목록 반복을 제거하고 이유를 붙인 평서문으로 재작성 | 강조를 쌓으면 규칙을 과적용한다 ([Best practices](https://code.claude.com/docs/en/best-practices)). Fable 은 `never` 를 절대 규칙으로 받아들인다 ([Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2)) |
| workflow 질문 게이트를 없애고 `/llm-rules:workflow` 호출이나 명시 요청으로 전환 | 불필요한 승인 대기와 상시 위임 지시는 제거 대상이다 (같은 문서 "Approvals" · "Review prompts and harnesses") |
| 직렬 작업의 강제 위임 삭제, 위임 조건과 비용 명시 | 같은 작업을 넘긴다고 답이 좋아지지 않는다 ([Best practices](https://code.claude.com/docs/en/best-practices) "Know what subagents cost") |
| 응답 형식을 output style 단일 출처로 이동, `keep-coding-instructions: true` 추가 | 응답 역할·어조·형식은 output style 이 담당한다 ([Output styles](https://code.claude.com/docs/en/output-styles)) |
| 보조 판정 작업자를 Haiku `high` 로 조정 | Haiku 의 `xhigh` 는 이득이 확인된 경우에만 쓴다 ([Prompting Claude Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5)) |
| SessionStart hook 은 진행 중인 PROCESS 작업만 주입 | 정적 규칙은 코어가 담당하고 hook 은 바뀌는 상태만 전달한다 |
| `attribution` 설정으로 커밋·PR 서명과 세션 링크 제거 | 예외가 없는 규칙은 설정으로 강제한다 ([Best practices](https://code.claude.com/docs/en/best-practices)) |

## 모델

| 역할 | 모델 | effort |
| --- | --- | --- |
| 메인 세션 | Fable | high |
| 구현 · 조사 · 검증 · reviewer | Sonnet | high |
| 보조 판정 | Haiku | high |

룰과 자산에는 모델 이름만 적는다. Claude Code 가 `fable` · `sonnet` · `haiku` 별칭을 현재 버전으로 풀어 준다.

## 확인

새 세션에서 아래를 확인한다.

1. `/context all` 의 Memory files 에 `rules/llm-rules/core.md` 가 보인다.
2. TypeScript 파일을 읽은 뒤 다시 실행하면 `common.md` · `comments.md` · `security.md` 가 추가된다.
3. `/hooks` 에 PreToolUse · PostToolUse · SessionStart 가 보인다.
4. `/doctor prompt-audit` 로 지침 간 충돌이나 낡은 지시가 없는지 점검한다.
