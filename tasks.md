# NYU Course Rater - Tasks

> 状态标记: `[ ]` 未开始 · `[~]` 进行中 · `[x]` 已完成
>
> **可用 MCP 工具:**
> - **Playwright** — 浏览器自动化验证前端 (navigate, snapshot, click, fill_form, screenshot, network_requests, console_messages)
> - **IDE getDiagnostics** — 检查 TypeScript 编译错误

---

## Task 1: 项目初始化与基础设施

`[x]`

搭建 Next.js 14 项目，配置 TypeScript、Tailwind CSS、Prisma、ESLint，连接 Supabase PostgreSQL 数据库。

**范围:**
- `npx create-next-app` (App Router + TypeScript + Tailwind)
- 安装依赖: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`
- 配置 Prisma 连接 Supabase
- 创建 `.env.local` 模板（数据库连接串、NextAuth secret）
- 配置 `.gitignore`

**验证:**
- `npm run dev` 启动成功
- `Playwright: browser_navigate → localhost:3000` 确认页面可访问
- `Playwright: browser_snapshot` 确认渲染出默认页面内容
- `IDE: getDiagnostics` 无 TypeScript 错误
- `npx prisma db push` 能连接到数据库

---

## Task 2: 数据库 Schema 设计与 Migration

`[x]`

在 Prisma 中定义所有实体模型（School, Department, Course, CourseOffering, Instructor, User, Review, GradeReport），建立关系和索引，执行 migration。

**范围:**
- 编写 `prisma/schema.prisma`，包含 design.md 中定义的 8 个实体
- 建立外键关系和唯一约束
- 为 Course 的 `name` 和 `code` 字段添加全文搜索索引
- 创建 seed 脚本 `prisma/seed.ts`，写入 School 和 Department 的初始数据

**验证:**
- `npx prisma migrate dev` 成功执行
- `npx prisma studio` 能查看所有表结构
- `npx prisma db seed` 成功写入 School/Department 初始数据
- `IDE: getDiagnostics` 确认 Prisma 生成的类型无错误

---

## Task 3: 课程数据爬虫

`[ ]`

实现从 NYU Bulletins FOSE API 拉取课程数据并写入数据库的同步脚本。

**范围:**
- 创建 `src/lib/scraper/fose-client.ts` — 封装 FOSE API 请求（构造 payload、发送 POST、解析响应）
- 创建 `src/lib/scraper/sync.ts` — 同步逻辑：
  - 根据当前日期计算活跃学期的 srcdb 代码
  - 拉取全量课程数据
  - 从 `code` 字段解析出院系和课程编号（如 `CSCI-UA 101` → dept=`CSCI-UA`, number=`101`）
  - Diff & upsert 到 Course + CourseOffering 表
  - 自动创建/关联 Instructor 记录
- 创建 `scripts/sync-courses.ts` — 可独立运行的入口脚本

**验证:**
- `npx tsx scripts/sync-courses.ts` 执行后，数据库中有 ~15,000 条 CourseOffering
- 重复运行不会产生重复数据
- 日志输出新增/更新/跳过的数量
- `IDE: getDiagnostics` 无类型错误

---

## Task 4: 课程搜索（API + 前端）

`[ ]`

实现课程搜索 API 和前端搜索界面，包含首页搜索框和搜索结果页。

**范围:**
- `GET /api/courses` — 支持参数: `q`(关键词), `school`, `department`, `semester`, `page`, `limit`
  - 使用 ILIKE 匹配课程名、课程代码
  - 支持模糊搜索：`normalizeQuery(q)` 对课程代码模式自动插入空格（如 `CSCI-GA3033` → `CSCI-GA 3033`）
  - 返回分页结果，每条包含课程基本信息 + 评分均值 + 评价数量
- 首页 (`/`) — 搜索框 + 热门课程推荐（评价最多的课程）
- 搜索结果页 (`/search?q=...`) — 课程卡片列表、筛选侧边栏（院系/学期）、分页

**验证:**
- `Playwright: browser_navigate → localhost:3000`
- `Playwright: browser_snapshot` 确认首页有搜索框
- `Playwright: browser_fill_form` 在搜索框输入 "computer science"，提交
- `Playwright: browser_snapshot` 确认跳转到搜索结果页，展示匹配课程卡片
- `Playwright: browser_navigate → localhost:3000/search?q=CSCI-UA+101` 确认精确搜索命中
- `Playwright: browser_navigate → localhost:3000/search?q=CSCI-GA3033` 确认模糊搜索命中 "CSCI-GA 3033"
- `Playwright: browser_navigate → localhost:3000/search?q=csci-ua101` 确认小写无空格也能命中
- `Playwright: browser_navigate → localhost:3000/search?q=xyznotexist` 确认无结果时有提示
- `Playwright: browser_network_requests` 确认 API 调用 `/api/courses` 返回 200
- `Playwright: browser_console_messages` 确认无 JS 错误
- 单元测试: `normalizeQuery` 覆盖上述所有变体

---

## Task 5: 课程详情页

`[ ]`

实现课程详情页面，展示课程信息、各学期开设情况（section 列表、讲师、时间）。

**范围:**
- `GET /api/courses/:id` — 返回课程详情 + 关联的 offerings
- `GET /api/courses/:id/offerings` — 返回所有学期的 section 列表
- 课程详情页 (`/course/:id`) — 布局:
  - Header: 课程代码、名称、院系、学分
  - Offerings 区域: 按学期分组展示各 section（讲师、上课时间、状态）
  - 预留 Grade Distribution 和 Reviews 区域的插槽（后续 Task 填充）

**验证:**
- `Playwright: browser_navigate → localhost:3000/search?q=CSCI-UA+101`
- `Playwright: browser_click` 点击第一个课程卡片
- `Playwright: browser_snapshot` 确认详情页包含:
  - 课程代码 "CSCI-UA 101"
  - 课程名称 "Intro to Computer Science"
  - 至少一个学期的 section 列表（包含上课时间）
- `Playwright: browser_network_requests` 确认 `/api/courses/xxx` 返回 200
- `Playwright: browser_console_messages` 无错误

---

## Task 6: 用户认证

`[ ]`

集成 NextAuth.js，支持 Google OAuth 登录和邮箱密码注册/登录，NYU 邮箱自动标记 verified。

**范围:**
- 配置 NextAuth (Prisma Adapter + Google Provider + Credentials Provider)
- 注册页 (`/register`) — 邮箱 + 密码 + 显示名称表单
- 登录页 (`/login`) — 邮箱密码登录 + Google 一键登录按钮
- 全局 Navbar — 显示登录状态、用户头像、登出按钮
- `@nyu.edu` 邮箱注册自动设置 `is_verified = true`
- 保护需要登录的 API（中间件或 route handler 内检查 session）

**验证:**
- `Playwright: browser_navigate → localhost:3000/register`
- `Playwright: browser_snapshot` 确认注册表单存在（邮箱、密码、名称字段 + Google 按钮）
- `Playwright: browser_fill_form` 填写注册信息并提交
- `Playwright: browser_snapshot` 确认注册成功后跳转，Navbar 显示用户名
- `Playwright: browser_navigate → localhost:3000/login`
- `Playwright: browser_fill_form` 填写登录信息并提交
- `Playwright: browser_snapshot` 确认登录后 Navbar 显示用户信息
- `Playwright: browser_network_requests` 确认未登录调用受保护 API 返回 401

---

## Task 7: 课程评价系统

`[ ]`

实现评价的创建、展示、编辑、删除功能。

**范围:**
- API:
  - `POST /api/reviews` — 创建评价（rating, difficulty, workload, comment, would_recommend, semester_taken, course_id）
  - `PUT /api/reviews/:id` — 修改自己的评价
  - `DELETE /api/reviews/:id` — 删除自己的评价
  - `GET /api/courses/:id/reviews` — 获取课程评价列表（分页，支持排序）
- 课程详情页中的评价区域:
  - 评价列表（评分、评语、难度、工作量、学期、作者、Verified 徽章）
  - 课程综合评��统计（平均 rating、平均 difficulty、平均 workload、推荐率）
- 写评价表单（在课程详情页内或单独页面）
  - 星级选择（rating 1-5）、难度/工作���滑块、文字评价、是否推荐、上课学期
  - 同一用户同一课程同一学期不能重复评价

**验证:**
- 先完成 Task 6 的登录流��
- `Playwright: browser_navigate` 到某课程详情页
- `Playwright: browser_snapshot` 确认有 "写评价" 按钮
- `Playwright: browser_click` 点击写评价
- `Playwright: browser_fill_form` 填写评分、评语、难度、工作量、学期
- `Playwright: browser_click` 提交
- `Playwright: browser_snapshot` 确认评价出现在列表中，综合评分更新
- `Playwright: browser_snapshot` 确认 Verified 用户显示徽章
- `Playwright: browser_click` 编辑自己的评价 → 修改 → 保存 → 确认更新
- `Playwright: browser_click` 删除自己的评价 → 确认消失
- 登出后 `Playwright: browser_snapshot` 确认写评价按钮不可见或提示登录

---

## Task 8: 成绩上报与分布图

`[ ]`

实现用户上报课程成绩和聚合成绩分布柱状图展示。

**范围:**
- API:
  - `POST /api/grades` — 上报成绩（course_id, grade, semester）
  - `PUT /api/grades/:id` — 修改自己的成绩
  - `GET /api/courses/:id/grades` — 返回聚合后的成绩分布（支持按学期/讲师筛选）
- 课程详情页中的成绩分布区域:
  - 柱状图展示各等级（A ~ F, W, P, INC）的占比和人数
  - 筛选器: 全部 / 按学期 / 按讲师
  - 显示总上报人数
- 成绩上报入口（在评价表单旁或详情页内）
  - 等级下拉选择 + 学期选择
  - 同一用户同一课程同一学期不能重复上报

**验证:**
- 先完成登录流程
- `Playwright: browser_navigate` 到某课程详情页
- `Playwright: browser_snapshot` 确认成绩分布区域存在（0 条数据时显示 "暂无数据"）
- `Playwright: browser_select_option` 选择成绩等级 + 学期
- `Playwright: browser_click` 提交成绩
- `Playwright: browser_snapshot` 确认柱状图出现，显示 "Based on 1 report"
- 通过 API 再插入几条不同成绩的数据
- `Playwright: browser_navigate` 刷新页面
- `Playwright: browser_snapshot` 确认柱状图显示多个等级的分布
- `Playwright: browser_select_option` 切换学期筛选
- `Playwright: browser_snapshot` 确认图表更新
- `Playwright: browser_console_messages` 无 JS 错误

---

## Task 9: 个人中心

`[ ]`

实现用户个人中心页面，管理自己的评价和成绩记录。

**范围:**
- 个人中心页 (`/profile`):
  - 用户基本信息（头像、名称、邮箱、Verified 状态）
  - "我的评价" Tab — 列出用户所有评价，点击可跳转到对应课程，支持编辑/删除
  - "我的成绩" Tab — 列出用户所有成绩上报记录，支持修改
- API:
  - `GET /api/users/me/reviews` — 当前用户的评价列表
  - `GET /api/users/me/grades` — 当前用户的成绩列表

**验证:**
- `Playwright: browser_navigate → localhost:3000/profile`（未登录）
- `Playwright: browser_snapshot` 确认重定向到登录页
- 完成登录后再次访问 `/profile`
- `Playwright: browser_snapshot` 确认显示用户名、邮箱、Verified 状态
- `Playwright: browser_click` "我的评价" Tab
- `Playwright: browser_snapshot` 确认列出之前提交的评价
- `Playwright: browser_click` 点击某条评价的课程链接
- `Playwright: browser_snapshot` 确认跳���到对应课程详情页
- `Playwright: browser_navigate_back` 返回个人中心
- `Playwright: browser_click` "我的成绩" Tab
- `Playwright: browser_snapshot` 确认列出成绩记录

---

## Task 10: 部署与定时同步

`[ ]`

将项目部署到 Vercel + Supabase，配置定时任务每日同步课程数据。

**范围:**
- Supabase 生产环境数据库配置 + production migration
- Vercel 项目配置:
  - 环境变量（DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET）
  - Build 设置
- Vercel Cron Function:
  - 创建 `app/api/cron/sync-courses/route.ts`
  - 配置 `vercel.json` 中的 cron schedule（每日 03:00 UTC）
  - 添加 cron secret 验证防止外部调用
- 首次运行同步，灌入课程数据
- 基本监控: 同步日志记录到数据库或 Vercel Logs

**验证:**
- `IDE: getDiagnostics` 全项目无 TypeScript 错误
- `Playwright: browser_navigate → 生产环境 URL`
- `Playwright: browser_snapshot` 确认首页正常渲染
- 全链路 Playwright 测试:
  1. `browser_navigate` → 首页
  2. `browser_fill_form` → 搜索 "CSCI-UA 101"
  3. `browser_click` → 点击课程进入详情页
  4. `browser_snapshot` → 确认课程信息、section 列表、成绩分布、评价区域都正常
  5. `browser_navigate` → 登录页 → `browser_fill_form` 登录
  6. `browser_navigate` → 回到课程详情 → `browser_click` 写评价 → `browser_fill_form` 提交
  7. `browser_navigate` → `/profile` → `browser_snapshot` 确认评价出现
  8. `browser_console_messages` → 无 JS 错误
- 手动触发 cron API 确认同步成功
