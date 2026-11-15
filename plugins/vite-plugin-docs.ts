import type { Plugin } from 'vite'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Doc, DocHeading } from '../src/types/docs'

const GITHUB_REPO = process.env.GITHUB_REPO ?? 'B-HS/llm-rules'

type DocSection = Doc['section']
type DocSource = {
    section: DocSection
    sectionLabel: string
    directory: string
    repositoryDirectory: string
    routePrefix: string
    orderOffset: number
    order: string[]
    labels: Record<string, string>
    tokens: Record<string, string>
}

const RULE_LABELS: Record<string, string> = {
    core: '룰 · 코어',
    common: '룰 · 공통',
    comments: '룰 · 주석',
    security: '룰 · 보안',
    git: '룰 · Git',
    frontend: '룰 · 프론트엔드',
    fsd: '룰 · FSD',
    query: '룰 · TanStack Query',
    backend: '룰 · 백엔드',
    desktop: '룰 · 데스크톱',
}
const EDITIONS: { section: DocSection; sectionLabel: string; folder: string; tokens: Record<string, string> }[] = [
    { section: 'claude-code', sectionLabel: 'Claude Code', folder: 'claudecode', tokens: { RULES_DIR: '~/.claude/rules/llm-rules' } },
    { section: 'codex', sectionLabel: 'Codex', folder: 'codex', tokens: { LLM_RULES_DIR: '~/.codex/llm-rules' } },
    { section: 'opencode', sectionLabel: 'OpenCode', folder: 'opencode', tokens: { LLM_RULES_DIR: '~/.config/opencode/llm-rules' } },
    { section: 'pi', sectionLabel: 'Pi', folder: 'pi', tokens: { LLM_RULES_DIR: '~/.pi/agent/llm-rules' } },
]

const DOC_SOURCES: DocSource[] = EDITIONS.flatMap(({ section, sectionLabel, folder, tokens }) => [
    {
        section,
        sectionLabel,
        directory: fileURLToPath(new URL(`../docs/${folder}`, import.meta.url)),
        repositoryDirectory: `docs/${folder}`,
        routePrefix: `/${section}`,
        orderOffset: 0,
        order: ['index'],
        labels: { index: '개요' },
        tokens,
    },
    {
        section,
        sectionLabel,
        directory: fileURLToPath(new URL(`../docs/${folder}/rules`, import.meta.url)),
        repositoryDirectory: `docs/${folder}/rules`,
        routePrefix: `/${section}/rules`,
        orderOffset: 1,
        order: Object.keys(RULE_LABELS),
        labels: RULE_LABELS,
        tokens,
    },
])

const toRoute = (source: DocSource, slug: string) => (slug === 'index' ? source.routePrefix : `${source.routePrefix}/${slug}`)

const VIRTUAL_ID = 'virtual:docs'
const RESOLVED_ID = '\0' + VIRTUAL_ID
type VisitTree = Parameters<typeof visit>[0]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const toText = (node: unknown): string => {
    if (!isRecord(node)) return ''
    if (node.type === 'text' && typeof node.value === 'string') return node.value
    if (Array.isArray(node.children)) return node.children.map(toText).join('')
    return ''
}

const collectHeadings = (acc: DocHeading[]) => () => (tree: VisitTree) => {
    visit(tree, 'element', (node: unknown) => {
        if (!isRecord(node) || typeof node.tagName !== 'string') return
        const match = /^h([1-6])$/.exec(node.tagName)
        if (!match) return
        const depth = Number(match[1])
        if (depth < 2 || depth > 3) return
        const id = isRecord(node.properties) ? node.properties.id : undefined
        if (typeof id !== 'string') return
        acc.push({ id, text: toText(node).trim(), depth })
    })
}

const rewriteLinks = (base: string, source: DocSource) => () => (tree: VisitTree) => {
    visit(tree, 'element', (node: unknown) => {
        if (!isRecord(node) || node.tagName !== 'a' || !isRecord(node.properties)) return
        const href = node.properties?.href
        if (typeof href !== 'string' || !href) return
        if (/^(https?:|mailto:|#|\/\/)/.test(href)) return

        const [pathPart, hash] = href.split('#')
        const resolved = path.posix.normalize(path.posix.join(source.repositoryDirectory, pathPart))
        if (/\.md$/.test(pathPart)) {
            const targetSource = DOC_SOURCES.find((candidate) => path.posix.dirname(resolved) === candidate.repositoryDirectory)
            if (targetSource) {
                const route = `${base.replace(/\/$/, '')}${toRoute(targetSource, path.posix.basename(resolved, '.md'))}`
                node.properties.href = hash ? `${route}#${hash}` : route
                node.properties['data-doc-link'] = ''
                return
            }
        }
        if (!pathPart || pathPart.startsWith('/')) return
        node.properties.href = `https://github.com/${GITHUB_REPO}/blob/main/${resolved}`
        node.properties.target = '_blank'
        node.properties.rel = 'noreferrer'
    })
}

const buildDoc = async (file: string, base: string, source: DocSource): Promise<Doc> => {
    const slug = file.replace(/\.md$/, '')
    const markdown = await fs.readFile(path.join(source.directory, file), 'utf-8')
    const rendered = Object.entries(source.tokens).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, value), markdown)
    const { content } = matter(rendered)
    const headings: DocHeading[] = []

    const processed = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkBreaks)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(collectHeadings(headings))
        .use(rewriteLinks(base, source))
        .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
        .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content)

    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : slug

    return {
        slug: `${source.routePrefix.slice(1).replaceAll('/', '-')}-${slug}`,
        route: toRoute(source, slug),
        section: source.section,
        sectionLabel: source.sectionLabel,
        label: source.labels[slug] ?? title,
        title,
        order: source.orderOffset + source.order.indexOf(slug),
        html: String(processed),
        headings,
    }
}

export const docsPlugin = (): Plugin => {
    let base = '/'
    let cache: string | null = null

    const buildModule = async () => {
        const docsBySource = await Promise.all(
            DOC_SOURCES.map(async (source) => {
                const files = (await fs.readdir(source.directory)).filter((file) => file.endsWith('.md'))
                const docs = await Promise.all(files.map((file) => buildDoc(file, base, source)))
                return docs.sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug))
            }),
        )
        const docs = docsBySource.flat()
        return `export const docs = ${JSON.stringify(docs)}\n`
    }

    return {
        name: 'vite-plugin-docs',
        enforce: 'pre',
        configResolved(config) {
            base = config.base
        },
        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID
        },
        async load(id) {
            if (id !== RESOLVED_ID) return
            if (!cache) cache = await buildModule()
            return cache
        },
        async handleHotUpdate(ctx) {
            if (!DOC_SOURCES.some((source) => ctx.file.startsWith(source.directory))) return
            cache = null
            const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID)
            if (mod) ctx.server.moduleGraph.invalidateModule(mod)
            ctx.server.ws.send({ type: 'full-reload' })
            return []
        },
    }
}
