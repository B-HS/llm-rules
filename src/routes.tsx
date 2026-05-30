import type { RouteRecord } from 'vite-react-ssg'
import { docs } from '@/lib/docs'
import { DocLayout } from '@/components/layout/doc-layout'
import { DocPage } from '@/components/doc-page'
import { NotFound } from '@/components/not-found'

export const routes: RouteRecord[] = [
    {
        path: '/',
        element: <DocLayout />,
        entry: 'src/components/layout/doc-layout.tsx',
        children: [
            ...docs.map((doc): RouteRecord =>
                doc.slug === 'index'
                    ? { index: true, element: <DocPage slug='index' /> }
                    : { path: doc.slug, element: <DocPage slug={doc.slug} /> },
            ),
            { path: '*', element: <NotFound /> },
        ],
    },
]
