# settings.json — 권한·훅 설정

> `docs/claudecode/assets/settings.json` 은 llm-rules Claude Code 에디션의 **enforce 레이어 연결부**입니다.
> 컨벤션 prose(`docs/convention/*.md`)를 복제하지 않고, **메인 모델·effort, permissions(허용/확인/거부), hooks(훅 스크립트 연결)** 를 선언합니다.
> 이 문서는 실제 자산 파일(`assets/settings.json`, `assets/hooks/*.sh`)과 설치 스크립트(`scripts/install-claude-code.ts`)의 동작을 그대로 기술합니다.

---

## 1. 구조 한눈에

`settings.json` 의 관리 최상위 키는 네 개입니다.

```json
{
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "model": "fable",
    "effortLevel": "high",
    "permissions": { "allow": [...], "ask": [...], "deny": [...] },
    "hooks": { "PreToolUse": [...], "PostToolUse": [...], "SessionStart": [...] }
}
```

- **model / effortLevel** — Fable high를 workflow 메인 오케스트레이터 기본값으로 설정합니다. 구현·리서치·주 검증은 Sonnet high, 남은 실질적 애매성의 최소 보조 판정은 Haiku xhigh 서브에이전트가 맡습니다.
- **permissions** — 어떤 Bash/Read/Write/Edit 호출을 바로 허용할지(allow), 사용자에게 물어볼지(ask), 차단할지(deny) 결정합니다.
- **hooks** — Claude Code 의 라이프사이클 이벤트마다 llm-rules 훅 스크립트를 실행해 컨벤션을 **결정론적으로 강제/주입**합니다.

---

## 2. permissions 의미

권한은 **deny > ask > allow** 순으로 평가됩니다. 매칭되지 않은 호출은 Claude Code 기본 정책(보통 확인 프롬프트)을 따릅니다.

### 2.1 allow — 확인 없이 즉시 실행

자주 쓰는 안전한 읽기/빌드/검증 명령을 프롬프트 없이 허용합니다.

| 패턴 | 의미 |
|------|------|
| `Bash(bun:*)`, `Bash(bunx:*)` | Bun 런타임 명령 (common §1 의 Bun 기준) |
| `Bash(bun run dev:*)`, `Bash(bun run build:*)`, `Bash(bun run typecheck:*)` | 개발/빌드/타입체크 스크립트 |
| `Bash(bun test:*)` | Bun 테스트 러너 |
| `Bash(tsc:*)` | 타입체크 (`tsc --noEmit`) |
| `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)`, `Bash(git push:*)` | workflow 메인의 일반 Git 작업. commit·push도 승인이나 Git 전용 PreToolUse guard 없이 즉시 실행 |

### 2.2 ask — 실행 전 사용자 확인

히스토리 구조를 바꾸거나 의존성을 추가하는 명령은 기본적으로 **확인 대상**입니다. 일반 commit·push는 ask 대상이 아닙니다.

| 패턴 | 의미 |
|------|------|
| `Bash(git merge:*)`, `Bash(git rebase:*)` | 히스토리 변경 |
| `Bash(npm install:*)`, `Bash(npm i:*)`, `Bash(pnpm add:*)`, `Bash(yarn add:*)` | 의존성 추가 |

### 2.3 deny — 무조건 차단

시크릿 노출·파괴적 명령을 원천 차단합니다. (security §1, git.md §6)

| 패턴 | 의미 |
|------|------|
| `Read(./.env)`, `Read(./.env.*)`, `Read(./**/.env)`, `Read(./**/.env.*)` | `.env` 파일 읽기 금지 |
| `Read(./secrets/**)` | `secrets/` 디렉토리 읽기 금지 |
| `Edit(./.env)`, `Edit(./.env.*)`, `Edit(./secrets/**)` | `.env`·`secrets/` 쓰기/수정 금지 (파일 권한 검사는 `Edit(path)` 규칙만 매칭하며 Write/Edit/MultiEdit 모두 커버) |
| `Bash(rm -rf:*)` | 재귀 강제 삭제 금지 |
| `Bash(git add .env:*)` | `.env` 스테이징 금지 |
| `Bash(git push --force:*)`, `Bash(git push -f:*)`, `Bash(git push --force-with-lease:*)`, `Bash(git push --force-if-includes:*)` | 강제 푸시 금지 |

> 주의: deny 는 매칭되는 **정확한 호출 형태**만 막습니다. 예컨대 `Bash(rm -rf:*)` 는 `rm -rf …` 명령을 막지만, 다른 파괴적 표현까지 전부 차단하진 않습니다. force push는 deny와 workflow 금지 규칙을 함께 적용하며, 일반 commit·push에는 차단기를 두지 않습니다.

---

## 3. hooks 연결

각 hook 항목의 `command` 는 자산에서 `$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/<script>.sh` 로 적혀 있고, 설치 시 위치에 맞게 경로가 치환됩니다(§4.2). 연결 관계는 다음과 같습니다.

| 이벤트 | matcher / 조건 | 스크립트 | timeout | 동작 |
|--------|----------------|----------|:---:|------|
| **PreToolUse** | `Edit\|Write\|MultiEdit` | `scan-secrets.sh` | 15s | 새로 쓰는 내용에 고신뢰 시크릿(`AKIA…`, `gh[pousr]_…`, `sk-…`, `BEGIN … PRIVATE KEY`, `xox…`)이 있으면 exit 2 차단. `.md`/`.mdx`/`.txt` 는 예시 오탐 방지로 건너뜀. |
| **PostToolUse** | `Edit\|Write\|MultiEdit` | `lint-edit.sh` | 60s | TS/JS 만 검사(아니면 no-op). `prettier --write` 후, HARD 위반은 `{"decision":"block"}` 으로 수정 요구(useCallback/useMemo, backend 경로의 `throw new Error`·`process.env` 직접접근), SOFT 위반은 `systemMessage` 경고(function 키워드·코드 주석·page/layout 외 default export·HACK/FIXME/@ts-ignore·sanitize 없는 dangerouslySetInnerHTML). |
| **SessionStart** | `startup\|resume\|clear\|compact` | `session-context.sh` | 15s | 컨벤션 핵심 요약 + (있으면) `docs/PROCESS.md` 앞부분(최대 200줄)을 `additionalContext` 로 주입. `docs/` 디렉토리 보장. |

> 모든 훅은 `jq` 가 없으면 `exit 0`(no-op)으로 안전하게 빠집니다.

### 3.1 차단 방식의 차이

- **exit 2 (PreToolUse)**: 도구 실행 자체를 막습니다. `scan-secrets`가 사용합니다.
- **`{"decision":"block"}` (PostToolUse)**: 편집은 이미 끝났으므로 차단 대신 Claude 에게 **수정/재작업을 요구**합니다. `lint-edit`(HARD)가 사용합니다.
- **`systemMessage` / `additionalContext`**: 차단 없이 경고·컨텍스트만 전달합니다. `lint-edit`(SOFT)·`session-context`가 사용합니다.

---

## 4. 글로벌 vs 프로젝트 설치

설치 스크립트(`bun run install-claude-code`)는 설치 위치를 **global / project** 중에 고릅니다.

| 구분 | 위치(`claudeDir`) | settings 경로 | 적용 범위 |
|------|-------------------|---------------|-----------|
| **global (user)** | `$HOME/.claude` | `~/.claude/settings.json` | 모든 프로젝트 공통 |
| **project** | 프로젝트 루트의 `.claude` | `<project>/.claude/settings.json` | 해당 레포에서만 |

### 4.1 우선순위 — project > user

Claude Code 는 **프로젝트 설정이 사용자(글로벌) 설정보다 우선**합니다. 같은 권한·훅이 양쪽에 있으면 프로젝트 쪽이 적용됩니다. 따라서:

- 팀/레포 전용 규칙은 **project** 에, 개인 공통 기본값은 **global** 에 두는 구성이 자연스럽습니다.
- 양쪽에 설치했다면, 충돌 시 프로젝트 값이 이긴다는 점을 염두에 두세요.

### 4.2 hook command 경로 차이

설치 위치에 따라 훅 `command` 의 경로 기준이 달라집니다(설치 스크립트가 자동 치환).

- **global**: `$HOME/.claude/hooks/llm-rules/<script>.sh` (절대 경로)
- **project**: `$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/<script>.sh` (프로젝트 기준)

> `settings` 만 설치하고 `hooks` 를 빼면 스크립트 파일이 없어 훅이 동작하지 않습니다. 설치 스크립트가 이 경우 경고합니다. **settings 와 hooks 는 함께 설치**하세요.

---

## 5. 비파괴 병합 — 멱등 · 기존 설정 보존

설치 스크립트의 `mergeSettings` 는 기존 `settings.json` 을 덮어쓰지 않고 **병합**합니다.

### 5.1 백업 (.bak)

- 기존 `settings.json` 이 있으면 병합 전 `settings.json.bak` 로 복사합니다.
- `--no-backup` 옵션으로 백업을 생략할 수 있습니다.

### 5.2 permissions 병합 — 합집합 dedupe와 Git ask 마이그레이션

- `allow`/`ask`/`deny` 각각을 **기존 + 템플릿 합집합**으로 만들고 중복을 제거합니다.
- 이전 llm-rules 템플릿의 정확한 `Bash(git commit:*)`·`Bash(git push:*)` ask 문자열만 제거하고 allow로 이동합니다. 나머지 사용자 권한은 보존합니다.
- settings에는 권한 출처 메타데이터가 없으므로 사용자가 동일 문자열을 독립적으로 추가한 경우에도 함께 이동됩니다.

### 5.3 hooks 병합 — 알려진 managed script 기반 교체(멱등)

- llm-rules 훅은 `command` 에 `/hooks/llm-rules/` 마커를 포함합니다.
- 병합 시 **모든 이벤트에서** llm-rules가 배포한 script 이름만 제거한 뒤 현재 활성 hook만 재추가합니다.
- 따라서 **여러 번 실행해도 llm-rules 훅이 중복으로 쌓이지 않고**(멱등), 사용자가 직접 추가한 다른 훅 항목은 보존됩니다.
- hooks 항목 설치 시 managed hook 디렉터리에서 retired script도 prune합니다. 따라서 이전 설치의 `Stop`·`UserPromptSubmit` managed entry와 해당 script는 재설치 때 제거됩니다.

### 5.4 model / effort 병합

- installer는 llm-rules가 관리하는 `model`과 `effortLevel`을 각각 `fable`, `high`로 갱신합니다.
- permissions·사용자 hook·그 밖의 settings 키는 §5.2·§5.3 방식으로 보존합니다.

### 5.5 안전 장치

- 기존 `settings.json` 이 **유효한 JSON 이 아니면** 병합을 중단합니다(자동 덮어쓰기 안 함). 수동 정리 후 재실행하세요.
- `--dry-run` 으로 병합 결과를 파일 수정 없이 미리 볼 수 있습니다.

---

## 6. 알아두어야 할 주의사항

- **settings + hooks 는 세트로 설치하세요.** settings 만 깔면 훅 스크립트 파일이 없어 동작하지 않습니다(스크립트가 경고).
- **일반 commit·push는 allow입니다.** workflow 메인이 규칙을 적용하며 별도 승인이나 Git 전용 PreToolUse guard를 거치지 않습니다.
- **글로벌·프로젝트 양쪽 설치 시 project 가 우선**합니다. 충돌 동작이 예상과 다르면 어느 쪽 설정이 적용 중인지 확인하세요.
- **훅은 `jq` 의존**입니다. `jq` 가 없으면 모든 훅이 조용히 no-op 으로 빠집니다(강제력 없음). 강제를 원하면 `jq` 를 설치하세요.
- **force push deny는 유지합니다.** 일반 push와 달리 파괴적 Git 작업은 자동 실행하지 않습니다.
- **검증은 위험에 비례해 한 번 수행**합니다. `verification-worker`의 성공 결과를 메인이 재사용하고, 실패 수정 뒤 관련 검사만 한 번 재실행합니다. 실질적 애매성은 `edge-case-verification-worker`가 최소 검사 하나로 판정합니다.
- **병합 전 기존 JSON 이 깨져 있으면 설치가 중단**됩니다. 수동으로 고친 뒤 재실행하세요. 백업이 필요 없을 때만 `--no-backup` 을 쓰세요.

---

## 관련 문서

- 훅 스크립트 상세: `docs/claudecode/hooks.md`
- 설치 방법: `docs/claudecode/install.md`
- 컨벤션 원본(SSOT): `docs/convention/*.md` (common·comments·security·git·frontend·fsd·query·backend·ai-process)
