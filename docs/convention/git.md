# GIT — Git · 커밋 컨벤션

> [common.md](./common.md) 를 전제로 한다. 커밋 메시지는 **[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** 을 따른다.
> **기본값**은 type 영어 · description/body 한국어다 ([common.md](./common.md) §1). 단, **실제 언어·스타일은 §1.1 에 따라 그 레포의 커밋 히스토리가 우선**한다.

---

## 1. 커밋 메시지 형식

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type**: 변경의 성격(필수). 아래 목록(§2)에서 고른다.
- **scope**: 변경 범위(선택). 명사를 괄호로. 예: `feat(auth):`, `fix(mail):`
- **description**: 한 줄 요약(필수). type/scope 바로 뒤 `: ` 다음에 온다. 마침표 없이, 50자 이내를 지향한다. 한국어일 때는 명사형 종결(`~추가`·`~수정`·`~정리`). (언어는 §1.1 로 결정)
- **body**: 한 줄 띄우고 상세 설명(선택). 무엇을·왜 바꿨는지.
- **footer**: 한 줄 띄우고 메타데이터(선택). `token: value` 또는 `token #value`. 예: `Refs: #123`.

### 1.1 언어 · 스타일 — 기존 히스토리 우선

> **별도 지시가 없으면, 커밋 전에 그 레포의 과거 커밋을 먼저 읽고 스타일과 언어를 맞춘다.** (`git log --oneline -30` 수준)

- **언어**는 읽은 히스토리의 언어를 따른다. 기존 커밋이 영어면 영어로, 한국어면 한국어로 쓴다.
- **형식**(type·scope 사용 방식, 시제·어투)도 히스토리의 지배적 패턴에 맞춘다. 히스토리가 Conventional Commits 가 아니면 그 레포의 형식을 따르되, 컨벤션과 다르다는 사실을 사용자에게 알린다. ([index.md](./index.md) 우선순위 사다리)
- **히스토리가 없거나(신규 레포·초기 커밋) 판단이 안 서면** 이 문서의 기본값 — Conventional Commits + 한국어 description — 을 쓴다.
- **언어·스타일이 섞여 있으면** 임의로 고르지 않고 **사용자에게 묻는다.** (1줄 객관식 — [ai-process.md §3.1](./ai-process.md)) 결정은 **`docs/acknowledge` 에 기록**하고, 이후 그 레포의 모든 커밋·푸시에 그 결정을 적용한다. (매번 다시 묻지 않는다)

---

## 2. type 목록

| type | 용도 | SemVer |
|------|------|:------:|
| `feat` | 새 기능 추가 | MINOR |
| `fix` | 버그 수정 | PATCH |
| `docs` | 문서만 변경 | - |
| `style` | 포맷·세미콜론 등 동작에 영향 없는 변경 | - |
| `refactor` | 동작 변화 없는 구조 개선 | - |
| `perf` | 성능 개선 | - |
| `test` | 테스트 추가/수정 | - |
| `build` | 빌드 시스템·의존성 변경 | - |
| `ci` | CI 설정 변경 | - |
| `chore` | 그 외 잡일(릴리스·설정 등) | - |
| `revert` | 이전 커밋 되돌림 | - |

- 위 목록 외 type 도 허용되지만, 합의 없이 새 type 을 늘리지 않는다.
- type·description 은 **대소문자를 구분하지 않는다.** 단 `BREAKING CHANGE` 만 **반드시 대문자**다.

---

## 3. BREAKING CHANGE (호환성 깨짐 = MAJOR)

두 가지 방법으로 표시한다. (둘 중 하나, 또는 병행)

1. **`!` 표기**: type/scope 뒤 `:` 앞에 `!` 를 붙인다. 예: `feat!:`, `feat(api)!:`
2. **footer**: `BREAKING CHANGE: <설명>` (대문자 필수)

`!` 를 쓰면 footer 는 생략할 수 있다.

---

## 4. 예시

```
feat(auth): Google OAuth 로그인 추가

fix(mail): 증분 동기화에서 중복 메일이 생기던 문제 수정

docs: README 설치 커맨드 정리

refactor(blog)!: 게시글 응답을 successResponse 로 통일

BREAKING CHANGE: /api/blog/posts 응답이 { data } 로 감싸진다
```

---

## 5. 브랜치 네이밍

- kebab-case, `<type>/<요약>` 형태. 예: `feat/oauth-login`, `fix/mail-dup`, `docs/convention`
- 브랜치 type 은 커밋 type 과 같은 어휘를 쓴다.

---

## 6. 커밋 · 푸시 안전 규칙

- **사용자가 요청하기 전에는 커밋·푸시하지 않는다.** (AI 작업 시 — [ai-process.md](./ai-process.md) §3 멈춤)
    - **예외 — 자동 커밋/푸시 합의(optional)**: 커밋이 예상되는 세션에서 레포에 설정이 없으면 첫 확인 질문 묶음에 자동/수동을 포함해 정하고, **`git config llm-rules.auto-commit true` / `llm-rules.auto-push true`** 로 레포 단위 기록한다(합의는 `docs/acknowledge` 에도 남긴다). 설정된 레포에서는 요청 없이 논리 단위 커밋(·푸시)을 진행하며, Claude Code 에서는 guard 훅이 **전 검사(형식·트레일러·시크릿·보호 브랜치·force) 통과 시에만** 권한 프롬프트를 자동 승인한다. 미설정이면 기본(요청 시에만)으로 동작하고, 위임하더라도 이 문서의 나머지 규칙은 그대로 지킨다.
- 커밋은 **논리적 단위 1개**로 묶는다. 무관한 변경을 한 커밋에 섞지 않는다. (→ [ai-process.md](./ai-process.md) §6.8 최소 변경)
- `main` 에 직접 커밋하지 않고 브랜치에서 작업한 뒤 합친다 (특별한 합의가 없는 한).
- 시크릿·빌드 산출물(`dist/`·`node_modules/`)·키 파일(`.env`·`.pem`·`id_rsa`)을 커밋하지 않는다. (→ [security.md](./security.md))
- 스테이징은 **관련 파일만 명시적으로** 한다. `git add -A` · `git add .` 같은 전체 스테이징을 사용하지 않는다.
- 커밋 전에 **`git status` 와 `git diff` 로 스테이징 내용을 확인**한다. 의도하지 않은 파일이 섞이면 커밋하지 않는다.
- 여러 커밋으로 나눌 때는 **한 번에 한 커밋분만 스테이징**하고, 그 커밋이 완료된 것을 확인한 뒤 다음 커밋분을 스테이징한다. (미리 쌓아 두면 의도하지 않은 파일이 섞인다)
- **`git push --force`(`-f`) 를 사용하지 않는다.** 히스토리 재작성(rebase·amend 후 push 포함)이 필요하면 사용자에게 묻고, **승인된 경우에도 `--force` 가 아니라 `--force-with-lease` 만** 쓴다.

### 6.1 AI 에이전트의 커밋 (모든 에이전트 공통)

- **author 는 사용자 단독이다.** 커밋 메시지에 `Co-Authored-By`, `Generated with ...`, `Claude-Session:` 같은 AI 세션 링크, 🤖 등 **AI 도구의 서명·트레일러·이모지를 넣지 않는다.**
- 커밋 메시지는 이 문서의 형식(§1~§4)을 그대로 따른다. 에이전트가 임의 형식을 만들지 않는다.
