# llm-rules

개인 프로젝트 **코딩 컨벤션 표준**. Claude Code 등 AI 가 항상 참조하도록 `~/.claude/` 에 설치한다.

📖 **문서 사이트**: https://b-hs.github.io/llm-rules/

---

## 설치

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
```

컨벤션 문서를 `~/.claude/convention/` 으로 내려받고, `~/.claude/CLAUDE.md` 가 이를 `@import` 하도록 한다.
기존 컨벤션이 있으면 실행 중 **`[a] 추가 / [r] 교체 / [c] 취소`** 를 묻는다. (쓰기 전 `.bak` 백업)

비대화형:

```bash
LLM_RULES_MODE=replace bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"
```

---

## 컨벤션 문서

[ai-process](./docs/convention/ai-process.md) · [common](./docs/convention/common.md) · [comments](./docs/convention/comments.md) · [frontend](./docs/convention/frontend.md) · [fsd](./docs/convention/fsd.md) · [query](./docs/convention/query.md) · [backend](./docs/convention/backend.md) · [desktop](./docs/convention/desktop.md)

---

## 개발

```bash
bun install
bun run dev      # 문서 사이트 로컬 실행
bun run build    # 정적 빌드 (→ dist/)
bun run sync     # 레포 클론 후 CLAUDE.md 동기화 (설치 스크립트와 동일 결과)
```
