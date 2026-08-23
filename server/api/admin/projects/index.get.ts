export default defineEventHandler(async () => ({ data: await usePrisma().project.findMany({ orderBy: [{ sort: 'asc' }, { id: 'desc' }] }) }))
