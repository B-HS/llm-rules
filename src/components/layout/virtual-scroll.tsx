import { useEffect, useRef, useState, type FC } from 'react'
import { useLocation } from 'react-router-dom'

export const VirtualScroll: FC = () => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const [scrollData, setScrollData] = useState({ thumbHeight: 0, thumbTop: 0, isScrollable: false })
    const [isVisible, setIsVisible] = useState(true)

    const handleScroll = () => {
        requestAnimationFrame(() => {
            const windowHeight = window.innerHeight
            const documentHeight = document.documentElement.scrollHeight
            const scrollableHeight = documentHeight - windowHeight
            const currentScrollPosition = window.scrollY

            const thumbHeight = (windowHeight / documentHeight) * 100
            const scrollPercentage = scrollableHeight > 0 ? (currentScrollPosition / scrollableHeight) * 100 : 0
            const thumbTop = (scrollPercentage * (100 - thumbHeight)) / 100

            setScrollData({
                thumbHeight: Math.max(thumbHeight, 10),
                thumbTop: Math.min(thumbTop, 100 - thumbHeight),
                isScrollable: thumbHeight < 100,
            })

            setIsVisible(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => setIsVisible(false), 1000)
        })
    }

    const location = useLocation()

    useEffect(() => {
        handleScroll()
        window.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', handleScroll)
        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleScroll)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    useEffect(() => {
        handleScroll()
        setIsVisible(true)
    }, [location.pathname])

    if (!scrollData.isScrollable) return null

    return (
        <div className='fixed top-0 right-0 z-[60] h-full w-[3px]'>
            <div
                className='absolute right-0 w-[3px] rounded-full bg-foreground/40 transition-opacity duration-200 will-change-transform'
                style={{ height: `${scrollData.thumbHeight}%`, top: `${scrollData.thumbTop}%`, opacity: isVisible ? 1 : 0 }}
            />
        </div>
    )
}
