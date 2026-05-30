import { useState, type FC } from 'react'
import { Dialog } from 'radix-ui'
import { List, X } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { SidebarNav } from './sidebar-nav'

export const MobileNav: FC = () => {
    const [open, setOpen] = useState(false)

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button variant='ghost' size='icon-sm' aria-label='메뉴 열기' className='lg:hidden'>
                    <List />
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in lg:hidden' />
                <Dialog.Content className='fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col border-r border-border bg-background shadow-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden'>
                    <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-4'>
                        <Dialog.Title className='font-mono text-sm font-semibold'>LLM Rules</Dialog.Title>
                        <Dialog.Close asChild>
                            <Button variant='ghost' size='icon-sm' aria-label='닫기'>
                                <X />
                            </Button>
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className='sr-only'>문서 내비게이션</Dialog.Description>
                    <div className='min-h-0 flex-1 overflow-y-auto'>
                        <SidebarNav onNavigate={() => setOpen(false)} />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
