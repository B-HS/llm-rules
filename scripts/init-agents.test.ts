import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { describe, expect, test } from 'bun:test'

const REPOSITORY_ROOT = resolve(import.meta.dir, '..')
const INIT_AGENTS = join(REPOSITORY_ROOT, 'scripts', 'init-agents.ts')
const LEGACY_BEGIN = '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-Codex-md.ts) -->'
const LEGACY_END = '<!-- END: rules-convention -->'
const USER_INTRODUCTION = '# 사용자 지침\n\n이 문단은 사용자가 관리합니다.\n'
const USER_CLOSING = '## 개인 메모\n\n이 문단도 사용자가 관리합니다.\n'
const MIGRATED_USER_TEXT = `${USER_INTRODUCTION}\n${USER_CLOSING}\n`

const createTemporaryHome = async () => {
    const root = await mkdtemp(join(tmpdir(), 'llm-rules-pi-init-'))
    const home = join(root, 'home')
    expect(resolve(home).startsWith(`${resolve(root)}${sep}`)).toBe(true)
    await mkdir(home, { recursive: true })
    return { root, home }
}

const runPiInstaller = async (home: string, options: string[] = []) => {
    const child = Bun.spawn({
        cmd: [process.execPath, INIT_AGENTS, '--global', 'pi', ...options],
        cwd: REPOSITORY_ROOT,
        env: { ...process.env, HOME: home },
        stdout: 'pipe',
        stderr: 'pipe',
    })
    const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    expect(exitCode).toBe(0)
    expect(stderr).toBe('')
    return stdout
}

const createLegacyHomeAgents = async (home: string) => {
    const agentsPath = join(home, 'AGENTS.md')
    const legacyBlock = [LEGACY_BEGIN, '## 코드 컨벤션', '@~/.Codex/convention/index.md', LEGACY_END].join('\n')
    const source = [USER_INTRODUCTION.trimEnd(), legacyBlock, USER_CLOSING.trimEnd(), ''].join('\n\n')
    await writeFile(agentsPath, source)
    return { agentsPath, source }
}

describe('Pi 전역 설치기', () => {
    test('구형 홈 관리 블록을 백업 후 제거하고 사용자 텍스트와 멱등성을 보장한다', async () => {
        const { root, home } = await createTemporaryHome()
        try {
            const { agentsPath, source } = await createLegacyHomeAgents(home)
            const piAgentsPath = join(home, '.pi', 'agent', 'AGENTS.md')

            await runPiInstaller(home, ['--dry-run'])

            expect(await Bun.file(agentsPath).text()).toBe(source)
            expect(await Bun.file(`${agentsPath}.bak`).exists()).toBe(false)
            expect(await Bun.file(piAgentsPath).exists()).toBe(false)

            await runPiInstaller(home)

            const migratedHomeAgents = await Bun.file(agentsPath).text()
            const installedPiAgents = await Bun.file(piAgentsPath).text()
            expect(migratedHomeAgents).toBe(MIGRATED_USER_TEXT)
            expect(migratedHomeAgents).not.toContain(LEGACY_BEGIN)
            expect(migratedHomeAgents).not.toContain(LEGACY_END)
            expect(await Bun.file(`${agentsPath}.bak`).text()).toBe(source)
            expect(installedPiAgents).toContain('<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->')

            await runPiInstaller(home)

            expect(await Bun.file(agentsPath).text()).toBe(migratedHomeAgents)
            expect(await Bun.file(`${agentsPath}.bak`).text()).toBe(source)
            expect(await Bun.file(piAgentsPath).text()).toBe(installedPiAgents)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })

    test('--no-backup은 구형 홈 관리 블록을 제거해도 백업을 만들지 않는다', async () => {
        const { root, home } = await createTemporaryHome()
        try {
            const { agentsPath } = await createLegacyHomeAgents(home)

            await runPiInstaller(home, ['--no-backup'])

            expect(await Bun.file(agentsPath).text()).toBe(MIGRATED_USER_TEXT)
            expect(await Bun.file(`${agentsPath}.bak`).exists()).toBe(false)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })

    test('완전하지 않은 구형 마커는 사용자 텍스트로 유지한다', async () => {
        const { root, home } = await createTemporaryHome()
        try {
            const agentsPath = join(home, 'AGENTS.md')
            const source = `${USER_INTRODUCTION}\n${LEGACY_BEGIN}\n사용자 소유 미완성 블록\n`
            await writeFile(agentsPath, source)

            await runPiInstaller(home)

            expect(await Bun.file(agentsPath).text()).toBe(source)
            expect(await Bun.file(`${agentsPath}.bak`).exists()).toBe(false)
        } finally {
            await rm(root, { recursive: true, force: true })
        }
    })
})
