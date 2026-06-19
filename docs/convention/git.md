# GIT — Git · 커밋 컨벤션

> [common.md](./common.md) 를 전제로 한다. 커밋 메시지는 **[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)** 을 따른다.
> 문서·커뮤니케이션은 한국어다 ([common.md](./common.md) §1). **커밋 type 은 영어, description·body 는 한국어**로 쓴다.

---

## 1. 커밋 메시지 형식

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type**: 변경의 성격(필수). 아래 목록(§2)에서 고른다.
- **scope**: 변경 범위(선택). 명사를 괄호로. 예: `feat(auth):`, `fix(mail):`
- **description**: 한 줄 요약(필수). type/scope 바로 뒤 `: ` 다음에 온다. **간결한 한국어**로.
- **body**: 한 줄 띄우고 상세 설명(선택). 무엇을·왜 바꿨는지.
- **footer**: 한 줄 띄우고 메타데이터(선택). `token: value` 또는 `token #value`. 예: `Refs: #123`.

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
- 커밋은 **논리적 단위 1개**로 묶는다. 무관한 변경을 한 커밋에 섞지 않는다. (→ [ai-process.md](./ai-process.md) §6.8 최소 변경)
- `main` 에 직접 커밋하지 않고 브랜치에서 작업한 뒤 합친다 (특별한 합의가 없는 한).
- 시크릿·빌드 산출물(`dist/`·`node_modules/`)을 커밋하지 않는다. (→ [security.md](./security.md))
