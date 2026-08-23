import { projectSchema } from '#shared/schemas/project'
export default defineEventHandler(async event => { const parsed=projectSchema.safeParse(await readBody(event)); if(!parsed.success)return apiError(event,400,'VALIDATION_ERROR','请检查项目内容',zodFields(parsed.error)); const project=await usePrisma().project.create({data:parsed.data}); setResponseStatus(event,201); return {data:project} })
