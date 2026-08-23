import { z } from 'zod'
export const viewSchema=z.object({postId:z.number().int().positive().optional()}).strict()
