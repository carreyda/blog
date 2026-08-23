import { getSettings } from '../utils/settings'
export default defineEventHandler(async()=>({data:await getSettings()}))
