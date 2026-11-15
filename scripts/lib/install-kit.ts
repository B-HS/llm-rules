import { chmod, copyFile, cp, lstat, mkdir, readdir, rm, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const MANAGED_BLOCK_BEGIN_PATTERN = /<!-- BEGIN: llm-rules \(managed by [^)]*\) -->/
const MANAGED_BLOCK_END = '<!-- END: llm-rules -->'
const EXECUTABLE_MODE = 0o755
const BACKUP_SUFFIX = '.bak'

export type InstallOptions = { isDryRun: boolean; shouldBackup: boolean }
export type Tokens = Record<string, string>
type CopyFilesInput = {
    sourceDir: string
    targetDir: string
    extension: string
    label: string
    options: InstallOptions
    tokens?: Tokens
    isExecutable?: boolean
    shouldResetTarget?: boolean
    excludedFiles?: readonly string[]
}

export const log = (...values: unknown[]) => console.log(...values)
export const warn = (...values: unknown[]) => console.warn('경고:', ...values)
export const die = (message: string): never => {
    console.error(`오류: ${message}`)
    process.exit(1)
}

export const createArgs = (argv: string[]) => ({
    has: (flag: string) => argv.includes(flag),
    get: (name: string) => {
        const index = argv.indexOf(name)
        return index === -1 ? undefined : argv[index + 1]
    },
})

export const createAsk = (shouldAcceptDefaults: boolean) => (question: string, fallback: string) => {
    if (shouldAcceptDefaults || !process.stdin.isTTY) return fallback
    return (prompt(question) ?? '').trim() || fallback
}

export const selectItems = <Item extends string>(
    allItems: readonly Item[],
    args: ReturnType<typeof createArgs>,
    ask: ReturnType<typeof createAsk>,
) => {
    if (args.has('--all')) return [...allItems]
    const flagged = allItems.filter((item) => args.has(`--${item}`))
    if (flagged.length > 0) return flagged
    log('설치 항목:')
    allItems.forEach((item, index) => log(`  ${index + 1}) ${item}`))
    const selection = ask('쉼표로 번호를 고르거나 a 로 전체 설치, 기본 a: ', 'a')
    if (/^a/i.test(selection)) return [...allItems]
    const selected = selection.split(',').map((value) => allItems[Number(value.trim()) - 1])
    return [...new Set(selected.filter((item): item is Item => item !== undefined))]
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const pathExists = async (path: string) =>
    lstat(path).then(
        () => true,
        () => false,
    )

export const readTextIfExists = async (path: string) => ((await Bun.file(path).exists()) ? Bun.file(path).text() : '')

export const replaceTokens = (text: string, tokens: Tokens = {}) =>
    Object.entries(tokens).reduce((rendered, [name, value]) => rendered.replaceAll(`{{${name}}}`, value), text)

export const buildManagedBlock = (installerName: string, body: string) =>
    [`<!-- BEGIN: llm-rules (managed by llm-rules/scripts/${installerName}) -->`, body.trim(), MANAGED_BLOCK_END].join('\n\n')

export const applyManagedBlock = (original: string, block: string) => {
    const beginMatch = MANAGED_BLOCK_BEGIN_PATTERN.exec(original)
    const endIndex = original.indexOf(MANAGED_BLOCK_END)
    if (beginMatch && endIndex > beginMatch.index) {
        const before = original.slice(0, beginMatch.index).trimEnd()
        const after = original.slice(endIndex + MANAGED_BLOCK_END.length).trimStart()
        return `${[before, block, after].filter(Boolean).join('\n\n')}\n`
    }
    if (original.trim() === '') return `${block}\n`
    return `${original.trimEnd()}\n\n${block}\n`
}

export const removeMarkedBlock = (original: string, beginMarker: string, endMarker: string) => {
    const beginIndex = original.indexOf(beginMarker)
    const endIndex = original.indexOf(endMarker)
    if (beginIndex === -1 || endIndex <= beginIndex) return original
    const before = original.slice(0, beginIndex).trimEnd()
    const after = original.slice(endIndex + endMarker.length).trimStart()
    const remaining = [before, after].filter(Boolean).join('\n\n')
    return remaining ? `${remaining}\n` : ''
}

export const backupFile = async (path: string, options: InstallOptions) => {
    if (!options.shouldBackup || !(await Bun.file(path).exists())) return
    await copyFile(path, `${path}${BACKUP_SUFFIX}`)
}

/**
 * Writes the managed block into an instruction file while keeping user-owned text.
 * A symbolic link is replaced with a regular file so the link target is never modified.
 */
export const writeManagedInstructions = async (path: string, block: string, options: InstallOptions, label: string) => {
    const linkInfo = await lstat(path).catch(() => undefined)
    const isSymbolicLink = linkInfo?.isSymbolicLink() ?? false
    const original = isSymbolicLink ? '' : await readTextIfExists(path)
    const next = applyManagedBlock(original, block)
    if (!isSymbolicLink && next === original) {
        log(`${label}: 이미 최신`)
        return
    }
    if (options.isDryRun) {
        log(`${label}: ${isSymbolicLink ? '심볼릭 링크를 실제 파일로 교체' : original ? '갱신' : '생성'} 예정 → ${path}`)
        return
    }
    await mkdir(dirname(path), { recursive: true })
    if (isSymbolicLink) {
        await unlink(path)
        warn(`${label}: ${path} 는 심볼릭 링크였습니다. 링크 대상은 그대로 두고 실제 파일로 교체했습니다.`)
    } else {
        await backupFile(path, options)
    }
    await Bun.write(path, next)
    log(`${label}: ${path}`)
}

export const copyRenderedFiles = async ({
    sourceDir,
    targetDir,
    extension,
    label,
    options,
    tokens,
    isExecutable,
    shouldResetTarget,
    excludedFiles = [],
}: CopyFilesInput) => {
    const files = (await readdir(sourceDir)).filter((file) => file.endsWith(extension) && !excludedFiles.includes(file))
    if (options.isDryRun) {
        log(`${label}: ${files.length}개 설치 예정 → ${targetDir}`)
        return files
    }
    if (shouldResetTarget) await rm(targetDir, { recursive: true, force: true })
    await mkdir(targetDir, { recursive: true })
    for (const file of files) {
        const targetPath = join(targetDir, file)
        await Bun.write(targetPath, replaceTokens(await Bun.file(join(sourceDir, file)).text(), tokens))
        if (isExecutable) await chmod(targetPath, EXECUTABLE_MODE)
    }
    log(`${label}: ${files.length}개 → ${targetDir}`)
    return files
}

export const copySkillDirectories = async (sourceDir: string, targetDir: string, tokens: Tokens, options: InstallOptions) => {
    const directories = (await readdir(sourceDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    if (options.isDryRun) {
        log(`skills: ${directories.length}개 설치 예정 → ${targetDir}`)
        return directories
    }
    await mkdir(targetDir, { recursive: true })
    for (const directory of directories) {
        const destination = join(targetDir, directory)
        await rm(destination, { recursive: true, force: true })
        await cp(join(sourceDir, directory), destination, { recursive: true })
        const skillPath = join(destination, 'SKILL.md')
        await Bun.write(skillPath, replaceTokens(await Bun.file(skillPath).text(), tokens))
    }
    log(`skills: ${directories.length}개 → ${targetDir}`)
    return directories
}

export const removeFiles = async (directory: string, files: readonly string[], options: InstallOptions) => {
    if (options.isDryRun) return
    await Promise.all(files.map((file) => rm(join(directory, file), { force: true })))
}

export const parseJsonObject = (text: string, path: string) => {
    const value: unknown = JSON.parse(text)
    if (!isRecord(value)) return die(`${path} 의 최상위 값이 JSON 객체가 아닙니다.`)
    return value
}

/**
 * Removes line comments, block comments and trailing commas from JSONC text without touching string literals.
 */
export const stripJsonComments = (source: string) => {
    const withoutComments = source.replace(
        /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
        (_match, stringLiteral: string | undefined) => stringLiteral ?? '',
    )
    return withoutComments.replace(
        /("(?:\\.|[^"\\])*")|,(\s*[}\]])/g,
        (_match, stringLiteral: string | undefined, closing: string | undefined) => stringLiteral ?? closing ?? '',
    )
}
