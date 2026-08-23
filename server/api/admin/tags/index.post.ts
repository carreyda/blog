import { Prisma } from '@prisma/client'
import { tagSchema } from '#shared/schemas/tag'

export default defineEventHandler(async (event) => {
  const parsed = tagSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '请检查标签内容', zodFields(parsed.error))
  try {
    const tag = await usePrisma().tag.create({ data: parsed.data })
    setResponseStatus(event, 201)
    return { data: { ...tag, postCount: 0 } }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(event, 409, 'TAG_CONFLICT', '标签名称或 slug 已存在')
    }
    throw error
  }
})
