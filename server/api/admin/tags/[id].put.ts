import { Prisma } from '@prisma/client'
import { tagSchema } from '#shared/schemas/tag'

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '标签 ID 无效')
  const parsed = tagSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '请检查标签内容', zodFields(parsed.error))
  try {
    const tag = await usePrisma().tag.update({ where: { id }, data: parsed.data })
    return { data: tag }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return apiError(event, 404, 'TAG_NOT_FOUND', '标签不存在')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(event, 409, 'TAG_CONFLICT', '标签名称或 slug 已存在')
    }
    throw error
  }
})
