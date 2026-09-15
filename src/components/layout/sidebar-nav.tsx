import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { docs } from '@/lib/docs'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
    onNavigate?: () => void
}

export const SidebarNav: FC<SidebarNavProps> = ({ onNavigate }) => (
    <nav className='flex flex-col gap-0.5 p-4' aria-label='문서 탐색'>
        <div className='mb-4 flex flex-col gap-0.5'>
            <p className='px-3 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>시작하기</p>
            <NavLink
                to='/'
                end
                onClick={onNavigate}
                className={({ isActive }) =>
                    cn(
                        'rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )
                }>
                홈
            </NavLink>
        </div>
        {[...new Set(docs.map((doc) => doc.section))].map((section) => (
            <div key={section} className='mb-4 flex flex-col gap-0.5 last:mb-0'>
                <p className='px-3 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                    {docs.find((doc) => doc.section === section)?.sectionLabel}
                </p>
                {docs
                    .filter((doc) => doc.section === section)
                    .map((doc) => (
                        <NavLink
                            key={doc.slug}
                            to={doc.route}
                            end={doc.route === `/${section}`}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                cn(
                                    'rounded-lg px-3 py-2 text-sm transition-colors',
                                    isActive
                                        ? 'bg-muted font-medium text-foreground'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                )
                            }>
                            {doc.label}
                        </NavLink>
                    ))}
            </div>
        ))}
    </nav>
)
