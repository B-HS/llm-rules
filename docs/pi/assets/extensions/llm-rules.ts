import { readFile, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join } from 'node:path'

type SessionContext = { cwd: string }
type ToolCallEvent = { toolName: string; input: unknown }
type ToolResultEvent = { toolName: string; input: unknown; content: unknown[]; isError?: boolean }
type AgentStartEvent = { messageType?: string }
type BlockDecision = { block: true; reason: string }
type ResultPatch = { content: unknown[] }
type AgentStartPatch = { message: { customType: string; content: string; display: boolean } }
type ExtensionApi = {
    on: {
        (event: 'tool_call', handler: (event: ToolCallEvent, ctx: SessionContext) => BlockDecision | undefined): void
        (event: 'tool_result', handler: (event: ToolResultEvent, ctx: SessionContext) => Promise<ResultPatch | undefined>): void
        (event: 'session_start', handler: () => void): void
        (event: 'before_agent_start', handler: (event: AgentStartEvent, ctx: SessionContext) => Promise<AgentStartPatch | undefined>): void
    }
    exec: (command: string, args: string[], options?: { cwd?: string; timeout?: number }) => Promise<{ code: number }>
}
type LintRule = { level: 'required' | 'advisory'; message: string; matches: (path: string, content: string) => boolean }

const FILE_TOOLS = new Set(['read', 'write', 'edit'])
const WRITE_TOOLS = new Set(['write', 'edit'])
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const DOCUMENT_EXTENSIONS = new Set(['.md', '.mdx', '.txt'])
const ENV_EXAMPLE_FILE = '.env.example'
const PRIVATE_KEY_FILE_NAMES = new Set(['id_rsa'])
const PRETTIER_RELATIVE_PATH = 'node_modules/.bin/prettier'
const PRETTIER_TIMEOUT_MS = 30_000
const MAX_PENDING_PROCESS_ITEMS = 4
const PROCESS_RELATIVE_PATH = 'docs/PROCESS.md'
const PROCESS_MESSAGE_TYPE = 'llm-rules-process'
const ENV_FILE_NAME_PATTERN = /^\.env(\..+)?$/
const SECRETS_DIRECTORY_PATTERN = /(^|\/)secrets\//
const SHELL_ENV_FILE_PATTERN = /(^|[\s'"=<>|;&(/])\.env(?!\.example)(\.[\w.-]+)?(?=$|[\s'";|&)<>])/
const SHELL_FORCE_PUSH_PATTERN = /\bgit\s+push\b[^|;&]*\s(--force(-with-lease|-if-includes)?|-f)(\s|=|$)/
const SHELL_RECURSIVE_DELETE_PATTERN = /(^|[\s;&|(])rm\s+-(rf|fr)\b/
const BACKEND_PATH_PATTERN = /(^|\/)(service|route|compose|dto|server)\//
const DEFAULT_EXPORT_ALLOWED_PATH_PATTERN = /(page\.tsx|layout\.tsx|route\.ts)$|(^|\/)(app|pages)\//

const SECRET_PATTERNS = [
    { label: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
    { label: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
    { label: 'API secret key (sk-)', pattern: /sk-[A-Za-z0-9]{20,}/ },
    { label: 'Private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { label: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
]

const LINT_RULES: LintRule[] = [
    {
        level: 'required',
        message: 'useCallback · useMemo 를 쓰지 않고 React Compiler 에 맡깁니다 (frontend.md §4)',
        matches: (_path, content) => /\buse(Callback|Memo)\(/.test(content),
    },
    {
        level: 'required',
        message: "throw new Error 대신 createAppError('CODE') 를 씁니다 (backend.md §6.1)",
        matches: (path, content) => BACKEND_PATH_PATTERN.test(path) && /throw\s+new\s+Error\(/.test(content),
    },
    {
        level: 'required',
        message: 'process.env 직접 접근 대신 getEnv() 를 씁니다 (backend.md §14)',
        matches: (path, content) => BACKEND_PATH_PATTERN.test(path) && /process\.env\./.test(content),
    },
    {
        level: 'advisory',
        message: 'named export 가 기본입니다. default export 는 page · layout 만 (common.md §6)',
        matches: (path, content) => /^\s*export default/m.test(content) && !DEFAULT_EXPORT_ALLOWED_PATH_PATTERN.test(path),
    },
    {
        level: 'advisory',
        message: 'function 키워드 대신 arrow function 을 씁니다 (common.md §3.1)',
        matches: (_path, content) => /^\s*function\s|=\s*function\s*\(/m.test(content),
    },
    {
        level: 'advisory',
        message: '코드 주석 대신 이름·구조·타입으로 설명하고 설명은 docs/ 에 남깁니다 (comments.md §1)',
        matches: (_path, content) => /(^|[^:])\/\/[^/]|\/\*[^*]/m.test(content) && !/\/\*\*/.test(content),
    },
    {
        level: 'advisory',
        message: 'HACK · FIXME · @ts-ignore · eslint-disable 대신 근본 원인을 고칩니다',
        matches: (_path, content) => /\b(HACK|FIXME|XXX|TODO)\b|@ts-ignore|eslint-disable/.test(content),
    },
    {
        level: 'advisory',
        message: 'dangerouslySetInnerHTML 은 sanitize 를 거친 결과에만 씁니다 (security.md §4)',
        matches: (_path, content) => /\bdangerouslySetInnerHTML\b/.test(content) && !/sanitize|DOMPurify/i.test(content),
    },
]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const collectStrings = (value: unknown): string[] => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(collectStrings)
    if (isRecord(value)) return Object.values(value).flatMap(collectStrings)
    return []
}

const getStringField = (input: unknown, key: string) => {
    if (!isRecord(input)) return undefined
    const value = input[key]
    return typeof value === 'string' ? value : undefined
}

const isProtectedPath = (path: string) => {
    const fileName = basename(path)
    if (fileName === ENV_EXAMPLE_FILE) return false
    return (
        ENV_FILE_NAME_PATTERN.test(fileName) ||
        SECRETS_DIRECTORY_PATTERN.test(path) ||
        extname(path) === '.pem' ||
        PRIVATE_KEY_FILE_NAMES.has(fileName)
    )
}

const findShellViolation = (command: string) => {
    if (SHELL_ENV_FILE_PATTERN.test(command)) return '.env 파일은 읽거나 쓰지 않습니다. 새 변수는 .env.example 에 키 이름만 추가하세요.'
    if (SHELL_FORCE_PUSH_PATTERN.test(command)) return 'force push 는 하지 않습니다. 이력 재작성이 필요하면 사용자와 방향을 정하세요.'
    if (SHELL_RECURSIVE_DELETE_PATTERN.test(command)) return 'rm -rf 대신 정확한 대상을 확인하고 복구 가능한 방법으로 삭제하세요.'
    return undefined
}

const findSecretLabel = (input: unknown) => {
    const texts = collectStrings(input)
    return SECRET_PATTERNS.find(({ pattern }) => texts.some((text) => pattern.test(text)))?.label
}

const buildLintFeedback = (path: string, content: string) => {
    const matched = LINT_RULES.filter((rule) => rule.matches(path, content))
    const required = matched.filter((rule) => rule.level === 'required').map((rule) => rule.message)
    const advisory = matched.filter((rule) => rule.level === 'advisory').map((rule) => rule.message)
    return [
        required.length > 0 ? `[llm-rules] 수정이 필요합니다: ${required.join('; ')}` : undefined,
        advisory.length > 0 ? `[llm-rules] 확인하세요: ${advisory.join('; ')}` : undefined,
    ]
        .filter((line) => line !== undefined)
        .join('\n')
}

const extractActiveProcess = (markdown: string) => {
    const sections = markdown.split(/^(?=## )/m).filter((section) => section.startsWith('## 작업:'))
    const active = sections.find((section) => {
        const title = section.split('\n')[0]
        if (title.includes('(진행 중)')) return true
        if (/\((완료|보류)\)/.test(title)) return false
        return /^- \[ \]/m.test(section)
    })
    if (!active) return undefined
    const [title, ...lines] = active.split('\n')
    const pending = lines
        .filter((line) => line.startsWith('- [ ]'))
        .slice(0, MAX_PENDING_PROCESS_ITEMS)
        .map((line) => line.replace(/ — .*/, ''))
    return ['[docs/PROCESS.md 의 진행 중인 작업]', title, ...pending, '세부가 필요하면 해당 섹션을 읽습니다.'].join('\n')
}

export default (pi: ExtensionApi) => {
    const sessionState = { isProcessInjected: false }

    pi.on('session_start', () => {
        sessionState.isProcessInjected = false
    })

    pi.on('before_agent_start', async (event, ctx) => {
        if (sessionState.isProcessInjected || event.messageType === 'custom') return undefined
        sessionState.isProcessInjected = true
        const markdown = await readFile(join(ctx.cwd, PROCESS_RELATIVE_PATH), 'utf8').catch(() => undefined)
        const excerpt = markdown === undefined ? undefined : extractActiveProcess(markdown)
        if (!excerpt) return undefined
        return { message: { customType: PROCESS_MESSAGE_TYPE, content: excerpt, display: false } }
    })

    pi.on('tool_call', (event) => {
        if (event.toolName === 'bash') {
            const reason = findShellViolation(getStringField(event.input, 'command') ?? '')
            return reason ? { block: true, reason: `[llm-rules] 차단: ${reason}` } : undefined
        }
        if (!FILE_TOOLS.has(event.toolName)) return undefined
        const path = getStringField(event.input, 'path')
        if (path && isProtectedPath(path)) {
            return {
                block: true,
                reason: '[llm-rules] 차단: .env · secrets/ · 키 파일은 읽거나 쓰지 않습니다. 새 변수는 .env.example 에 키 이름만 추가하세요.',
            }
        }
        if (!WRITE_TOOLS.has(event.toolName) || (path && DOCUMENT_EXTENSIONS.has(extname(path)))) return undefined
        const secretLabel = findSecretLabel(event.input)
        if (!secretLabel) return undefined
        return {
            block: true,
            reason: `[llm-rules] 차단: 작성하려는 내용에 시크릿으로 보이는 값이 있습니다 (${secretLabel}). 시크릿은 코드에 넣지 말고 .env 와 getEnv() 로 분리하세요.`,
        }
    })

    pi.on('tool_result', async (event, ctx) => {
        if (event.isError || !WRITE_TOOLS.has(event.toolName)) return undefined
        const path = getStringField(event.input, 'path')
        if (!path || !CODE_EXTENSIONS.has(extname(path))) return undefined
        const absolutePath = isAbsolute(path) ? path : join(ctx.cwd, path)
        const prettierPath = join(ctx.cwd, PRETTIER_RELATIVE_PATH)
        const hasPrettier = await stat(prettierPath).then(
            () => true,
            () => false,
        )
        if (hasPrettier) await pi.exec(prettierPath, ['--write', absolutePath], { cwd: ctx.cwd, timeout: PRETTIER_TIMEOUT_MS }).catch(() => undefined)
        const content = await readFile(absolutePath, 'utf8').catch(() => undefined)
        if (content === undefined) return undefined
        const feedback = buildLintFeedback(absolutePath, content)
        if (!feedback) return undefined
        return { content: [...event.content, { type: 'text', text: feedback }] }
    })
}
