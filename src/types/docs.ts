export type DocHeading = {
    id: string
    text: string
    depth: number
}

export type Doc = {
    slug: string
    route: string
    section: 'convention' | 'codex' | 'claude-code'
    sectionLabel: string
    label: string
    title: string
    order: number
    html: string
    headings: DocHeading[]
}
