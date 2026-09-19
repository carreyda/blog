import { Prisma } from '@prisma/client'
import { bookmarkCategorySchema } from '#shared/schemas/bookmark-category'

export default defineEventHandler(async (event) => {
  const parsed = bookmarkCategorySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    return apiError(event, 400, 'VALIDATION_ERROR', '请检查分类内容', zodFields(parsed.error))
  }

  try {
    const category = await usePrisma().$transaction(async (tx) => {
      if (parsed.data.parentId !== null) {
        const parent = await tx.bookmarkCategory.findUnique({ where: { id: parsed.data.parentId } })
        if (!parent) throw createError({ statusCode: 404, statusMessage: 'BOOKMARK_CATEGORY_NOT_FOUND' })
        if (parent.parentId !== null) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_CATEGORY_DEPTH_EXCEEDED' })
      }

      const duplicate = await tx.bookmarkCategory.findFirst({
        where: { parentId: parsed.data.parentId, name: parsed.data.name },
        select: { id: true },
      })
      if (duplicate) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_CATEGORY_CONFLICT' })

      return tx.bookmarkCategory.create({ data: parsed.data })
    })

    setResponseStatus(event, 201)
    return { data: category }
  } catch (error) {
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_NOT_FOUND') {
      return apiError(event, 404, 'BOOKMARK_CATEGORY_NOT_FOUND', '父分类不存在')
    }
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_DEPTH_EXCEEDED') {
      return apiError(event, 409, 'BOOKMARK_CATEGORY_DEPTH_EXCEEDED', '分类最多只能创建两级')
    }
    if (
      (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_CONFLICT')
      || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    ) {
      return apiError(event, 409, 'BOOKMARK_CATEGORY_CONFLICT', '同级分类名称已存在')
    }
    throw error
  }
})
