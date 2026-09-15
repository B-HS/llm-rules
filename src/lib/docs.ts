import { docs } from 'virtual:docs'
import type { Doc } from '@/types/docs'

export { docs }

export const GITHUB_URL = 'https://github.com/B-HS/llm-rules'

export const getDocBySlug = (slug: string): Doc | undefined => docs.find((doc) => doc.slug === slug)

export const getDocSiblings = (slug: string) => {
    const current = docs.find((doc) => doc.slug === slug)
    if (!current) return { prev: undefined, next: undefined }
    const sectionDocs = docs.filter((doc) => doc.section === current.section)
    const index = sectionDocs.findIndex((doc) => doc.slug === slug)
    return {
        prev: index > 0 ? sectionDocs[index - 1] : undefined,
        next: index >= 0 && index < sectionDocs.length - 1 ? sectionDocs[index + 1] : undefined,
    }
}
