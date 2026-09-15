import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { describe, expect, test } from 'bun:test'

type JsonRecord = Record<string, unknown>

const REPOSITORY_ROOT = resolve(import.meta.dir, '..')
const CODEX_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-codex.ts')
const CLAUDE_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-claude-code.ts')
const RETIRED_HOOKS = ['reinject-rules.sh', 'verify-on-stop.sh']
const HOOK_MARKER = '/hooks/llm-rules/'
const USER_HOOK_NAME = 'user-hook.sh'
const USER_HOOK_CONTENT = '#!/usr/bin/env bash\necho user-owned-hook\n'

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

const readJsonRecord = (source: string) => {
    const value: unknown = JSON.parse(source)
    if (!isRecord(value)) throw new Error('JSON fixture must be an object')
    return value
}

const collectStrings = (value: unknown): string[] => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(collectStrings)
    if (isRecord(value)) return Object.values(value).flatMap(collectStrings)
    return []
}

const getRecord = (record: JsonRecord, key: string) => {
    const value = record[key]
    if (!isRecord(value)) throw new Error(`${key} must be an object`)
    return value
}

const assertManagedStringsAreUnique = (value: unknown) => {
    const managedStrings = collectStrings(value).filter((entry) => entry.includes(HOOK_MARKER))
    expect(managedStrings.length).toBeGreaterThan(0)
    expect(new Set(managedStrings).size).toBe(managedStrings.length)
}

const runInstaller = async (installer: string, target: string, items: string[]) => {
    const processResult = Bun.spawn({
        cmd: [process.execPath, installer, '--target', target, ...items, '--no-backup'],
        stdout: 'pipe',
        stderr: 'pipe',
    })
    const [exitCode, stdout, stderr] = await Promise.all([
        processResult.exited,
        new Response(processResult.stdout).text(),
        new Response(processResult.stderr).text(),
    ])
    expect(exitCode).toBe(0)
    expect(stdout.length).toBeGreaterThan(0)
    expect(typeof stderr).toBe('string')
    return { stdout, stderr }
}

const runHook = async (hookScript: string, command: string) => {
    const processResult = Bun.spawn({
        cmd: ['bash', hookScript],
        cwd: REPOSITORY_ROOT,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
    })
    processResult.stdin.write(JSON.stringify({ tool_input: { command } }))
    processResult.stdin.end()
    const [exitCode, stdout, stderr] = await Promise.all([
        processResult.exited,
        new Response(processResult.stdout).text(),
        new Response(processResult.stderr).text(),
    ])
    return { exitCode, stdout, stderr }
}

const assertHookResult = async (hookScript: string, command: string, exitCode: number, shouldAllow: boolean) => {
    const result = await runHook(hookScript, command)
    expect(result.exitCode).toBe(exitCode)
    expect(typeof result.stdout).toBe('string')
    expect(typeof result.stderr).toBe('string')
    if (shouldAllow) expect(result.stdout).toContain('permissionDecision')
}

const createTempTarget = async (name: string) => {
    const root = await mkdtemp(join(tmpdir(), 'llm-rules-installers-'))
    const target = join(root, name)
    expect(resolve(target).startsWith(`${resolve(root)}${sep}`)).toBe(true)
    await mkdir(target, { recursive: true })
    return { root, target }
}

const createCodexFixture = async (target: string) => {
    const codexDir = join(target, '.codex')
    const hooksDir = join(codexDir, 'hooks', 'llm-rules')
    await mkdir(hooksDir, { recursive: true })
    await writeFile(
        join(codexDir, 'config.toml'),
        `model="legacy-model"
model_reasoning_effort="low"
custom_value = "keep"

[mcp_servers.sample]
command = "keep-command"

[agents] # inline agent comment
enabled=false
default_subagent_model="legacy-subagent"
default_subagent_reasoning_effort="low"
max_concurrent_threads_per_session=1

[agents.worker]
worker_value = "keep-worker"

[[skills.config]]
name = "keep-skill"
`,
    )
    await writeFile(
        join(codexDir, 'hooks.json'),
        `${JSON.stringify(
            {
                description: 'user hooks',
                hooks: {
                    Stop: [
                        { matcher: '', hooks: [{ type: 'command', command: 'echo user-stop' }] },
                        { matcher: '', hooks: [{ type: 'command', command: 'bash "/hooks/llm-rules/verify-on-stop.sh"' }] },
                    ],
                    UserPromptSubmit: [
                        { matcher: '', hooks: [{ type: 'command', command: 'echo user-prompt' }] },
                        { matcher: '', hooks: [{ type: 'command', command: 'bash "/hooks/llm-rules/reinject-rules.sh"' }] },
                    ],
                },
            },
            null,
            2,
        )}
\n`,
    )
    await Promise.all(RETIRED_HOOKS.map((file) => writeFile(join(hooksDir, file), 'retired hook')))
}

const createClaudeFixture = async (target: string) => {
    const claudeDir = join(target, '.claude')
    const hooksDir = join(claudeDir, 'hooks', 'llm-rules')
    await mkdir(hooksDir, { recursive: true })
    await writeFile(
        join(claudeDir, 'settings.json'),
        `${JSON.stringify(
            {
                $schema: 'https://json.schemastore.org/claude-code-settings.json',
                customSetting: 'keep',
                permissions: {
                    allow: ['Bash(custom:*)'],
                    ask: [],
                    deny: [],
                },
                hooks: {
                    Stop: [
                        { matcher: '', hooks: [{ type: 'command', command: 'echo user-stop' }] },
                        { matcher: '', hooks: [{ type: 'command', command: '$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/verify-on-stop.sh' }] },
                    ],
                    UserPromptSubmit: [
                        { matcher: '', hooks: [{ type: 'command', command: 'echo user-prompt' }] },
                        { matcher: '', hooks: [{ type: 'command', command: '$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/reinject-rules.sh' }] },
                    ],
                },
            },
            null,
            2,
        )}
\n`,
    )
    await writeFile(join(hooksDir, USER_HOOK_NAME), USER_HOOK_CONTENT)
    await Promise.all(RETIRED_HOOKS.map((file) => writeFile(join(hooksDir, file), 'retired hook')))
}

const readFileText = async (path: string) => Bun.file(path).text()

describe('Codex 로컬 설치기', () => {
    test('설정 병합과 retired hook 정리 및 멱등성을 보장한다', async () => {
        const { root, target } = await createTempTarget('codex-target')
        try {
            await createCodexFixture(target)
            await runInstaller(CODEX_INSTALLER, target, ['--config', '--hooks'])

            const codexDir = join(target, '.codex')
            const configPath = join(codexDir, 'config.toml')
            const hooksPath = join(codexDir, 'hooks.json')
            const configText = await readFileText(configPath)
            const hooksText = await readFileText(hooksPath)
            const config = Bun.TOML.parse(configText)
            const hooks = readJsonRecord(hooksText)

            expect(config.model).toBe('gpt-5.6-sol')
            expect(config.model_reasoning_effort).toBe('high')
            expect(isRecord(config.agents)).toBe(true)
            const agents = getRecord(config, 'agents')
            expect(agents.enabled).toBe(true)
            expect(agents.default_subagent_model).toBe('gpt-5.6-terra')
            expect(agents.default_subagent_reasoning_effort).toBe('high')
            expect(agents.max_concurrent_threads_per_session).toBe(4)
            expect(configText).toContain('custom_value = "keep"')
            expect(configText).toContain('[mcp_servers.sample]')
            expect(configText).toContain('command = "keep-command"')
            expect(configText).toContain('[agents] # inline agent comment')
            expect(configText).toContain('worker_value = "keep-worker"')
            expect(configText).toContain('name = "keep-skill"')

            const hookStrings = collectStrings(hooks)
            expect(hookStrings).toContain('echo user-stop')
            expect(hookStrings).toContain('echo user-prompt')
            expect(hookStrings.some((entry) => entry.includes('verify-on-stop.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('reinject-rules.sh'))).toBe(false)
            assertManagedStringsAreUnique(hooks)
            for (const file of RETIRED_HOOKS) expect(await Bun.file(join(codexDir, 'hooks', 'llm-rules', file)).exists()).toBe(false)

            await runInstaller(CODEX_INSTALLER, target, ['--config', '--hooks'])
            expect(await readFileText(configPath)).toBe(configText)
            expect(await readFileText(hooksPath)).toBe(hooksText)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
})

describe('Claude Code 로컬 설치기', () => {
    test('settings 병합과 retired hook 정리 및 멱등성을 보장한다', async () => {
        const { root, target } = await createTempTarget('claude-target')
        try {
            await createClaudeFixture(target)
            await runInstaller(CLAUDE_INSTALLER, target, ['--settings', '--hooks'])

            const claudeDir = join(target, '.claude')
            const settingsPath = join(claudeDir, 'settings.json')
            const settingsText = await readFileText(settingsPath)
            const settings = readJsonRecord(settingsText)
            const permissions = getRecord(settings, 'permissions')
            const userHookPath = join(claudeDir, 'hooks', 'llm-rules', USER_HOOK_NAME)

            expect(settings.model).toBe('fable')
            expect(settings.effortLevel).toBe('high')
            expect(settings.customSetting).toBe('keep')
            expect(permissions.allow).toEqual(expect.arrayContaining(['Bash(custom:*)']))
            expect(await Bun.file(userHookPath).exists()).toBe(true)
            expect(await readFileText(userHookPath)).toBe(USER_HOOK_CONTENT)

            const hookStrings = collectStrings(settings)
            expect(hookStrings).toContain('echo user-stop')
            expect(hookStrings).toContain('echo user-prompt')
            expect(hookStrings.some((entry) => entry.includes('verify-on-stop.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('reinject-rules.sh'))).toBe(false)
            assertManagedStringsAreUnique(settings)
            for (const file of RETIRED_HOOKS) expect(await Bun.file(join(claudeDir, 'hooks', 'llm-rules', file)).exists()).toBe(false)

            await runInstaller(CLAUDE_INSTALLER, target, ['--settings', '--hooks'])
            expect(await readFileText(settingsPath)).toBe(settingsText)
            expect(await Bun.file(userHookPath).exists()).toBe(true)
            expect(await readFileText(userHookPath)).toBe(USER_HOOK_CONTENT)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
})

describe('Git guard hook 안전성', () => {
    test('Codex와 Claude Code의 커밋 및 푸시 안전 행렬을 검증한다', async () => {
        const guards = [
            {
                commit: join(REPOSITORY_ROOT, 'docs', 'codex', 'assets', 'hooks', 'guard-commit.sh'),
                push: join(REPOSITORY_ROOT, 'docs', 'codex', 'assets', 'hooks', 'guard-push.sh'),
                validCommitCommands: ['git commit -m "feat: guard test"'],
            },
            {
                commit: join(REPOSITORY_ROOT, 'docs', 'claudecode', 'assets', 'hooks', 'guard-commit.sh'),
                push: join(REPOSITORY_ROOT, 'docs', 'claudecode', 'assets', 'hooks', 'guard-push.sh'),
                validCommitCommands: ['git commit -m "feat: guard test"', 'git commit --message "feat: guard test"'],
            },
        ]
        const invalidMessageCommands = [
            'git commit -F message.txt',
            'git commit --file=message.txt',
            'git commit --edit',
            'git commit -e',
            'git commit --template template.txt',
            'git commit -t template.txt',
            'git commit --no-edit',
            'git commit -m "feat: guard test\n\nCo-Authored-By: AI <ai@example.com>"',
        ]
        const validPushCommands = ['git push origin feature']
        const invalidPushCommands = [
            'git push --force origin feature',
            'git push -f origin feature',
            'git push --force-with-lease origin feature',
            'git push --force-if-includes origin feature',
            'git push --force=value origin feature',
            'git push --force-with-lease=value origin feature',
            'git push --force-if-includes=value origin feature',
        ]

        for (const guard of guards) {
            for (const command of guard.validCommitCommands) await assertHookResult(guard.commit, command, 0, true)
            for (const command of invalidMessageCommands) await assertHookResult(guard.commit, command, 2, false)
            for (const command of validPushCommands) await assertHookResult(guard.push, command, 0, true)
            for (const command of invalidPushCommands) await assertHookResult(guard.push, command, 2, false)
        }
    })
})
