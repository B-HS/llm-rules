#!/usr/bin/env bun
/**
 * init-agents.ts — generate AGENTS.md (+ .cursor/rules) for non-Claude coding agents
 *
 * 목적
 *   Claude 외 코딩 에이전트(Codex · Cursor 등)는 CLAUDE.md 의 @import 가 통하지 않는다.
 *   AGENTS.md 는 import 메커니즘이 없으므로(공식 스펙) 컨벤션 전문을 inline 한다.
 *   이 스크립트는 대상 프로젝트 루트에 두 파일을 생성한다.
 *     - AGENTS.md                     (Codex · Cursor 공통, 관리 블록으로 멱등 갱신)
 *     - .cursor/rules/llm-rules.mdc   (Cursor 네이티브, alwaysApply, 전체 덮어쓰기)
 *
 * 소스
 *   이 레포의 docs/convention/*.md (단일 출처) 를 DOC_ORDER 순으로 inline 한다.
 *
 * 옵션
 *   --target <dir>   생성 대상 프로젝트 루트 (기본: 현재 디렉토리)
 *   --dry-run        결과만 출력, 파일 미수정
 *   --no-cursor      .cursor/rules/llm-rules.mdc 생성 생략
 *   --no-agents      AGENTS.md 생성 생략
 *   --no-backup      AGENTS.md 변경 시 .bak 백업 생략
 *   --help, -h       도움말
 */

import { resolve, dirname } from 'node:path'
import { mkdir, copyFile, readdir } from 'node:fs/promises'

const BEGIN = '<!-- BEGIN: llm-rules (managed by llm-rules/scripts/init-agents.ts) -->'
const END = '<!-- END: llm-rules -->'

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
            '대상 프로젝트 루트에 AGENTS.md(Codex·Cursor) + .cursor/rules/llm-rules.mdc(Cursor) 를 생성한다.',
            '',
            '옵션:',
            '  --target <dir>   생성 대상 프로젝트 루트 (기본: 현재 디렉토리)',
            '  --dry-run        결과만 출력, 파일 미수정',
            '  --no-cursor      .cursor/rules/llm-rules.mdc 생성 생략',
            '  --no-agents      AGENTS.md 생성 생략',
            '  --no-backup      AGENTS.md 변경 시 .bak 백업 생략',
            '  --help, -h       이 도움말',
        ].join('\n'),
    )
    process.exit(0)
}

const opts = {
    target: resolve(getOpt('--target') ?? process.cwd()),
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
if (!(await Bun.file(resolve(srcConventionDir, 'index.md')).exists())) {
    die(`컨벤션 문서를 찾을 수 없습니다: ${srcConventionDir}\n   rules 레포 구조가 올바른지 확인하세요.`)
}

const docFiles = (await readdir(srcConventionDir)).filter((f) => f.endsWith('.md')).sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b))
const sections = await Promise.all(docFiles.map((f) => Bun.file(resolve(srcConventionDir, f)).text()))
const inlined = sections.map((s) => s.trim()).join('\n\n')

const intro = [
    '# 코딩 컨벤션 (LLM Rules)',
    '',
    '> 아래는 `llm-rules` 가 생성·관리하는 코딩 컨벤션 전문이다. 이 블록은 자동 생성되므로 직접 수정하지 않는다.',
    '> Claude 외 에이전트(Codex · Cursor 등)는 이 파일을 베이스 룰로 읽는다. 모든 코드 작업에서 아래 규칙을 따른다.',
].join('\n')

const block = [BEGIN, intro, inlined, END].join('\n\n')

const applyBlock = (orig: string) => {
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

const mdc = ['---', 'description: 프로젝트 코딩 컨벤션 (LLM Rules) — 항상 적용', 'alwaysApply: true', '---', '', inlined, ''].join('\n')

const agentsPath = resolve(opts.target, 'AGENTS.md')
const cursorPath = resolve(opts.target, '.cursor/rules/llm-rules.mdc')

const agentsOrig = (await Bun.file(agentsPath).exists()) ? await Bun.file(agentsPath).text() : ''
const agentsNext = applyBlock(agentsOrig)
const agentsChanged = agentsNext !== agentsOrig

log('')
log(`대상   : ${opts.target}`)
log(`소스   : ${srcConventionDir} (${docFiles.length}개 .md inline)`)
if (opts.agents) log(`AGENTS : ${agentsPath} (${agentsChanged ? (agentsOrig ? '갱신' : '생성') : '변경 없음'})`)
if (opts.cursor) log(`CURSOR : ${cursorPath} (덮어쓰기)`)

if (opts.dryRun) {
    log('\n────────── (dry-run) AGENTS.md ──────────')
    log(agentsNext)
    log('──────────────────────────────────────────')
    log('dry-run 모드: 파일 미수정.')
    process.exit(0)
}

try {
    if (opts.agents) {
        await mkdir(dirname(agentsPath), { recursive: true })
        if (agentsChanged) {
            if (opts.backup && agentsOrig) {
                await copyFile(agentsPath, `${agentsPath}.bak`)
                log(`🗄  백업 생성: ${agentsPath}.bak`)
            }
            await Bun.write(agentsPath, agentsNext)
            log(`✅ AGENTS.md ${agentsOrig ? '갱신' : '생성'} 완료.`)
        } else {
            log('✅ AGENTS.md 는 이미 최신 (변경 없음).')
        }
    }
    if (opts.cursor) {
        await mkdir(dirname(cursorPath), { recursive: true })
        await Bun.write(cursorPath, mdc)
        log('✅ .cursor/rules/llm-rules.mdc 생성 완료.')
    }
} catch (error) {
    die(`파일 쓰기 실패: ${error instanceof Error ? error.message : String(error)}\n   쓰기 권한을 확인하세요: ${opts.target}`)
}
