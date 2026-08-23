import { getSettings } from '../utils/settings'
export default defineEventHandler(async()=>{const settings=await getSettings();const rendered=await renderMarkdown(settings.aboutMarkdown);return{data:{contentHtml:rendered.html,toc:rendered.toc,personName:settings.personName,bio:settings.bio,social:settings.social,email:settings.email}}})
