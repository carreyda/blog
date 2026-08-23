import { z } from 'zod'

const optionalUrl = z.union([z.literal(''), z.string().trim().url().max(2048)]).transform(value => value || null)
const optionalText = (max: number) => z.union([z.literal(''), z.string().trim().max(max)]).transform(value => value || null)

export const postContentSchema = z.object({
  title: z.string().trim().min(1, '请输入标题').max(200),
  summary: z.string().trim().min(1, '请输入摘要').max(500),
  contentMarkdown: z.string().trim().min(1, '请输入正文'),
  coverImageUrl: optionalUrl,
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  tagIds: z.array(z.number().int().positive()).max(30).transform(ids => [...new Set(ids)]),
}).strict()

export const createPostSchema = postContentSchema
export const updatePostSchema = postContentSchema.extend({
  status: z.enum(['PUBLISHED', 'ARCHIVED']),
})

export type PostFormInput = z.input<typeof postContentSchema>
