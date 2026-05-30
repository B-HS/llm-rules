import { useEffect, useState, type FC } from 'react'
import { Moon, Sun } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'

export const ThemeToggle: FC = () => {
    const [isDark, setIsDark] = useState(false)
    const [mounted, setMounted] = useState(false)

    const handleToggle = () => {
        const next = !isDark
        setIsDark(next)
        const root = document.documentElement
        root.classList.toggle('dark', next)
        root.style.colorScheme = next ? 'dark' : 'light'
        localStorage.setItem('theme', next ? 'dark' : 'light')
    }

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
        setMounted(true)
    }, [])

    return (
        <Button variant='ghost' size='icon-sm' aria-label='테마 전환' onClick={handleToggle} suppressHydrationWarning>
            {mounted && (isDark ? <Moon weight='fill' /> : <Sun weight='fill' />)}
        </Button>
    )
}
