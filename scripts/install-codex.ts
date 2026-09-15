#!/usr/bin/env bun

import { homedir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { mkdir, copyFile, cp, rm, readdir, chmod } from 'node:fs/promises'

const BEGIN = '<!-- BEGIN: llm-rules (managed by llm-rules/scripts/install-codex.ts) -->'
const LEGACY_BEGIN = '<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->'
const END = '<!-- END: llm-rules -->'
const DIR_TOKEN = '{{LLM_RULES_DIR}}'
const HOOKS_DIR_TOKEN = '{{HOOKS_DIR}}'
const CODEX_DOC_LIMIT_BYTES = 32 * 1024
const CODEX_DOC_WARNING_MARGIN_BYTES = 2 * 1024
const EXECUTABLE_MODE = 0o755
const HOME_DIR = homedir()
const argv = process.argv.slice(2)

const log = (...values: unknown[]) => console.log(...values)
const warn = (...values: unknown[]) => console.warn('경고:', ...values)
const die = (message: string): never => {
    console.error(`오류: ${message}`)
    process.exit(1)
}
const has = (flag: string) => argv.includes(flag)
const getOption = (name: string) => {
    const index = argv.indexOf(name)
    return index === -1 ? undefined : argv[index + 1]
}

if (has('--help') || has('-h')) {
    log(
        [
            'Codex 전용 설치 CLI',
            '',
            '사용법: bun run install-codex [위치] [항목] [옵션]',
            '',
            '위치: --global | --project | --target <dir>',
            '항목: --all | --instructions | --hooks | --skills | --agents | --rules',
            '옵션: --dry-run --yes/-y --no-backup --help/-h',
            '',
            '예: bun run install-codex --global --all',
            '    bun run install-codex --project --hooks --skills --agents --rules',
        ].join('\n'),
    )
    process.exit(0)
}

const options = {
    dryRun: has('--dry-run'),
    yes: has('--yes') || has('-y'),
    backup: !has('--no-backup'),
}

const assetsDir = resolve(import.meta.dir, '../docs/codex/assets')
const conventionDir = resolve(import.meta.dir, '../docs/convention')
const corePath = resolve(import.meta.dir, '../docs/agents-core.md')
const hooksTemplatePath = join(assetsDir, 'hooks.json')

for (const requiredPath of [join(conventionDir, 'index.md'), corePath, hooksTemplatePath]) {
    if (!(await Bun.file(requiredPath).exists())) die(`필수 자산을 찾을 수 없습니다: ${requiredPath}`)
}

const ask = (question: string, fallback: string) => {
    if (options.yes || !process.stdin.isTTY) return fallback
    return (prompt(question) ?? '').trim() || fallback
}

type Location = {
    kind: 'global' | 'project'
    rootDir: string
    codexDir: string
    skillsDir: string
}

const resolveLocation = (): Location => {
    const target = getOption('--target')
    if (target) {
        const rootDir = resolve(target)
        return { kind: 'project', rootDir, codexDir: join(rootDir, '.codex'), skillsDir: join(rootDir, '.agents', 'skills') }
    }
    if (has('--project')) {
        const rootDir = resolve(process.cwd())
        return { kind: 'project', rootDir, codexDir: join(rootDir, '.codex'), skillsDir: join(rootDir, '.agents', 'skills') }
    }
    if (has('--global')) return { kind: 'global', rootDir: join(HOME_DIR, '.codex'), codexDir: join(HOME_DIR, '.codex'), skillsDir: join(HOME_DIR, '.agents', 'skills') }
    const choice = ask('설치 위치 [1] 글로벌 [2] 프로젝트, 기본 1: ', '1')
    if (choice === '2') {
        const rootDir = resolve(process.cwd())
        return { kind: 'project', rootDir, codexDir: join(rootDir, '.codex'), skillsDir: join(rootDir, '.agents', 'skills') }
    }
    return { kind: 'global', rootDir: join(HOME_DIR, '.codex'), codexDir: join(HOME_DIR, '.codex'), skillsDir: join(HOME_DIR, '.agents', 'skills') }
}

const ALL_ITEMS = ['instructions', 'hooks', 'skills', 'agents', 'rules'] as const
type Item = (typeof ALL_ITEMS)[number]

const resolveItems = () => {
    if (has('--all')) return [...ALL_ITEMS]
    const flagged = ALL_ITEMS.filter((item) => has(`--${item}`))
    if (flagged.length > 0) return flagged
    log('설치 항목:')
    log('  1) instructions: AGENTS.md 코어와 컨벤션 전문')
    log('  2) hooks: Codex lifecycle hook 7종')
    log('  3) skills: 반복 워크플로 9종')
    log('  4) agents: 읽기 전용 reviewer 7종')
    log('  5) rules: Git·삭제·검증 Execpolicy')
    const selection = ask('쉼표로 선택하거나 a로 전체 설치, 기본 a: ', 'a')
    if (/^a/i.test(selection)) return [...ALL_ITEMS]
    const itemByNumber: Record<string, Item> = { '1': 'instructions', '2': 'hooks', '3': 'skills', '4': 'agents', '5': 'rules' }
    return [
        ...new Set(
            selection
                .split(',')
                .map((value) => itemByNumber[value.trim()])
                .filter((value): value is Item => value !== undefined),
        ),
    ]
}

const location = resolveLocation()
const items = resolveItems()
if (items.length === 0) die('선택된 설치 항목이 없습니다.')

const docOrder = ['index', 'ai-process', 'common', 'comments', 'security', 'git', 'frontend', 'fsd', 'query', 'backend', 'desktop']
const orderOf = (file: string) => {
    const index = docOrder.indexOf(file.replace(/\.md$/, ''))
    return index === -1 ? docOrder.length : index
}
const docFiles = (await readdir(conventionDir)).filter((file) => file.endsWith('.md')).sort((left, right) => orderOf(left) - orderOf(right) || left.localeCompare(right))
const core = (await Bun.file(corePath).text()).trim()

const applyManagedBlock = (original: string, block: string) => {
    const beginMarker = original.includes(BEGIN) ? BEGIN : LEGACY_BEGIN
    const beginIndex = original.indexOf(beginMarker)
    const endIndex = original.indexOf(END)
    if (beginIndex !== -1 && endIndex > beginIndex) {
        const before = original.slice(0, beginIndex).trimEnd()
        const after = original.slice(endIndex + END.length).trimStart()
        return [before, block, after].filter(Boolean).join('\n\n') + '\n'
    }
    if (original.trim() === '') return `${block}\n`
    return `${original.trimEnd()}\n\n${block}\n`
}

const installInstructions = async () => {
    const agentsPath = location.kind === 'global' ? join(location.codexDir, 'AGENTS.md') : join(location.rootDir, 'AGENTS.md')
    const installedDocsDir = location.kind === 'global' ? join(location.codexDir, 'llm-rules') : join(location.rootDir, '.llm-rules')
    const modelDocsDir = location.kind === 'global' ? installedDocsDir : '.llm-rules'
    const intro = '# 코딩 컨벤션 (LLM Rules)\n\n> 이 블록은 install-codex가 관리합니다. §0 참조 프로토콜에 따라 전문 문서를 읽습니다.'
    const block = [BEGIN, intro, core.replaceAll(DIR_TOKEN, modelDocsDir), END].join('\n\n')
    const blockSize = Buffer.byteLength(block, 'utf8')
    if (blockSize > CODEX_DOC_LIMIT_BYTES - CODEX_DOC_WARNING_MARGIN_BYTES) warn(`AGENTS.md 코어가 Codex 기본 한도에 근접했습니다: ${blockSize} bytes`)

    const original = (await Bun.file(agentsPath).exists()) ? await Bun.file(agentsPath).text() : ''
    const next = applyManagedBlock(original, block)
    if (options.dryRun) {
        log(`instructions: ${agentsPath}와 전문 ${docFiles.length}개 설치 예정`)
        return
    }
    await mkdir(dirname(agentsPath), { recursive: true })
    await mkdir(installedDocsDir, { recursive: true })
    if (options.backup && original && next !== original) await copyFile(agentsPath, `${agentsPath}.bak`)
    if (next !== original) await Bun.write(agentsPath, next)
    await Promise.all(docFiles.map((file) => copyFile(join(conventionDir, file), join(installedDocsDir, file))))
    log(`instructions: ${agentsPath}, 전문 ${docFiles.length}개 설치`)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const parseJsonObject = (text: string, path: string) => {
    const value: unknown = JSON.parse(text)
    if (!isRecord(value)) die(`${path}의 최상위 값이 JSON 객체가 아닙니다.`)
    return value
}
const getHooksRecord = (value: Record<string, unknown>, path: string) => {
    if (value.hooks === undefined) return {}
    if (!isRecord(value.hooks)) die(`${path}의 hooks가 JSON 객체가 아닙니다.`)
    for (const [event, entries] of Object.entries(value.hooks)) {
        if (!Array.isArray(entries) || !entries.every(isRecord)) die(`${path}의 hooks.${event}가 객체 배열이 아닙니다.`)
    }
    return value.hooks
}
const isManagedHookEntry = (entry: unknown) => {
    if (!isRecord(entry) || !Array.isArray(entry.hooks)) return false
    return entry.hooks.some((handler) => isRecord(handler) && typeof handler.command === 'string' && handler.command.includes('/hooks/llm-rules/'))
}

const copyHookScripts = async () => {
    const sourceDir = join(assetsDir, 'hooks')
    const destinationDir = join(location.codexDir, 'hooks', 'llm-rules')
    const files = (await readdir(sourceDir)).filter((file) => file.endsWith('.sh'))
    if (options.dryRun) {
        log(`hooks: 스크립트 ${files.length}개와 ${join(location.codexDir, 'hooks.json')} 병합 예정`)
        return
    }
    await mkdir(destinationDir, { recursive: true })
    for (const file of files) {
        const destination = join(destinationDir, file)
        await copyFile(join(sourceDir, file), destination)
        await chmod(destination, EXECUTABLE_MODE)
    }

    const hooksPath = join(location.codexDir, 'hooks.json')
    const exists = await Bun.file(hooksPath).exists()
    const current = exists ? parseJsonObject(await Bun.file(hooksPath).text(), hooksPath) : {}
    const currentHooks = getHooksRecord(current, hooksPath)
    const template = parseJsonObject(await Bun.file(hooksTemplatePath).text(), hooksTemplatePath)
    const hookBase = location.kind === 'global' ? '$HOME/.codex/hooks/llm-rules' : '$(git rev-parse --show-toplevel)/.codex/hooks/llm-rules'
    const rendered = parseJsonObject(JSON.stringify(template).replaceAll(HOOKS_DIR_TOKEN, hookBase), hooksTemplatePath)
    const renderedHooks = getHooksRecord(rendered, hooksTemplatePath)

    for (const [event, entries] of Object.entries(renderedHooks)) {
        if (!Array.isArray(entries) || !entries.every(isRecord)) die(`${hooksTemplatePath}의 hooks.${event}가 객체 배열이 아닙니다.`)
        const existingEntries = currentHooks[event]
        const preserved = Array.isArray(existingEntries) ? existingEntries.filter((entry) => !isManagedHookEntry(entry)) : []
        currentHooks[event] = [...preserved, ...entries]
    }
    current.hooks = currentHooks
    if (current.description === undefined) current.description = rendered.description
    if (options.backup && exists) await copyFile(hooksPath, `${hooksPath}.bak`)
    await Bun.write(hooksPath, `${JSON.stringify(current, null, 2)}\n`)
    log(`hooks: 스크립트 ${files.length}개 설치, hooks.json 병합`)
}

const copyDirectories = async (sourceDir: string, destinationDir: string, label: string) => {
    const directories = (await readdir(sourceDir, { withFileTypes: true })).filter((entry) => entry.isDirectory())
    if (options.dryRun) {
        log(`${label}: ${directories.length}개를 ${destinationDir}에 설치 예정`)
        return
    }
    await mkdir(destinationDir, { recursive: true })
    for (const directory of directories) {
        const destination = join(destinationDir, directory.name)
        await rm(destination, { recursive: true, force: true })
        await cp(join(sourceDir, directory.name), destination, { recursive: true })
    }
    log(`${label}: ${directories.length}개 설치`)
}

const copyFiles = async (sourceDir: string, destinationDir: string, extension: string, label: string) => {
    const files = (await readdir(sourceDir)).filter((file) => file.endsWith(extension))
    if (options.dryRun) {
        log(`${label}: ${files.length}개를 ${destinationDir}에 설치 예정`)
        return
    }
    await mkdir(destinationDir, { recursive: true })
    await Promise.all(files.map((file) => copyFile(join(sourceDir, file), join(destinationDir, file))))
    log(`${label}: ${files.length}개 설치`)
}

log(`위치: ${location.kind} (${location.codexDir})`)
log(`항목: ${items.join(', ')}`)
if (options.dryRun) log('dry-run: 파일을 수정하지 않습니다.')

if (items.includes('instructions')) await installInstructions()
if (items.includes('hooks')) await copyHookScripts()
if (items.includes('skills')) await copyDirectories(join(assetsDir, 'skills'), location.skillsDir, 'skills')
if (items.includes('agents')) await copyFiles(join(assetsDir, 'agents'), join(location.codexDir, 'agents'), '.toml', 'agents')
if (items.includes('rules')) await copyFiles(join(assetsDir, 'rules'), join(location.codexDir, 'rules'), '.rules', 'rules')

if (options.dryRun) log('dry-run 완료')
else {
    log('Codex 설치 완료')
    log('새 세션에서 /hooks와 /skills를 확인하고 custom agent를 요청해 동작을 확인하세요.')
    if (items.includes('hooks')) warn('새로 설치하거나 변경된 hook은 Codex /hooks에서 신뢰 승인 후 실행됩니다.')
}
