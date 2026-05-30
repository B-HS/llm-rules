import { docs } from 'virtual:docs'
import type { Doc } from '@/types/docs'

export { docs }

export const GITHUB_URL = 'https://github.com/B-HS/llm-rules'

export const getDocBySlug = (slug: string): Doc | undefined => docs.find((doc) => doc.slug === slug)

export const getDocSiblings = (slug: string) => {
    const index = docs.findIndex((doc) => doc.slug === slug)
    return {
        prev: index > 0 ? docs[index - 1] : undefined,
        next: index >= 0 && index < docs.length - 1 ? docs[index + 1] : undefined,
    }
}
