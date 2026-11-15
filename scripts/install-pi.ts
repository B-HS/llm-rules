#!/usr/bin/env bun

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import {
    backupFile,
    buildManagedBlock,
    copyRenderedFiles,
    copySkillDirectories,
    createArgs,
    createAsk,
    die,
    log,
    readTextIfExists,
    removeMarkedBlock,
    replaceTokens,
    selectItems,
    writeManagedInstructions,
    type InstallOptions,
} from './lib/install-kit'

const ALL_ITEMS = ['instructions', 'skills', 'extension'] as const
const CORE_FILE = 'core.md'
const NAMESPACE = 'llm-rules'
const LEGACY_HOME_BLOCK_BEGIN = '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-Codex-md.ts) -->'
const LEGACY_HOME_BLOCK_END = '<!-- END: rules-convention -->'
const HOME_DIR = homedir()
const ASSETS_DIR = resolve(import.meta.dir, '../docs/pi/assets')
const RULES_SOURCE_DIR = resolve(import.meta.dir, '../docs/pi/rules')

const args = createArgs(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
    log(
        [
            'Pi 전용 설치 CLI',
            '',
            '사용법: bun run install-pi [위치] [항목] [옵션]',
            '',
            '위치: --global | --project | --target <dir>',
            `항목: --all | ${ALL_ITEMS.map((item) => `--${item}`).join(' | ')}`,
            '옵션: --dry-run --yes/-y --no-backup --help/-h',
            '글로벌 위치는 PI_CODING_AGENT_DIR 이 있으면 그 경로, 없으면 ~/.pi/agent 입니다.',
        ].join('\n'),
    )
    process.exit(0)
}

if (!(await Bun.file(join(RULES_SOURCE_DIR, CORE_FILE)).exists())) die(`코어 문서를 찾을 수 없습니다: ${RULES_SOURCE_DIR}`)

const options: InstallOptions = { isDryRun: args.has('--dry-run'), shouldBackup: !args.has('--no-backup') }
const ask = createAsk(args.has('--yes') || args.has('-y'))

const resolveLocation = () => {
    const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(HOME_DIR, '.pi', 'agent')
    const globalLocation = {
        isGlobal: true,
        agentsPath: join(agentDir, 'AGENTS.md'),
        resourceDir: agentDir,
        referenceDir: join(agentDir, NAMESPACE),
        referenceLabel: process.env.PI_CODING_AGENT_DIR ? join(agentDir, NAMESPACE) : '~/.pi/agent/llm-rules',
    }
    const toProjectLocation = (rootDir: string) => ({
        isGlobal: false,
        agentsPath: join(rootDir, 'AGENTS.md'),
        resourceDir: join(rootDir, '.pi'),
        referenceDir: join(rootDir, '.llm-rules'),
        referenceLabel: '.llm-rules',
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

const tokens = { LLM_RULES_DIR: location.referenceLabel }

const migrateLegacyHomeAgents = async () => {
    const legacyPath = join(HOME_DIR, 'AGENTS.md')
    const original = await readTextIfExists(legacyPath)
    const next = removeMarkedBlock(original, LEGACY_HOME_BLOCK_BEGIN, LEGACY_HOME_BLOCK_END)
    if (next === original) return
    if (options.isDryRun) {
        log(`migration: ${legacyPath} 의 구형 관리 블록 제거 예정`)
        return
    }
    await backupFile(legacyPath, options)
    await Bun.write(legacyPath, next)
    log(`migration: ${legacyPath} 의 구형 관리 블록 제거`)
}

const installInstructions = async () => {
    const block = buildManagedBlock('install-pi.ts', replaceTokens(await Bun.file(join(RULES_SOURCE_DIR, CORE_FILE)).text(), tokens))
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
    if (location.isGlobal) await migrateLegacyHomeAgents()
}

log(`위치: ${location.isGlobal ? 'global' : 'project'} (${location.resourceDir})`)
log(`항목: ${items.join(', ')}`)
if (options.isDryRun) log('dry-run: 파일을 수정하지 않습니다.')

if (items.includes('instructions')) await installInstructions()
if (items.includes('skills')) await copySkillDirectories(join(ASSETS_DIR, 'skills'), join(location.resourceDir, 'skills'), tokens, options)
if (items.includes('extension')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'extensions'),
        targetDir: join(location.resourceDir, 'extensions'),
        extension: '.ts',
        label: 'extension',
        options,
    })
}

log(options.isDryRun ? 'dry-run 완료' : 'Pi 설치 완료. 실행 중인 세션은 /reload 로 다시 불러오세요.')
