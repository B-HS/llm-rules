# DESKTOP — 데스크톱 앱 컨벤션 (Electron / Tauri 등)

> [common.md](./common.md) 의 모든 규칙을 전제로 하며, 렌더러(웹뷰) 코드는 [frontend.md](./frontend.md) 의 React 규칙을 그대로 따른다.
> 여기서는 **데스크톱 셸(메인 프로세스 · IPC · 네이티브 연동) 전용** 규칙만 다룬다.
> 현재는 Electron 기준이며, 추후 **Tauri** 등 다른 프레임워크가 병합되면 본 문서에 프레임워크별 섹션을 추가한다.

---

## 1. 공통 원칙

- **렌더러 = 프론트엔드**: 화면을 그리는 코드는 전부 [frontend.md](./frontend.md) 규칙(FSD, `FC<Props>`, hook 순서, React Compiler, JSX inline 등)을 적용한다.
- **셸 ≠ 프론트엔드**: 메인 프로세스 / 네이티브 브리지는 UI 프레임워크 규칙을 따르지 않는다. 아래 규칙을 적용한다.
- **IPC 는 타입으로 계약한다**: 프로세스 간 통신은 반드시 타입 정의된 이벤트/커맨드 맵을 통해서만 한다.
- **권한 최소화**: 렌더러에는 필요한 API 만 preload(bridge)로 노출한다. 네이티브 전권을 그대로 넘기지 않는다.

---

## 2. Electron

### 2.1 구조

```
src/
  main.ts        - Electron 메인 프로세스
  store.ts       - 스토리지
  tray.ts        - 시스템 트레이
  events/        - IPC 이벤트 핸들러
  preload/       - Preload 스크립트 (렌더러에 노출할 bridge)
  renderer/      - React 앱 (frontend.md + fsd.md 규칙 그대로 적용)
    app/         - 진입점·프로바이더
    widgets/     - 비즈니스 로직 조립
    features/    - 순수 컴포넌트
    entities/    - 데이터 계층
    shared/      - 공통 기반
```

### 2.2 IPC 통신

타입 정의된 이벤트 시스템을 사용한다.

```typescript
type EVENTS_TYPE = {
    close: () => void
    setCurrency: (list: string[]) => void
    currencyEventer: (fn: (data: unknown) => void) => void
}
```

- 이벤트 맵(`EVENTS_TYPE`)을 단일 출처로 두고, 메인·preload·렌더러가 **같은 타입을 공유**한다.
- 핸들러 시그니처는 이 맵에서 `Parameters` / `ReturnType` 으로 유도한다. (→ [common.md 5.3](./common.md#53-typescript-유틸리티-타입--100-활용))

### 2.3 보안 기본값

- `BrowserWindow` 의 `webPreferences` 는 **`contextIsolation: true` · `nodeIntegration: false` · `sandbox: true`** 를 유지한다. 이 기본값을 끄는 설정을 금지한다.
- 렌더러 노출은 preload 의 **`contextBridge.exposeInMainWorld`** 로만 한다. `ipcRenderer` 전체나 `fs` · `child_process` · `shell` 같은 네이티브 모듈을 통째로 넘기지 않는다. (§1 권한 최소화)
- 외부 URL 은 **검증(화이트리스트) 후에만** `shell.openExternal` 로 연다. `will-navigate` · `setWindowOpenHandler` 로 임의 내비게이션을 차단한다.

---

## 3. Tauri (예정)

> Tauri 기반 앱을 도입/병합하게 되면 아래 항목을 이 섹션에 채운다.

- 프로젝트 구조 (`src-tauri/` 등)
- command / event 의 타입 계약 방식 (`invoke` 시그니처 공유)
- 권한(capabilities/allowlist) 설정 원칙
- 렌더러는 [frontend.md](./frontend.md) 규칙 적용 (Electron 과 동일)
