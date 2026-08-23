import { z } from 'zod'
const nullableUrl = z.union([z.literal(''), z.string().trim().url().max(2048), z.null()]).transform(value => value || null)
export const projectSchema = z.object({
  name: z.string().trim().min(1).max(100), summary: z.string().trim().min(1).max(500),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'SOLD', 'BUILDING']), websiteUrl: nullableUrl, githubUrl: nullableUrl,
  techStack: z.array(z.string().trim().min(1).max(50)).max(30).transform(values => [...new Set(values)]),
  sort: z.number().int().min(-9999).max(9999),
}).strict().refine(value => value.websiteUrl || value.githubUrl, { message: '网站地址和 GitHub 地址至少填写一个', path: ['websiteUrl'] })
