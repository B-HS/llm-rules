import { lstat, mkdtemp, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { describe, expect, test } from 'bun:test'

type JsonRecord = Record<string, unknown>

const REPOSITORY_ROOT = resolve(import.meta.dir, '..')
const CODEX_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-codex.ts')
const CLAUDE_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-claude-code.ts')
const OPENCODE_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-opencode.ts')
const PI_INSTALLER = join(REPOSITORY_ROOT, 'scripts', 'install-pi.ts')
const CODEX_SESSION_HOOK = join(REPOSITORY_ROOT, 'docs', 'codex', 'assets', 'hooks', 'session-context.sh')
const CLAUDE_SESSION_HOOK = join(REPOSITORY_ROOT, 'docs', 'claudecode', 'assets', 'hooks', 'session-context.sh')
const RETIRED_HOOKS = ['guard-commit.sh', 'guard-push.sh', 'reinject-rules.sh', 'verify-on-stop.sh']
const REFERENCE_DOCS = ['backend.md', 'comments.md', 'common.md', 'desktop.md', 'frontend.md', 'fsd.md', 'git.md', 'query.md', 'security.md']
const CLAUDE_RULE_DOCS = ['backend.md', 'comments.md', 'common.md', 'core.md', 'desktop.md', 'frontend.md', 'fsd.md', 'query.md', 'security.md']
const HOOK_MARKER = '/hooks/llm-rules/'
const USER_HOOK_NAME = 'user-hook.sh'
const USER_TEXT = '# 사용자 지침\n\n이 문단은 사용자가 관리합니다.'
const LEGACY_AGENTS_BLOCK = '<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->\n\n구형 코어\n\n<!-- END: llm-rules -->'
const LEGACY_CLAUDE_BLOCK =
    '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-claude-md.ts) -->\n@~/.claude/convention/index.md\n<!-- END: rules-convention -->'
const LEGACY_HOME_BLOCK =
    '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-Codex-md.ts) -->\n@~/.Codex/convention/index.md\n<!-- END: rules-convention -->'
const UNRESOLVED_TOKEN_PATTERN = /\{\{[A-Z_]+\}\}/

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

const readFileText = async (path: string) => Bun.file(path).text()

const listFiles = async (directory: string) => (await readdir(directory)).sort()

const runCommand = async (cmd: string[], env: Record<string, string | undefined> = process.env, stdin?: string) => {
    const child = Bun.spawn({ cmd, cwd: REPOSITORY_ROOT, env, stdin: stdin === undefined ? 'ignore' : 'pipe', stdout: 'pipe', stderr: 'pipe' })
    if (stdin !== undefined && child.stdin) {
        child.stdin.write(stdin)
        child.stdin.end()
    }
    const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    return { exitCode, stdout, stderr }
}

const runInstaller = async (installer: string, installerArgs: string[], env: Record<string, string | undefined> = process.env) => {
    const result = await runCommand([process.execPath, installer, ...installerArgs, '--no-backup'], env)
    expect(result.exitCode).toBe(0)
    expect(result.stdout.length).toBeGreaterThan(0)
    return result
}

const withTempRoot = async (run: (root: string) => Promise<void>) => {
    const root = await mkdtemp(join(tmpdir(), 'llm-rules-installers-'))
    try {
        await run(root)
    } finally {
        await rm(root, { recursive: true, force: true })
    }
}

const createTarget = async (root: string, name: string) => {
    const target = join(root, name)
    expect(resolve(target).startsWith(`${resolve(root)}${sep}`)).toBe(true)
    await mkdir(target, { recursive: true })
    return target
}

const assertManagedStringsAreUnique = (value: unknown) => {
    const managedStrings = collectStrings(value).filter((entry) => entry.includes(HOOK_MARKER))
    expect(managedStrings.length).toBeGreaterThan(0)
    expect(new Set(managedStrings).size).toBe(managedStrings.length)
}

const buildLegacyHookSettings = (commandPrefix: string) => ({
    PreToolUse: [
        {
            matcher: 'Bash',
            hooks: [
                { type: 'command', command: 'echo user-bash' },
                { type: 'command', command: `${commandPrefix}/hooks/llm-rules/guard-commit.sh` },
                { type: 'command', command: `${commandPrefix}/hooks/llm-rules/guard-push.sh` },
            ],
        },
    ],
    Stop: [
        { matcher: '', hooks: [{ type: 'command', command: 'echo user-stop' }] },
        { matcher: '', hooks: [{ type: 'command', command: `${commandPrefix}/hooks/llm-rules/verify-on-stop.sh` }] },
    ],
    UserPromptSubmit: [
        { matcher: '', hooks: [{ type: 'command', command: 'echo user-prompt' }] },
        { matcher: '', hooks: [{ type: 'command', command: `${commandPrefix}/hooks/llm-rules/reinject-rules.sh` }] },
    ],
})

const assertLegacyHooksPruned = (hooks: unknown) => {
    const hookStrings = collectStrings(hooks)
    for (const userCommand of ['echo user-bash', 'echo user-stop', 'echo user-prompt']) expect(hookStrings).toContain(userCommand)
    for (const retired of RETIRED_HOOKS) expect(hookStrings.some((entry) => entry.includes(retired))).toBe(false)
    assertManagedStringsAreUnique(hooks)
}

describe('Codex 설치기', () => {
    test('설정을 병합하고 retired hook 을 정리하며 다시 실행해도 결과가 같다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'codex-target')
            const codexDir = join(target, '.codex')
            const hooksDir = join(codexDir, 'hooks', 'llm-rules')
            await mkdir(hooksDir, { recursive: true })
            await writeFile(
                join(codexDir, 'config.toml'),
                [
                    'model="legacy-model"',
                    'model_reasoning_effort="low"',
                    'custom_value = "keep"',
                    '',
                    '[mcp_servers.sample]',
                    'command = "keep-command"',
                    '',
                    '[agents] # inline agent comment',
                    'enabled=false',
                    'default_subagent_model="legacy-subagent"',
                    'max_concurrent_threads_per_session=1',
                    '',
                    '[agents.worker]',
                    'worker_value = "keep-worker"',
                    '',
                ].join('\n'),
            )
            await writeFile(
                join(codexDir, 'hooks.json'),
                `${JSON.stringify({ description: 'user hooks', hooks: buildLegacyHookSettings('bash "') }, null, 2)}\n`,
            )
            await Promise.all(RETIRED_HOOKS.map((file) => writeFile(join(hooksDir, file), 'retired hook')))

            await runInstaller(CODEX_INSTALLER, ['--target', target, '--config', '--hooks', '--rules'])
            const configText = await readFileText(join(codexDir, 'config.toml'))
            const hooksText = await readFileText(join(codexDir, 'hooks.json'))
            const config = Bun.TOML.parse(configText)
            const agents = getRecord(config, 'agents')

            expect(config.model).toBe('legacy-model')
            expect(agents.enabled).toBe(true)
            expect(agents.default_subagent_model).toBe('gpt-6.1-sol')
            expect(agents.default_subagent_reasoning_effort).toBe('medium')
            expect(agents.max_concurrent_threads_per_session).toBe(4)
            for (const kept of ['custom_value = "keep"', '[mcp_servers.sample]', '[agents] # inline agent comment', 'worker_value = "keep-worker"']) {
                expect(configText).toContain(kept)
            }
            assertLegacyHooksPruned(readJsonRecord(hooksText))
            expect(hooksText).toContain('startup|resume|clear|compact|fork')
            expect(await readFileText(join(codexDir, 'rules', 'llm-rules.rules'))).toContain('pattern = ["git", ["commit", "push"]]')
            for (const file of RETIRED_HOOKS) expect(await Bun.file(join(hooksDir, file)).exists()).toBe(false)

            await runInstaller(CODEX_INSTALLER, ['--target', target, '--config', '--hooks', '--rules'])
            expect(await readFileText(join(codexDir, 'config.toml'))).toBe(configText)
            expect(await readFileText(join(codexDir, 'hooks.json'))).toBe(hooksText)
        })
    })

    test('이전 설치가 넣은 main 모델 고정만 제거한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'codex-main-migration')
            await mkdir(join(target, '.codex'), { recursive: true })
            await writeFile(join(target, '.codex', 'config.toml'), 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "high"\ncustom_value = "keep"\n')

            await runInstaller(CODEX_INSTALLER, ['--target', target, '--config'])
            const config = Bun.TOML.parse(await readFileText(join(target, '.codex', 'config.toml')))
            expect(config.model).toBeUndefined()
            expect(config.model_reasoning_effort).toBeUndefined()
            expect(config.custom_value).toBe('keep')
        })
    })

    test('코어 블록과 참조 문서를 설치하고 모델 슬러그를 설치 시점에 치환한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'codex-instructions')
            await writeFile(join(target, 'AGENTS.md'), `${USER_TEXT}\n\n${LEGACY_AGENTS_BLOCK}\n`)

            await runInstaller(CODEX_INSTALLER, ['--target', target, '--instructions', '--skills', '--agents', '--luna-model', 'custom-luna'])
            const agentsMd = await readFileText(join(target, 'AGENTS.md'))
            expect(agentsMd).toContain(USER_TEXT)
            expect(agentsMd).toContain('# llm-rules 코어 (Codex)')
            expect(agentsMd).not.toContain('구형 코어')
            expect(agentsMd).toContain('`.llm-rules/`')
            expect(agentsMd.match(/<!-- BEGIN: llm-rules/g)).toHaveLength(1)
            expect(await listFiles(join(target, '.llm-rules'))).toEqual(REFERENCE_DOCS)

            const sol = Bun.TOML.parse(await readFileText(join(target, '.codex', 'agents', 'security-reviewer.toml')))
            const luna = Bun.TOML.parse(await readFileText(join(target, '.codex', 'agents', 'research-worker.toml')))
            expect(sol.model).toBe('gpt-6.1-sol')
            expect(luna.model).toBe('custom-luna')
            expect(sol.sandbox_mode).toBeUndefined()

            const skillText = await readFileText(join(target, '.agents', 'skills', 'llm-rules-audit-fsd', 'SKILL.md'))
            expect(skillText).toContain('.llm-rules/fsd.md')
            expect(UNRESOLVED_TOKEN_PATTERN.test(`${agentsMd}${skillText}`)).toBe(false)
        })
    })
})

describe('Claude Code 설치기', () => {
    test('settings 를 병합하고 사용자 hook 과 권한을 보존한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'claude-settings')
            const claudeDir = join(target, '.claude')
            const hooksDir = join(claudeDir, 'hooks', 'llm-rules')
            await mkdir(hooksDir, { recursive: true })
            await writeFile(
                join(claudeDir, 'settings.json'),
                `${JSON.stringify(
                    {
                        customSetting: 'keep',
                        permissions: { allow: ['Bash(custom:*)'], ask: ['Bash(git commit:*)', 'Bash(git push:*)'], deny: [], defaultMode: 'auto' },
                        hooks: buildLegacyHookSettings('$CLAUDE_PROJECT_DIR/.claude'),
                    },
                    null,
                    2,
                )}\n`,
            )
            await writeFile(join(hooksDir, USER_HOOK_NAME), 'user hook')
            await Promise.all(RETIRED_HOOKS.map((file) => writeFile(join(hooksDir, file), 'retired hook')))

            await runInstaller(CLAUDE_INSTALLER, ['--target', target, '--settings', '--hooks'])
            const settingsText = await readFileText(join(claudeDir, 'settings.json'))
            const settings = readJsonRecord(settingsText)
            const permissions = getRecord(settings, 'permissions')

            expect(settings.customSetting).toBe('keep')
            expect(settings.outputStyle).toBe('llm-rules')
            expect(settings.attribution).toEqual({ commit: '', pr: '', sessionUrl: false })
            expect(permissions.defaultMode).toBe('auto')
            expect(collectStrings(permissions.allow)).toContain('Bash(custom:*)')
            expect(collectStrings(permissions.allow)).toContain('Bash(git commit:*)')
            expect(collectStrings(permissions.ask)).not.toContain('Bash(git commit:*)')
            assertLegacyHooksPruned(settings.hooks)
            expect(await Bun.file(join(hooksDir, USER_HOOK_NAME)).exists()).toBe(true)
            for (const file of RETIRED_HOOKS) expect(await Bun.file(join(hooksDir, file)).exists()).toBe(false)

            await runInstaller(CLAUDE_INSTALLER, ['--target', target, '--settings', '--hooks'])
            expect(await readFileText(join(claudeDir, 'settings.json'))).toBe(settingsText)
        })
    })

    test('경로 범위 규칙을 설치하고 구형 @import 구성을 정리한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'claude-rules')
            const claudeDir = join(target, '.claude')
            await mkdir(join(claudeDir, 'convention'), { recursive: true })
            await mkdir(join(claudeDir, 'agents'), { recursive: true })
            await Promise.all(['index.md', 'ai-process.md'].map((file) => writeFile(join(claudeDir, 'convention', file), 'legacy')))
            await writeFile(join(claudeDir, 'agents', 'my-agent.md'), 'user agent')
            await writeFile(join(claudeDir, 'CLAUDE.md'), `${USER_TEXT}\n\n${LEGACY_CLAUDE_BLOCK}\n`)

            await runInstaller(CLAUDE_INSTALLER, ['--target', target, '--rules', '--commands', '--agents', '--output-style'])
            const rulesDir = join(claudeDir, 'rules', 'llm-rules')
            expect(await listFiles(rulesDir)).toEqual(CLAUDE_RULE_DOCS)
            const core = await readFileText(join(rulesDir, 'core.md'))
            expect(core.startsWith('---')).toBe(false)
            expect(core).toContain('`.claude/rules/llm-rules/`')
            expect((await readFileText(join(rulesDir, 'backend.md'))).startsWith('---\npaths:\n')).toBe(true)

            const claudeMd = await readFileText(join(claudeDir, 'CLAUDE.md'))
            expect(claudeMd).toContain(USER_TEXT)
            expect(claudeMd).not.toContain('rules-convention')
            expect(await Bun.file(join(claudeDir, 'convention', 'index.md')).exists()).toBe(false)
            expect(await readFileText(join(claudeDir, 'agents', 'my-agent.md'))).toBe('user agent')
            expect(await Bun.file(join(claudeDir, 'commands', 'prepare-new.md')).exists()).toBe(true)
            expect(await Bun.file(join(claudeDir, 'commands', 'llm-rules', 'prepare-new.md')).exists()).toBe(false)
            expect(await readFileText(join(claudeDir, 'output-styles', 'llm-rules.md'))).toContain('keep-coding-instructions: true')

            const auditCommand = await readFileText(join(claudeDir, 'commands', 'llm-rules', 'audit-query.md'))
            expect(auditCommand).toContain('@.claude/rules/llm-rules/query.md')
            expect(UNRESOLVED_TOKEN_PATTERN.test(`${core}${auditCommand}`)).toBe(false)
        })
    })
})

describe('OpenCode 설치기', () => {
    test('심볼릭 링크를 실제 파일로 바꾸고 설정과 자산을 설치한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'opencode-target')
            const linkedPath = join(root, 'linked-instructions.md')
            await writeFile(linkedPath, 'linked content')
            await symlink(linkedPath, join(target, 'AGENTS.md'))
            await mkdir(join(target, '.opencode'), { recursive: true })
            await writeFile(
                join(target, '.opencode', 'opencode.jsonc'),
                '{\n  // 사용자 주석\n  "model": "openai/sample#high",\n  "permissions": [{ "action": "shell", "resource": "git status *", "effect": "allow" },],\n}\n',
            )

            await runInstaller(OPENCODE_INSTALLER, ['--target', target, '--all'])
            expect(await readFileText(linkedPath)).toBe('linked content')
            expect((await lstat(join(target, 'AGENTS.md'))).isSymbolicLink()).toBe(false)
            expect(await readFileText(join(target, 'AGENTS.md'))).toContain('# llm-rules 코어 (OpenCode)')
            expect(await listFiles(join(target, '.llm-rules'))).toEqual(REFERENCE_DOCS)

            const configText = await readFileText(join(target, '.opencode', 'opencode.jsonc'))
            const config = readJsonRecord(configText)
            const rules = Array.isArray(config.permissions) ? config.permissions : []
            expect(config.model).toBe('openai/sample#high')
            expect(config.formatter).toBe(true)
            expect(rules[0]).toEqual({ action: 'shell', resource: 'git status *', effect: 'allow' })
            expect(rules).toContainEqual({ action: 'read', resource: '*.env', effect: 'deny' })
            expect(rules).toContainEqual({ action: 'shell', resource: 'git push *--force*', effect: 'deny' })

            const openCodeDir = join(target, '.opencode')
            expect(await Bun.file(join(openCodeDir, 'plugins', 'llm-rules', 'index.ts')).exists()).toBe(true)
            expect(await Bun.file(join(openCodeDir, 'commands', 'llm-rules', 'verify.md')).exists()).toBe(true)
            expect(await Bun.file(join(openCodeDir, 'skills', 'llm-rules-subagent-workflow', 'SKILL.md')).exists()).toBe(true)
            const reviewer = await readFileText(join(openCodeDir, 'agents', 'llm-rules', 'security-reviewer.md'))
            expect(reviewer).toContain('mode: subagent')
            expect(reviewer).toContain('resource: "git commit *"')
            expect(UNRESOLVED_TOKEN_PATTERN.test(reviewer)).toBe(false)

            await runInstaller(OPENCODE_INSTALLER, ['--target', target, '--all'])
            expect(await readFileText(join(target, '.opencode', 'opencode.jsonc'))).toBe(configText)
        })
    })
})

describe('Pi 설치기', () => {
    test('전역 자산을 설치하고 구형 홈 관리 블록만 제거한다', async () => {
        await withTempRoot(async (root) => {
            const home = await createTarget(root, 'home')
            await writeFile(join(home, 'AGENTS.md'), `${USER_TEXT}\n\n${LEGACY_HOME_BLOCK}\n`)
            const env = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: undefined }

            await runInstaller(PI_INSTALLER, ['--global', '--all'], env)
            const agentDir = join(home, '.pi', 'agent')
            const agentsMd = await readFileText(join(agentDir, 'AGENTS.md'))
            expect(agentsMd).toContain('# llm-rules 코어 (Pi)')
            expect(agentsMd).toContain('`~/.pi/agent/llm-rules/`')
            expect(await listFiles(join(agentDir, 'llm-rules'))).toEqual(REFERENCE_DOCS)
            expect(await Bun.file(join(agentDir, 'extensions', 'llm-rules.ts')).exists()).toBe(true)
            expect(await Bun.file(join(agentDir, 'skills', 'llm-rules-verify', 'SKILL.md')).exists()).toBe(true)
            expect(await Bun.file(join(agentDir, 'skills', 'llm-rules-subagent-workflow', 'SKILL.md')).exists()).toBe(false)

            const homeAgents = await readFileText(join(home, 'AGENTS.md'))
            expect(homeAgents).toContain(USER_TEXT)
            expect(homeAgents).not.toContain('rules-convention')

            const second = await runInstaller(PI_INSTALLER, ['--global', '--all'], env)
            expect(second.stdout).toContain('instructions: 이미 최신')
            expect(await readFileText(join(home, 'AGENTS.md'))).toBe(homeAgents)
        })
    })
})

describe('SessionStart hook', () => {
    test('진행 중인 첫 작업의 미완료 항목만 주입한다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'session-hook')
            await mkdir(join(target, 'docs'), { recursive: true })
            await writeFile(
                join(target, 'docs', 'PROCESS.md'),
                [
                    '# PROCESS',
                    '',
                    '## 작업: 완료 이력 (완료)',
                    '',
                    '- [x] 오래된 완료 항목',
                    '',
                    '## 작업: 보류 작업 (보류)',
                    '',
                    '- [ ] 보류된 미완료 항목',
                    '',
                    '## 작업: 현재 작업 (진행 중)',
                    '',
                    '- [x] 조사 완료',
                    '- [ ] 구현 진행 — 상세 설명',
                    '',
                    '## 작업: 다음 작업',
                    '',
                    '- [ ] 아직 시작하지 않음',
                    '',
                ].join('\n'),
            )

            for (const hook of [CODEX_SESSION_HOOK, CLAUDE_SESSION_HOOK]) {
                const result = await runCommand(['bash', hook], process.env, JSON.stringify({ cwd: target, source: 'resume' }))
                expect(result.exitCode).toBe(0)
                expect(result.stderr).toBe('')
                const context = getRecord(readJsonRecord(result.stdout), 'hookSpecificOutput').additionalContext
                expect(context).toContain('## 작업: 현재 작업 (진행 중)')
                expect(context).toContain('- [ ] 구현 진행')
                for (const excluded of ['상세 설명', '오래된 완료 항목', '보류된 미완료 항목', '아직 시작하지 않음', 'workflow']) {
                    expect(context).not.toContain(excluded)
                }
            }
        })
    })

    test('진행 중인 작업이 없으면 아무것도 출력하지 않는다', async () => {
        await withTempRoot(async (root) => {
            const target = await createTarget(root, 'session-hook-idle')
            await mkdir(join(target, 'docs'), { recursive: true })
            await writeFile(join(target, 'docs', 'PROCESS.md'), '## 작업: 끝난 작업 (완료)\n\n- [x] 완료\n')

            for (const hook of [CODEX_SESSION_HOOK, CLAUDE_SESSION_HOOK]) {
                const result = await runCommand(['bash', hook], process.env, JSON.stringify({ cwd: target, source: 'startup' }))
                expect(result.exitCode).toBe(0)
                expect(result.stdout).toBe('')
            }
        })
    })
})
