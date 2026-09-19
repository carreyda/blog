import { z } from 'zod'

const httpUrl = (label: string) => z.string()
  .trim()
  .min(1, `请输入${label}`)
  .max(2048, `${label}不能超过 2048 个字符`)
  .url(`${label}格式不正确`)
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  }, `${label}只支持 HTTP 或 HTTPS`)

const nullableIconUrl = z.union([
  z.literal(''),
  z.null(),
  httpUrl('图标 URL'),
]).transform(value => value || null)

export const bookmarkSchema = z.object({
  categoryId: z.number().int().positive('请选择二级分类'),
  name: z.string().trim().min(1, '请输入收藏名称').max(100, '收藏名称不能超过 100 个字符'),
  description: z.string().trim().min(1, '请输入收藏描述').max(500, '收藏描述不能超过 500 个字符'),
  iconUrl: nullableIconUrl,
  url: httpUrl('网站 URL'),
  sort: z.number().int().min(-9999).max(9999),
  isVisible: z.boolean(),
}).strict()
