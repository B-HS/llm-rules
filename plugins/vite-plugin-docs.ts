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

const CONVENTION_DIR = fileURLToPath(new URL('../docs/convention', import.meta.url))

const GITHUB_REPO = process.env.GITHUB_REPO ?? 'B-HS/llm-rules'

const ORDER: Record<string, number> = { index: 0, 'ai-process': 1, common: 2, comments: 3, frontend: 4, fsd: 5, query: 6, backend: 7, desktop: 8 }
const LABELS: Record<string, string> = {
    index: '개요',
    'ai-process': 'AI 프로세스',
    common: '공통',
    comments: '주석',
    frontend: '프론트엔드',
    fsd: 'FSD 아키텍처',
    query: 'TanStack Query',
    backend: '백엔드',
    desktop: '데스크톱',
}

const VIRTUAL_ID = 'virtual:docs'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const toText = (node: any): string => {
    if (node.type === 'text') return node.value as string
    if (Array.isArray(node.children)) return node.children.map(toText).join('')
    return ''
}

const collectHeadings = (acc: DocHeading[]) => () => (tree: any) => {
    visit(tree, 'element', (node: any) => {
        const match = /^h([1-6])$/.exec(node.tagName)
        if (!match) return
        const depth = Number(match[1])
        if (depth < 2 || depth > 3) return
        const id = node.properties?.id
        if (typeof id !== 'string') return
        acc.push({ id, text: toText(node).trim(), depth })
    })
}

const rewriteLinks = (base: string) => () => (tree: any) => {
    visit(tree, 'element', (node: any) => {
        if (node.tagName !== 'a') return
        const href = node.properties?.href
        if (typeof href !== 'string' || !href) return
        if (/^(https?:|mailto:|#|\/\/)/.test(href)) return

        const [pathPart, hash] = href.split('#')
        if (/\.md$/.test(pathPart)) {
            const name = pathPart.replace(/.*\//, '').replace(/\.md$/, '')
            const route = name === 'index' ? base : `${base}${name}`
            node.properties.href = hash ? `${route}#${hash}` : route
            node.properties['data-doc-link'] = ''
        } else if (pathPart && !pathPart.startsWith('/')) {
            const resolved = path.posix.normalize(path.posix.join('docs/convention', pathPart))
            node.properties.href = `https://github.com/${GITHUB_REPO}/blob/main/${resolved}`
            node.properties.target = '_blank'
            node.properties.rel = 'noreferrer'
        }
    })
}

const buildDoc = async (file: string, base: string): Promise<Doc> => {
    const slug = file.replace(/\.md$/, '')
    const source = await fs.readFile(path.join(CONVENTION_DIR, file), 'utf-8')
    const { content } = matter(source)
    const headings: DocHeading[] = []

    const processed = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkBreaks)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(collectHeadings(headings))
        .use(rewriteLinks(base))
        .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
        .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content)

    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : slug

    return {
        slug,
        route: slug === 'index' ? '/' : `/${slug}`,
        label: LABELS[slug] ?? title,
        title,
        order: ORDER[slug] ?? 999,
        html: String(processed),
        headings,
    }
}

export const docsPlugin = (): Plugin => {
    let base = '/'
    let cache: string | null = null

    const buildModule = async () => {
        const files = (await fs.readdir(CONVENTION_DIR)).filter((file) => file.endsWith('.md'))
        const docs = await Promise.all(files.map((file) => buildDoc(file, base)))
        docs.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
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
            if (!ctx.file.startsWith(CONVENTION_DIR)) return
            cache = null
            const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID)
            if (mod) ctx.server.moduleGraph.invalidateModule(mod)
            ctx.server.ws.send({ type: 'full-reload' })
            return []
        },
    }
}
