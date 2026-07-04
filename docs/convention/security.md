# SECURITY — 보안 · 시크릿

> [common.md](./common.md) 를 전제로 한다. FE·BE 공통으로 적용되는 **보안 기본기**다.
> 핵심 원칙 하나: **시크릿은 코드·저장소·로그·클라이언트 어디에도 노출하지 않는다.**

---

## 1. 시크릿 · 환경변수

- API 키·토큰·비밀번호·DB 접속정보를 **코드에 하드코딩하지 않는다.** `.env` 로 분리하고 `.gitignore` 에 넣는다.
- 백엔드 환경변수는 **`getEnv()` 싱글톤 + Zod 검증**으로만 접근한다. `process.env` 직접 접근은 부트스트랩/싱글톤 내부로 제한한다. ([backend.md](./backend.md) §14)
- 프론트엔드에서 **`NEXT_PUBLIC_*`(빌드에 노출되는 변수)에 시크릿을 넣지 않는다.** 이 값은 클라이언트 번들에 그대로 박힌다.
- 실수로 커밋된 시크릿은 **즉시 폐기(rotate)** 한다. 히스토리에서 지워도 이미 노출된 것으로 간주한다.

### 1.1 AI 에이전트의 시크릿 취급 (모든 에이전트 공통)

- 에이전트는 `.env` · `.env.*` · `secrets/` · 키 파일(`.pem` · `id_rsa` 등)을 **읽지도, 쓰지도, 대화·로그에 출력하지도 않는다.** (Claude Code 는 permission 이 차단하지만, 다른 에이전트는 이 규칙을 스스로 지켜야 한다)
- 새 환경변수가 필요하면 **`.env.example` 에 키 이름만** 추가하고, 값 입력은 사용자에게 안내한다.
- 코드·히스토리·로그에서 노출된 시크릿을 **발견하면 즉시 사용자에게 보고**한다. 히스토리 재작성 등 파괴적 조치를 임의로 하지 않는다.

---

## 2. 입력 검증 — 경계에서

- 외부 입력(요청 바디·쿼리·폼)은 **신뢰 경계에서 Zod 로 검증**한다.
  - 백엔드: Route 의 `validator()` + DTO 스키마 ([backend.md](./backend.md) §4·§5)
  - 프론트엔드: 폼 제출 전 검증
- 검증되지 않은 값을 그대로 DB·파일경로·셸·HTML 에 흘리지 않는다.

---

## 3. 데이터 접근 — Injection 방지

- DB 는 **ORM(Drizzle)의 파라미터 바인딩**으로 접근한다. 사용자 입력을 문자열로 이어붙인 raw SQL 을 만들지 않는다. (→ [ai-process.md](./ai-process.md) §6.7 환경 일관성)
- 파일 경로·외부 명령에 사용자 입력을 직접 넣지 않는다. (path traversal · command injection 방지)

---

## 4. 출력 — XSS

- 사용자/외부 콘텐츠를 `dangerouslySetInnerHTML` 등으로 **그대로 주입하지 않는다.** 신뢰된 자체 콘텐츠만 예외로 허용한다.
- 외부 콘텐츠를 HTML 로 렌더링하는 것이 불가피하면 **sanitize(DOMPurify 등)를 거친 결과만** 주입한다. sanitize 없는 `dangerouslySetInnerHTML` 은 금지다.
- 렌더링은 기본적으로 React 의 자동 이스케이프에 맡긴다.

---

## 5. 인증 · 인가

- 인증은 **better-auth** 기반(세션 · OAuth). ([frontend.md](./frontend.md) §8.3 · [backend.md](./backend.md) §11)
- 권한은 **최소 권한 원칙**. 보호가 필요한 핸들러는 `withAuth` / `withAdmin` HOF 로 감싼다. ([backend.md](./backend.md) §7)
- 인가 검사를 **클라이언트에만 의존하지 않는다.** 서버에서 반드시 재확인한다.

---

## 6. 에러 · 로그

- 에러 응답의 `details` 는 **프로덕션에서 노출하지 않는다.** ([backend.md](./backend.md) §8)
- 스택트레이스 · 시크릿 · 토큰 · 개인정보를 **로그에 남기지 않는다.**

---

## 7. 의존성

- 의존성은 **최신 버전을 유지**하고, 추가 전 취약점·필요성을 점검한다. ([ai-process.md](./ai-process.md) §6.6)
- 데스크톱(Electron 등)은 렌더러에 네이티브 API 를 preload(bridge)로 **최소 노출**한다. ([desktop.md](./desktop.md))
