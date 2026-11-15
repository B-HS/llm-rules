import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import openCodePlugin from '../docs/opencode/assets/plugin/index.ts'
import piExtension from '../docs/pi/assets/extensions/llm-rules.ts'

type Handler = (event: Record<string, unknown>, context?: Record<string, unknown>) => unknown
type OpenCodeContext = Parameters<typeof openCodePlugin.setup>[0]
type PiApi = Parameters<typeof piExtension>[0]

const FAKE_AWS_KEY = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('')
const ACTIVE_PROCESS =
    '## 작업: 가드 검증 (진행 중)\n\n- [x] 1. 끝난 항목 — 상세\n- [ ] 2. 남은 항목 — 상세\n\n## 작업: 옛 작업 (완료)\n\n- [x] 1. 완료\n'
const MEMO_HOOK_NAME = ['use', 'Memo'].join('')
const MEMO_COMPONENT = `export const Sample = () => {\n    const value = ${MEMO_HOOK_NAME}(() => 1, [])\n    return value\n}\n`

const withTempDir = async (run: (directory: string) => Promise<void>) => {
    const directory = await mkdtemp(join(tmpdir(), 'llm-rules-guards-'))
    try {
        await run(directory)
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
}

const setupOpenCodePlugin = async (directory: string) => {
    const handlers = new Map<string, Handler>()
    const register = async (name: string, callback: Handler) => {
        handlers.set(name, callback)
        return { dispose: () => undefined }
    }
    const fakeContext: unknown = { location: { directory }, tool: { hook: register }, session: { hook: register } }
    const dispose = await openCodePlugin.setup(fakeContext as OpenCodeContext)
    const getHandler = (name: string) => {
        const handler = handlers.get(name)
        if (!handler) throw new Error(`${name} hook 이 등록되지 않았습니다`)
        return handler
    }
    return { getHandler, dispose }
}

const setupPiExtension = () => {
    const handlers = new Map<string, Handler>()
    const fakeApi: unknown = { on: (event: string, handler: Handler) => handlers.set(event, handler), exec: async () => ({ code: 0 }) }
    piExtension(fakeApi as PiApi)
    return (name: string) => {
        const handler = handlers.get(name)
        if (!handler) throw new Error(`${name} 핸들러가 등록되지 않았습니다`)
        return handler
    }
}

describe('OpenCode 플러그인', () => {
    test('코드 파일에 쓰는 시크릿을 막고 문서 파일은 통과시킨다', async () => {
        await withTempDir(async (directory) => {
            const { getHandler, dispose } = await setupOpenCodePlugin(directory)
            const before = getHandler('execute.before')
            expect(() => before({ tool: 'write', input: { filePath: 'src/config.ts', content: `const key = "${FAKE_AWS_KEY}"` } })).toThrow('시크릿')
            expect(before({ tool: 'write', input: { filePath: 'docs/example.md', content: FAKE_AWS_KEY } })).toBeUndefined()
            expect(before({ tool: 'read', input: { filePath: 'src/config.ts' } })).toBeUndefined()
            await dispose()
        })
    })

    test('편집한 코드의 컨벤션 위반을 도구 결과에 덧붙인다', async () => {
        await withTempDir(async (directory) => {
            await mkdir(join(directory, 'src'), { recursive: true })
            await writeFile(join(directory, 'src', 'sample.tsx'), MEMO_COMPONENT)
            const { getHandler } = await setupOpenCodePlugin(directory)
            const event = { tool: 'edit', input: { filePath: 'src/sample.tsx' }, status: 'completed', result: { content: 'ok' } }
            await getHandler('execute.after')(event)
            expect(event.result.content).toContain('[llm-rules] 수정이 필요합니다')
            expect(event.result.content).toContain('React Compiler')
        })
    })

    test('진행 중인 PROCESS 작업만 시스템 컨텍스트에 넣는다', async () => {
        await withTempDir(async (directory) => {
            await mkdir(join(directory, 'docs'), { recursive: true })
            await writeFile(join(directory, 'docs', 'PROCESS.md'), ACTIVE_PROCESS)
            const { getHandler } = await setupOpenCodePlugin(directory)
            const event = { system: [] as { type: string; text: string }[] }
            await getHandler('context')(event)
            expect(event.system).toHaveLength(1)
            expect(event.system[0].text).toContain('## 작업: 가드 검증 (진행 중)')
            expect(event.system[0].text).toContain('- [ ] 2. 남은 항목')
            expect(event.system[0].text).not.toContain('옛 작업')
        })
    })
})

describe('Pi 확장', () => {
    test('환경 파일 접근과 위험한 셸 명령을 막는다', () => {
        const toolCall = setupPiExtension()('tool_call')
        expect(toolCall({ toolName: 'read', input: { path: '.env' } })).toMatchObject({ block: true })
        expect(toolCall({ toolName: 'write', input: { path: 'apps/web/.env.local', content: 'A=1' } })).toMatchObject({ block: true })
        expect(toolCall({ toolName: 'read', input: { path: '.env.example' } })).toBeUndefined()
        expect(toolCall({ toolName: 'bash', input: { command: 'cat .env.local' } })).toMatchObject({ block: true })
        expect(toolCall({ toolName: 'bash', input: { command: 'git add .env.example' } })).toBeUndefined()
        expect(toolCall({ toolName: 'bash', input: { command: 'grep -r "process.env" src' } })).toBeUndefined()
        expect(toolCall({ toolName: 'bash', input: { command: 'git push origin main --force-with-lease' } })).toMatchObject({ block: true })
        expect(toolCall({ toolName: 'bash', input: { command: 'git push origin main' } })).toBeUndefined()
        expect(toolCall({ toolName: 'bash', input: { command: 'rm -rf build' } })).toMatchObject({ block: true })
    })

    test('코드 파일에 쓰는 시크릿을 막는다', () => {
        const toolCall = setupPiExtension()('tool_call')
        expect(toolCall({ toolName: 'write', input: { path: 'src/config.ts', content: `const key = "${FAKE_AWS_KEY}"` } })).toMatchObject({
            block: true,
        })
        expect(toolCall({ toolName: 'write', input: { path: 'docs/example.md', content: FAKE_AWS_KEY } })).toBeUndefined()
    })

    test('편집 결과에 컨벤션 위반을 덧붙이고 PROCESS 는 세션당 한 번만 주입한다', async () => {
        await withTempDir(async (directory) => {
            await mkdir(join(directory, 'src'), { recursive: true })
            await mkdir(join(directory, 'docs'), { recursive: true })
            await writeFile(join(directory, 'src', 'sample.tsx'), MEMO_COMPONENT)
            await writeFile(join(directory, 'docs', 'PROCESS.md'), ACTIVE_PROCESS)
            const getHandler = setupPiExtension()

            const patch = await getHandler('tool_result')(
                { toolName: 'write', input: { path: 'src/sample.tsx' }, content: [{ type: 'text', text: 'ok' }] },
                { cwd: directory },
            )
            expect(JSON.stringify(patch)).toContain('React Compiler')

            getHandler('session_start')({})
            const first = await getHandler('before_agent_start')({ messageType: 'user' }, { cwd: directory })
            const second = await getHandler('before_agent_start')({ messageType: 'user' }, { cwd: directory })
            expect(JSON.stringify(first)).toContain('가드 검증')
            expect(second).toBeUndefined()
        })
    })
})
