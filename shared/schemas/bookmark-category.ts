import { z } from 'zod'

export const bookmarkCategorySchema = z.object({
  name: z.string().trim().min(1, '请输入分类名称').max(50, '分类名称不能超过 50 个字符'),
  parentId: z.number().int().positive('父分类 ID 无效').nullable(),
  sort: z.number().int().min(-9999).max(9999),
}).strict()
