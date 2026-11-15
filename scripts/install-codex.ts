#!/usr/bin/env bun

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import {
    backupFile,
    buildManagedBlock,
    copyRenderedFiles,
    copySkillDirectories,
    createArgs,
    createAsk,
    die,
    isRecord,
    log,
    parseJsonObject,
    readTextIfExists,
    removeFiles,
    replaceTokens,
    selectItems,
    warn,
    writeManagedInstructions,
    type InstallOptions,
} from './lib/install-kit'

const ALL_ITEMS = ['instructions', 'config', 'hooks', 'skills', 'agents', 'rules'] as const
const DEFAULT_MODEL_SLUGS = { sol: 'gpt-6.1-sol', luna: 'gpt-6-luna' }
const CODEX_DOC_LIMIT_BYTES = 32 * 1024
const CODEX_DOC_WARNING_BYTES = 16 * 1024
const CORE_FILE = 'core.md'
const HOOKS_DIR_TOKEN = '{{HOOKS_DIR}}'
const CURRENT_HOOK_SCRIPTS = ['scan-secrets.sh', 'lint-edit.sh', 'session-context.sh']
const RETIRED_HOOK_SCRIPTS = ['reinject-rules.sh', 'verify-on-stop.sh', 'guard-commit.sh', 'guard-push.sh']
const LEGACY_MAIN_MODEL_PATTERN = /^\s*model\s*=\s*"gpt-5\.6-sol"\s*$/
const LEGACY_MAIN_EFFORT_PATTERN = /^\s*model_reasoning_effort\s*=\s*"high"\s*$/
const TOML_TABLE_HEADER_PATTERN = /^[\t ]*(?:\[[^\]\r\n]+\]|\[\[[^\]\r\n]+\]\])[\t ]*(?:#.*)?\r?$/m
const TOML_AGENTS_HEADER_PATTERN = /^[\t ]*\[agents\][\t ]*(?:#.*)?\r?$/m
const HOME_DIR = homedir()
const ASSETS_DIR = resolve(import.meta.dir, '../docs/codex/assets')
const RULES_SOURCE_DIR = resolve(import.meta.dir, '../docs/codex/rules')

const args = createArgs(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
    log(
        [
            'Codex 전용 설치 CLI',
            '',
            '사용법: bun run install-codex [위치] [항목] [옵션]',
            '',
            '위치: --global | --project | --target <dir>',
            `항목: --all | ${ALL_ITEMS.map((item) => `--${item}`).join(' | ')}`,
            `모델: --sol-model <slug> (기본 ${DEFAULT_MODEL_SLUGS.sol}) --luna-model <slug> (기본 ${DEFAULT_MODEL_SLUGS.luna})`,
            '옵션: --dry-run --yes/-y --no-backup --help/-h',
        ].join('\n'),
    )
    process.exit(0)
}

for (const requiredPath of [join(RULES_SOURCE_DIR, CORE_FILE), join(ASSETS_DIR, 'hooks.json'), join(ASSETS_DIR, 'config.toml')]) {
    if (!(await Bun.file(requiredPath).exists())) die(`필수 자산을 찾을 수 없습니다: ${requiredPath}`)
}

const options: InstallOptions = { isDryRun: args.has('--dry-run'), shouldBackup: !args.has('--no-backup') }
const ask = createAsk(args.has('--yes') || args.has('-y'))

const resolveLocation = () => {
    const globalLocation = {
        isGlobal: true,
        rootDir: join(HOME_DIR, '.codex'),
        codexDir: join(HOME_DIR, '.codex'),
        skillsDir: join(HOME_DIR, '.agents', 'skills'),
    }
    const toProjectLocation = (rootDir: string) => ({
        isGlobal: false,
        rootDir,
        codexDir: join(rootDir, '.codex'),
        skillsDir: join(rootDir, '.agents', 'skills'),
    })
    const target = args.get('--target')
    if (target) return toProjectLocation(resolve(target))
    if (args.has('--project')) return toProjectLocation(resolve(process.cwd()))
    if (args.has('--global')) return globalLocation
    return ask('설치 위치 [1] 글로벌 [2] 프로젝트, 기본 1: ', '1') === '2' ? toProjectLocation(resolve(process.cwd())) : globalLocation
}

const location = resolveLocation()
const items = selectItems(ALL_ITEMS, args, ask)
if (items.length === 0) die('선택된 설치 항목이 없습니다.')

const referenceDir = location.isGlobal ? join(location.codexDir, 'llm-rules') : join(location.rootDir, '.llm-rules')
const tokens = {
    LLM_RULES_DIR: location.isGlobal ? '~/.codex/llm-rules' : '.llm-rules',
    MODEL_SOL: args.get('--sol-model') ?? DEFAULT_MODEL_SLUGS.sol,
    MODEL_LUNA: args.get('--luna-model') ?? DEFAULT_MODEL_SLUGS.luna,
}

const installInstructions = async () => {
    const agentsPath = location.isGlobal ? join(location.codexDir, 'AGENTS.md') : join(location.rootDir, 'AGENTS.md')
    const block = buildManagedBlock('install-codex.ts', replaceTokens(await Bun.file(join(RULES_SOURCE_DIR, CORE_FILE)).text(), tokens))
    const blockBytes = Buffer.byteLength(block, 'utf8')
    if (blockBytes > CODEX_DOC_WARNING_BYTES) {
        warn(`AGENTS.md 코어가 ${blockBytes} bytes 입니다. Codex 는 전역과 프로젝트 파일 합산 ${CODEX_DOC_LIMIT_BYTES} bytes 에서 읽기를 멈춥니다.`)
    }
    await writeManagedInstructions(agentsPath, block, options, 'instructions')
    await copyRenderedFiles({
        sourceDir: RULES_SOURCE_DIR,
        targetDir: referenceDir,
        extension: '.md',
        label: 'reference',
        options,
        tokens,
        shouldResetTarget: true,
        excludedFiles: [CORE_FILE],
    })
}

const validateToml = (source: string, path: string) => {
    try {
        Bun.TOML.parse(source)
    } catch (error) {
        die(`${path} 의 TOML 형식이 올바르지 않습니다: ${error instanceof Error ? error.message : String(error)}`)
    }
}

const removeLegacyManagedMainDefaults = (source: string) => {
    const lines = source.split('\n')
    const hasLegacyPair = lines.some((line) => LEGACY_MAIN_MODEL_PATTERN.test(line)) && lines.some((line) => LEGACY_MAIN_EFFORT_PATTERN.test(line))
    if (!hasLegacyPair) return source
    return lines.filter((line) => !LEGACY_MAIN_MODEL_PATTERN.test(line) && !LEGACY_MAIN_EFFORT_PATTERN.test(line)).join('\n')
}

const mergeManagedConfig = (original: string, managedLines: string[]) => {
    const managedKeys = managedLines.map((line) => line.split('=')[0].trim())
    const firstTableIndex = original.search(TOML_TABLE_HEADER_PATTERN)
    const rootSection = firstTableIndex === -1 ? original : original.slice(0, firstTableIndex)
    const tableSections = firstTableIndex === -1 ? '' : original.slice(firstTableIndex)
    const preservedRoot = removeLegacyManagedMainDefaults(rootSection).trim()
    const agentMatch = TOML_AGENTS_HEADER_PATTERN.exec(tableSections)

    if (!agentMatch) {
        const preserved = [preservedRoot, tableSections.trim()].filter(Boolean).join('\n\n')
        return `${preserved}${preserved ? '\n\n' : ''}[agents]\n${managedLines.join('\n')}\n`
    }

    const agentStart = agentMatch.index
    const agentHeaderEnd = agentStart + agentMatch[0].length
    const followingTable = tableSections.slice(agentHeaderEnd).search(TOML_TABLE_HEADER_PATTERN)
    const agentEnd = followingTable === -1 ? tableSections.length : agentHeaderEnd + followingTable
    const beforeAgent = tableSections.slice(0, agentStart)
    const afterAgent = tableSections.slice(agentEnd)
    const keptAgentBody = tableSections
        .slice(agentHeaderEnd, agentEnd)
        .split('\n')
        .filter((line) => !managedKeys.some((key) => new RegExp(`^\\s*${key}\\s*=`).test(line)))
        .join('\n')
        .trim()
    const agentSection = [tableSections.slice(agentStart, agentHeaderEnd), managedLines.join('\n'), keptAgentBody].filter(Boolean).join('\n')

    const rootPrefix = preservedRoot ? `${preservedRoot}\n\n` : ''
    const beforePrefix = beforeAgent.trim() ? `${beforeAgent.trimEnd()}\n` : ''
    const afterSuffix = afterAgent ? `\n${afterAgent.trim()}` : ''
    return `${rootPrefix}${beforePrefix}${agentSection}${afterSuffix}\n`
}

const installConfig = async () => {
    const configPath = join(location.codexDir, 'config.toml')
    const template = replaceTokens(await Bun.file(join(ASSETS_DIR, 'config.toml')).text(), tokens)
    validateToml(template, 'config.toml 템플릿')
    const managedLines = template.split('\n').filter((line) => line.includes('='))
    const original = await readTextIfExists(configPath)
    if (original) validateToml(original, configPath)
    const next = mergeManagedConfig(original, managedLines)
    validateToml(next, configPath)
    if (options.isDryRun) {
        log(`config: ${configPath} 의 [agents] 관리 키 병합 예정`)
        return
    }
    if (next === original) {
        log('config: 이미 최신')
        return
    }
    await mkdir(location.codexDir, { recursive: true })
    await backupFile(configPath, options)
    await Bun.write(configPath, next)
    log(`config: ${configPath}`)
}

const isManagedHookHandler = (handler: unknown) =>
    isRecord(handler) &&
    typeof handler.command === 'string' &&
    [...CURRENT_HOOK_SCRIPTS, ...RETIRED_HOOK_SCRIPTS].some((file) =>
        new RegExp(`/hooks/llm-rules/${file.replace('.', '\\.')}(["'\\s]|$)`).test(String(handler.command)),
    )

const pruneManagedHookEntry = (entry: unknown) => {
    if (!isRecord(entry) || !Array.isArray(entry.hooks)) return entry
    const hooks = entry.hooks.filter((handler) => !isManagedHookHandler(handler))
    return hooks.length > 0 ? { ...entry, hooks } : undefined
}

const installHooks = async () => {
    const scriptsDir = join(location.codexDir, 'hooks', 'llm-rules')
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'hooks'),
        targetDir: scriptsDir,
        extension: '.sh',
        label: 'hooks',
        options,
        isExecutable: true,
    })
    if (options.isDryRun) return
    await removeFiles(scriptsDir, RETIRED_HOOK_SCRIPTS, options)

    const hooksPath = join(location.codexDir, 'hooks.json')
    const hookBase = location.isGlobal ? '$HOME/.codex/hooks/llm-rules' : '$(git rev-parse --show-toplevel)/.codex/hooks/llm-rules'
    const templateText = (await Bun.file(join(ASSETS_DIR, 'hooks.json')).text()).replaceAll(HOOKS_DIR_TOKEN, hookBase)
    const template = parseJsonObject(templateText, 'hooks.json 템플릿')
    const currentText = await readTextIfExists(hooksPath)
    const current = currentText ? parseJsonObject(currentText, hooksPath) : {}
    const currentHooks = isRecord(current.hooks) ? current.hooks : {}
    const templateHooks = isRecord(template.hooks) ? template.hooks : {}
    const events = [...new Set([...Object.keys(currentHooks), ...Object.keys(templateHooks)])]
    const mergedHooks = Object.fromEntries(
        events
            .map((event) => {
                const kept = (Array.isArray(currentHooks[event]) ? currentHooks[event] : [])
                    .map(pruneManagedHookEntry)
                    .filter((entry) => entry !== undefined)
                const added = Array.isArray(templateHooks[event]) ? templateHooks[event] : []
                return [event, [...kept, ...added]] as const
            })
            .filter(([, entries]) => entries.length > 0),
    )
    const nextText = `${JSON.stringify({ ...current, description: current.description ?? template.description, hooks: mergedHooks }, null, 2)}\n`
    if (nextText === currentText) return
    await backupFile(hooksPath, options)
    await Bun.write(hooksPath, nextText)
    log(`hooks: ${hooksPath} 병합`)
}

log(`위치: ${location.isGlobal ? 'global' : 'project'} (${location.codexDir})`)
log(`항목: ${items.join(', ')}`)
if (options.isDryRun) log('dry-run: 파일을 수정하지 않습니다.')

if (items.includes('instructions')) await installInstructions()
if (items.includes('config')) await installConfig()
if (items.includes('hooks')) await installHooks()
if (items.includes('skills')) await copySkillDirectories(join(ASSETS_DIR, 'skills'), location.skillsDir, tokens, options)
if (items.includes('agents')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'agents'),
        targetDir: join(location.codexDir, 'agents'),
        extension: '.toml',
        label: 'agents',
        options,
        tokens,
    })
}
if (items.includes('rules')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'rules'),
        targetDir: join(location.codexDir, 'rules'),
        extension: '.rules',
        label: 'rules',
        options,
    })
}

log(options.isDryRun ? 'dry-run 완료' : 'Codex 설치 완료. 새 세션에서 /hooks 로 hook 을 신뢰 승인하고 /skills 를 확인하세요.')
