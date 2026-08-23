import { z } from 'zod'

export const tagSchema = z.object({
  name: z.string().trim().min(1, '请输入标签名称').max(50),
  slug: z.string().trim().toLowerCase().min(1, '请输入 slug').max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和连字符'),
}).strict()
