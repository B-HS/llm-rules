import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { ArrowRight, CheckCircle, TerminalWindow } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'

const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/B-HS/llm-rules/main/install-files/install.sh'
const buildInstallCommand = (edition: string) => `bash -c "$(curl -fsSL ${INSTALL_SCRIPT_URL})" llm-rules ${edition} --global --all`

const EDITIONS = [
    {
        name: 'Claude Code',
        route: '/claude-code',
        command: buildInstallCommand('claude-code'),
        summary: '200줄 이하 코어와 경로 범위 규칙, output style, 커맨드, 서브에이전트, hook, settings 를 설치합니다.',
    },
    {
        name: 'Codex',
        route: '/codex',
        command: buildInstallCommand('codex'),
        summary: '11KB 코어와 조건부 참조 문서, Skills, Custom Agents, Hooks, Execpolicy Rules 를 설치합니다.',
    },
    {
        name: 'OpenCode',
        route: '/opencode',
        command: buildInstallCommand('opencode'),
        summary: 'AGENTS.md 코어와 참조 문서, Skills, Commands, Subagents, 권한 규칙, 플러그인을 설치합니다.',
    },
    {
        name: 'Pi',
        route: '/pi',
        command: buildInstallCommand('pi'),
        summary: 'AGENTS.md 코어와 참조 문서, Skills, 도구 호출을 지키는 Extension 을 설치합니다.',
    },
]

const DELIVERY_LAYERS = [
    { label: '상시 지침', values: ['rules/core.md', 'AGENTS.md', 'AGENTS.md', 'AGENTS.md'] },
    { label: '도메인 규칙', values: ['경로 범위 규칙', '조건부 참조 문서', '조건부 참조 문서', '조건부 참조 문서'] },
    { label: '반복 절차', values: ['Commands', 'Skills', 'Skills · Commands', 'Skills'] },
    { label: '응답 형식', values: ['Output Style', 'AGENTS.md', 'AGENTS.md', 'AGENTS.md'] },
    { label: '위임', values: ['Subagents (요청 시)', 'Custom Agents (요청 시)', 'Subagents (요청 시)', '직접 수행'] },
    { label: '강제 계층', values: ['Hooks · Permissions', 'Hooks · Execpolicy', 'Permissions · Plugin', 'Extension'] },
]

export const HomePage: FC = () => (
    <div className='mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20'>
        <Head>
            <title>LLM Rules · 프로바이더별로 최적화한 코딩 에이전트 룰</title>
            <meta
                name='description'
                content='같은 결과물을 내는 코딩 컨벤션을 Claude Code, Codex, OpenCode, Pi 각각의 권장사항에 맞춰 제공합니다.'
            />
        </Head>

        <section className='max-w-4xl'>
            <p className='mb-5 inline-flex rounded-full border border-border bg-muted/60 px-3 py-1 font-mono text-xs font-medium text-muted-foreground'>
                CLAUDE CODE · CODEX · OPENCODE · PI
            </p>
            <h1 className='text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl'>
                결과물은 같게,
                <br />
                과정은 프로바이더에 맞게.
            </h1>
            <p className='mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg'>
                코드·문서·커밋·응답의 결과는 네 에디션이 같습니다. 지침을 싣는 방식과 작업 과정은 각 모델과 하네스의 공식 권장에 맞춰 따로
                작성했습니다.
            </p>
        </section>

        <section className='mt-16' aria-labelledby='quick-install'>
            <div className='mb-6 flex items-end justify-between gap-4'>
                <div>
                    <p className='font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase'>Quick install</p>
                    <h2 id='quick-install' className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
                        쓰는 에이전트의 에디션을 설치하세요.
                    </h2>
                </div>
                <TerminalWindow className='hidden size-8 text-muted-foreground sm:block' />
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
                {EDITIONS.map((edition) => (
                    <article key={edition.route} className='flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'>
                        <h3 className='text-xl font-semibold'>{edition.name}</h3>
                        <p className='mt-3 text-sm leading-6 text-muted-foreground'>{edition.summary}</p>
                        <pre className='mt-5 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 text-xs leading-6'>
                            <code className='break-all whitespace-pre-wrap'>{edition.command}</code>
                        </pre>
                        <Link to={edition.route} className='mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium hover:underline'>
                            구성과 근거 보기 <ArrowRight />
                        </Link>
                    </article>
                ))}
            </div>
            <p className='mt-4 text-sm text-muted-foreground'>
                원격 설치에는 Bun 이 필요합니다. 저장소를 클론했다면 bun run install-&lt;에디션&gt; 을 씁니다.
            </p>
        </section>

        <section className='mt-16 rounded-2xl border border-border bg-muted/30 p-5 sm:p-8' aria-labelledby='delivery-layers'>
            <div className='max-w-2xl'>
                <p className='font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase'>Delivery</p>
                <h2 id='delivery-layers' className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
                    같은 규칙을 싣는 서로 다른 계층
                </h2>
                <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                    에디션마다 룰 문서를 따로 소유합니다. 결과물이 같은지는 저장소의 동등성 테스트가 확인합니다.
                </p>
            </div>
            <div className='mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3'>
                {DELIVERY_LAYERS.map((layer) => (
                    <div key={layer.label} className='bg-background p-4'>
                        <p className='flex items-center gap-2 text-sm font-medium'>
                            <CheckCircle className='text-muted-foreground' /> {layer.label}
                        </p>
                        <dl className='mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5'>
                            {EDITIONS.map((edition, index) => (
                                <div key={edition.route} className='contents'>
                                    <dt className='text-muted-foreground'>{edition.name}</dt>
                                    <dd className='font-mono'>{layer.values[index]}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </div>
        </section>

        <section className='mt-16 flex flex-col gap-5 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between'>
            <div>
                <h2 className='text-xl font-semibold'>에디션마다 전체 룰을 볼 수 있습니다.</h2>
                <p className='mt-2 text-sm text-muted-foreground'>코어와 공통·프론트엔드·백엔드·보안·Git 규칙을 에디션별 문서로 제공합니다.</p>
            </div>
            <Button asChild variant='outline' size='lg'>
                <Link to='/claude-code/rules/core'>
                    Claude Code 코어 보기 <ArrowRight data-icon='inline-end' />
                </Link>
            </Button>
        </section>
    </div>
)
