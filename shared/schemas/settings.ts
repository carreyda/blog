import { z } from 'zod'
const url = z.union([z.literal(''), z.string().trim().url().max(2048), z.null()]).transform(v=>v||null)
export const settingsSchema=z.object({
  siteName:z.string().trim().min(1).max(100),siteDescription:z.string().trim().min(1).max(500),avatarUrl:url,logoUrl:url,
  personName:z.string().trim().min(1).max(100),bio:z.string().trim().min(1).max(500),currentStatus:z.string().trim().max(200),email:z.union([z.literal(''),z.string().trim().email().max(200)]),
  techStack:z.array(z.string().trim().min(1).max(50)).max(50).transform(v=>[...new Set(v)]),featuredProjectCount:z.number().int().min(0).max(20),aboutMarkdown:z.string().max(100000),
  social:z.object({github:url,twitter:url,linkedin:url,juejin:url,zhihu:url,xiaohongshu:url}).strict(),
  seo:z.object({title:z.string().trim().max(200),description:z.string().trim().max(500),ogImage:url}).strict(),
}).strict()
export type SiteSettingValue=z.infer<typeof settingsSchema>
