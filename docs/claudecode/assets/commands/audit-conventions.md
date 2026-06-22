---
description: 변경된 코드의 컨벤션 위반 종합 점검 (tsc·prettier·금지 패턴 grep → 수정대상/경고 분류 보고)
argument-hint: "[경로 또는 비우면 변경분 전체]"
allowed-tools: Bash, Read, Grep, Glob
---

당신은 llm-rules 컨벤션(`~/.claude/convention/*.md`)을 기준으로 변경된 코드의 위반을 종합 점검합니다. 한국어·존댓말·간결하게, 자축 톤 없이 사실만 보고하세요.

## 0. 점검 대상 산정

- `$ARGUMENTS` 가 주어지면 그 경로를 대상으로 합니다.
- 비어 있으면 변경분 전체를 대상으로 합니다.

변경된 파일 목록:
!`git diff --name-only HEAD; git diff --name-only --cached; git ls-files --others --exclude-standard`

위 목록에서 중복을 제거하고, 그중 `*.ts *.tsx *.js *.jsx *.mts *.cts` 만 점검 대상으로 둡니다. 대상이 없으면 "점검할 TS/JS 변경 없음"으로 보고하고 종료합니다.

## 1. 타입체크 (common §1)

!`if [ -x ./node_modules/.bin/tsc ]; then ./node_modules/.bin/tsc --noEmit; elif command -v bunx >/dev/null 2>&1; then bunx tsc --noEmit; else echo "tsc 없음 — 건너뜀"; fi`

## 2. Prettier 검사 (common §2)

대상 파일에 대해서만 포맷 위반을 확인합니다(자동 수정하지 않고 `--check` 만):
!`if [ -x ./node_modules/.bin/prettier ]; then ./node_modules/.bin/prettier --check $(git diff --name-only HEAD; git diff --name-only --cached; git ls-files --others --exclude-standard) 2>&1 | grep -Ei 'warn|\.(ts|tsx|js|jsx|mts|cts)$' | head -50; else echo "prettier 없음 — 건너뜀"; fi`

## 3. 금지 패턴 grep — 대상 파일만

각 대상 파일을 `Grep`(또는 Read 통독)으로 아래 패턴을 검사합니다. lint-edit 훅과 동일한 분류(HARD=수정대상 / SOFT=경고)를 따릅니다.

### HARD — 수정대상 (명백한 위반)
- `useCallback` / `useMemo` 호출 — frontend §4: React Compiler 에 위임. 정규식 `\buse(Callback|Memo)\(`.
- `throw new Error(` — backend §6.1: `createAppError('CODE')` 사용. **service/route/compose/dto/server 경로**에서만 위반으로 판정.
- `process.env.` 직접접근 — backend §14 · security §1: `getEnv()` 싱글톤 사용. **service/route/compose/dto/server 경로**에서만 위반으로 판정.

### SOFT — 경고 (오탐 가능, 변경 파일 Read 통독으로 검증)
- `export default` — common §6: named export 기본. 단 `*page.tsx *layout.tsx *route.ts app/ pages/` 는 허용(제외).
- `function` 키워드 — common §3.1: arrow function 사용. 정규식 `^[[:space:]]*function[[:space:]]|=[[:space:]]*function[[:space:]]*\(`.
- 코드 주석(`//` 한 줄, `/* */` 블록, JSX/CSS 주석) — comments §1: 주석 금지(JSDoc `/** */` 만 예외). JSDoc 이 있는 파일은 그 라인을 오탐 처리하지 말고 구분하세요.
- `HACK` / `FIXME` / `XXX` / `TODO` / `@ts-ignore` / `eslint-disable` — ai-process §6.2: 근본 해결하거나 docs/ 에 기록.
- `dangerouslySetInnerHTML` 인데 `sanitize`/`DOMPurify` 없음 — security §4.

> grep 은 위치 파악 보조용입니다. HARD/SOFT 모두 변경 파일을 직접 Read 통독으로 검증한 뒤 분류하세요. 테스트의 `next/image` 목 `<img>`, `p-1` 같은 리터럴, JSDoc 라인 등 알려진 오탐을 걸러냅니다.

## 4. 보고

다음 형식으로 분류해 보고합니다.

- **타입체크 / Prettier**: 통과 여부. 실패 시 핵심 메시지만.
- **수정대상(HARD)**: `파일:라인 — 위반 규칙(섹션) — 무엇을 어떻게 고칠지` 목록. 없으면 "없음".
- **경고(SOFT)**: 동일 형식. 오탐으로 판단해 제외한 항목은 그 이유를 1줄로 함께 적습니다.

검증되지 않은 "통과/완벽" 단언은 하지 않습니다. tsc·prettier·grep 으로 확인한 범위만 사실대로 보고하고, 수정은 사용자 지시가 있을 때만 진행합니다.
