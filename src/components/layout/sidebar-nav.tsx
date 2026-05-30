import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { docs } from '@/lib/docs'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
    onNavigate?: () => void
}

export const SidebarNav: FC<SidebarNavProps> = ({ onNavigate }) => (
    <nav className='flex flex-col gap-0.5 p-4'>
        <p className='px-3 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>컨벤션</p>
        {docs.map((doc) => (
            <NavLink
                key={doc.slug}
                to={doc.route}
                end={doc.route === '/'}
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
    </nav>
)
