import type { Prisma } from '@prisma/client'
import { settingsSchema } from '#shared/schemas/settings'
export default defineEventHandler(async event=>{const parsed=settingsSchema.safeParse(await readBody(event));if(!parsed.success)return apiError(event,400,'VALIDATION_ERROR','请检查网站设置',zodFields(parsed.error));await usePrisma().siteSetting.upsert({where:{id:1},create:{id:1,value:parsed.data as Prisma.InputJsonValue},update:{value:parsed.data as Prisma.InputJsonValue}});return{data:parsed.data}})
