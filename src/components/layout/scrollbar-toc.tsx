import { useEffect, type FC } from 'react'
import { setScrollToc } from 'scrollbar-toc'

export const ScrollbarToc: FC = () => {
    useEffect(() => {
        const article = document.querySelector('article')
        if (!article) return

        const run = () =>
            setScrollToc(article, {
                scrollOffset: -72,
                rightOffset: 12,
                exceptLevel: [1],
                className: 'cursor-pointer',
            })

        let cleanup = run()
        const handleResize = () => {
            cleanup()
            cleanup = run()
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            cleanup()
        }
    }, [])

    return <aside className='toc-peer fixed top-0 right-0 z-10 hidden h-dvh w-[6dvw] lg:block' role='complementary' aria-label='목차' />
}
