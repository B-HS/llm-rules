#!/usr/bin/env bun
/**
 * install-claude-code.ts — Claude Code 전용 설치 메뉴
 *
 * 목적
 *   docs/claudecode/assets 의 Claude Code 기능(settings.json hooks+permissions,
 *   hook 스크립트, slash commands, subagents, output-style)을 ~/.claude(글로벌) 또는
 *   프로젝트 .claude 에 설치한다. 컨벤션 prose 설치(sync-claude-md.ts)와는 분리된다.
 *
 * 사용
 *   bun run install-claude-code               대화형 메뉴 (위치 + 항목 선택)
 *   bun run install-claude-code --global --all 비대화형 전체 설치(글로벌)
 *   bun run install-claude-code --project --hooks --settings
 *
 * 옵션
 *   --global | --project | --target <dir>   설치 위치 (기본: 대화형, 비대화형이면 --global)
 *   --all                                    모든 항목 설치
 *   --settings --hooks --commands --agents --output-style   개별 항목
 *   --dry-run        변경 미리보기 (파일 미수정)
 *   --yes, -y        프롬프트 기본값 자동 응답
 *   --no-backup      settings.json .bak 백업 생략
 *   --help, -h       도움말
 *
 * 멱등성
 *   settings.json 은 비파괴 병합한다(.bak 백업). 재실행 시 llm-rules hook 항목은
 *   command 경로 마커(/hooks/llm-rules/)로 식별해 교체하고, permissions 는 합집합으로 dedupe.
 */

import { homedir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { mkdir, copyFile, cp, rm, readdir, chmod } from 'node:fs/promises'

const HOME = homedir()
const log = (...a: unknown[]) => console.log(...a)
const warn = (...a: unknown[]) => console.warn('⚠️ ', ...a)
const die = (m: string): never => {
    console.error(`❌ ${m}`)
    process.exit(1)
}

const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const getOpt = (n: string) => {
    const i = argv.indexOf(n)
    return i !== -1 ? argv[i + 1] : undefined
}

if (has('--help') || has('-h')) {
    log(
        [
            'Claude Code 전용 설치 메뉴',
            '',
            '사용법: bun run install-claude-code [위치] [항목] [옵션]',
            '',
            '위치  : --global(기본/비대화형) | --project | --target <dir>',
            '항목  : --all | --settings | --hooks | --commands | --agents | --output-style',
            '옵션  : --dry-run  --yes/-y  --no-backup  --help/-h',
            '',
            '예) bun run install-claude-code --global --all',
            '    bun run install-claude-code --project --hooks --settings',
        ].join('\n'),
    )
    process.exit(0)
}

const opts = {
    dryRun: has('--dry-run'),
    yes: has('--yes') || has('-y'),
    backup: !has('--no-backup'),
}

const ASSETS = resolve(import.meta.dir, '../docs/claudecode/assets')
if (!(await Bun.file(join(ASSETS, 'settings.json')).exists())) {
    die(`자산을 찾을 수 없습니다: ${ASSETS}\n   llm-rules 레포 구조를 확인하세요.`)
}

// --- 프롬프트 ---
const isTTY = process.stdin.isTTY
const ask = (q: string, fallback: string): string => {
    if (opts.yes || !isTTY) return fallback
    const a = prompt(q)
    return (a ?? '').trim() || fallback
}

// --- 1. 설치 위치 ---
type Loc = { kind: 'global' | 'project'; claudeDir: string }
const resolveLocation = (): Loc => {
    const target = getOpt('--target')
    if (target) return { kind: 'project', claudeDir: resolve(target, '.claude') }
    if (has('--global')) return { kind: 'global', claudeDir: resolve(HOME, '.claude') }
    if (has('--project')) return { kind: 'project', claudeDir: resolve(process.cwd(), '.claude') }
    const c = ask('설치 위치?  [1] 글로벌(~/.claude)  [2] 프로젝트(./.claude)  (기본 1): ', '1')
    return c === '2' ? { kind: 'project', claudeDir: resolve(process.cwd(), '.claude') } : { kind: 'global', claudeDir: resolve(HOME, '.claude') }
}
const loc = resolveLocation()

// --- 2. 설치 항목 ---
const ALL_ITEMS = ['settings', 'hooks', 'commands', 'agents', 'output-style'] as const
type Item = (typeof ALL_ITEMS)[number]
const flagged = ALL_ITEMS.filter((i) => has(`--${i}`))
let items: Item[]
if (has('--all')) items = [...ALL_ITEMS]
else if (flagged.length) items = flagged
else {
    log('설치 항목 (쉼표로 다중 선택, a=전체):')
    log('  1) settings.json (hooks + permissions 병합)')
    log('  2) hooks 스크립트 (6종)')
    log('  3) slash commands (/llm-rules:*)')
    log('  4) subagents (리뷰어)')
    log('  5) output-style (한국어·존댓말)')
    const sel = ask('선택 (기본 a): ', 'a')
    if (/^a/i.test(sel)) items = [...ALL_ITEMS]
    else {
        const map: Record<string, Item> = { '1': 'settings', '2': 'hooks', '3': 'commands', '4': 'agents', '5': 'output-style' }
        items = [...new Set(sel.split(',').map((s) => map[s.trim()]).filter(Boolean) as Item[])]
    }
}
if (!items.length) die('선택된 항목이 없습니다.')
// settings 는 hooks 경로를 참조하므로 hooks 도 함께 깐다(없으면 경고).
if (items.includes('settings') && !items.includes('hooks')) warn('settings 만 선택했습니다. hooks 스크립트가 없으면 hook 이 동작하지 않습니다. (--hooks 권장)')

const HOOKS_DEST = join(loc.claudeDir, 'hooks', 'llm-rules')
const COMMANDS_DEST = join(loc.claudeDir, 'commands', 'llm-rules')
const AGENTS_DEST = join(loc.claudeDir, 'agents')
const OUTPUT_DEST = join(loc.claudeDir, 'output-styles')
const SETTINGS_PATH = join(loc.claudeDir, 'settings.json')
// hook command 경로: 글로벌은 절대($HOME), 프로젝트는 $CLAUDE_PROJECT_DIR 기준.
const hookCmdBase = loc.kind === 'global' ? `$HOME/.claude/hooks/llm-rules` : `$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules`

log('')
log(`위치   : ${loc.kind} → ${loc.claudeDir}`)
log(`항목   : ${items.join(', ')}`)
log(`자산   : ${ASSETS}`)
if (opts.dryRun) log('(dry-run: 파일을 수정하지 않습니다)')

// --- settings.json 병합 ---
const MARK = '/hooks/llm-rules/'
const uniq = (a: string[]) => [...new Set(a)]
const isOurs = (entry: any) => Array.isArray(entry?.hooks) && entry.hooks.some((h: any) => typeof h?.command === 'string' && h.command.includes(MARK))

const mergeSettings = async () => {
    const tmpl = JSON.parse(await Bun.file(join(ASSETS, 'settings.json')).text())
    // 템플릿 hook command 경로를 설치 위치에 맞게 치환
    const ourHooks = JSON.parse(JSON.stringify(tmpl.hooks).replaceAll('$CLAUDE_PROJECT_DIR/.claude/hooks/llm-rules', hookCmdBase))

    let cur: any = {}
    const exists = await Bun.file(SETTINGS_PATH).exists()
    if (exists) {
        try {
            cur = JSON.parse(await Bun.file(SETTINGS_PATH).text())
        } catch {
            die(`${SETTINGS_PATH} 가 유효한 JSON 이 아닙니다. 수동 확인 후 다시 실행하세요. (안전을 위해 중단)`)
        }
    }

    // permissions: 합집합 dedupe
    cur.permissions ??= {}
    for (const k of ['allow', 'ask', 'deny'] as const) {
        const merged = uniq([...(cur.permissions[k] ?? []), ...((tmpl.permissions?.[k] as string[]) ?? [])])
        if (merged.length) cur.permissions[k] = merged
    }

    // hooks: 우리 항목(마커) 제거 후 재추가 (멱등)
    cur.hooks ??= {}
    for (const event of Object.keys(ourHooks)) {
        const existing = (cur.hooks[event] ?? []).filter((e: any) => !isOurs(e))
        cur.hooks[event] = [...existing, ...ourHooks[event]]
    }

    const next = JSON.stringify(cur, null, 2) + '\n'
    if (opts.dryRun) {
        log('\n────────── (dry-run) settings.json ──────────')
        log(next)
        log('─────────────────────────────────────────────')
        return
    }
    await mkdir(dirname(SETTINGS_PATH), { recursive: true })
    if (opts.backup && exists) {
        await copyFile(SETTINGS_PATH, `${SETTINGS_PATH}.bak`)
        log(`🗄  백업: ${SETTINGS_PATH}.bak`)
    }
    await Bun.write(SETTINGS_PATH, next)
    log(`✅ settings.json 병합: ${SETTINGS_PATH}`)
}

const copyTree = async (src: string, dest: string, label: string, exec = false) => {
    const files = (await readdir(src)).filter((f) => !f.startsWith('.'))
    if (opts.dryRun) {
        log(`\n(dry-run) ${label}: ${files.length}개 → ${dest}`)
        files.forEach((f) => log(`  • ${f}`))
        return
    }
    await rm(dest, { recursive: true, force: true })
    await mkdir(dest, { recursive: true })
    for (const f of files) {
        await cp(join(src, f), join(dest, f))
        if (exec) await chmod(join(dest, f), 0o755)
    }
    log(`✅ ${label}: ${files.length}개 → ${dest}`)
}

// --- 실행 ---
if (items.includes('hooks')) await copyTree(join(ASSETS, 'hooks'), HOOKS_DEST, 'hooks 스크립트', true)
if (items.includes('commands')) await copyTree(join(ASSETS, 'commands'), COMMANDS_DEST, 'slash commands')
if (items.includes('agents')) await copyTree(join(ASSETS, 'agents'), AGENTS_DEST, 'subagents')
if (items.includes('output-style')) {
    if (opts.dryRun) log(`\n(dry-run) output-style → ${OUTPUT_DEST}/llm-rules.md`)
    else {
        await mkdir(OUTPUT_DEST, { recursive: true })
        await copyFile(join(ASSETS, 'output-styles', 'llm-rules.md'), join(OUTPUT_DEST, 'llm-rules.md'))
        log(`✅ output-style → ${OUTPUT_DEST}/llm-rules.md  (활성화: /output-style llm-rules)`)
    }
}
if (items.includes('settings')) await mergeSettings()

log('')
if (opts.dryRun) log('dry-run 완료. 실제 설치하려면 --dry-run 을 빼고 실행하세요.')
else {
    log('✓ Claude Code 설치 완료.')
    log(`  - 적용 확인: ${loc.kind === 'global' ? '새 세션' : '이 프로젝트에서 새 세션'} 시작 후 /hooks 로 확인`)
    if (items.includes('commands')) log('  - 슬래시 커맨드: /llm-rules:audit-conventions 등')
    if (items.includes('agents')) log('  - 서브에이전트: convention-reviewer 등 (자동/수동 호출)')
    if (items.includes('output-style')) log('  - 응답 스타일: /output-style llm-rules')
    if (loc.kind === 'global') warn('글로벌 hook 은 모든 프로젝트에 적용됩니다. 특정 레포만 원하면 --project 로 설치하세요.')
}
