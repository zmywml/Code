# 文序公文写作实训平台

面向公文教学的可运行测试版。包含知识与素材、情景实训、规则反馈、学习档案、教师任务与复核、班级与资源共享。

## 能力边界

当前没有连接真实 AI 服务。所有写作检查明确标为规则检查，所有五维分数来自教师输入。自由对话、语义批改、政策核验和 AI 润色待用户提供接口后实现。教学版式预览不是 GB/T 9704 排版验收。初始资料是人工整理的教学示例。

## 本地运行

要求 Node.js 22.13 及以上、npm。使用锁文件安装：

```text
npm ci
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_mute_hawkeye.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 5173 --inspector-port 0 --var LOCAL_PREVIEW:true
```

迁移只在首次初始化本地数据库时执行；不要对同一数据库重复执行。Windows 上重建前先停止预览进程，避免构建目录被占用。打开 http://127.0.0.1:5173 。本地预览默认为 preview-owner 身份。

本地身份开关只能用于本机预览，不得配置到线上。发布版本依赖平台认证头。教师权限始终按班级所有者在服务器校验；切换界面视角不会改变其他班级的权限。

## 检查与测试

```text
node node_modules/typescript/bin/tsc --noEmit
node tests/api.mjs
node tests/browser.mjs
```

接口测试需要上述本地预览启动。浏览器测试需要 Playwright 模块及 Edge；使用 PLAYWRIGHT_MODULE 环境变量指定现有 Playwright 模块路径，未设置则从 Node 模块解析路径加载 playwright。浏览器测试不依赖生产账号。测试用户名称每次随机生成，数据只存在本地数据库。

测试结果保存在 tests/api-results.json 和 tests/browser-results.json；浏览器截图也位于 tests/。本次通过 36 项接口测试、25 项浏览器测试。

## 关键文件

- app/lab.tsx：导航、学习工作台、素材、自主练习、档案与教师页面。
- app/editor.tsx：草稿保存、规则自查、批注定位、修改与提交。
- app/api/lab/route.ts：认证、权限、数据查询和写入。
- lib/review.ts：规则反馈与评分量规校验。
- lib/content.ts / lib/samples.ts：教学素材、题目与情景任务。
- db/schema.ts / drizzle/：数据库定义与迁移。
- .openai/hosting.json：Sites 项目标识与逻辑数据库绑定。

## 发布

此项目由 Sites 托管，保持私有。新部署按平台工作流准备源码、构建归档、保存版本并发布。不要将本地身份开关、测试数据库、密钥或 node_modules 加入发布归档。实际邀请学生进入班级时，班级码之外还需相应的网站访问权限。

## 模型接入

需先确认服务名称、服务地址、模型名称、鉴权、请求响应结构与限流策略。密钥由服务端秘密配置管理。未来输出应标注 AI 来源、验证分数范围、保留来源材料与教师最终评分；禁止把无依据的事实或政策作为可靠结论展示。
