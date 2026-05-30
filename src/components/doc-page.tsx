import { useEffect, type FC } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr'
import { getDocBySlug, getDocSiblings } from '@/lib/docs'
import { MarkdownContent } from './markdown-content'
import { ScrollbarToc } from './layout/scrollbar-toc'

type DocPageProps = {
    slug: string
}

export const DocPage: FC<DocPageProps> = ({ slug }) => {
    const location = useLocation()
    const doc = getDocBySlug(slug)
    const { prev, next } = getDocSiblings(slug)

    useEffect(() => {
        if (location.hash) {
            const element = document.getElementById(decodeURIComponent(location.hash.slice(1)))
            if (element) {
                element.scrollIntoView()
                return
            }
        }
        window.scrollTo(0, 0)
    }, [slug, location.hash])

    if (!doc) return null

    return (
        <div className='mx-auto w-full max-w-3xl px-5 py-9 sm:px-8 sm:py-10'>
            <ScrollbarToc key={slug} />
            <article className='w-full min-w-0'>
                <Head>
                    <title>{`${doc.title} · LLM Rules`}</title>
                </Head>
                <MarkdownContent html={doc.html} />
                <nav className='mt-14 grid gap-3 border-t border-border pt-6 sm:grid-cols-2'>
                    {prev ? (
                        <Link
                            to={prev.route}
                            className='group flex flex-col gap-1 rounded-xl border border-border p-4 transition-colors hover:bg-muted/60'>
                            <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                                <CaretLeft className='size-3' /> 이전
                            </span>
                            <span className='font-medium'>{prev.label}</span>
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next ? (
                        <Link
                            to={next.route}
                            className='group flex flex-col items-end gap-1 rounded-xl border border-border p-4 text-right transition-colors hover:bg-muted/60 sm:col-start-2'>
                            <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                                다음 <CaretRight className='size-3' />
                            </span>
                            <span className='font-medium'>{next.label}</span>
                        </Link>
                    ) : (
                        <span />
                    )}
                </nav>
            </article>
        </div>
    )
}
