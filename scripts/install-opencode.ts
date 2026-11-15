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
    pathExists,
    readTextIfExists,
    replaceTokens,
    selectItems,
    stripJsonComments,
    warn,
    writeManagedInstructions,
    type InstallOptions,
} from './lib/install-kit'

const ALL_ITEMS = ['instructions', 'config', 'skills', 'commands', 'agents', 'plugin'] as const
const CORE_FILE = 'core.md'
const CONFIG_FILE_NAMES = ['opencode.jsonc', 'opencode.json']
const NAMESPACE = 'llm-rules'
const HOME_DIR = homedir()
const ASSETS_DIR = resolve(import.meta.dir, '../docs/opencode/assets')
const RULES_SOURCE_DIR = resolve(import.meta.dir, '../docs/opencode/rules')

const args = createArgs(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
    log(
        [
            'OpenCode 전용 설치 CLI (V2)',
            '',
            '사용법: bun run install-opencode [위치] [항목] [옵션]',
            '',
            '위치: --global | --project | --target <dir>',
            `항목: --all | ${ALL_ITEMS.map((item) => `--${item}`).join(' | ')}`,
            '옵션: --dry-run --yes/-y --no-backup --help/-h',
        ].join('\n'),
    )
    process.exit(0)
}

if (!(await Bun.file(join(RULES_SOURCE_DIR, CORE_FILE)).exists())) die(`코어 문서를 찾을 수 없습니다: ${RULES_SOURCE_DIR}`)

const options: InstallOptions = { isDryRun: args.has('--dry-run'), shouldBackup: !args.has('--no-backup') }
const ask = createAsk(args.has('--yes') || args.has('-y'))

const resolveLocation = () => {
    const globalDir = join(HOME_DIR, '.config', 'opencode')
    const globalLocation = {
        isGlobal: true,
        agentsPath: join(globalDir, 'AGENTS.md'),
        configDir: globalDir,
        referenceDir: join(globalDir, NAMESPACE),
    }
    const toProjectLocation = (rootDir: string) => ({
        isGlobal: false,
        agentsPath: join(rootDir, 'AGENTS.md'),
        configDir: join(rootDir, '.opencode'),
        referenceDir: join(rootDir, '.llm-rules'),
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

const tokens = { LLM_RULES_DIR: location.isGlobal ? '~/.config/opencode/llm-rules' : '.llm-rules' }

const installInstructions = async () => {
    const block = buildManagedBlock('install-opencode.ts', replaceTokens(await Bun.file(join(RULES_SOURCE_DIR, CORE_FILE)).text(), tokens))
    await writeManagedInstructions(location.agentsPath, block, options, 'instructions')
    await copyRenderedFiles({
        sourceDir: RULES_SOURCE_DIR,
        targetDir: location.referenceDir,
        extension: '.md',
        label: 'reference',
        options,
        tokens,
        shouldResetTarget: true,
        excludedFiles: [CORE_FILE],
    })
}

const toRuleKey = (rule: unknown) => (isRecord(rule) ? `${String(rule.action)}\u0000${String(rule.resource)}\u0000${String(rule.effect)}` : '')

const installConfig = async () => {
    const existingChecks = await Promise.all(CONFIG_FILE_NAMES.map((name) => pathExists(join(location.configDir, name))))
    const configPath = join(location.configDir, CONFIG_FILE_NAMES.find((_name, index) => existingChecks[index]) ?? CONFIG_FILE_NAMES[0])
    const template = parseJsonObject(await Bun.file(join(ASSETS_DIR, 'opencode.json')).text(), 'opencode.json 템플릿')
    const currentText = await readTextIfExists(configPath)
    const strippedText = stripJsonComments(currentText)
    const current = currentText ? parseJsonObject(strippedText, configPath) : { $schema: 'https://opencode.ai/config.json' }
    const currentRules = Array.isArray(current.permissions) ? current.permissions : []
    const currentRuleKeys = new Set(currentRules.map(toRuleKey))
    const templateRules = Array.isArray(template.permissions) ? template.permissions : []
    const next = {
        ...current,
        formatter: current.formatter ?? template.formatter,
        permissions: [...currentRules, ...templateRules.filter((rule) => !currentRuleKeys.has(toRuleKey(rule)))],
    }
    const nextText = `${JSON.stringify(next, null, 2)}\n`
    if (options.isDryRun) {
        log(`config: ${configPath} 에 permissions · formatter 병합 예정`)
        return
    }
    if (currentText && JSON.stringify(parseJsonObject(strippedText, configPath)) === JSON.stringify(next)) {
        log('config: 이미 최신')
        return
    }
    if (currentText && strippedText !== currentText) warn(`${configPath} 의 주석은 병합하면서 제거됩니다. 원본은 .bak 로 보존합니다.`)
    await mkdir(location.configDir, { recursive: true })
    await backupFile(configPath, options)
    await Bun.write(configPath, nextText)
    log(`config: ${configPath}`)
}

log(`위치: ${location.isGlobal ? 'global' : 'project'} (${location.configDir})`)
log(`항목: ${items.join(', ')}`)
if (options.isDryRun) log('dry-run: 파일을 수정하지 않습니다.')

if (items.includes('instructions')) await installInstructions()
if (items.includes('config')) await installConfig()
if (items.includes('skills')) await copySkillDirectories(join(ASSETS_DIR, 'skills'), join(location.configDir, 'skills'), tokens, options)
if (items.includes('commands')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'commands'),
        targetDir: join(location.configDir, 'commands', NAMESPACE),
        extension: '.md',
        label: 'commands',
        options,
        shouldResetTarget: true,
    })
}
if (items.includes('agents')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'agents'),
        targetDir: join(location.configDir, 'agents', NAMESPACE),
        extension: '.md',
        label: 'agents',
        options,
        tokens,
        shouldResetTarget: true,
    })
}
if (items.includes('plugin')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'plugin'),
        targetDir: join(location.configDir, 'plugins', NAMESPACE),
        extension: '.ts',
        label: 'plugin',
        options,
        shouldResetTarget: true,
    })
}

log(options.isDryRun ? 'dry-run 완료' : 'OpenCode 설치 완료. 새 세션에서 /llm-rules/verify 와 subagent 목록을 확인하세요.')
