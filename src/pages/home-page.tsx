import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { ArrowRight, CheckCircle, TerminalWindow } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'

const CODEX_INSTALL_COMMAND = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-codex.sh)"'
const CLAUDE_INSTALL_COMMANDS = [
    'bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh)"',
    'bash -c "$(curl -fsSL https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install-claude-code.sh)"',
]
const SUPPORT_LAYERS = [
    { label: '기본 지침', codex: 'AGENTS.md', claude: 'CLAUDE.md' },
    { label: '생명주기', codex: 'Hooks', claude: 'Hooks' },
    { label: '오케스트레이터', codex: 'Sol · high', claude: 'Fable · high' },
    { label: '하위 작업', codex: 'Terra/Luna high · Luna xhigh', claude: 'Sonnet high · Haiku xhigh' },
    { label: '워크플로', codex: 'Subagent workflow', claude: 'Workflow command' },
    { label: '명령 정책', codex: 'Execpolicy Rules', claude: 'Permissions' },
    { label: '응답 규칙', codex: 'AGENTS.md', claude: 'Output Style' },
]

export const HomePage: FC = () => (
    <div className='mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20'>
        <Head>
            <title>LLM Rules · Codex와 Claude Code 네이티브 컨벤션</title>
            <meta name='description' content='하나의 코딩 컨벤션과 다중 에이전트 workflow를 Codex와 Claude Code에서 네이티브로 실행합니다.' />
        </Head>

        <section className='max-w-4xl'>
            <p className='mb-5 inline-flex rounded-full border border-border bg-muted/60 px-3 py-1 font-mono text-xs font-medium text-muted-foreground'>
                CODEX + CLAUDE CODE
            </p>
            <h1 className='text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl'>
                한 번 정의하고,
                <br />두 에이전트에서 네이티브로 실행합니다.
            </h1>
            <p className='mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg'>
                공통 컨벤션은 하나로 유지하고 각 환경의 주 모델과 하위 모델이 구현, 리서치, 검증을 나눠 수행한 뒤 추가 승인 없이 자동으로 커밋하고
                푸시합니다.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
                <Button asChild size='lg'>
                    <Link to='/codex'>
                        Codex 에디션 <ArrowRight data-icon='inline-end' />
                    </Link>
                </Button>
                <Button asChild variant='outline' size='lg'>
                    <Link to='/claude-code'>Claude Code 에디션</Link>
                </Button>
            </div>
        </section>

        <section className='mt-16' aria-labelledby='quick-install'>
            <div className='mb-6 flex items-end justify-between gap-4'>
                <div>
                    <p className='font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase'>Quick install</p>
                    <h2 id='quick-install' className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
                        환경을 선택하고 바로 설치하세요.
                    </h2>
                </div>
                <TerminalWindow className='hidden size-8 text-muted-foreground sm:block' />
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
                <article className='flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <p className='font-mono text-xs font-medium text-muted-foreground'>PRIMARY</p>
                            <h3 className='mt-1 text-xl font-semibold'>Codex</h3>
                        </div>
                        <span className='rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background'>1 command</span>
                    </div>
                    <p className='mt-4 text-sm leading-6 text-muted-foreground'>
                        Sol 오케스트레이터부터 Hooks, Subagent workflow, Terra/Luna Custom Agents, 무승인 Git Rules까지 한 번에 설치합니다.
                    </p>
                    <pre className='mt-5 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-xs leading-6'>
                        <code className='whitespace-pre-wrap break-all'>{CODEX_INSTALL_COMMAND}</code>
                    </pre>
                    <Link to='/codex/install' className='mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium hover:underline'>
                        설치 옵션 보기 <ArrowRight />
                    </Link>
                </article>

                <article className='flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <p className='font-mono text-xs font-medium text-muted-foreground'>COMPATIBLE</p>
                            <h3 className='mt-1 text-xl font-semibold'>Claude Code</h3>
                        </div>
                        <span className='rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium'>2 commands</span>
                    </div>
                    <p className='mt-4 text-sm leading-6 text-muted-foreground'>
                        공통 컨벤션을 먼저 설치한 뒤 Fable 오케스트레이터와 Sonnet/Haiku Subagents를 기존 네이티브 레이어에 추가합니다.
                    </p>
                    <pre className='mt-5 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-xs leading-6'>
                        <code className='whitespace-pre-wrap break-all'>{CLAUDE_INSTALL_COMMANDS.join('\n')}</code>
                    </pre>
                    <Link to='/claude-code' className='mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium hover:underline'>
                        설치 구성 보기 <ArrowRight />
                    </Link>
                </article>
            </div>
        </section>

        <section className='mt-16 rounded-2xl border border-border bg-muted/30 p-5 sm:p-8' aria-labelledby='native-support'>
            <div className='max-w-2xl'>
                <p className='font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase'>Native parity</p>
                <h2 id='native-support' className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
                    같은 규칙, 각 환경에 맞는 실행 계층
                </h2>
                <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                    Claude Code 자산은 기존 구조를 유지하고 Codex 자산은 별도 경로에서 병렬 관리하며, 양쪽 모두 상세 위임과 위험비례 최소 검증 후
                    무승인 자동 Git 흐름을 적용합니다.
                </p>
            </div>
            <div className='mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3'>
                {SUPPORT_LAYERS.map((layer) => (
                    <div key={layer.label} className='bg-background p-4'>
                        <p className='flex items-center gap-2 text-sm font-medium'>
                            <CheckCircle className='text-muted-foreground' /> {layer.label}
                        </p>
                        <dl className='mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5'>
                            <dt className='text-muted-foreground'>Codex</dt>
                            <dd className='font-mono'>{layer.codex}</dd>
                            <dt className='text-muted-foreground'>Claude</dt>
                            <dd className='font-mono'>{layer.claude}</dd>
                        </dl>
                    </div>
                ))}
            </div>
        </section>

        <section className='mt-16 flex flex-col gap-5 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between'>
            <div>
                <h2 className='text-xl font-semibold'>규칙의 단일 출처는 공통 컨벤션입니다.</h2>
                <p className='mt-2 text-sm text-muted-foreground'>
                    AI 작업 프로세스부터 프론트엔드, 백엔드, 보안과 Git 규칙까지 한곳에서 관리합니다.
                </p>
            </div>
            <Button asChild variant='outline' size='lg'>
                <Link to='/convention'>
                    공통 컨벤션 보기 <ArrowRight data-icon='inline-end' />
                </Link>
            </Button>
        </section>
    </div>
)
