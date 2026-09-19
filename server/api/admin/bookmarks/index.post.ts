import { Prisma } from '@prisma/client'
import { bookmarkSchema } from '#shared/schemas/bookmark'

export default defineEventHandler(async (event) => {
  const parsed = bookmarkSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    return apiError(event, 400, 'VALIDATION_ERROR', '请检查收藏内容', zodFields(parsed.error))
  }

  try {
    const bookmark = await usePrisma().$transaction(async (tx) => {
      const category = await tx.bookmarkCategory.findUnique({ where: { id: parsed.data.categoryId } })
      if (!category) throw createError({ statusCode: 404, statusMessage: 'BOOKMARK_CATEGORY_NOT_FOUND' })
      if (category.parentId === null) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_REQUIRES_CHILD_CATEGORY' })
      return tx.bookmark.create({ data: parsed.data })
    })

    setResponseStatus(event, 201)
    return { data: bookmark }
  } catch (error) {
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_NOT_FOUND') {
      return apiError(event, 404, 'BOOKMARK_CATEGORY_NOT_FOUND', '收藏分类不存在')
    }
    if (isError(error) && error.statusMessage === 'BOOKMARK_REQUIRES_CHILD_CATEGORY') {
      return apiError(event, 409, 'BOOKMARK_REQUIRES_CHILD_CATEGORY', '收藏必须归属二级分类')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(event, 409, 'BOOKMARK_URL_CONFLICT', '该网站 URL 已经收藏')
    }
    throw error
  }
})
