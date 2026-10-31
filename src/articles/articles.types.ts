export interface ArticleFrontmatter {
  title?: string
  description?: string
  date?: string | Date
  updated?: string | Date
  tags?: string[] | string
  cover?: string
  image?: string
  slug?: string
  draft?: boolean
  author?: string
}

export interface ArticleTocItem {
  id: string
  text: string
  level: number
}

export interface Article {
  slug: string
  path: string
  title: string
  description: string
  date: string
  updated?: string
  tags: string[]
  cover?: string
  author?: string
  readingMinutes: number
  content: string
  rawPath: string
}
