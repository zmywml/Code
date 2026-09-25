import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:8787',teacherCode=process.env.TEST_TEACHER_CODE;
assert.ok(teacherCode,'TEST_TEACHER_CODE is required');
async function call(body,cookie,status=200){const r=await fetch(base+'/api/lab',{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
assert.equal((await call(null,null,401)).data.error,'请先登录学习空间。');
await call({action:'login',role:'teacher',name:'测试教师',accessCode:'wrong'},null,403);
const teacherLogin=await call({action:'login',role:'teacher',name:'测试教师',accessCode:teacherCode});
assert.ok(teacherLogin.cookie?.startsWith('wenxu_session='));
const teacher=(await call(null,teacherLogin.cookie)).data;assert.equal(teacher.role,'teacher');assert.ok(teacher.classes[0]?.code);
await call({action:'login',role:'student',name:'测试学生',studentNo:'20260001',classCode:'invalid'},null,404);
const studentLogin=await call({action:'login',role:'student',name:'测试学生',studentNo:'20260001',classCode:teacher.classes[0].code});
const student=(await call(null,studentLogin.cookie)).data;assert.equal(student.role,'student');assert.equal(student.tasks.length,teacher.tasks.length);assert.equal(student.classes.length,1);
const relogin=await call({action:'login',role:'student',name:'学生新姓名',studentNo:'20260001',classCode:teacher.classes[0].code});
const sameStudent=(await call(null,relogin.cookie)).data;assert.equal(sameStudent.user,student.user);assert.equal(sameStudent.name,'学生新姓名');
const logout=await call({action:'logout'},studentLogin.cookie);assert.ok(logout.cookie?.startsWith('wenxu_session='));await call(null,logout.cookie,401);
console.log('PASS 站内登录、身份稳定、班级隔离与退出登录');
