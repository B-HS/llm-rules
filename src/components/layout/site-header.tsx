import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { GithubLogo } from '@phosphor-icons/react/dist/ssr'
import { GITHUB_URL } from '@/lib/docs'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'

export const SiteHeader: FC = () => (
    <header className='sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6'>
        <MobileNav />
        <Link to='/' className='flex items-center gap-2 font-mono text-sm font-semibold tracking-tight'>
            <span className='text-muted-foreground'>&lt;/&gt;</span>
            <span>LLM Rules</span>
        </Link>
        <span className='hidden text-xs text-muted-foreground sm:inline'>· 코딩 컨벤션</span>
        <div className='ml-auto flex items-center gap-1'>
            <a
                href={GITHUB_URL}
                target='_blank'
                rel='noreferrer'
                aria-label='GitHub'
                className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
                <GithubLogo className='size-4' />
            </a>
            <ThemeToggle />
        </div>
    </header>
)
