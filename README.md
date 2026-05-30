# llm-rules

개인 프로젝트 전반에 적용하는 **코딩 컨벤션 표준**이자, 이를 보여주는 **문서 사이트**다.
컨벤션을 각 머신의 글로벌 `~/.claude/CLAUDE.md` 에 연결하는 **동기화 스크립트**도 포함한다.

- 📖 문서 사이트: GitHub Pages 로 배포 (`main` push 시 자동) — `https://b-hs.github.io/llm-rules/`
- 🧩 컨벤션 원본: `docs/convention/*.md` (사이트 콘텐츠이자 동기화 소스)
- 🔁 여러 컴퓨터에서 이 레포만 클론하면 동일한 컨벤션을 Claude / 에디터에 적용할 수 있다.

---

## 기술 스택 (문서 사이트)

- **Vite + rolldown-vite** — 번들러 (`vite` 를 `rolldown-vite` 로 별칭)
- **vite-react-ssg** — React Router 기반 정적 사이트 생성 (SSG)
- **shadcn/ui (radix-nova) + Tailwind CSS v4** — UI / 테마 (라이트·다크)
- **unified / remark / rehype / shiki** — 빌드 타임 마크다운 → HTML, 듀얼 테마 코드 하이라이팅
- **Bun** 런타임

마크다운은 `plugins/vite-plugin-docs.ts` 가 빌드 타임에 처리해 `virtual:docs` 가상 모듈로 노출한다.

---

## 구조

```
llm-rules/
├── index.html
├── vite.config.ts
├── package.json
├── plugins/
│   └── vite-plugin-docs.ts   ← docs/convention/*.md → virtual:docs
├── src/
│   ├── main.tsx              ← ViteReactSSG 엔트리
│   ├── routes.tsx
│   ├── globals.css           ← 테마 토큰 · prose · shiki
│   ├── components/           ← 레이아웃 · 사이드바 · TOC · 마크다운 렌더
│   └── lib/ · types/
├── docs/
│   └── convention/
│       ├── index.md          ← 진입점·요약
│       ├── common.md         ← 공통 (FE·BE)
│       ├── comments.md       ← 주석 컨벤션
│       ├── frontend.md       ← 프론트엔드 (Next.js / React)
│       ├── fsd.md            ← 프론트엔드 아키텍처 (필수)
│       ├── backend.md        ← 백엔드 (Hono.js)
│       └── desktop.md        ← 데스크톱 앱 (Electron / Tauri 등)
├── scripts/
│   └── sync-claude-md.ts     ← 글로벌 CLAUDE.md 동기화
└── .github/workflows/deploy.yml  ← GitHub Pages 배포
```

---

## 개발 / 빌드

```bash
bun install
bun run dev       # 로컬 개발 서버 (http://localhost:5173/llm-rules/)
bun run build     # 정적 사이트 생성 → dist/
bun run preview   # 빌드 결과 미리보기
bun run typecheck # 타입 체크
```

### 배포 (GitHub Pages)

`main` 브랜치에 push 하면 `.github/workflows/deploy.yml` 가 빌드 후 GitHub Pages 로 배포한다.
레포 **Settings → Pages → Source** 를 **GitHub Actions** 로 설정해야 한다.
base 경로는 레포명(`/llm-rules/`)으로 자동 설정된다 (워크플로의 `BASE_PATH`).

---

## 컨벤션 문서

전체 개요와 핵심 원칙은 [docs/convention/index.md](./docs/convention/index.md) 에서 시작한다.

| 문서 | 범위 |
|------|------|
| [ai-process.md](./docs/convention/ai-process.md) | **AI 작업 프로세스** (Claude Code 등) |
| [common.md](./docs/convention/common.md) | 공통 (FE·BE 전부) |
| [comments.md](./docs/convention/comments.md) | 주석 (코드 주석 금지 · JSDoc · docs/) |
| [frontend.md](./docs/convention/frontend.md) | 프론트엔드 (Next.js / React) |
| [fsd.md](./docs/convention/fsd.md) | **프론트엔드 아키텍처 (필수)** |
| [query.md](./docs/convention/query.md) | 프론트엔드 (TanStack Query 사용지침) |
| [backend.md](./docs/convention/backend.md) | 백엔드 (Hono.js) |
| [desktop.md](./docs/convention/desktop.md) | 데스크톱 앱 (Electron / Tauri 등) |

---

## 빠른 설치 (원격 · 클론 불필요)

레포를 클론하지 않고 한 줄로 설치한다. (`curl` + `python3` 만 필요)

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
```

- 컨벤션 9개 문서를 `~/.claude/convention/` 로 내려받고, `~/.claude/CLAUDE.md` 에 `@import` 관리 블록을 주입한다.
- 기존 컨벤션이 있으면 실행 중 **`[a] 추가 / [r] 교체 / [c] 취소`** 를 묻는다 (`/dev/tty` 입력).
- 비대화형으로 고르려면 환경변수로:

```bash
LLM_RULES_MODE=replace bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
# LLM_RULES_MODE=add 도 가능. 다른 레포/브랜치면 LLM_RULES_BASE_URL 로 베이스 URL 지정.
```

---

## 적용 (레포 클론 후 · 다른 컴퓨터 포함)

`bun run sync` 는 두 가지를 한다.

1. `docs/convention/*.md` 를 **`~/.claude/convention/` 로 복사**한다 (CLAUDE.md 와 같은 레벨, 레포 경로에 독립).
2. 글로벌 `~/.claude/CLAUDE.md` 의 관리 블록에서 **복사된 각 문서를 `@~/.claude/convention/<file>.md` 로 모두 import** 한다. (Claude Code 의 `@import` 는 마크다운 링크를 따라가지 않으므로 문서마다 한 줄씩 명시한다.)

```bash
bun run sync             # 복사 + CLAUDE.md 동기화 (대화형: 기존 convention 있으면 추가/교체/취소 선택)
bun run sync --dry-run   # 변경 미리보기 (파일 수정 안 함)
bun run sync --help      # 옵션 전체 보기
```

> 기존에 `@...convention.md` 같은 참조가 있으면 실행 중 **[a] 추가(기존 보존) / [r] 교체 / [c] 취소** 를 묻는다. 비대화형(CI)에서는 `--yes` (기본 추가) 또는 `--yes --replace-legacy` (교체) 로 선택한다.

### 옵션

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 변경 결과만 출력, 파일 수정 안 함 |
| `--yes`, `-y` | 프롬프트에 기본값 자동 응답 (비대화형/CI) |
| `--replace-legacy` | 기존 `@...convention.md` 참조를 새 참조로 교체 (기본은 보존+추가) |
| `--target <path>` | 대상 CLAUDE.md 경로 (기본: `~/.claude/CLAUDE.md`) |
| `--no-backup` | 쓰기 전 `.bak` 백업 생략 |
| `--force` | 손상된 마커 자동 복구 |

### 동작 (멱등)

관리 영역을 마커로 감싸 **여러 번 실행해도 안전**하다. 동기화 시 상태에 따라 자동 분기한다.

| 상황 | 동작 |
|------|------|
| 파일 없음 / 빈 파일 | 관리 블록 새로 생성 |
| 관리 마커 존재 | 마커 사이만 갱신 (동일하면 변경 없음) |
| 기존 convention 내용 존재 | 내용을 보여주고 **추가 / 교체 / 취소** 선택 |
| 무관 내용만 존재 | 기존 보존 + 끝에 블록 추가 |
| 마커 손상 / 중복 | 경고 후 `--force` 복구 / 첫 블록만 갱신 |

- 문서 사본(`~/.claude/convention/`)은 **실행할 때마다 소스 기준으로 다시 미러링**된다. CLAUDE.md 블록이 동일해도 사본은 최신으로 갱신된다.
- 쓰기 전 `~/.claude/CLAUDE.md.bak` **백업**을 만든다. (`--no-backup` 으로 생략)
- 경로는 홈 디렉토리 하위면 `~/` 로 기록되어 **계정명이 다른 머신에서도 그대로 동작**한다.
