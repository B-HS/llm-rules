# 프로바이더별 룰 최적화 — 공식 권장사항 점검 결과와 결정 리스트

- 작성일: 2026-11-15
- 요청: 공통 룰을 없애고 Claude Code · Codex · OpenCode · Pi 각각의 모델·하네스 권장사항에 맞게 룰을 최적화한다. 최종 결과물(코드·문서·커밋·응답)은 현재 룰이 만드는 것과 같아야 하고, 중간 과정의 불필요한 루프·검증은 각 프로바이더 권장에 맞춰 정리한다.
- 상태: 점검 완료, 결정 4건 확정(문서 끝 "결정 기록")

---

## 1. 점검한 공식 문서

| 프로바이더 | 문서 | 기준 버전 |
| --- | --- | --- |
| Anthropic | [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2) · [Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) · [Haiku 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5) | Fable 5.2 · Sonnet 5.5 · Haiku 5.5 |
| Claude Code | [Best practices](https://code.claude.com/docs/en/best-practices) · [Memory](https://code.claude.com/docs/en/memory) · [Skills](https://code.claude.com/docs/en/skills) · [Output styles](https://code.claude.com/docs/en/output-styles) | 로컬 2.1.325 |
| OpenAI | [GPT-6 prompting best practices](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra) · [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) · [Model selection](https://developers.openai.com/api/docs/guides/model-selection) | GPT-6 Astra · GPT-6.1 Sol · GPT-6.1 Terra · GPT-6 Luna |
| Codex | [Best practices](https://learn.chatgpt.com/docs/learn/best-practices) · [AGENTS.md](https://developers.openai.com/codex/guides/agents-md) · [Skills](https://developers.openai.com/codex/skills) · [Subagents](https://developers.openai.com/codex/subagents) · [Hooks](https://developers.openai.com/codex/hooks) · [Models](https://developers.openai.com/codex/models) · [Rules](https://developers.openai.com/codex/rules) | 로컬 codex-cli 0.155.1 |
| OpenCode | [Instructions](https://opencode.ai/docs/instructions/) · [Agents](https://opencode.ai/docs/agents/) · [Skills](https://opencode.ai/docs/skills/) · [Commands](https://opencode.ai/docs/commands/) · [Permissions](https://opencode.ai/docs/permissions/) · [Formatters](https://opencode.ai/docs/formatters/) · [Config](https://opencode.ai/docs/config/) | V2 (로컬 2.1.2) |
| Pi | 패키지 `@earendil-works/pi-coding-agent` 1.5.2 의 README · `docs/configuration.md` · `docs/skills.md` · `docs/prompt-templates.md` · `docs/settings.md` · `docs/security.md` · `dist/core/package-manager.js` | 1.5.2 (로컬 CLI 미설치) |

---

## 2. 결과물 계약 — 모든 에디션에서 동일하게 유지

프로바이더별로 표현과 전달 방식은 달라지지만 아래 결과는 같아야 한다. 에디션마다 이 항목이 빠지지 않았는지 `scripts/rule-parity.test.ts` 로 검사한다.

1. **응답**: 한국어 존댓말, 간결. 첫 줄은 실행 행동이나 직접 답, 2단계 이상은 번호 목록, 마지막은 다음 행동 하나 또는 완료 결과. 현재 상태 한 줄. 목록은 그룹당 5개 이하. 이모지·아스키아트 없음. 오류는 원인·관찰값·해결.
2. **코드**: common · comments · security · frontend · fsd · query · backend · desktop 문서의 모든 규칙과 예시.
3. **문서 산출물**: 2파일 또는 2스텝 이상 작업의 `docs/PROCESS.md` 체크리스트, `docs/` 분류 저장(memory · history · bug · acknowledge · utils · feedback · quality-assurance), 설명은 주석 대신 `docs/`.
4. **Git**: Conventional Commits, 히스토리 언어·스타일 우선, 논리 단위 커밋, 선별 스테이징, 검증 후 main 의 자동 커밋·푸시, AI 트레일러 없음, force push 없음.
5. **결정 지점**: 실질적 모호성은 한 번에 모아 질문, 신규 프로젝트 스택 합의, 파괴적 작업 사전 확인, 같은 가정 3회 실패 시 중단 후 진단 질문.
6. **검증**: 변경 위험을 직접 덮는 최소 검사, 같은 상태의 성공 결과 재사용, 실행하지 않은 검사를 통과로 보고하지 않음, 특수 엣지는 `docs/quality-assurance` 테스트 부채.
7. **작업 원칙**: 코드베이스·공식 문서 확인 후 구현, 근본 원인 해결, 프로젝트 환경 안에서 해결, 최소 변경, 의존성 최신·필요성 검토, `.env`·키 파일 접근 금지.

---

## 3. 프로바이더별 점검 결과

### 3.1 Claude Code (Fable 5.2 main · Sonnet 5.5 · Haiku 5.5)

| 현재 상태 | 공식 권장 | 조치 |
| --- | --- | --- |
| `~/.claude/CLAUDE.md` 가 전문 11개(약 140KB)를 `@import` 해 매 세션 전부 로드 | CLAUDE.md 는 200줄 이하. import 는 컨텍스트 비용을 줄이지 않는다. 코드 일부에만 해당하는 규칙은 `paths:` 를 가진 `.claude/rules/` 로, 절차는 Skill 로 옮긴다 (Memory · Best practices) | 상시 로드는 200줄 이하 코어만. 도메인 규칙은 `~/.claude/rules/llm-rules/*.md` 의 경로 범위 규칙으로 전환 |
| "절대", "무조건", "반드시" 강조와 금지 목록 3중 반복(index 요약 · ai-process §10 · §11) | 강조를 쌓으면 규칙을 과적용한다. 평이한 문장과 이유를 쓴다. Fable 5.2 는 `never` 를 절대 규칙으로 받아들이므로 범위와 이유를 적는다 (Best practices "What you can stop doing" · Fable 5.2 "Keep caution from piling up") | 중복 목록 제거, 규칙마다 이유·범위를 붙인 평서문으로 재작성 |
| 새 도구 작업마다 workflow 사용 여부를 묻고 대기 | 불필요한 승인 대기를 줄이고 승인 대상을 구체적으로 적는다. 상시 위임 지시는 제거 대상이다 (Fable 5.2 "Approvals" · "Review prompts and harnesses") | 결정 1 |
| workflow 사용 시 직렬 작업도 하위 작업 1개 이상 강제 | 같은 작업을 넘긴다고 답이 좋아지지 않는다. 병렬·잡음 격리·독립 리뷰일 때만 가치가 있고 토큰이 든다 (Best practices "Know what subagents cost") | 강제 위임 삭제. 위임 조건(병렬 가능 · 격리 필요 · 독립 리뷰)과 비용을 명시 |
| Haiku `xhigh` 보조 판정 | Haiku 5.5 의 `xhigh` · `max` 는 평가로 이득이 확인된 경우만 쓰고 Sonnet 5.5 와 비교한다. `high` 가 엄격한 지시 준수에 맞다 (Haiku 5.5 "Use effort to control thinking") | 결정 3 |
| 응답 형식 규칙이 CLAUDE.md 와 output-style 양쪽에 중복 | 응답 역할·어조·형식은 output style, 프로젝트 지식은 CLAUDE.md. 서로 모순되는 지침은 임의로 하나가 선택된다 (Output styles · Memory) | 응답 형식은 output-style 단일 출처로 두고 설치기가 `outputStyle` 을 설정 |
| 하위 지시 10항목을 모든 위임에 강제 | 위임 시 목표·이미 배제한 것·읽을 파일·범위를 주되 Skill 과 CLAUDE.md 는 "무엇을"만 간결히 쓴다 | 계약을 목표·근거·소유 범위·검증·보고 5요소로 압축 |
| "계속 진행" 류 지시 없음 | Fable 5.2 는 긴 작업에서 조기 종료할 수 있다. 필요하면 "Finish the whole task" 문구를 쓴다 | 코어에 완료 기준과 일반 장애물 처리 문단을 추가 |

### 3.2 Codex (GPT-6.1 Sol main)

| 현재 상태 | 공식 권장 | 조치 |
| --- | --- | --- |
| 전역 `AGENTS.md` 코어가 23KB. Codex 는 전역과 프로젝트 파일 합산 32KiB 에서 읽기를 멈춘다 | 짧고 정확한 AGENTS.md. 커지면 본문은 간결히 두고 작업별 문서를 가리킨다 (Best practices · AGENTS.md) | 코어를 10KB 안팎으로 줄여 프로젝트 `AGENTS.md` 몫을 확보 |
| "모든 작업(항상) ai-process.md 를 읽는다", "작업 전에 반드시 전문을 읽는다" | 매 편집 전에 문서 묶음을 읽게 하는 지시는 컨텍스트를 태운다. "X 작업에는 X.md" 형태의 조건부 포인터를 쓴다 (Rethinking skills and prompts) | 조건부 포인터 표로 교체 |
| workflow 질문 게이트, "체크리스트 밖은 멈추고 질문" | GPT-6 은 질문·중단이 늘었다. 리뷰 대기 요구는 조기 중단을 부른다. 승인은 구체적이고 검토 가능한 결과를 만든 뒤에 받는다. 경계 문구가 강하면 계속해도 되는 곳에서 멈춘다 (Prompting best practices "Initiative" · 블로그 "Decision boundaries" · "Persistence") | 결정 1 · 결정 2 |
| 검증 문구가 코어 · Skill · agent 에 반복 | GPT-6 은 스스로 검증한다. 같은 지시는 불필요한 테스트를 만든다. 변경에 맞는 검사를 통과하면 새 변경·실패가 있을 때만 넓힌다 ("Testing and verification") | 검증 규칙을 한 곳에 한 번만 기술 |
| 하위 모델 `gpt-5.6-terra` · `gpt-5.6-luna`, main `gpt-5.6-sol` 언급 | 현재 권장은 GPT-6.1 Sol(복잡한 작업) · GPT-6 Luna(좁고 반복적인 작업, `high` 에서 시작). Terra 는 글쓰기·시각·컴퓨터 사용용이며 CLI 0.159.0 이상 필요 (Models · Subagents) | 결정 3 |
| agent TOML 의 `sandbox_mode = "read-only"` | custom agent 파일의 `sandbox_mode` 는 부모 설정을 덮지 못한다. 읽기 전용은 지침으로만 요청할 수 있다 (Subagents) | 효과 없는 키 제거, 지침에 편집 금지를 명시 |
| Skill 설명이 길고 본문이 절차 나열 | 설명은 짧게, 언제 쓰는지 분명히. 루트 문서는 최소 라우터. 과도하게 구체적인 절차는 방해가 된다 (블로그 "Better skills") | 설명·본문 축약 |
| SessionStart matcher 에 `fork` 없음 | source 값은 `startup` · `resume` · `clear` · `compact` · `fork` (Hooks) | matcher 에 `fork` 추가 |

### 3.3 OpenCode (V2)

| 현재 상태 | 공식 권장 | 조치 |
| --- | --- | --- |
| `~/.config/opencode/AGENTS.md` 가 `~/.claude/CLAUDE.md` 심볼릭 링크. 내용은 `@import` 줄뿐 | V2 는 `AGENTS.md` 만 읽고 CLAUDE.md fallback 이 없다. 추가 파일은 `instructions` 배열로 지정한다 (Instructions) | 링크를 백업 후 실제 파일로 교체하고 OpenCode 전용 코어를 설치 |
| 전용 Skill · Subagent · 권한 설정 없음 (Claude 커맨드 사본만 존재) | Skill 은 `~/.config/opencode/skills`, Subagent 는 `mode: subagent` Markdown, 권한은 `permissions` 규칙 목록, 포매터는 `formatter` 설정 (Skills · Agents · Permissions · Formatters) | 결정 4 |
| 설치기가 전문만 복사 | `~/.claude/skills` · `~/.agents/skills` 도 읽지만 `~/.config/opencode/skills` 가 우선한다 | 같은 ID 의 OpenCode 전용 Skill 을 전용 경로에 설치해 다른 에디션 Skill 을 덮는다 |

### 3.4 Pi (1.5.2)

| 현재 상태 | 공식 권장 | 조치 |
| --- | --- | --- |
| 코어 23KB + 전문 11개, Codex 용 문구(Subagent workflow · 모델 표) 포함 | 가장 약한 수단부터: 지침은 `AGENTS.md`, 작업별 지침은 Skill, 실행 동작은 Extension. Pi 는 sub-agent · plan mode · 권한 확인이 내장되어 있지 않다 (Quickstart · README · Security) | Pi 전용 코어에서 위임·모델 라우팅을 제거하고 직접 수행 기준으로 작성 |
| Skill 은 `~/.agents/skills` 의 Codex 용을 그대로 읽음 | `~/.pi/agent/skills` 가 `~/.agents/skills` 보다 먼저 등록되어 이름 충돌 시 우선한다 (`package-manager.js`) | 같은 이름의 Pi 전용 Skill 을 `~/.pi/agent/skills` 에 설치 |
| hook · 권한 계층 없음 | 도구 호출은 Pi 프로세스 권한으로 실행된다. 차단이 필요하면 Extension 또는 격리 환경을 쓴다 (Security) | 결정 4 |

---

## 4. 구조 변경 (결정 없이 진행)

요청에서 이미 확정된 내용이다.

- `docs/convention/` 과 `docs/agents-core.md` 를 삭제하고 `docs/{claudecode,codex,opencode,pi}/` 가 각자 전체 룰을 소유한다.
- 설치기는 에디션별로 분리한다: `install-claude-code` · `install-codex` · `install-opencode` · `install-pi`. `sync-claude-md` 와 `init-agents` 는 에디션 설치기로 흡수한다.
- Cursor `.cursor/rules` 생성은 대상 4종 밖이라 제거한다.
- 문서 사이트와 README 를 4개 에디션 구조로 바꾼다.
- 기존 설치본(`~/.claude/convention`, CLAUDE.md 의 `rules-convention` 블록, 각 `llm-rules/` 사본)은 새 설치기가 백업 후 정리한다.

---

## 5. 결정 필요

과거에 사용자가 명시적으로 정한 규칙을 바꾸는 항목이라 확인을 받는다.

1. **workflow 질문 게이트** — **A안(추천): 질문을 없애고 명시적 opt-in 으로 전환.** 기본은 main 직접 수행이고 workflow 커맨드·Skill 을 호출하거나 요청에 workflow 를 쓰라고 적으면 다중 에이전트로 진행한다. / B안: 현행 유지(작업·재개마다 질문) / C안: 세션당 1회만 질문
2. **체크리스트 밖 작업** — **A안(추천): 요청 범위 안에서 완료에 필요한 항목은 체크리스트에 추가하고 계속 진행, 범위 확장·정책 결정·파괴적 작업만 멈추고 질문.** / B안: 현행 유지(체크리스트 밖은 항상 멈추고 질문)
3. **모델 라우팅** — **A안(추천): 공식 문서 기준으로 갱신.** Codex 하위 작업은 `gpt-6.1-sol` `medium`(복잡한 구현·보안은 `high`)과 `gpt-6-luna` `high`, Claude 보조 판정은 Haiku `xhigh` 에서 `high` 로. / B안: Codex 만 갱신하고 Haiku `xhigh` 유지 / C안: 현행 유지
4. **OpenCode · Pi 범위** — **A안(추천): 네이티브 선언형 자산까지.** OpenCode 는 코어 · 참조 문서 · Skills · Commands · Subagents · `permissions` · `formatter`, Pi 는 코어 · 참조 문서 · Skills. TypeScript 플러그인·확장은 제외한다(로컬에 Pi 가 없어 실행 검증 불가). / B안: OpenCode 플러그인과 Pi 확장으로 시크릿 차단 · lint · 세션 컨텍스트까지 이식

## 결정 기록

2026-11-15 사용자 응답.

1. **workflow 질문 게이트 → A안.** 질문을 없애고 명시적 opt-in 으로 전환한다. `docs/acknowledge/2026-09-18-workflow-selection-gate.md` 의 결정을 대체한다.
2. **체크리스트 밖 작업 → A안.** 요청 범위 안에서 완료에 필요한 항목은 체크리스트에 추가하고 계속 진행한다. 범위 확장·정책 결정·파괴적 작업만 멈추고 묻는다.
3. **모델 라우팅 → 공식 기준으로 갱신하되, 룰에는 모델의 버전을 빼고 이름만 적는다.** 사유는 추후 유지보수 편의다. 룰·Skill·문서 본문은 Sol · Luna · Fable · Sonnet · Haiku 처럼 이름만 쓰고, 실제 슬러그가 필요한 Codex 설정은 설치기의 단일 상수에서만 관리한다. Claude 보조 판정은 Haiku `high` 로 낮춘다.
4. **OpenCode · Pi 범위 → B안.** 선언형 자산에 더해 OpenCode 플러그인과 Pi 확장으로 시크릿 차단 · lint · 세션 컨텍스트 주입을 이식한다.
