import type { FC, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

type MarkdownContentProps = {
    html: string
}

export const MarkdownContent: FC<MarkdownContentProps> = ({ html }) => {
    const navigate = useNavigate()
    const base = import.meta.env.BASE_URL

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        const anchor = (event.target as HTMLElement).closest('a')
        if (!anchor) return
        const href = anchor.getAttribute('href')
        if (!href || anchor.hasAttribute('target')) return
        if (/^(https?:|mailto:|#)/.test(href)) return
        if (href.startsWith(base)) {
            event.preventDefault()
            navigate('/' + href.slice(base.length))
        }
    }

    return (
        <div
            className='prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-pre:bg-muted/60'
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}
