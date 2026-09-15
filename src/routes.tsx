import type { RouteRecord } from 'vite-react-ssg'
import { docs } from '@/lib/docs'
import { DocLayout } from '@/components/layout/doc-layout'
import { DocPage } from '@/components/doc-page'
import { NotFound } from '@/components/not-found'
import { HomePage } from '@/pages/home-page'

export const routes: RouteRecord[] = [
    {
        path: '/',
        element: <DocLayout />,
        entry: 'src/components/layout/doc-layout.tsx',
        children: [
            { index: true, element: <HomePage /> },
            ...docs.map((doc): RouteRecord => ({ path: doc.route.slice(1), element: <DocPage slug={doc.slug} /> })),
            { path: '*', element: <NotFound /> },
        ],
    },
]
