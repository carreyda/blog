import { Prisma } from '@prisma/client'
import { bookmarkCategorySchema } from '#shared/schemas/bookmark-category'

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '分类 ID 无效')

  const parsed = bookmarkCategorySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    return apiError(event, 400, 'VALIDATION_ERROR', '请检查分类内容', zodFields(parsed.error))
  }
  if (parsed.data.parentId === id) {
    return apiError(event, 409, 'BOOKMARK_CATEGORY_INVALID_PARENT', '分类不能设为自己的父分类')
  }

  try {
    const category = await usePrisma().$transaction(async (tx) => {
      const current = await tx.bookmarkCategory.findUnique({ where: { id }, select: { id: true } })
      if (!current) throw createError({ statusCode: 404, statusMessage: 'BOOKMARK_CATEGORY_NOT_FOUND' })

      if (parsed.data.parentId !== null) {
        const allCategories = await tx.bookmarkCategory.findMany({ select: { id: true, parentId: true } })
        const parents = new Map(allCategories.map(item => [item.id, item.parentId]))
        if (!parents.has(parsed.data.parentId)) {
          throw createError({ statusCode: 404, statusMessage: 'BOOKMARK_CATEGORY_PARENT_NOT_FOUND' })
        }

        let cursor: number | null = parsed.data.parentId
        const visited = new Set<number>()
        while (cursor !== null) {
          if (cursor === id) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_CATEGORY_INVALID_PARENT' })
          if (visited.has(cursor)) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_CATEGORY_INVALID_PARENT' })
          visited.add(cursor)
          cursor = parents.get(cursor) ?? null
        }
      }

      const duplicate = await tx.bookmarkCategory.findFirst({
        where: { id: { not: id }, parentId: parsed.data.parentId, name: parsed.data.name },
        select: { id: true },
      })
      if (duplicate) throw createError({ statusCode: 409, statusMessage: 'BOOKMARK_CATEGORY_CONFLICT' })

      return tx.bookmarkCategory.update({ where: { id }, data: parsed.data })
    })

    return { data: category }
  } catch (error) {
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_NOT_FOUND') {
      return apiError(event, 404, 'BOOKMARK_CATEGORY_NOT_FOUND', '分类不存在')
    }
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_PARENT_NOT_FOUND') {
      return apiError(event, 404, 'BOOKMARK_CATEGORY_NOT_FOUND', '父分类不存在')
    }
    if (isError(error) && error.statusMessage === 'BOOKMARK_CATEGORY_INVALID_PARENT') {
      return apiError(event, 409, 'BOOKMARK_CATEGORY_INVALID_PARENT', '不能把分类移动到它自己的子分类下')
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
