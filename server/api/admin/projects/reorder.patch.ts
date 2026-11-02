import { z } from 'zod'

const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
}).strict()

export default defineEventHandler(async (event) => {
  const parsed = reorderSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '排序参数无效', zodFields(parsed.error))

  const ids = [...new Set(parsed.data.ids)]
  const prisma = usePrisma()
  const existing = await prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true } })
  if (existing.length !== ids.length) {
    return apiError(event, 404, 'NOT_FOUND', '部分项目已不存在，请刷新后重试')
  }

  // New order becomes the sort value, so drag order and the numeric field agree.
  await prisma.$transaction(
    ids.map((id, index) => prisma.project.update({ where: { id }, data: { sort: index } })),
  )

  return {
    data: await prisma.project.findMany({ orderBy: [{ sort: 'asc' }, { id: 'desc' }] }),
  }
})
