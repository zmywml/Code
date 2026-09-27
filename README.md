# 文序公文写作实训平台

面向公文教学的可运行测试版。包含知识与素材、情景实训、规则反馈、学习档案、教师任务与复核、班级与资源共享。

## 能力边界

当前已接入 SiliconFlow 模型服务，提供 AI 对话引导、选段润色和五维语义批改。AI 只能依据任务材料和学生原文提供教学建议，不承担政策或事实核验，建议分不计入正式成绩；最终分数仍由教师复核。教学版式预览不是 GB/T 9704 排版验收，初始资料是人工整理的教学示例。

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
- app/editor.tsx：草稿保存、AI 引导、选段润色、规则与语义批改、修改和提交。
- app/api/lab/route.ts：认证、权限、数据查询和写入。
- lib/review.ts：规则反馈与评分量规校验。
- lib/ai-review.ts / lib/ai-assistant.ts：AI 语义批改、对话引导、润色与事实保护。
- lib/content.ts / lib/samples.ts：教学素材、题目与情景任务。
- db/schema.ts / drizzle/：数据库定义与迁移。
- .openai/hosting.json：Sites 项目标识与逻辑数据库绑定。

## 发布

生产版本部署在 Cloudflare Workers，业务数据存储在 Cloudflare D1。不要将本地身份开关、测试数据库、密钥或 node_modules 加入发布归档。

## 模型接入

模型密钥由 Cloudflare Secret 管理，只在服务端调用。语义批改每日每人最多 10 次，对话引导最多 20 次，选段润色最多 10 次；相同正文的语义批改会命中缓存。AI 输出采用结构化格式，润色会拦截数字和日期变化，并始终保留教师最终评分。
