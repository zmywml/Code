import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
const run=Date.now().toString(36),teacher=`test-teacher-${run}`,student=`test-student-${run}`,outsider=`test-other-${run}`;
const results=[];
async function req(user,body,status=200){const r=await fetch(base+'/api/lab',{method:body?'POST':'GET',headers:{'x-preview-user':user,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;}
async function test(name,f){try{await f();results.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message});throw e;}}
try{
let td,sd,task,sid;
await test('初始化保存班级与三个情景任务',async()=>{td=await req(teacher);assert.equal(td.tasks.length,3);assert.equal(td.classes[0].owner,teacher);});
await test('重复读取不重复初始化数据',async()=>{assert.equal((await req(teacher)).tasks.length,3);});
await test('不同账户隔离作业、草稿和班级',async()=>{sd=await req(student);assert.ok(sd.classes.every(c=>c.owner===student));assert.equal(sd.drafts.length,0);});
await test('未加入班级不可写入教师任务',async()=>{await req(student,{action:'draft',task:td.tasks[0].id,content:'未授权写入'},403);});
await test('无效班级码返回可读错误',async()=>{await req(student,{action:'join',code:'NO-SUCH-CLASS'},404);});
await test('学生加入班级并读取任务',async()=>{await req(student,{action:'join',code:td.classes[0].code});assert.equal((await req(student)).tasks.length,6);});
await test('重复加入保持唯一成员',async()=>{await req(student,{action:'join',code:td.classes[0].code});assert.equal((await req(teacher)).members.filter(m=>m.user===student).length,1);});
const taskInput={action:'task',classroom:td.classes[0].id,title:'测试任务：调查情况报告',genre:'报告',background:'测试情景：工作人员已完成调研，不得虚构损失数据。',requirements:'写明情况、问题与建议。',deadline:'',rubric:[20,20,20,20,20],level:'基础'};
await test('学生不能发布他人班级任务',async()=>{await req(student,taskInput,403);});
await test('拒绝不合计100分的评分权重',async()=>{await req(teacher,{...taskInput,rubric:[10,10,10,10,10]},400);});
await test('拒绝缺失任务标题',async()=>{await req(teacher,{...taskInput,title:' '},400);});
await test('拒绝过去的截止时间',async()=>{await req(teacher,{...taskInput,deadline:'2020-01-01T00:00:00Z'},400);});
await test('教师发布任务，学生可见',async()=>{task=(await req(teacher,taskInput)).id;assert.ok((await req(student)).tasks.some(t=>t.id===task));});
const text='关于开展调查的报告\n办公室：\n大家赶紧把材料弄好，尽快完成汇总。请批准新增经费。本次走访发现排水设施需要清理，请核对事实并提出相应措施。';
await test('草稿写入数据库并跨请求恢复',async()=>{await req(student,{action:'draft',task,content:text});assert.equal((await req(student)).drafts.find(d=>d.task===task).content,text);});
await test('其他学生不能读取草稿',async()=>{await req(outsider,{action:'join',code:td.classes[0].code});assert.equal((await req(outsider)).drafts.length,0);});
await test('空作业与过短作业禁止提交',async()=>{await req(student,{action:'submit',id:crypto.randomUUID(),task,content:'短文'},400);});
await test('超过两万字禁止提交',async()=>{await req(student,{action:'submit',id:crypto.randomUUID(),task,content:'字'.repeat(20001)},400);});
await test('规则识别文种混用和口语化，定位准确',async()=>{const r=await req(student,{action:'check',task,content:text});assert.equal(r.scores,null);assert.ok(r.issues.some(i=>i.dimension===1));assert.ok(r.issues.some(i=>i.dimension===3));r.issues.filter(i=>i.quote).forEach(i=>assert.equal(text.slice(i.start,i.end),i.quote));});
await test('提交作业保存原文及检查报告',async()=>{sid=crypto.randomUUID();await req(student,{action:'submit',id:sid,task,content:text});const s=(await req(student)).submissions.find(s=>s.id===sid);assert.equal(s.content,text);assert.equal(s.status,'submitted');assert.equal(s.report.mode,'rules');});
await test('相同提交编号重试不重复创建版本',async()=>{await req(student,{action:'submit',id:sid,task,content:text});assert.equal((await req(student)).submissions.filter(s=>s.id===sid).length,1);});
await test('同编号不同内容不误报提交成功',async()=>{await req(student,{action:'submit',id:sid,task,content:text+'不同版本'},409);});
await test('同班其他学生不能读取提交',async()=>{assert.ok(!(await req(outsider)).submissions.some(s=>s.id===sid));});
await test('班级教师可以读取本班作业',async()=>{assert.ok((await req(teacher)).submissions.some(s=>s.id===sid));});
await test('学生不能越权评分',async()=>{await req(student,{action:'review',id:sid,status:'reviewed',scores:[20,20,20,20,20],comment:'越权操作'},403);});
await test('超过维度满分的评分被拒绝',async()=>{await req(teacher,{action:'review',id:sid,status:'reviewed',scores:[21,20,20,20,20],comment:'分数越界'},400);});
await test('退回必须说明修改原因',async()=>{await req(teacher,{action:'review',id:sid,status:'returned',comment:''},400);});
await test('教师退回，学生看见修改要求',async()=>{await req(teacher,{action:'review',id:sid,status:'returned',comment:'请删除夹带请示事项并核对日期。'});assert.equal((await req(student)).submissions.find(s=>s.id===sid).status,'returned');});
await test('修改重交保留旧原稿与新版本',async()=>{const n=crypto.randomUUID();await req(student,{action:'submit',id:n,task,content:text+'\n2026年9月24日'});const subs=(await req(student)).submissions.filter(s=>s.task===task);assert.equal(subs.length,2);assert.equal(subs.find(s=>s.id===sid).content,text);sid=n;});
await test('教师五维复核分数和评语保存',async()=>{await req(teacher,{action:'review',id:sid,status:'reviewed',scores:[18,17,16,15,14],comment:'结构基本完整，需要进一步充实依据。'});const s=(await req(student)).submissions.find(s=>s.id===sid);assert.deepEqual(s.scores,[18,17,16,15,14]);assert.equal(s.status,'reviewed');});
await test('客观题正确答案自动判分',async()=>{assert.equal((await req(student,{action:'answer',question:'q1',answer:'错误'})).correct,true);});
await test('客观题错误答案返回解释并记录',async()=>{const r=await req(student,{action:'answer',question:'q1',answer:'正确'});assert.equal(r.correct,false);assert.ok(r.explain);assert.equal((await req(student)).attempts.length,2);});
await test('未知题目拒绝判分',async()=>{await req(student,{action:'answer',question:'unknown',answer:'答案'},404);});
await test('教师新增素材在班级共享',async()=>{await req(teacher,{action:'resource',classroom:td.classes[0].id,title:'测试病文',genre:'报告',category:'病文',industry:'通用',body:'错误示例：请批准。错误分析：报告夹带请示。正确示范：另行请示。'});assert.ok((await req(student)).resources.some(r=>r.title==='测试病文'));});
await test('学生不能修改他人班级素材',async()=>{await req(student,{action:'resource',classroom:td.classes[0].id,title:'越权',genre:'通知',category:'范文',industry:'通用',body:'内容'},403);});
await test('跨来源写请求被拒绝',async()=>{const r=await fetch(base+'/api/lab',{method:'POST',headers:{'x-preview-user':student,'content-type':'application/json',origin:'https://other.example'},body:JSON.stringify({action:'join',code:td.classes[0].code})});assert.equal(r.status,403);});
await test('无效JSON得到400',async()=>{const r=await fetch(base+'/api/lab',{method:'POST',headers:{'x-preview-user':student},body:'invalid json'});assert.equal(r.status,400);});
await test('JSON空值被拒绝且服务不崩溃',async()=>{const r=await fetch(base+'/api/lab',{method:'POST',headers:{'x-preview-user':student},body:'null'});assert.equal(r.status,400);});
}finally{writeFileSync('tests/api-results.json',JSON.stringify({time:new Date().toISOString(),results},null,2));}
