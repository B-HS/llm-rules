#!/usr/bin/env bun
/**
 * sync-claude-md.ts — 글로벌 CLAUDE.md ↔ rules 컨벤션 동기화
 *
 * 목적
 *   어느 컴퓨터에서든 이 rules 레포를 받아 `bun run sync` 만 실행하면
 *   글로벌 ~/.claude/CLAUDE.md 가 docs/convention/index.md 를 참조하도록 맞춘다.
 *
 * 멱등성
 *   관리 영역을 마커(BEGIN/END)로 감싸고, 재실행 시 그 사이만 갱신한다.
 *   같은 내용이면 아무것도 쓰지 않는다.
 *
 * 경로 이식성
 *   컨벤션 경로가 홈 디렉토리 하위면 `~/...` 로 기록한다. (계정명이 달라도 동작)
 *
 * 옵션
 *   --dry-run         변경 결과만 출력, 파일은 수정하지 않음
 *   --yes, -y         프롬프트에 기본값으로 자동 응답 (비대화형/CI)
 *   --target <path>   대상 CLAUDE.md 경로 (기본: ~/.claude/CLAUDE.md)
 *   --no-backup       쓰기 전 .bak 백업을 만들지 않음
 *   --force           손상된 마커(BEGIN/END 짝 불일치) 자동 복구
 *
 * 처리 케이스
 *   A. 파일 없음 / 빈 파일                 → 관리 블록 새로 생성
 *   B. 관리 마커 이미 존재(정상)           → 마커 사이만 멱등 갱신 (동일하면 no-op)
 *   C. 마커 없음 + 기존 convention 내용 감지 → 내용 보여주고 [추가 / 교체 / 취소] 선택
 *   D. 마커 없음 + 무관 내용               → 기존 보존하고 끝에 블록 추가
 *   E. 마커 손상(BEGIN만 / END만)          → 경고, --force 시 정리 후 재생성
 *   F. 마커 중복(BEGIN 2개 이상)           → 경고, 첫 블록만 갱신 + 수동 정리 안내
 */

import { homedir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { mkdir, copyFile, cp, rm, readdir } from 'node:fs/promises'

const HOME = homedir()
const MARKER_BEGIN = '<!-- BEGIN: rules-convention (managed by rules/scripts/sync-claude-md.ts) -->'
const MARKER_END = '<!-- END: rules-convention -->'

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const log = (...a: unknown[]) => console.log(...a)
const warn = (...a: unknown[]) => console.warn('⚠️ ', ...a)
const die = (msg: string): never => {
    console.error(`❌ ${msg}`)
    process.exit(1)
}

// --- CLI 파싱 ---
const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const getOpt = (name: string) => {
    const i = argv.indexOf(name)
    return i !== -1 ? argv[i + 1] : undefined
}
if (has('--help') || has('-h')) {
    log(
        [
            '사용법: bun run sync [옵션]   (= bun run scripts/sync-claude-md.ts)',
            '',
            '글로벌 ~/.claude/CLAUDE.md 가 이 레포의 컨벤션(docs/convention/index.md)을 참조하도록 동기화한다.',
            '',
            '옵션:',
            '  --dry-run          변경 결과만 출력, 파일은 수정하지 않음',
            '  --yes, -y          프롬프트에 기본값으로 자동 응답 (비대화형/CI)',
            '  --replace-legacy   기존 @...convention.md 참조를 제거하고 새 참조로 교체 (기본은 보존+추가)',
            '  --target <path>    대상 CLAUDE.md 경로 (기본: ~/.claude/CLAUDE.md)',
            '  --no-backup        쓰기 전 .bak 백업을 만들지 않음',
            '  --force            손상된 마커(BEGIN/END 짝 불일치) 자동 복구',
            '  --help, -h         이 도움말',
        ].join('\n'),
    )
    process.exit(0)
}

const opts = {
    dryRun: has('--dry-run'),
    yes: has('--yes') || has('-y'),
    backup: !has('--no-backup'),
    force: has('--force'),
    replaceLegacy: has('--replace-legacy'),
    target: getOpt('--target'),
}

// --- 경로 계산 ---
// 컨벤션 문서를 CLAUDE.md 와 같은 위치의 convention/ 으로 복사하고, 그 사본을 참조한다. (레포 경로에 독립)
const srcConventionDir = resolve(import.meta.dir, '../docs/convention')
const targetPath = resolve(opts.target ?? `${HOME}/.claude/CLAUDE.md`)
const targetDir = dirname(targetPath)
const destConventionDir = resolve(targetDir, 'convention')

if (!(await Bun.file(resolve(srcConventionDir, 'index.md')).exists())) {
    die(`컨벤션 문서를 찾을 수 없습니다: ${srcConventionDir}\n   rules 레포 구조가 올바른지 확인하세요.`)
}

// 문서 순서: index 우선 → 정해진 순서 → 나머지 알파벳
const DOC_ORDER = ['index', 'ai-process', 'common', 'comments', 'security', 'git', 'frontend', 'fsd', 'query', 'backend', 'desktop']
const orderOf = (file: string) => {
    const i = DOC_ORDER.indexOf(file.replace(/\.md$/, ''))
    return i === -1 ? DOC_ORDER.length : i
}
const docFiles = (await readdir(srcConventionDir)).filter((f) => f.endsWith('.md')).sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b))

// 홈 하위면 ~/ 로 치환 (이식성). @import 은 마크다운 링크를 따라가지 않으므로 문서마다 한 줄씩 명시한다.
const toRefPath = (abs: string) => (abs === HOME || abs.startsWith(`${HOME}/`) ? `~${abs.slice(HOME.length)}` : abs)
const importLines = docFiles.map((f) => `@${toRefPath(resolve(destConventionDir, f))}`)

const block = [MARKER_BEGIN, '## 코드 컨벤션', '아래 컨벤션 문서를 항상 참고하여 코드를 작성한다.', ...importLines, MARKER_END].join('\n')

// --- 대상 읽기 ---
const file = Bun.file(targetPath)
const exists = await file.exists()
const original = exists ? await file.text() : ''

// --- 마커 상태 ---
const beginCount = original.split(MARKER_BEGIN).length - 1
const endCount = original.split(MARKER_END).length - 1
const beginIdx = original.indexOf(MARKER_BEGIN)
const endIdx = original.indexOf(MARKER_END)
const hasValidPair = beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx

// --- 프롬프트 ---
const ask = (question: string, fallback: string): string => {
    if (opts.yes) return fallback
    if (!process.stdin.isTTY) {
        die('비대화형 환경입니다. 자동 적용하려면 --yes 를 함께 사용하세요. (안전을 위해 변경을 중단합니다)')
    }
    const answer = prompt(question)
    return (answer ?? '').trim().toLowerCase() || fallback
}

// --- 콘텐츠 변형 ---
const replaceBlock = (content: string) => {
    const before = content.slice(0, beginIdx).replace(/\s*$/, '')
    const after = content.slice(endIdx + MARKER_END.length).replace(/^\s*/, '')
    return [before, block, after].filter(Boolean).join('\n\n') + '\n'
}
const appendBlock = (content: string) => {
    const base = content.replace(/\s*$/, '')
    return (base ? `${base}\n\n` : '') + block + '\n'
}

// --- 케이스 분기 ---
let next: string
let caseLabel: string

if (beginCount > 1 || endCount > 1) {
    // F. 중복 마커
    warn(`관리 마커가 여러 개 발견되었습니다 (BEGIN ${beginCount} / END ${endCount}). 첫 블록만 갱신하니 나머지는 수동 정리하세요.`)
    if (!hasValidPair) die('마커 짝이 손상되어 안전하게 갱신할 수 없습니다. 수동 정리 후 다시 실행하세요.')
    next = replaceBlock(original)
    caseLabel = 'F: 중복 마커(첫 블록만 갱신)'
} else if (hasValidPair) {
    // B. 정상 마커 → 멱등 갱신
    next = replaceBlock(original)
    caseLabel = 'B: 기존 관리 블록 갱신'
} else if (beginIdx !== -1 || endIdx !== -1) {
    // E. 손상 마커
    if (!opts.force) die('관리 마커가 손상되었습니다 (BEGIN/END 짝이 맞지 않음). 확인 후 --force 로 복구하거나 수동 정리하세요.')
    const cleaned = original
        .replace(new RegExp(`${escapeRegExp(MARKER_BEGIN)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`, 'g'), '')
        .replaceAll(MARKER_BEGIN, '')
        .replaceAll(MARKER_END, '')
    next = appendBlock(cleaned)
    caseLabel = 'E: 손상 마커 복구'
} else if (original.trim() === '') {
    // A. 빈 파일 / 파일 없음
    next = block + '\n'
    caseLabel = exists ? 'A: 빈 파일 → 생성' : 'A: 파일 없음 → 신규 생성'
} else {
    // 마커 없음 + 내용 있음
    const hasLegacyConvention = /(@\S*convention\S*\.md)|코드\s*컨벤션|coding\s*convention|컨벤션/i.test(original)
    if (hasLegacyConvention) {
        // C. 기존 convention 내용 → 보여주고 선택
        log('────────── 기존 CLAUDE.md ──────────')
        log(original.trimEnd())
        log('────────────────────────────────────')
        log('이미 컨벤션 관련 내용이 있습니다.')
        const fallback = opts.replaceLegacy ? 'r' : 'a'
        const choice = ask(`어떻게 할까요? [a] 추가(기존 보존) / [r] 기존 convention 참조 교체 / [c] 취소  (기본: ${fallback}): `, fallback)
        if (choice === 'c') {
            log('취소했습니다. 변경 없음.')
            process.exit(0)
        }
        if (choice === 'r') {
            // 레거시 '코드 컨벤션' 섹션(@convention 참조 포함)을 통째로 제거한다.
            // (헤딩만 남는 중복을 막는다.) 섹션 매칭이 안 되면 참조 줄만 제거로 폴백.
            const legacySectionRe = /\n*#{1,6}[^\n]*컨벤션[^\n]*\n(?:(?!\s*#{1,6}\s)[^\n]*\n?)*?\s*@\S*convention\S*\.md[^\n]*/
            const stripped = legacySectionRe.test(original)
                ? original.replace(legacySectionRe, '')
                : original
                      .split('\n')
                      .filter((line: string) => !/@\S*convention\S*\.md/.test(line))
                      .join('\n')
            next = appendBlock(stripped)
            caseLabel = 'C: 기존 convention 섹션 교체 + 블록 추가'
        } else {
            next = appendBlock(original)
            caseLabel = 'C: 기존 보존 + 블록 추가'
        }
    } else {
        // D. 무관 내용
        next = appendBlock(original)
        caseLabel = 'D: 기존 내용 보존 + 블록 추가'
    }
}

const claudeChanged = next !== original

log('')
log(`대상   : ${targetPath}`)
log(`복사   : ${srcConventionDir}`)
log(`     → : ${destConventionDir} (${docFiles.length}개 .md)`)
log(`참조   : @import ${importLines.length}개 (${docFiles.join(', ')})`)
log(`케이스 : ${caseLabel}`)

// --- dry-run ---
if (opts.dryRun) {
    log('\n────────── (dry-run) 적용 후 CLAUDE.md ──────────')
    log(next)
    log('──────────────────────────────────────────────────')
    log(`dry-run 모드: 파일 미수정. 실제 실행 시 ${docFiles.length}개 문서를 ${destConventionDir} 로 복사합니다.`)
    log(claudeChanged ? 'CLAUDE.md: 위 내용으로 갱신됩니다.' : 'CLAUDE.md: 변경 없음 (관리 블록 동일).')
    process.exit(0)
}

// --- 쓰기 ---
try {
    await mkdir(targetDir, { recursive: true })

    // 컨벤션 문서를 convention/ 으로 미러링 (소스가 바뀌었을 수 있으므로 항상 갱신)
    await rm(destConventionDir, { recursive: true, force: true })
    await cp(srcConventionDir, destConventionDir, { recursive: true })
    log(`📁 컨벤션 ${docFiles.length}개 문서 복사: ${destConventionDir}`)

    if (claudeChanged) {
        if (opts.backup && exists) {
            const backupPath = `${targetPath}.bak`
            await copyFile(targetPath, backupPath)
            log(`🗄  백업 생성: ${backupPath}`)
        }
        await Bun.write(targetPath, next)
        log(`✅ 동기화 완료 (${caseLabel}).`)
    } else {
        log(`✅ CLAUDE.md 는 이미 최신 (${caseLabel}). 문서 사본만 갱신했습니다.`)
    }
} catch (error) {
    die(`파일 쓰기 실패: ${error instanceof Error ? error.message : String(error)}\n   쓰기 권한을 확인하세요: ${targetPath}`)
}
