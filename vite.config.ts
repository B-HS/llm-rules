import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { docsPlugin } from './plugins/vite-plugin-docs'

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

const base = process.env.BASE_PATH ?? '/llm-rules/'

const config: UserConfig & { ssgOptions?: Record<string, unknown> } = {
    base,
    plugins: [react(), tailwindcss(), docsPlugin()],
    resolve: {
        alias: {
            '@': resolvePath('./src'),
        },
    },
    ssgOptions: {
        entry: 'src/main.tsx',
        script: 'async',
        includedRoutes: (paths: string[]) => paths.filter((path) => !path.includes('*') && !path.includes(':')),
    },
}

export default config
