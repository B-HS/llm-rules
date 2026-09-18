import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { describe, expect, test } from 'bun:test'

type JsonRecord = Record<string, unknown>

const REPOSITORY_ROOT = resolve(import.meta.dir, '..')
const CODEX_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-codex.ts')
const CLAUDE_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-claude-code.ts')
const CODEX_SESSION_HOOK = join(REPOSITORY_ROOT, 'docs', 'codex', 'assets', 'hooks', 'session-context.sh')
const CLAUDE_SESSION_HOOK = join(REPOSITORY_ROOT, 'docs', 'claudecode', 'assets', 'hooks', 'session-context.sh')
const RETIRED_HOOKS = ['guard-commit.sh', 'guard-push.sh', 'reinject-rules.sh', 'verify-on-stop.sh']
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

const runSessionHook = async (hook: string, cwd: string, source = 'resume') => {
    const processResult = Bun.spawn({
        cmd: ['bash', hook],
        cwd: REPOSITORY_ROOT,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
    })
    processResult.stdin.write(JSON.stringify({ cwd, source }))
    processResult.stdin.end()
    const [exitCode, stdout, stderr] = await Promise.all([
        processResult.exited,
        new Response(processResult.stdout).text(),
        new Response(processResult.stderr).text(),
    ])
    expect(exitCode).toBe(0)
    expect(stderr).toBe('')
    const output = readJsonRecord(stdout)
    const hookOutput = getRecord(output, 'hookSpecificOutput')
    const context = hookOutput.additionalContext
    if (typeof context !== 'string') throw new Error('additionalContext must be a string')
    return context
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
                    PreToolUse: [
                        {
                            matcher: '^Bash$',
                            hooks: [
                                { type: 'command', command: 'echo user-bash' },
                                { type: 'command', command: 'bash "/hooks/llm-rules/guard-commit.sh"' },
                                { type: 'command', command: 'bash "/hooks/llm-rules/guard-push.sh"' },
                            ],
                        },
                    ],
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
                    ask: ['Bash(git commit:*)', 'Bash(git push:*)'],
                    deny: [],
                },
                hooks: {
                    PreToolUse: [
                        {
                            matcher: 'Bash',
                            hooks: [
                                { type: 'command', command: 'echo user-bash' },
                                {
                                    type: 'command',
                                    command: '$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/guard-commit.sh',
                                    if: 'Bash(git commit*)',
                                },
                                {
                                    type: 'command',
                                    command: '$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules/guard-push.sh',
                                    if: 'Bash(git push*)',
                                },
                            ],
                        },
                    ],
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
            await runInstaller(CODEX_INSTALLER, target, ['--config', '--hooks', '--rules'])

            const codexDir = join(target, '.codex')
            const configPath = join(codexDir, 'config.toml')
            const hooksPath = join(codexDir, 'hooks.json')
            const rulesPath = join(codexDir, 'rules', 'llm-rules.rules')
            const configText = await readFileText(configPath)
            const hooksText = await readFileText(hooksPath)
            const rulesText = await readFileText(rulesPath)
            const config = Bun.TOML.parse(configText)
            const hooks = readJsonRecord(hooksText)

            expect(config.model).toBe('legacy-model')
            expect(config.model_reasoning_effort).toBe('low')
            expect(isRecord(config.agents)).toBe(true)
            const agents = getRecord(config, 'agents')
            expect(agents.enabled).toBe(true)
            expect(agents.default_subagent_model).toBe('gpt-5.6-terra')
            expect(agents.default_subagent_reasoning_effort).toBe('medium')
            expect(agents.max_concurrent_threads_per_session).toBe(4)
            expect(configText).toContain('custom_value = "keep"')
            expect(configText).toContain('[mcp_servers.sample]')
            expect(configText).toContain('command = "keep-command"')
            expect(configText).toContain('[agents] # inline agent comment')
            expect(configText).toContain('worker_value = "keep-worker"')
            expect(configText).toContain('name = "keep-skill"')

            const hookStrings = collectStrings(hooks)
            expect(hookStrings).toContain('echo user-bash')
            expect(hookStrings).toContain('echo user-stop')
            expect(hookStrings).toContain('echo user-prompt')
            expect(hookStrings.some((entry) => entry.includes('guard-commit.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('guard-push.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('verify-on-stop.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('reinject-rules.sh'))).toBe(false)
            expect(rulesText).toContain('pattern = ["git", ["commit", "push"]]')
            expect(rulesText).toContain('decision = "allow"')
            expect(rulesText).not.toContain('llm-rules guard')
            assertManagedStringsAreUnique(hooks)
            for (const file of RETIRED_HOOKS) expect(await Bun.file(join(codexDir, 'hooks', 'llm-rules', file)).exists()).toBe(false)

            await runInstaller(CODEX_INSTALLER, target, ['--config', '--hooks', '--rules'])
            expect(await readFileText(configPath)).toBe(configText)
            expect(await readFileText(hooksPath)).toBe(hooksText)
            expect(await readFileText(rulesPath)).toBe(rulesText)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })

    test('이전 llm-rules의 main Sol high 고정만 제거한다', async () => {
        const { root, target } = await createTempTarget('codex-main-migration')
        try {
            const codexDir = join(target, '.codex')
            await mkdir(codexDir, { recursive: true })
            await writeFile(
                join(codexDir, 'config.toml'),
                `model = "gpt-5.6-sol"
model_reasoning_effort = "high"
custom_value = "keep"
`,
            )

            await runInstaller(CODEX_INSTALLER, target, ['--config'])
            const config = Bun.TOML.parse(await readFileText(join(codexDir, 'config.toml')))
            expect(config.model).toBeUndefined()
            expect(config.model_reasoning_effort).toBeUndefined()
            expect(config.custom_value).toBe('keep')
            expect(getRecord(config, 'agents').default_subagent_reasoning_effort).toBe('medium')
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
})

describe('SessionStart 경량 컨텍스트', () => {
    test('입력 cwd의 첫 활성 작업만 양 플랫폼에 주입한다', async () => {
        const { root, target } = await createTempTarget('session-hook-target')
        try {
            await mkdir(join(target, 'docs'), { recursive: true })
            await writeFile(
                join(target, 'docs', 'PROCESS.md'),
                `# PROCESS

## 작업: 완료 이력 (완료)

- [x] 오래된 완료 항목

## 작업: 보류 작업 (보류)

- [ ] 보류된 미완료 항목

## 작업: 현재 작업 (진행 중)

- [x] 조사 완료
- [ ] 구현 진행

## 작업: 다음 작업

- [ ] 아직 시작하지 않음
`,
            )

            for (const hook of [CODEX_SESSION_HOOK, CLAUDE_SESSION_HOOK]) {
                const context = await runSessionHook(hook, target)
                expect(context).toContain('[llm-rules 세션 경계: resume]')
                expect(context).toContain('## 작업: 현재 작업 (진행 중)')
                expect(context).toContain('- [ ] 구현 진행')
                expect(context).not.toContain('오래된 완료 항목')
                expect(context).not.toContain('보류된 미완료 항목')
                expect(context).not.toContain('아직 시작하지 않음')
                expect(context.length).toBeLessThan(4000)
            }
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
            expect(permissions.allow).toEqual(expect.arrayContaining(['Bash(custom:*)', 'Bash(git commit:*)', 'Bash(git push:*)']))
            expect(permissions.ask).not.toEqual(expect.arrayContaining(['Bash(git commit:*)', 'Bash(git push:*)']))
            expect(await Bun.file(userHookPath).exists()).toBe(true)
            expect(await readFileText(userHookPath)).toBe(USER_HOOK_CONTENT)

            const hookStrings = collectStrings(settings)
            expect(hookStrings).toContain('echo user-bash')
            expect(hookStrings).toContain('echo user-stop')
            expect(hookStrings).toContain('echo user-prompt')
            expect(hookStrings.some((entry) => entry.includes('guard-commit.sh'))).toBe(false)
            expect(hookStrings.some((entry) => entry.includes('guard-push.sh'))).toBe(false)
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
