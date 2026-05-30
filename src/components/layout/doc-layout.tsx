import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { SiteHeader } from './site-header'
import { SidebarNav } from './sidebar-nav'
import { VirtualScroll } from './virtual-scroll'

export const DocLayout: FC = () => (
    <div className='min-h-dvh'>
        <VirtualScroll />
        <SiteHeader />
        <div className='mx-auto flex w-full max-w-screen-2xl'>
            <aside className='sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border/60 lg:block'>
                <SidebarNav />
            </aside>
            <main className='min-w-0 flex-1'>
                <Outlet />
            </main>
        </div>
    </div>
)
