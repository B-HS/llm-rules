#!/usr/bin/env bun
/**
 * init-agents.ts — generate AGENTS.md (+ .llm-rules/ + .cursor/rules) for non-Claude coding agents
 *
 * 배경
 *   Claude 외 코딩 에이전트(Codex · opencode · pi · Cursor 등)는 CLAUDE.md 의 @import 를 해석하지 않는다.
 *   또한 Codex 는 AGENTS.md 를 합산 32 KiB 까지만 읽으므로(project_doc_max_bytes 기본값),
 *   컨벤션 전문(~100KB)을 그대로 inline 하면 뒷부분이 잘린다.
 *
 * 구조 (코어 + 전문 사본)
 *   - AGENTS.md               : docs/agents-core.md 의 압축 코어를 관리 블록으로 inline (≤32KiB)
 *   - .llm-rules/*.md         : 컨벤션 전문 11개 사본 — 코어의 §0 참조 프로토콜이 이 경로를 가리킨다
 *   - .cursor/rules/*.mdc     : Cursor 네이티브 (크기 제한 없음 → 전문 전체 inline, alwaysApply)
 *
 * 글로벌 설치 (--global)
 *   codex    → ~/.codex/AGENTS.md            + ~/.codex/llm-rules/
 *   opencode → ~/.config/opencode/AGENTS.md  + ~/.config/opencode/llm-rules/
 *   pi       → ~/.pi/agent/AGENTS.md         + ~/.pi/agent/llm-rules/
 *   --global 이 주어지면 프로젝트 파일은 생성하지 않는다.
 *
 * 옵션
 *   --target <dir>            생성 대상 프로젝트 루트 (기본: 현재 디렉토리)
 *   --global <list|all>       글로벌 설치 대상 (codex,opencode,pi 콤마 구분 또는 all)
 *   --dry-run                 결과만 출력, 파일 미수정
 *   --no-cursor               .cursor/rules/llm-rules.mdc 생성 생략
 *   --no-agents               AGENTS.md 생성 생략
 *   --no-backup               AGENTS.md 변경 시 .bak 백업 생략
 *   --help, -h                도움말
 */

import { resolve, dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, copyFile, readdir } from 'node:fs/promises'

const BEGIN = '<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->'
const END = '<!-- END: llm-rules -->'
const DIR_TOKEN = '{{LLM_RULES_DIR}}'
const CODEX_DOC_LIMIT = 32 * 1024

const log = (...a: unknown[]) => console.log(...a)
const die = (msg: string): never => {
    console.error(`❌ ${msg}`)
    process.exit(1)
}

const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const getOpt = (name: string) => {
    const i = argv.indexOf(name)
    return i !== -1 ? argv[i + 1] : undefined
}

if (has('--help') || has('-h')) {
    log(
        [
            '사용법: bun run init-agents [옵션]   (= bun run scripts/init-agents.ts)',
            '',
            '프로젝트 모드(기본): AGENTS.md(코어) + .llm-rules/(전문 사본) + .cursor/rules/llm-rules.mdc 생성.',
            '글로벌 모드(--global): codex(~/.codex) · opencode(~/.config/opencode) · pi(~/.pi/agent) 에 코어+전문 설치.',
            '',
            '옵션:',
            '  --target <dir>       생성 대상 프로젝트 루트 (기본: 현재 디렉토리)',
            '  --global <list|all>  글로벌 설치 대상 (codex,opencode,pi / all) — 지정 시 프로젝트 파일은 생성 안 함',
            '  --dry-run            결과만 출력, 파일 미수정',
            '  --no-cursor          .cursor/rules/llm-rules.mdc 생성 생략',
            '  --no-agents          AGENTS.md 생성 생략',
            '  --no-backup          AGENTS.md 변경 시 .bak 백업 생략',
            '  --help, -h           이 도움말',
        ].join('\n'),
    )
    process.exit(0)
}

const GLOBAL_TARGETS = {
    codex: join(homedir(), '.codex'),
    opencode: join(homedir(), '.config', 'opencode'),
    pi: join(homedir(), '.pi', 'agent'),
} as const
type GlobalAgent = keyof typeof GLOBAL_TARGETS

const parseGlobal = (raw?: string) => {
    if (!raw) return [] as GlobalAgent[]
    const names = raw === 'all' ? Object.keys(GLOBAL_TARGETS) : raw.split(',').map((s) => s.trim())
    return names.map((n) => {
        if (!(n in GLOBAL_TARGETS)) die(`알 수 없는 --global 대상: ${n} (codex | opencode | pi | all)`)
        return n as GlobalAgent
    })
}

const opts = {
    target: resolve(getOpt('--target') ?? process.cwd()),
    globals: parseGlobal(getOpt('--global')),
    dryRun: has('--dry-run'),
    cursor: !has('--no-cursor'),
    agents: !has('--no-agents'),
    backup: !has('--no-backup'),
}

const DOC_ORDER = ['index', 'ai-process', 'common', 'comments', 'security', 'git', 'frontend', 'fsd', 'query', 'backend', 'desktop']
const orderOf = (file: string) => {
    const i = DOC_ORDER.indexOf(file.replace(/\.md$/, ''))
    return i === -1 ? DOC_ORDER.length : i
}

const srcConventionDir = resolve(import.meta.dir, '../docs/convention')
const srcCorePath = resolve(import.meta.dir, '../docs/agents-core.md')
if (!(await Bun.file(resolve(srcConventionDir, 'index.md')).exists())) {
    die(`컨벤션 문서를 찾을 수 없습니다: ${srcConventionDir}\n   rules 레포 구조가 올바른지 확인하세요.`)
}
if (!(await Bun.file(srcCorePath).exists())) {
    die(`코어 문서를 찾을 수 없습니다: ${srcCorePath}`)
}

const docFiles = (await readdir(srcConventionDir)).filter((f) => f.endsWith('.md')).sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b))
const sections = await Promise.all(docFiles.map((f) => Bun.file(resolve(srcConventionDir, f)).text()))
const inlined = sections.map((s) => s.trim()).join('\n\n')
const coreRaw = (await Bun.file(srcCorePath).text()).trim()

const intro = [
    '# 코딩 컨벤션 (LLM Rules)',
    '',
    '> 아래는 `llm-rules` 가 생성·관리하는 코딩 컨벤션 코어다. 이 블록은 자동 생성되므로 직접 수정하지 않는다.',
    '> 모든 코드 작업에서 아래 규칙을 따르고, §0 참조 프로토콜에 따라 전문 문서를 읽는다.',
].join('\n')

const buildBlock = (docsDir: string) => [BEGIN, intro, coreRaw.replaceAll(DIR_TOKEN, docsDir), END].join('\n\n')

const applyBlock = (orig: string, block: string) => {
    const bi = orig.indexOf(BEGIN)
    const ei = orig.indexOf(END)
    if (bi !== -1 && ei !== -1 && ei > bi) {
        const before = orig.slice(0, bi).replace(/\s*$/, '')
        const after = orig.slice(ei + END.length).replace(/^\s*/, '')
        return [before, block, after].filter(Boolean).join('\n\n') + '\n'
    }
    if (orig.trim() === '') return block + '\n'
    return orig.replace(/\s*$/, '') + '\n\n' + block + '\n'
}

const writeAgentsMd = async (agentsPath: string, docsDir: string, label: string) => {
    const block = buildBlock(docsDir)
    const blockBytes = Buffer.byteLength(block, 'utf-8')
    if (blockBytes > CODEX_DOC_LIMIT - 2 * 1024) log(`⚠️  ${label}: 코어 블록이 ${blockBytes}B — Codex 32KiB 한도에 근접/초과했습니다.`)

    const orig = (await Bun.file(agentsPath).exists()) ? await Bun.file(agentsPath).text() : ''
    const next = applyBlock(orig, block)
    if (next === orig) {
        log(`✅ ${label}: 이미 최신 (변경 없음)`)
        return
    }
    if (opts.dryRun) {
        log(`  (dry-run) ${label}: ${orig ? '갱신' : '생성'} 예정 (${blockBytes}B 코어)`)
        return
    }
    await mkdir(dirname(agentsPath), { recursive: true })
    if (opts.backup && orig) {
        await copyFile(agentsPath, `${agentsPath}.bak`)
        log(`🗄  백업 생성: ${agentsPath}.bak`)
    }
    await Bun.write(agentsPath, next)
    log(`✅ ${label} ${orig ? '갱신' : '생성'} 완료. (코어 ${blockBytes}B)`)
}

const copyDocs = async (docsDirPath: string, label: string) => {
    if (opts.dryRun) {
        log(`  (dry-run) ${label}: 전문 ${docFiles.length}개 복사 예정 → ${docsDirPath}`)
        return
    }
    await mkdir(docsDirPath, { recursive: true })
    await Promise.all(docFiles.map((f) => copyFile(resolve(srcConventionDir, f), join(docsDirPath, f))))
    log(`✅ ${label}: 전문 ${docFiles.length}개 복사 완료 → ${docsDirPath}`)
}

log('')
log(`소스   : ${srcConventionDir} (전문 ${docFiles.length}개) + ${srcCorePath} (코어)`)

try {
    if (opts.globals.length > 0) {
        for (const agent of opts.globals) {
            const base = GLOBAL_TARGETS[agent]
            const docsDir = join(base, 'llm-rules')
            log(`\n▶ 글로벌: ${agent} (${base})`)
            await writeAgentsMd(join(base, 'AGENTS.md'), docsDir, `${agent} AGENTS.md`)
            await copyDocs(docsDir, `${agent} llm-rules/`)
        }
    } else {
        log(`대상   : ${opts.target}`)
        if (opts.agents) {
            await writeAgentsMd(resolve(opts.target, 'AGENTS.md'), '.llm-rules', 'AGENTS.md')
            await copyDocs(resolve(opts.target, '.llm-rules'), '.llm-rules/')
        }
        if (opts.cursor) {
            const cursorPath = resolve(opts.target, '.cursor/rules/llm-rules.mdc')
            const mdc = ['---', 'description: 프로젝트 코딩 컨벤션 (LLM Rules) — 항상 적용', 'alwaysApply: true', '---', '', inlined, ''].join('\n')
            if (opts.dryRun) {
                log('  (dry-run) .cursor/rules/llm-rules.mdc: 전문 inline 덮어쓰기 예정')
            } else {
                await mkdir(dirname(cursorPath), { recursive: true })
                await Bun.write(cursorPath, mdc)
                log('✅ .cursor/rules/llm-rules.mdc 생성 완료. (전문 inline)')
            }
        }
    }
    if (opts.dryRun) log('\ndry-run 모드: 파일 미수정.')
} catch (error) {
    die(`파일 쓰기 실패: ${error instanceof Error ? error.message : String(error)}`)
}
