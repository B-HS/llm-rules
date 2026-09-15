---
name: llm-rules-audit-conventions
description: 변경된 TypeScript·JavaScript 코드의 llm-rules 컨벤션 위반을 타입체크, 포맷, 금지 패턴과 실제 코드 검토로 감사할 때 사용합니다. 구현 수정이 아니라 점검 보고가 목적일 때 적용합니다.
---

# 컨벤션 감사

사용자가 지정한 경로가 있으면 그 범위를, 없으면 스테이지·워킹트리·미추적 변경 전체를 대상으로 합니다. `docs/convention/common.md`, `comments.md`, `frontend.md`, `backend.md`, `security.md`를 먼저 읽습니다.

1. `git diff --name-only HEAD`, `git diff --name-only --cached`, `git ls-files --others --exclude-standard`로 변경 파일을 모으고 중복을 제거합니다. `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mts`, `*.cts`만 검사합니다.
2. `package.json`과 lockfile을 확인해 프로젝트의 `typecheck` 스크립트 또는 로컬 `tsc --noEmit`을 실행합니다.
3. 로컬 Prettier가 있으면 대상 파일에 `--check`만 실행합니다. 자동 수정하지 않습니다.
4. 아래 후보를 `rg`로 찾은 뒤 파일을 직접 읽어 오탐을 제거합니다.
   - 수정 대상: `useCallback`·`useMemo`, 서버 경로의 `throw new Error`, 서버 경로의 `process.env` 직접 접근.
   - 경고 후보: 허용 경로 밖 `export default`, 불가피한 예외가 아닌 `function`, JSDoc·도구 지시가 아닌 코드 주석, `HACK`·`FIXME`·`XXX`·`TODO`·`@ts-ignore`·`eslint-disable`, sanitize 없는 `dangerouslySetInnerHTML`.
5. 타입체크·Prettier 결과, 수정 대상, 경고를 `파일:라인`, 근거 문서 절, 권고와 함께 한국어로 간결하게 보고합니다.

검사되지 않은 영역을 통과했다고 단정하지 않습니다. 사용자가 수정을 요청하지 않았다면 코드를 변경하지 않습니다.
