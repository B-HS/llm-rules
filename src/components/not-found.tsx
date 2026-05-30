import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const NotFound: FC = () => (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center'>
        <p className='font-mono text-5xl font-bold text-muted-foreground'>404</p>
        <p className='text-muted-foreground'>요청한 문서를 찾을 수 없습니다.</p>
        <Button asChild variant='outline' size='lg'>
            <Link to='/'>개요로 돌아가기</Link>
        </Button>
    </div>
)
