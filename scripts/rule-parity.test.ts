import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const DOCS_DIR = resolve(import.meta.dir, '..', 'docs')
const EDITIONS = ['claudecode', 'codex', 'opencode', 'pi'] as const
const AGENTS_EDITIONS = ['codex', 'opencode', 'pi'] as const
const DOMAIN_DOCS = ['common', 'comments', 'security', 'frontend', 'fsd', 'query', 'backend', 'desktop']
const CORE_FILE = 'core.md'
const CLAUDE_CORE_MAX_LINES = 200
const AGENTS_CORE_MAX_BYTES = 16 * 1024
const ALLOWED_TOKENS = ['{{RULES_DIR}}', '{{LLM_RULES_DIR}}', '{{MODEL_SOL}}', '{{MODEL_LUNA}}', '{{HOOKS_DIR}}']
const STALE_REFERENCE_PATTERN = /ai-process\.md|docs\/convention\/|agents-core\.md|workflow 사용 여부|workflow 선택/
const VERSIONED_MODEL_PATTERN = /gpt-\d|claude-(fable|opus|sonnet|haiku)-\d|\b(xhigh)\b/
const TOKEN_PATTERN = /\{\{[A-Z_]+\}\}/g
const TEXT_ASSET_PATTERN = /\.(md|toml|sh|json|ts|rules)$/

const OUTCOME_CONTRACT: Record<string, string[]> = {
    응답: ['존댓말', '첫 줄', '번호 목록', '5개 이하', '2분 안에', '이모지', '현재 상태를 한 줄'],
    문서: ['docs/PROCESS.md', 'docs/acknowledge', 'feedback', 'quality-assurance', '300줄', 'docs/history'],
    결정: ['세 번 연속', '신규 프로젝트', '추천안', '되돌리기 어려운', '체크리스트에 추가하고 계속'],
    검증: ['가장 작은 검사', '재사용', '테스트 부채', '통과했다고 쓰지 않는다', '최소 재현'],
    원칙: ['공식 문서', '근본 원인', '@ts-expect-error', '최신 버전', '요청된 변경만', 'dead code'],
    Git: [
        'Conventional Commits',
        'git log --oneline -30',
        'git add -A',
        'Co-Authored-By',
        '--force-with-lease',
        '논리 단위',
        '`docs/acknowledge` 에 기록',
    ],
    보안: ['.env.example', 'getEnv()', 'dangerouslySetInnerHTML', 'Zod'],
    코드: [
        'arrow function',
        '`any`',
        'as const',
        'z.infer',
        'UPPER_SNAKE_CASE',
        'named export',
        'useCallback',
        'React Compiler',
        'FC<Props>',
        'queryOptions',
        'QUERY_KEY',
        'createAppError',
        'withErrorHandling',
        'contextIsolation',
        'barrel',
        'kebab-case',
    ],
}

const readText = (path: string) => Bun.file(path).text()

const stripFrontmatter = (source: string) => source.replace(/^---\n[\s\S]*?\n---\n+/, '')

const listTextFiles = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true })
    const nested = await Promise.all(
        entries.map((entry) => {
            const path = join(directory, entry.name)
            if (entry.isDirectory()) return listTextFiles(path)
            return TEXT_ASSET_PATTERN.test(entry.name) ? [path] : []
        }),
    )
    return nested.flat()
}

const readEditionRuleText = async (edition: string) => {
    const rulesDir = join(DOCS_DIR, edition, 'rules')
    const ruleFiles = (await readdir(rulesDir)).filter((file) => file.endsWith('.md'))
    const ruleTexts = await Promise.all(ruleFiles.map((file) => readText(join(rulesDir, file))))
    const outputStyle = edition === 'claudecode' ? await readText(join(DOCS_DIR, edition, 'assets', 'output-styles', 'llm-rules.md')) : ''
    return [...ruleTexts, outputStyle].join('\n')
}

const extractHeadings = (markdown: string) => markdown.split('\n').filter((line) => /^#{1,4} /.test(line))

const extractCodeBlocks = (markdown: string) => markdown.match(/```[\s\S]*?```/g) ?? []

describe('에디션 간 결과물 계약', () => {
    test('모든 에디션이 결과물 계약 항목을 빠짐없이 담는다', async () => {
        for (const edition of EDITIONS) {
            const text = await readEditionRuleText(edition)
            const missing = Object.entries(OUTCOME_CONTRACT).flatMap(([group, markers]) =>
                markers.filter((marker) => !text.includes(marker)).map((marker) => `${edition} · ${group} · ${marker}`),
            )
            expect(missing).toEqual([])
        }
    })

    test('도메인 규칙 문서의 절 구성과 코드 예시가 에디션마다 같다', async () => {
        for (const doc of DOMAIN_DOCS) {
            const [reference, ...others] = await Promise.all(
                EDITIONS.map(async (edition) => stripFrontmatter(await readText(join(DOCS_DIR, edition, 'rules', `${doc}.md`)))),
            )
            for (const other of others) {
                expect(extractHeadings(other)).toEqual(extractHeadings(reference))
                expect(extractCodeBlocks(other)).toEqual(extractCodeBlocks(reference))
            }
        }
    })

    test('Git 규칙 문서는 AGENTS 계열 에디션에서 같고 Claude Code 는 코어가 같은 규칙을 담는다', async () => {
        const [reference, ...others] = await Promise.all(AGENTS_EDITIONS.map((edition) => readText(join(DOCS_DIR, edition, 'rules', 'git.md'))))
        for (const other of others) expect(other).toBe(reference)
        const claudeCore = await readText(join(DOCS_DIR, 'claudecode', 'rules', CORE_FILE))
        for (const marker of ['BREAKING CHANGE', '`feat`', '`revert`', '50자', 'kebab-case', '--force-if-includes', '명사형 종결']) {
            expect(claudeCore).toContain(marker)
        }
    })
})

describe('프로바이더별 형식 제약', () => {
    test('Claude Code 코어는 200줄 이하이고 도메인 규칙은 경로 범위를 가진다', async () => {
        const rulesDir = join(DOCS_DIR, 'claudecode', 'rules')
        const core = await readText(join(rulesDir, CORE_FILE))
        expect(core.split('\n').length).toBeLessThanOrEqual(CLAUDE_CORE_MAX_LINES)
        expect(core.startsWith('---')).toBe(false)
        for (const doc of DOMAIN_DOCS) expect((await readText(join(rulesDir, `${doc}.md`))).startsWith('---\npaths:\n')).toBe(true)
    })

    test('AGENTS 계열 코어는 프로젝트 지침 몫을 남기는 크기다', async () => {
        for (const edition of AGENTS_EDITIONS) {
            const core = await readText(join(DOCS_DIR, edition, 'rules', CORE_FILE))
            expect(Buffer.byteLength(core, 'utf8')).toBeLessThan(AGENTS_CORE_MAX_BYTES)
        }
    })

    test('에디션 자산에 제거된 문서 참조, 질문 게이트, 버전이 붙은 모델명이 없다', async () => {
        for (const edition of EDITIONS) {
            const files = [...(await listTextFiles(join(DOCS_DIR, edition, 'rules'))), ...(await listTextFiles(join(DOCS_DIR, edition, 'assets')))]
            for (const file of files) {
                const text = await readText(file)
                expect(`${file}: ${STALE_REFERENCE_PATTERN.exec(text)?.[0] ?? ''}`).toBe(`${file}: `)
                expect(`${file}: ${VERSIONED_MODEL_PATTERN.exec(text)?.[0] ?? ''}`).toBe(`${file}: `)
                const unknownTokens = (text.match(TOKEN_PATTERN) ?? []).filter((token) => !ALLOWED_TOKENS.includes(token))
                expect(unknownTokens).toEqual([])
            }
        }
    })
})
