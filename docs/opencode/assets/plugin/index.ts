import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, join } from 'node:path'

type TextPart = { type: 'text'; text: string }
type Registration = { dispose: () => Promise<void> | void }
type ToolBeforeEvent = { tool: string; input: unknown }
type ToolAfterEvent = { tool: string; input: unknown; status: 'completed' | 'error'; result?: Record<string, unknown> }
type ToolHooks = { 'execute.before': ToolBeforeEvent; 'execute.after': ToolAfterEvent }
type ContextEvent = { system: TextPart[] }
type PluginContext = {
    location: { directory: string }
    tool: { hook: <Name extends keyof ToolHooks>(name: Name, callback: (event: ToolHooks[Name]) => Promise<void> | void) => Promise<Registration> }
    session: { hook: (name: 'context', callback: (event: ContextEvent) => Promise<void> | void) => Promise<Registration> }
}
type LintRule = { level: 'required' | 'advisory'; message: string; matches: (path: string, content: string) => boolean }

const EDIT_TOOLS = new Set(['edit', 'write', 'patch'])
const PATH_KEYS = ['filePath', 'path', 'file_path', 'file']
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const DOCUMENT_EXTENSIONS = new Set(['.md', '.mdx', '.txt'])
const MAX_PENDING_PROCESS_ITEMS = 4
const PROCESS_RELATIVE_PATH = 'docs/PROCESS.md'
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

const processCache = new Map<string, { modifiedAt: number; excerpt: string | undefined }>()

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const collectStrings = (value: unknown): string[] => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(collectStrings)
    if (isRecord(value)) return Object.values(value).flatMap(collectStrings)
    return []
}

const getTargetPath = (input: unknown) => {
    if (!isRecord(input)) return undefined
    return PATH_KEYS.map((key) => input[key]).find((value): value is string => typeof value === 'string')
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

const readActiveProcess = async (directory: string) => {
    const processPath = join(directory, PROCESS_RELATIVE_PATH)
    const info = await stat(processPath).catch(() => undefined)
    if (!info) return undefined
    const cached = processCache.get(processPath)
    if (cached?.modifiedAt === info.mtimeMs) return cached.excerpt
    const excerpt = extractActiveProcess(await readFile(processPath, 'utf8'))
    processCache.set(processPath, { modifiedAt: info.mtimeMs, excerpt })
    return excerpt
}

export default {
    id: 'llm-rules',
    setup: async (ctx: PluginContext) => {
        const registrations = await Promise.all([
            ctx.tool.hook('execute.before', (event) => {
                if (!EDIT_TOOLS.has(event.tool)) return
                const targetPath = getTargetPath(event.input)
                if (targetPath && DOCUMENT_EXTENSIONS.has(extname(targetPath))) return
                const secretLabel = findSecretLabel(event.input)
                if (!secretLabel) return
                throw new Error(
                    `[llm-rules] 차단: 작성하려는 내용에 시크릿으로 보이는 값이 있습니다 (${secretLabel}). 시크릿은 코드에 넣지 말고 .env 와 getEnv() 로 분리하세요.`,
                )
            }),
            ctx.tool.hook('execute.after', async (event) => {
                if (event.status !== 'completed' || !EDIT_TOOLS.has(event.tool)) return
                const targetPath = getTargetPath(event.input)
                if (!targetPath || !CODE_EXTENSIONS.has(extname(targetPath))) return
                const absolutePath = isAbsolute(targetPath) ? targetPath : join(ctx.location.directory, targetPath)
                const content = await readFile(absolutePath, 'utf8').catch(() => undefined)
                if (content === undefined) return
                const feedback = buildLintFeedback(absolutePath, content)
                if (!feedback || !event.result || typeof event.result.content !== 'string') return
                event.result = { ...event.result, content: `${event.result.content}\n\n${feedback}` }
            }),
            ctx.session.hook('context', async (event) => {
                const excerpt = await readActiveProcess(ctx.location.directory)
                if (excerpt) event.system.push({ type: 'text', text: excerpt })
            }),
        ])
        return async () => {
            await Promise.all(registrations.map((registration) => registration.dispose()))
        }
    },
}
