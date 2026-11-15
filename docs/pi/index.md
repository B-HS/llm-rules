# Pi 에디션

Pi 전용으로 쓴 룰과 자산이다. 다른 에디션과 결과물(코드·문서·커밋·응답)은 같고, 전달 방식은 Pi 의 "가장 약한 수단부터" 원칙에 맞췄다: 지침은 `AGENTS.md`, 작업별 절차는 Skill, 실행 동작은 Extension.

## 설치

```bash
bun run install-pi --global --all
bun run install-pi --project --all
bun run install-pi --global --all --dry-run
```

클론 없이 설치하려면 아래 명령을 쓴다. Bun 이 필요하다.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)" llm-rules pi --global --all
```

글로벌 위치는 `PI_CODING_AGENT_DIR` 이 있으면 그 경로, 없으면 `~/.pi/agent` 다.

## 구성

| 항목 | 설치 위치 | 역할 |
| --- | --- | --- |
| `instructions` | `~/.pi/agent/AGENTS.md` · `~/.pi/agent/llm-rules/` | [코어](./rules/core.md) 관리 블록과 조건부로 읽는 참조 문서 9개 |
| `skills` | `~/.pi/agent/skills/llm-rules-*` | 반복 절차 9종. `/skill:<이름>` 으로도 실행한다 |
| `extension` | `~/.pi/agent/extensions/llm-rules.ts` | 환경 파일·위험 명령 차단, 시크릿 차단, 편집 후 포맷과 lint 피드백, 진행 중인 PROCESS 작업 주입 |

설치기는 이전 버전이 `~/AGENTS.md` 에 남긴 `rules-convention` 관리 블록만 제거하고 사용자 내용은 보존한다.

## Pi 에 맞춘 점

| 내용 | 근거 |
| --- | --- |
| 위임과 모델 라우팅 규칙이 없다 | Pi 는 sub-agent 와 plan mode 를 내장하지 않는다 (패키지 README) |
| 권한 규칙 대신 Extension 이 도구 호출을 막는다 | Pi 의 도구는 프로세스 권한으로 실행되고 승인 절차가 없다 (`docs/security.md`) |
| Skill 을 `~/.pi/agent/skills` 에 둔다 | 같은 이름의 Skill 이 `~/.agents/skills` 에 있어도 Pi 전용 경로가 먼저 등록되어 우선한다 (`dist/core/package-manager.js`). Codex 에디션과 함께 쓰면 시작할 때 이름 충돌 경고가 나온다 |
| 코어는 조건부 포인터만 두고 전문을 미리 읽게 하지 않는다 | 컨텍스트 파일은 매 세션 시스템 프롬프트에 들어간다 (`docs/how-pi-works.md`) |

## Extension 이 막는 것

- `read` · `write` · `edit` 의 `.env` · `.env.*` · `secrets/` · `.pem` · `id_rsa` 접근 (`.env.example` 은 허용)
- `bash` 의 `.env` 파일 참조, force push 계열, `rm -rf`
- 코드 파일에 쓰는 시크릿 패턴

편집한 TypeScript·JavaScript 파일은 프로젝트의 Prettier 가 있으면 포맷하고, 컨벤션 위반을 도구 결과에 덧붙인다.

## 확인

Extension 은 문서 기준으로 작성했고 `scripts/guards.test.ts` 의 가짜 API 로 동작을 검증했다. 이 저장소를 작업한 머신에 Pi CLI 가 없어 실제 Pi 에서 로드해 보지는 못했다. Pi 를 설치한 뒤 아래를 확인한다. 항목은 `docs/quality-assurance/2026-11-15-provider-editions.md` 에도 있다.

1. 시작 화면에 `llm-rules.ts` 로드 오류가 없다.
2. `.env` 읽기를 요청하면 `[llm-rules] 차단` 메시지가 나온다.
3. `/skill:llm-rules-verify` 가 실행된다.
