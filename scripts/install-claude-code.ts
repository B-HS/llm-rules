#!/usr/bin/env bun

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'
import {
    backupFile,
    copyRenderedFiles,
    createArgs,
    createAsk,
    die,
    isRecord,
    log,
    parseJsonObject,
    pathExists,
    readTextIfExists,
    removeFiles,
    removeMarkedBlock,
    replaceTokens,
    selectItems,
    warn,
    type InstallOptions,
} from './lib/install-kit'

const ALL_ITEMS = ['rules', 'settings', 'hooks', 'commands', 'agents', 'output-style'] as const
const PERMISSION_KINDS = ['allow', 'ask', 'deny'] as const
const OUTPUT_STYLE_NAME = 'llm-rules'
const HOOK_PATH_MARKER = '/hooks/llm-rules/'
const TEMPLATE_HOOK_BASE = '$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules'
const RETIRED_HOOK_FILES = ['guard-commit.sh', 'guard-push.sh', 'reinject-rules.sh', 'verify-on-stop.sh']
const CURRENT_HOOK_FILES = ['lint-edit.sh', 'scan-secrets.sh', 'session-context.sh']
const MIGRATED_GIT_ASK_PERMISSIONS = ['Bash(git commit:*)', 'Bash(git push:*)']
const ROOT_COMMAND_FILES = ['prepare-new.md']
const LEGACY_IMPORT_BLOCK_BEGIN = '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-claude-md.ts) -->'
const LEGACY_IMPORT_BLOCK_END = '<!-- END: rules-convention -->'
const LEGACY_CONVENTION_MARKER_FILES = ['index.md', 'ai-process.md']
const HOME_DIR = homedir()
const ASSETS_DIR = resolve(import.meta.dir, '../docs/claudecode/assets')
const RULES_SOURCE_DIR = resolve(import.meta.dir, '../docs/claudecode/rules')

const args = createArgs(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
    log(
        [
            'Claude Code 전용 설치 CLI',
            '',
            '사용법: bun run install-claude-code [위치] [항목] [옵션]',
            '',
            '위치: --global | --project | --target <dir>',
            `항목: --all | ${ALL_ITEMS.map((item) => `--${item}`).join(' | ')}`,
            '옵션: --dry-run --yes/-y --no-backup --help/-h',
        ].join('\n'),
    )
    process.exit(0)
}

if (!(await Bun.file(join(ASSETS_DIR, 'settings.json')).exists())) die(`자산을 찾을 수 없습니다: ${ASSETS_DIR}`)

const options: InstallOptions = { isDryRun: args.has('--dry-run'), shouldBackup: !args.has('--no-backup') }
const ask = createAsk(args.has('--yes') || args.has('-y'))

const resolveLocation = () => {
    const target = args.get('--target')
    if (target) return { isGlobal: false, claudeDir: resolve(target, '.claude') }
    if (args.has('--project')) return { isGlobal: false, claudeDir: resolve(process.cwd(), '.claude') }
    if (args.has('--global')) return { isGlobal: true, claudeDir: join(HOME_DIR, '.claude') }
    const choice = ask('설치 위치 [1] 글로벌(~/.claude) [2] 프로젝트(./.claude), 기본 1: ', '1')
    return choice === '2'
        ? { isGlobal: false, claudeDir: resolve(process.cwd(), '.claude') }
        : { isGlobal: true, claudeDir: join(HOME_DIR, '.claude') }
}

const location = resolveLocation()
const items = selectItems(ALL_ITEMS, args, ask)
if (items.length === 0) die('선택된 설치 항목이 없습니다.')

const rulesDir = join(location.claudeDir, 'rules', 'llm-rules')
const hooksDir = join(location.claudeDir, 'hooks', 'llm-rules')
const tokens = { RULES_DIR: location.isGlobal ? '~/.claude/rules/llm-rules' : '.claude/rules/llm-rules' }
const hookCommandBase = location.isGlobal ? '$HOME/.claude/hooks/llm-rules' : TEMPLATE_HOOK_BASE

const toStringArray = (value: unknown) => (Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [])

const migrateLegacyConvention = async () => {
    const claudeMdPath = join(location.claudeDir, 'CLAUDE.md')
    const original = await readTextIfExists(claudeMdPath)
    const next = removeMarkedBlock(original, LEGACY_IMPORT_BLOCK_BEGIN, LEGACY_IMPORT_BLOCK_END)
    const conventionDir = join(location.claudeDir, 'convention')
    const markerChecks = await Promise.all(LEGACY_CONVENTION_MARKER_FILES.map((file) => pathExists(join(conventionDir, file))))
    const hasLegacyConventionDir = markerChecks.every(Boolean)

    if (next !== original) {
        if (options.isDryRun) log(`migration: ${claudeMdPath} 의 구형 @import 블록 제거 예정`)
        else {
            await backupFile(claudeMdPath, options)
            if (next === '') await rm(claudeMdPath, { force: true })
            else await Bun.write(claudeMdPath, next)
            log(`migration: ${claudeMdPath} 의 구형 @import 블록 제거`)
        }
    }
    if (hasLegacyConventionDir) {
        if (options.isDryRun) log(`migration: ${conventionDir} 제거 예정`)
        else {
            await rm(conventionDir, { recursive: true, force: true })
            log(`migration: ${conventionDir} 제거`)
        }
    }
}

const installRules = async () => {
    await copyRenderedFiles({
        sourceDir: RULES_SOURCE_DIR,
        targetDir: rulesDir,
        extension: '.md',
        label: 'rules',
        options,
        tokens,
        shouldResetTarget: true,
    })
    await migrateLegacyConvention()
}

const installHooks = async () => {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'hooks'),
        targetDir: hooksDir,
        extension: '.sh',
        label: 'hooks',
        options,
        isExecutable: true,
    })
    await removeFiles(hooksDir, RETIRED_HOOK_FILES, options)
}

const installCommands = async () => {
    const sourceDir = join(ASSETS_DIR, 'commands')
    const namespacedDir = join(location.claudeDir, 'commands', 'llm-rules')
    await copyRenderedFiles({ sourceDir, targetDir: namespacedDir, extension: '.md', label: 'commands', options, tokens, shouldResetTarget: true })
    if (options.isDryRun) return
    await removeFiles(namespacedDir, ROOT_COMMAND_FILES, options)
    for (const file of ROOT_COMMAND_FILES) {
        await Bun.write(join(location.claudeDir, 'commands', file), replaceTokens(await Bun.file(join(sourceDir, file)).text(), tokens))
    }
}

const isManagedHookHandler = (handler: unknown) => {
    if (!isRecord(handler) || typeof handler.command !== 'string' || !handler.command.includes(HOOK_PATH_MARKER)) return false
    const fileName = handler.command.split('/').at(-1) ?? ''
    return [...RETIRED_HOOK_FILES, ...CURRENT_HOOK_FILES].some((file) => fileName.startsWith(file))
}

const pruneManagedHooks = (entry: unknown) => {
    if (!isRecord(entry) || !Array.isArray(entry.hooks)) return entry
    const hooks = entry.hooks.filter((handler) => !isManagedHookHandler(handler))
    return hooks.length > 0 ? { ...entry, hooks } : undefined
}

const mergePermissions = (current: unknown, template: unknown) => {
    const currentPermissions = isRecord(current) ? current : {}
    const templatePermissions = isRecord(template) ? template : {}
    const merged = PERMISSION_KINDS.map((kind) => {
        const kept = toStringArray(currentPermissions[kind]).filter(
            (permission) => kind !== 'ask' || !MIGRATED_GIT_ASK_PERMISSIONS.includes(permission),
        )
        return [kind, [...new Set([...kept, ...toStringArray(templatePermissions[kind])])]] as const
    })
    const withoutManagedKinds = Object.fromEntries(
        Object.entries(currentPermissions).filter(([key]) => !PERMISSION_KINDS.some((kind) => kind === key)),
    )
    return { ...withoutManagedKinds, ...Object.fromEntries(merged.filter(([, list]) => list.length > 0)) }
}

const mergeHooks = (current: unknown, template: unknown) => {
    const currentHooks = isRecord(current) ? current : {}
    const templateHooks = isRecord(template) ? template : {}
    const events = [...new Set([...Object.keys(currentHooks), ...Object.keys(templateHooks)])]
    const merged = events.map((event) => {
        const kept = (Array.isArray(currentHooks[event]) ? currentHooks[event] : []).map(pruneManagedHooks).filter((entry) => entry !== undefined)
        const added = Array.isArray(templateHooks[event]) ? templateHooks[event] : []
        return [event, [...kept, ...added]] as const
    })
    return Object.fromEntries(merged.filter(([, entries]) => entries.length > 0))
}

const installSettings = async () => {
    const settingsPath = join(location.claudeDir, 'settings.json')
    const templateText = (await Bun.file(join(ASSETS_DIR, 'settings.json')).text()).replaceAll(TEMPLATE_HOOK_BASE, hookCommandBase)
    const template = parseJsonObject(templateText, 'settings.json 템플릿')
    const currentText = await readTextIfExists(settingsPath)
    const current = currentText ? parseJsonObject(currentText, settingsPath) : {}
    const hasOtherOutputStyle = typeof current.outputStyle === 'string' && current.outputStyle !== OUTPUT_STYLE_NAME
    if (hasOtherOutputStyle)
        warn(
            `outputStyle 이 "${String(current.outputStyle)}" 로 설정되어 있어 유지합니다. 응답 형식 규칙은 /output-style ${OUTPUT_STYLE_NAME} 에서 적용됩니다.`,
        )

    const next = {
        ...current,
        model: template.model,
        effortLevel: template.effortLevel,
        outputStyle: hasOtherOutputStyle ? current.outputStyle : OUTPUT_STYLE_NAME,
        attribution: template.attribution,
        permissions: mergePermissions(current.permissions, template.permissions),
        hooks: mergeHooks(current.hooks, template.hooks),
    }
    const nextText = `${JSON.stringify(next, null, 2)}\n`
    if (options.isDryRun) {
        log(`settings: ${settingsPath} 병합 예정`)
        return
    }
    if (nextText === currentText) {
        log('settings: 이미 최신')
        return
    }
    await mkdir(location.claudeDir, { recursive: true })
    await backupFile(settingsPath, options)
    await Bun.write(settingsPath, nextText)
    log(`settings: ${settingsPath}`)
}

log(`위치: ${location.isGlobal ? 'global' : 'project'} (${location.claudeDir})`)
log(`항목: ${items.join(', ')}`)
if (options.isDryRun) log('dry-run: 파일을 수정하지 않습니다.')
if (items.includes('settings') && !items.includes('hooks')) warn('settings 만 선택했습니다. hooks 항목이 없으면 hook 이 동작하지 않습니다.')

if (items.includes('rules')) await installRules()
if (items.includes('hooks')) await installHooks()
if (items.includes('commands')) await installCommands()
if (items.includes('agents')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'agents'),
        targetDir: join(location.claudeDir, 'agents'),
        extension: '.md',
        label: 'agents',
        options,
        tokens,
    })
}
if (items.includes('output-style')) {
    await copyRenderedFiles({
        sourceDir: join(ASSETS_DIR, 'output-styles'),
        targetDir: join(location.claudeDir, 'output-styles'),
        extension: '.md',
        label: 'output-style',
        options,
    })
}
if (items.includes('settings')) await installSettings()

log(options.isDryRun ? 'dry-run 완료' : 'Claude Code 설치 완료. 새 세션에서 /context all 과 /hooks 로 확인하세요.')
