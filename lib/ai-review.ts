import { env } from 'cloudflare:workers';
import { dimensions } from './content';

type Task={id:string;title:string;genre:string;background:string;requirements:string;rubric:number[]};
type RawIssue={dimension:string;quote:string;severity:string;message:string;suggestion:string};
type RawReport={summary:string;scores:Array<{dimension:string;score:number;reason:string}>;issues:RawIssue[];revisionPlan:string[]};
type AIEnv=Cloudflare.Env&{SILICONFLOW_API_KEY?:string;SILICONFLOW_BASE_URL?:string;SILICONFLOW_MODEL?:string};

const schema={name:'official_document_review',strict:true,schema:{type:'object',additionalProperties:false,required:['summary','scores','issues','revisionPlan'],properties:{summary:{type:'string'},scores:{type:'array',minItems:5,maxItems:5,items:{type:'object',additionalProperties:false,required:['dimension','score','reason'],properties:{dimension:{type:'string',enum:dimensions},score:{type:'number'},reason:{type:'string'}}}},issues:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,required:['dimension','quote','severity','message','suggestion'],properties:{dimension:{type:'string',enum:dimensions},quote:{type:'string'},severity:{type:'string',enum:['low','medium','high']},message:{type:'string'},suggestion:{type:'string'}}}},revisionPlan:{type:'array',maxItems:6,items:{type:'string'}}}}};

export async function reviewWithAI(content:string,task:Task){
 const runtime=env as AIEnv,key=runtime.SILICONFLOW_API_KEY?.trim();if(!key)throw new Error('AI 服务密钥尚未配置。');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(`${(runtime.SILICONFLOW_BASE_URL||'https://api.siliconflow.cn/v1').replace(/\/$/,'')}/chat/completions`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:runtime.SILICONFLOW_MODEL||'deepseek-ai/DeepSeek-V4-Flash',temperature:0.1,max_tokens:2600,enable_thinking:false,response_format:{type:'json_schema',json_schema:schema},messages:[{role:'system',content:'你是严谨的中国党政机关公文写作教师。评分标准只来自写作要求与已给材料，只依据学生原文批改。不得虚构政策、数据、日期、地点、人员、原因或事实。任务未要求且材料未提供的姓名、成员职务、具体调研日期、社区名称、损失金额等，不得当作缺陷或扣分项，也不得建议补充。若题目明确说明某项信息缺失、未知或不应虚构，学生省略该信息是正确做法，必须保持省略。不得根据材料日期与成文日期的间隔推断时效问题。对可能原因只能要求核实后分析，不得列出具体推测原因作为建议。材料没有提供的信息，只能在任务明确要求时提示“材料未提供，如任务需要应核实后补充”，不得给出具体示例值。评分仅为教学建议，必须指出证据。quote必须逐字摘自原文，无法定位时返回空字符串。输出严格符合JSON Schema。'},{role:'user',content:`任务：${task.title}\n文种：${task.genre}\n情景材料：${task.background}\n写作要求：${task.requirements}\n五维满分：${dimensions.map((d,i)=>`${d}${task.rubric[i]}分`).join('，')}\n\n学生原文：\n${content}`}]})});
  const payload=await response.json() as any;if(!response.ok){const detail=String(payload?.message||payload?.error?.message||'');if(/balance is insufficient/i.test(detail))throw new Error('硅基流动账户余额不足，请充值后重试。');if(response.status===401)throw new Error('硅基流动 API Key 无效或已失效。');if(response.status===429)throw new Error('AI 服务请求过于频繁，请稍后重试。');throw new Error(detail||`AI 服务返回 ${response.status}`);}
  const text=payload?.choices?.[0]?.message?.content;if(typeof text!=='string')throw new Error('AI 服务没有返回批改内容。');let raw:RawReport;try{raw=JSON.parse(text);}catch{throw new Error('AI 返回格式无法解析，请重试。');}
  if(!Array.isArray(raw.scores)||raw.scores.length!==5||!Array.isArray(raw.issues))throw new Error('AI 返回内容不完整，请重试。');
  const scores=dimensions.map((d,i)=>{const item=raw.scores.find(x=>x.dimension===d);const score=Number(item?.score);return {dimension:d,score:Math.max(0,Math.min(task.rubric[i],Number.isFinite(score)?score:0)),maxScore:task.rubric[i],reason:String(item?.reason||'未提供评分依据').slice(0,500)}});
  const issues=raw.issues.slice(0,12).map((item,i)=>{const dimension=Math.max(0,dimensions.indexOf(item.dimension));const quote=typeof item.quote==='string'?item.quote.slice(0,160):'';const start=quote?content.indexOf(quote):-1;return {id:`ai-${i}`,dimension,quote:start>=0?quote:'',start,end:start>=0?start+quote.length:-1,severity:['low','medium','high'].includes(item.severity)?item.severity:'medium',message:String(item.message||'').slice(0,600),suggestion:String(item.suggestion||'').slice(0,800)};}).filter(x=>x.message&&x.suggestion);
  return {mode:'ai',provider:'SiliconFlow',model:runtime.SILICONFLOW_MODEL||'deepseek-ai/DeepSeek-V4-Flash',scores,issues,summary:String(raw.summary||'AI 语义批改完成。').slice(0,1000),revisionPlan:Array.isArray(raw.revisionPlan)?raw.revisionPlan.map(String).slice(0,6):[],created:new Date().toISOString(),notice:'AI 评分仅供学习参考，最终成绩以教师复核为准。'};
 }catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw new Error('AI 批改超时，请稍后重试。');throw error;}finally{clearTimeout(timer);}
}

export async function contentHash(content:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));return Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,'0')).join('');}
