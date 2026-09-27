import { env } from 'cloudflare:workers';

type Task={title:string;genre:string;background:string;requirements:string};
type Message={role:'user'|'assistant';content:string};
type AIEnv=Cloudflare.Env&{SILICONFLOW_API_KEY?:string;SILICONFLOW_BASE_URL?:string;SILICONFLOW_MODEL?:string};

async function requestJSON<T>(schema:object,messages:Array<{role:string;content:string}>,max_tokens=1200):Promise<T>{
 const runtime=env as AIEnv,key=runtime.SILICONFLOW_API_KEY?.trim();if(!key)throw new Error('AI 服务密钥尚未配置。');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{const response=await fetch(`${(runtime.SILICONFLOW_BASE_URL||'https://api.siliconflow.cn/v1').replace(/\/$/,'')}/chat/completions`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:runtime.SILICONFLOW_MODEL||'deepseek-ai/DeepSeek-V4-Flash',temperature:.15,max_tokens,enable_thinking:false,response_format:{type:'json_schema',json_schema:schema},messages})});
  const payload=await response.json() as any;if(!response.ok){const detail=String(payload?.message||payload?.error?.message||'');if(/balance is insufficient/i.test(detail))throw new Error('硅基流动账户余额不足，请充值后重试。');if(response.status===401)throw new Error('硅基流动 API Key 无效或已失效。');if(response.status===429)throw new Error('AI 服务请求过于频繁，请稍后重试。');throw new Error(detail||`AI 服务返回 ${response.status}`);}const text=payload?.choices?.[0]?.message?.content;if(typeof text!=='string')throw new Error('AI 服务没有返回内容。');try{return JSON.parse(text) as T;}catch{throw new Error('AI 返回格式无法解析，请重试。');}
 }catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw new Error('AI 请求超时，请稍后重试。');throw error;}finally{clearTimeout(timer);}
}

const guideSchema={name:'writing_guide',strict:true,schema:{type:'object',additionalProperties:false,required:['reply','suggestedActions'],properties:{reply:{type:'string'},suggestedActions:{type:'array',maxItems:3,items:{type:'string'}}}}};
export async function guideWithAI(message:string,content:string,task:Task,history:Message[]){
 const context=`任务：${task.title}\n文种：${task.genre}\n情景材料：${task.background}\n写作要求：${task.requirements}\n学生当前正文：\n${content||'尚未开始写作'}`;
 const system='你是中国党政机关公文写作教学助手。你的任务是通过提问、分析和分步提示帮助学生自己完成写作，不得代写可直接提交的完整文章。一次聚焦一个关键问题，回复简洁具体，通常不超过300字。只依据题目材料、写作要求和学生正文；不得虚构政策、数据、日期、地点、人员、原因或事实。材料未提供的信息要明确标记为待核实。发现学生请求整篇代写时，应拒绝代写并改为给出提纲或启发问题。可提供最多3个简短的下一步选项。输出严格符合JSON Schema。';
 const result=await requestJSON<{reply:string;suggestedActions:string[]}>(guideSchema,[{role:'system',content:system},{role:'user',content:context},...history.map(x=>({role:x.role,content:x.content})),{role:'user',content:message}],900);
 return {reply:String(result.reply||'').slice(0,1600),suggestedActions:Array.isArray(result.suggestedActions)?result.suggestedActions.map(String).filter(Boolean).slice(0,3):[]};
}

const rewriteSchema={name:'writing_rewrite',strict:true,schema:{type:'object',additionalProperties:false,required:['revisedText','changes','warnings'],properties:{revisedText:{type:'string'},changes:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['type','original','reason'],properties:{type:{type:'string'},original:{type:'string'},reason:{type:'string'}}}},warnings:{type:'array',maxItems:5,items:{type:'string'}}}}};
const modes:Record<string,string>={formal:'改为正式、准确的公文表达',concise:'精简冗余内容并保留全部事实',logic:'改善句间逻辑和衔接',proofread:'只修改错别字、标点和病句'};
const protectedTokens=(text:string)=>new Set(text.match(/(?:\d{1,4}年|\d{1,2}月|\d{1,2}日|\d+(?:\.\d+)?(?:万|亿|元|人|户|个|项|次|%|％)?)/g)||[]);
export async function rewriteWithAI(original:string,mode:string,task:Task){
 const goal=modes[mode];if(!goal)throw new Error('润色方式无效。');
 const system='你是严谨的公文文字编辑。只润色用户提供的选中文字，必须保持原意、事实、数字、日期、金额、地点、机构、人名、责任主体和行文身份不变。不得新增材料外事实、政策依据、原因、评价或具体示例值；不得扩大承诺或改变语气强度。若无法在不改变事实的情况下完成，应保持原文并在warnings说明。输出严格符合JSON Schema。';
 const prompt=`任务：${task.title}\n文种：${task.genre}\n情景材料：${task.background}\n写作要求：${task.requirements}\n润色目标：${goal}\n\n选中文字：\n${original}`;
 const result=await requestJSON<{revisedText:string;changes:Array<{type:string;original:string;reason:string}>;warnings:string[]}>(rewriteSchema,[{role:'system',content:system},{role:'user',content:prompt}],1400);
 const revised=String(result.revisedText||'').trim();if(!revised)throw new Error('AI 没有返回润色结果。');
 const before=protectedTokens(original),after=protectedTokens(revised),changed=[...new Set([...before].filter(x=>!after.has(x)).concat([...after].filter(x=>!before.has(x))))];if(changed.length)throw new Error(`润色结果改变了原文中的数字或日期（${changed.slice(0,3).join('、')}），已阻止采纳。`);
 return {revisedText:revised.slice(0,6000),changes:Array.isArray(result.changes)?result.changes.slice(0,8):[],warnings:Array.isArray(result.warnings)?result.warnings.map(String).slice(0,5):[]};
}
