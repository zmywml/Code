export type Issue={id:string;dimension:number;quote:string;message:string;suggestion:string;replacement?:string;start:number;end:number};
export function checkWriting(content:string,genre:string){
 const issues:Issue[]=[];
 const add=(dimension:number,quote:string,message:string,suggestion:string,replacement?:string,start=content.indexOf(quote))=>issues.push({id:`issue-${issues.length}`,dimension,quote,message,suggestion,replacement,start,end:start>=0?start+quote.length:-1});
 const lines=content.trim().split('\n').filter(Boolean);
 if(!lines[0]?.includes(genre.replace('（令）','')))add(0,lines[0]||'','标题中未识别到任务文种，请人工核对。','检查标题是否准确交代事项和文种。');
 if(!/\d{4}年\d{1,2}月\d{1,2}日/.test(content))add(0,'','未识别到完整的成文日期。','核实实际成文日期后填写；事务文书可由教师按任务要求判断。',undefined,-1);
 if(['通知','请示','函','报告'].includes(genre)&&!/[：:]/.test(content))add(0,'','未识别到主送对象后的冒号。','核对任务是否要求主送机关，并检查相应格式。',undefined,-1);
 if(genre==='报告'||genre==='调研报告')for(const m of content.matchAll(/请批准|请批示|恳请批准/g))add(1,m[0],'报告中出现请求批准的表达，可能混入请示事项。','核对真实行文目的；需请示的事项另行组织。',undefined,m.index);
 const expressions:Record<string,string>={'大家':'各有关单位','赶紧':'及时','弄好':'完成','搞好':'做好'};
 for(const [old,replacement] of Object.entries(expressions)) for(const m of content.matchAll(new RegExp(old,'g')))add(3,old,'该表达可能偏口语化，请结合上下文判断。',`可考虑“${replacement}”；涉及对象、期限时仍需补充具体事实。`,replacement,m.index);
 for(const m of content.matchAll(/尽快/g))add(3,m[0],'时间要求可能不够明确。','若材料提供了截止日期，请改为具体期限；不要编造日期。',undefined,m.index);
 for(const m of content.matchAll(/【[^】]*(?:待|核实)[^】]*】|\[待[^\]]*\]/g))add(4,m[0],'仍有待补充或待核实内容。','在提交正式稿前补充依据，或明确标注信息缺失。',undefined,m.index);
 if(content.replace(/\s/g,'').length<100)add(2,'','当前文本较短，可能尚未展开论述。','对照任务逐项检查事实、分析和结论。这是长度提示，不代表逻辑评分。',undefined,-1);
 return {mode:'rules',scores:null,issues,summary:issues.length?`规则检查发现 ${issues.length} 条待核对提示，请结合任务逐项修改。`:'未发现已覆盖规则的问题，仍需教师检查内容、逻辑与事实。',pending:['语义质量与逐句深度分析','政策表述及引用真实性','字体、页边距、印章等完整版式核验'],created:new Date().toISOString()};
}
export function validateRubric(value:unknown):number[]{if(!Array.isArray(value)||value.length!==5||value.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<=0)||Math.abs(value.reduce((a,b)=>a+b,0)-100)>0.001)throw new Error('五项评分权重须大于 0，且合计为 100。');return value;}
export function validateScores(value:unknown,rubric:number[]):number[]{if(!Array.isArray(value)||value.length!==5||value.some((v,i)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>rubric[i]))throw new Error('请完整填写五项得分，且不得超过各项满分。');return value;}
