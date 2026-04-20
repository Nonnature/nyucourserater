# NYU Course Rater - System Design

## 1. Overview

NYU Course Rater 是一个面向 NYU 学生的课程评价平台。用户可以搜索课程、查看历史成绩分布、阅读和发布课程评价。系统定期从 NYU 爬取完整课程列表并保持数据同步。

---

## 2. Tech Stack

| Layer        | Technology                          | Reason                                      |
| ------------ | ----------------------------------- | ------------------------------------------- |
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR/SSG 提升 SEO 和首屏速度，全栈统一       |
| **Styling**  | Tailwind CSS                        | 快速开发，响应式设计                         |
| **Backend**  | Next.js API Routes (Route Handlers) | 与前端同一项目，部署简单                     |
| **Database** | PostgreSQL (via Supabase)           | 关系型数据，全文搜索支持好                   |
| **ORM**      | Prisma                              | 类型安全，migration 管理方便                 |
| **Auth**     | NextAuth.js                         | 支持 Google OAuth + Email/Password           |
| **Scraper**  | Node.js cron script                 | 定期调用 Schedge API 同步课程数据            |
| **Deploy**   | Vercel (app) + Supabase (db)        | 免费额度充裕，适合学生项目                   |

---

## 3. Data Source

### 数据源调研

| 数据源 | 状态 | 说明 |
| ------ | ---- | ---- |
| Schedge API (`nyu.a1liu.com/api/`) | **已废弃** | NYU 加了 reCAPTCHA，Fall 2022 后数据不可靠 |
| NYU Official Course System API (MuleSoft) | **需申请** | 通过 `dataaccess.it.nyu.edu` 申请，审批 3-6 周，需 VPN + Service Account |
| NYU Bulletins Class Search (`bulletins.nyu.edu/class-search/`) | **公开可用** | Beta 版公开搜索工具，有 JSON API 后端 |
| Albert Mobile (`m.albert.nyu.edu`) | **受限** | 已加 reCAPTCHA，无法直接爬取 |

### 选定方案: NYU Bulletins FOSE API (已验证可用)

NYU Bulletins 提供了一个公开的课程搜索页面，背后使用 FOSE (Faculty/Online Search Engine) 系统。经实测验证，该 API 完全可用。

#### 基本信息

- **Endpoint**: `https://bulletins.nyu.edu/class-search/api/?page=fose&route=search`
- **Method**: POST
- **Content-Type**: `application/json`
- **Body 格式**: `encodeURIComponent(JSON.stringify(payload))` — JSON 字符串经 URL encode 后作为 raw body
- **公开访问**: 无需登录，无 reCAPTCHA
- **数据量**: 一次请求可返回全部课程（Fall 2026 共 ~15,000 条，无分页限制）

#### 请求示例

```bash
# 搜索 Fall 2026 的 CSCI-UA 课程
curl -s -X POST 'https://bulletins.nyu.edu/class-search/api/?page=fose&route=search' \
  -H 'Content-Type: application/json' \
  -H 'Referer: https://bulletins.nyu.edu/class-search/' \
  -d "$(python3 -c "
import urllib.parse, json
payload = {
    'other': {'srcdb': '1268'},
    'criteria': [{'field': 'keyword', 'value': 'CSCI-UA'}],
    'columns': 'to_be_announced,terms,class_name,title,section_name,crn,hours,status,meets,instr'
}
print(urllib.parse.quote(json.dumps(payload)))
")"

# 获取某学期的全部课程（不加 criteria 过滤）
payload = {
    "other": {"srcdb": "1268"},
    "criteria": [],
    "columns": "to_be_announced,terms,class_name,title,section_name,crn,hours,status,meets,instr"
}
```

#### 响应格式

```json
{
  "srcdb": "1268",
  "count": 15023,
  "results": [
    {
      "key": "4873",
      "code": "CSCI-UA 101",          // 课程代码
      "title": "Intro to Computer Science", // 课程名称
      "crn": "8918",                   // Albert 注册号
      "no": "002",                     // Section 编号
      "total": "11",                   // 该课程总 section 数
      "schd": "LEC",                   // 课程类型 (LEC/SEM/LAB/IND)
      "stat": "A",                     // 状态 (A=Active)
      "isCancelled": "",               // 是否取消
      "meets": "TR 8-9:15a",           // 上课时间（人类可读）
      "meetingTimes": "[{\"meet_day\":\"1\",\"start_time\":\"800\",\"end_time\":\"915\"}]",  // 结构化时间
      "instr": "",                     // 讲师（部分课程为空）
      "start_date": "2026-09-02",      // 开课日期
      "end_date": "2026-12-14",        // 结课日期
      "srcdb": "1268"                  // 学期代码
    }
  ]
}
```

#### 学期代码 (srcdb) 映射

| srcdb | 学期 | 日期范围 |
| ----- | ---- | -------- |
| 1268 / 9999 | Fall 2026 | 2026-09-02 ~ 2026-12-14 |
| 1266 | Summer 2026 | 2026-05-18 ~ 2026-08-12 |
| 1264 | Spring 2026 | 2026-01-20 ~ 2026-05-05 |
| 1262 | January 2026 | — |
| 1258 | Fall 2025 | 2025-09-02 ~ 2025-12-11 |
| 1256 | Summer 2025 | 2025-05-19 ~ 2025-08-13 |
| 1254 | Spring 2025 | 2025-01-21 ~ 2025-05-06 |
| 1252 | January 2025 | — |
| 1248 | Fall 2024 | — |

**编码规则**: `12` + 2位递增序号，末尾 `8`=Fall, `6`=Summer, `4`=Spring, `2`=January

#### 搜索字段

| criteria field | 说明 | 示例 |
| -------------- | ---- | ---- |
| `keyword` | 关键词搜索（课程名、描述） | `computer science` |
| `alias` | 课程代码匹配 | `CSCI-UA 101` |
| `crn` | 5位注册号精确匹配 | `08918` |

### 后备方案: NYU Official API

如果 Bulletins API 不稳定或被限制，可申请 NYU 官方 Course System API:
1. 申请 Service Account → `dataaccess.it.nyu.edu`
2. 通过 Architecture Review Board 审批
3. 获得 `client_id` + `client_secret`，使用 OAuth 2.0 认证
4. 每日 8:00 AM ET 刷新数据，支持 limit/offset 分页（最多 1000 条）

### 数据更新策略

```
┌─────────────┐    cron (每日)    ┌──────────────┐   POST/JSON  ┌───────────────────┐
│  Scheduler   │ ───────────────> │  Scraper Job  │ ──────────> │ Bulletins FOSE API │
└─────────────┘                   └──────┬───────┘             └───────────────────┘
                                         │
                                    diff & upsert
                                         │
                                         v
                                  ┌──────────────┐
                                  │  PostgreSQL   │
                                  └──────────────┘
```

- **频率**: 每天凌晨 3:00 运行一次
- **策略**: 对每个活跃学期发送一次无 criteria 请求，一次获取全部 ~15,000 条课程数据，与数据库比对后 upsert
- **Diff 逻辑**: 以 `(code, srcdb, crn)` 为唯一键
- **无需分页**: API 单次返回全部数据
- **Rate Limiting**: 每个学期请求间隔 2s，总共仅需 2-3 个请求即可完成全量同步

---

## 4. Entities (主体)

### 4.1 School (学院)

| Field       | Type   | Description              |
| ----------- | ------ | ------------------------ |
| id          | UUID   | Primary Key              |
| code        | String | 学院代码，如 `UA`, `UY`  |
| name        | String | 学院全称，如 `College of Arts and Science` |
| created_at  | DateTime |                        |
| updated_at  | DateTime |                        |

### 4.2 Department (院系)

| Field       | Type   | Description                     |
| ----------- | ------ | ------------------------------- |
| id          | UUID   | Primary Key                     |
| school_id   | UUID   | FK → School                     |
| code        | String | 院系代码，如 `CSCI`             |
| name        | String | 院系名称，如 `Computer Science` |
| created_at  | DateTime |                               |
| updated_at  | DateTime |                               |

### 4.3 Course (课程)

代表一门课程本身，跨学期存在。

| Field           | Type   | Description                              |
| --------------- | ------ | ---------------------------------------- |
| id              | UUID   | Primary Key                              |
| department_id   | UUID   | FK → Department                          |
| course_number   | String | 课程编号，如 `101`                       |
| name            | String | 课程名，如 `Intro to Computer Science`   |
| description     | Text   | 课程描述                                 |
| min_units       | Float  | 最低学分                                 |
| max_units       | Float  | 最高学分                                 |
| created_at      | DateTime |                                        |
| updated_at      | DateTime |                                        |

**Unique Constraint**: `(department_id, course_number)`

### 4.4 CourseOffering (课程开设)

代表某一学期中某门课的一个 section。

| Field          | Type   | Description                                    |
| -------------- | ------ | ---------------------------------------------- |
| id             | UUID   | Primary Key                                    |
| course_id      | UUID   | FK → Course                                    |
| instructor_id  | UUID   | FK → Instructor (nullable)                     |
| semester       | String | 学期标识，如 `2024-fall`                       |
| section_code   | String | Section 代码，如 `001`                         |
| status         | Enum   | `open` / `closed` / `waitlist`                 |
| location       | String | 上课地点                                       |
| schedule       | JSON   | 上课时间 `[{day, start, end}]`                 |
| class_number   | String | Albert 注册号                                  |
| synced_at      | DateTime | 最后同步时间                                 |
| created_at     | DateTime |                                              |
| updated_at     | DateTime |                                              |

**Unique Constraint**: `(course_id, semester, section_code)`

### 4.5 Instructor (讲师)

| Field      | Type   | Description     |
| ---------- | ------ | --------------- |
| id         | UUID   | Primary Key     |
| name       | String | 讲师姓名        |
| created_at | DateTime |               |
| updated_at | DateTime |               |

**Unique Constraint**: `(name)` (以姓名去重，Schedge 不提供讲师 ID)

### 4.6 User (用户)

| Field                      | Type         | Description                                 |
| -------------------------- | ------------ | ------------------------------------------- |
| id                         | UUID         | Primary Key                                 |
| email                      | String       | 邮箱（唯一，仅限 @nyu.edu）                |
| name                       | String       | 显示名称                                    |
| password_hash              | String       | 密码哈希（nullable，OAuth 用户无）          |
| avatar_url                 | String       | 头像地址（nullable）                        |
| is_verified                | Boolean      | 是否验证邮箱（通过邮件验证链接）            |
| verification_token         | String       | 邮箱验证 token（nullable，唯一）            |
| verification_token_expires | DateTime     | 验证 token 过期时间（24小时）               |
| program_level              | Enum         | `UNDERGRADUATE` / `MASTERS`                 |
| enrollment_semester        | String       | 入学学期，如 `Fall 2025`                    |
| enrollment_edits_remaining | Int          | 入学信息修改剩余次数（默认1）               |
| created_at                 | DateTime     |                                             |
| updated_at                 | DateTime     |                                             |

### 4.7 Review (课程评价)

| Field             | Type     | Description                            |
| ----------------- | -------- | -------------------------------------- |
| id                | UUID     | Primary Key                            |
| user_id           | UUID     | FK → User                              |
| course_id         | UUID     | FK → Course                            |
| offering_id       | UUID     | FK → CourseOffering (nullable)         |
| rating            | Int      | 总体评分 1-5                           |
| difficulty        | Int      | 难度 1-5                               |
| workload          | Int      | 工作量 1-5                             |
| comment           | Text     | 文字评价                               |
| would_recommend   | Boolean  | 是否推荐                               |
| semester_taken    | String   | 上课学期                               |
| created_at        | DateTime |                                        |
| updated_at        | DateTime |                                        |

**Unique Constraint**: `(user_id, course_id, semester_taken)` — 每人每门课每学期只能评价一次

### 4.8 GradeReport (成绩上报)

用户上报自己的课程成绩，用于聚合展示成绩分布。

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| id             | UUID     | Primary Key                          |
| user_id        | UUID     | FK → User                            |
| course_id      | UUID     | FK → Course                          |
| offering_id    | UUID     | FK → CourseOffering (nullable)       |
| grade          | Enum     | `A`, `A-`, `B+`, `B`, `B-`, `C+`, `C`, `C-`, `D+`, `D`, `F`, `W`, `P`, `INC` |
| semester       | String   | 上课学期                             |
| created_at     | DateTime |                                      |

**Unique Constraint**: `(user_id, course_id, semester)` — 每人每门课每学期只能报一次成绩

### 4.9 ReviewVote (评价投票)

| Field      | Type     | Description                   |
| ---------- | -------- | ----------------------------- |
| id         | UUID     | Primary Key                   |
| review_id  | UUID     | FK → Review                   |
| user_id    | UUID     | FK → User                     |
| vote       | Enum     | `UP` / `DOWN`                 |
| created_at | DateTime |                               |

**Unique Constraint**: `(user_id, review_id)` — 每人每条评价只能投一票

---

## 5. Entity Relationships (实体关系)

```
┌──────────┐ 1:N  ┌──────────────┐ 1:N  ┌──────────┐ 1:N  ┌─────────────────┐
│  School   │─────>│  Department   │─────>│  Course   │─────>│ CourseOffering   │
└──────────┘      └──────────────┘      └─────┬────┘      └────────┬────────┘
                                               │                    │
                                          1:N  │               N:1  │
                                               │                    │
                                               v                    v
                                         ┌──────────┐       ┌──────────────┐
                                         │  Review   │       │  Instructor   │
                                         └─────┬────┘       └──────────────┘
                                               │
                                          N:1  │
                                               v
┌──────────────┐ 1:N                    ┌──────────┐
│ GradeReport   │<──────────────────────│   User    │
└──────────────┘                        └──────────┘
```

关系总结:
- **School 1:N Department**: 一个学院下有多个院系
- **Department 1:N Course**: 一个院系下有多门课程
- **Course 1:N CourseOffering**: 一门课在不同学期有不同的开设（section）
- **CourseOffering N:1 Instructor**: 每个 section 由一位讲师教授
- **User 1:N Review**: 一个用户可以评价多门课
- **Course 1:N Review**: 一门课可以有多条评价
- **User 1:N GradeReport**: 一个用户可以上报多门课的成绩
- **Course 1:N GradeReport**: 一门课可以有多条成绩上报

---

## 6. API Design

### 6.1 Course APIs

| Method | Path                            | Description          |
| ------ | ------------------------------- | -------------------- |
| GET    | `/api/courses`                  | 搜索/列出课程（支持分页、筛选） |
| GET    | `/api/courses/:id`              | 获取课程详情         |
| GET    | `/api/courses/:id/offerings`    | 获取课程所有开设     |
| GET    | `/api/courses/:id/reviews`      | 获取课程评价列表     |
| GET    | `/api/courses/:id/grades`       | 获取课程成绩分布     |

### 6.2 Review APIs

| Method | Path                            | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/reviews`                  | 创建评价             |
| PUT    | `/api/reviews/:id`              | 修改自己的评价       |
| DELETE | `/api/reviews/:id`              | 删除自己的评价       |

### 6.3 Grade APIs

| Method | Path                            | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/grades`                   | 上报成绩             |
| PUT    | `/api/grades/:id`               | 修改自己的成绩       |

### 6.4 Auth APIs

| Method | Path                              | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/auth/register`              | 注册（仅限 @nyu.edu）         |
| POST   | `/api/auth/login`                 | 登录                           |
| GET    | `/api/auth/session`               | 获取当前会话                   |
| GET    | `/api/auth/verify?token=xxx`      | 邮箱验证（点击邮件链接）       |
| POST   | `/api/auth/resend-verification`   | 重发验证邮件（需登录，2分钟限频）|

### 6.5 User APIs

| Method | Path                              | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| PATCH  | `/api/users/me/enrollment`        | 修改入学信息（仅限1次）        |

### 6.6 Vote APIs

| Method | Path                              | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/reviews/:id/vote`           | 投票（UP/DOWN，可覆盖）       |
| DELETE | `/api/reviews/:id/vote`           | 取消投票                       |

### 6.5 Search Query Parameters

`GET /api/courses?q=&school=&department=&semester=&instructor=&page=&limit=`

搜索使用 PostgreSQL ILIKE 匹配课程名称、课程代码。

#### 模糊搜索 (Fuzzy Search)

搜索需支持用户常见的非精确输入。核心策略：在搜索前对查询词进行**预处理/规范化**，生成多个匹配变体。

| 用户输入 | 期望匹配 | 规范化策略 |
| --- | --- | --- |
| `CSCI-GA3033` | `CSCI-GA 3033` | 检测课程代码模式（字母+数字紧连），自动插入空格 |
| `csci-ua101` | `CSCI-UA 101` | 同上 + 大小写不敏感 |
| `CSCIGA3033` | `CSCI-GA 3033` | 去掉空格/连字符后与课程代码的无空格版本对比 |
| `intro to cs` | `Intro to Computer Science` | 直接 ILIKE 匹配课程名称 |

**实现方式**: `normalizeQuery(q)` 函数返回一个或多个搜索变体，`buildCourseWhere` 对每个变体生成 `OR` 条件：
1. 原始查询（ILIKE）
2. 如果查询匹配课程代码模式 `/^([A-Za-z]+-[A-Za-z]+)(\d+.*)$/`，则插入空格生成规范化代码（如 `CSCI-GA3033` → `CSCI-GA 3033`）
3. 去除所有空格和连字符后的版本，与课程代码的同样处理版本比较

---

## 7. Page Structure (前端页面)

```
/                           → 首页（搜索框 + 热门课程）
/search?q=...               → 搜索结果页
/course/:id                 → 课程详情页（信息 + 成绩分布图 + 评价列表）
/course/:id/review          → 写评价页
/login                      → 登录页
/register                   → 注册页
/profile                    → 个人中心（我的评价、我的成绩）
```

### 课程详情页布局

```
┌─────────────────────────────────────────────┐
│  Course Header                              │
│  CSCI-UA 101 - Intro to Computer Science    │
│  CAS · Computer Science · 4 credits         │
│  Avg Rating: ★★★★☆ (4.2)  Difficulty: 3.1  │
├─────────────────────────────────────────────┤
│  Grade Distribution                    [Tab] │
│  ┌─────────────────────────────────────┐    │
│  │  ██████████████  A   35%            │    │
│  │  ████████████    A-  28%            │    │
│  │  ████████        B+  18%            │    │
│  │  █████           B   12%            │    │
│  │  ██              C+   4%            │    │
│  │  █               Other 3%          │    │
│  └─────────────────────────────────────┘    │
│  Based on 47 reports                        │
├─────────────────────────────────────────────┤
│  Reviews (23)                    [写评价]    │
│                                              │
│  ┌─ Review ────────────────────────────┐    │
│  │ ★★★★☆  Fall 2024 · Prof. Smith      │    │
│  │ "Great course, heavy workload..."    │    │
│  │ Difficulty: 4  Workload: 5           │    │
│  └─────────────────────────────────────┘    │
│  ...                                        │
└─────────────────────────────────────────────┘
```

---

## 8. Scraping Strategy

### 流程

1. **Cron 触发**: 每天 03:00 UTC 运行
2. **计算活跃学期**: 根据当前日期计算当前学期和下一学期的 srcdb 代码
3. **全量拉取**: 对每个活跃学期发送一次无 criteria 的 POST 请求（单次返回全部 ~15,000 条）
4. **解析 + 去重**: 按 `code` 字段解析出课程代码（如 `CSCI-UA 101`），相同 code 的不同 section 归入同一 Course
5. **Diff & Upsert**: 以 `(code, srcdb, crn)` 为唯一键
   - 新数据 → INSERT（创建 Course + CourseOffering）
   - 已有但有变化 → UPDATE（讲师、时间、状态等）
   - 已有且无变化 → SKIP
6. **记录同步**: 更新 `synced_at` 时间戳
7. **日志**: 记录新增/更新/无变化的数量

### 性能

- 全量拉取一个学期仅需 **1 个 HTTP 请求**，无需遍历院系
- 2-3 个请求即可完成所有活跃学期的全量同步
- 每个请求间隔 2s
- 失败重试 3 次，指数退避

---

## 9. Grade Distribution Aggregation

成绩数据来源于用户上报，聚合逻辑:

```sql
-- 按课程聚合所有学期的成绩分布
SELECT grade, COUNT(*) as count
FROM grade_reports
WHERE course_id = :courseId
GROUP BY grade
ORDER BY
  CASE grade
    WHEN 'A'  THEN 1
    WHEN 'A-' THEN 2
    WHEN 'B+' THEN 3
    WHEN 'B'  THEN 4
    WHEN 'B-' THEN 5
    WHEN 'C+' THEN 6
    WHEN 'C'  THEN 7
    WHEN 'C-' THEN 8
    WHEN 'D+' THEN 9
    WHEN 'D'  THEN 10
    WHEN 'F'  THEN 11
    WHEN 'W'  THEN 12
    WHEN 'P'  THEN 13
    WHEN 'INC' THEN 14
  END;
```

前端使用柱状图展示，支持按学期或按讲师筛选查看。

---

## 10. Authentication

- **注册**: 仅限 `@nyu.edu` 邮箱注册（非 NYU 邮箱直接拒绝）
- **邮箱验证**: 注册后发送验证邮件（Nodemailer + Gmail SMTP），用户点击链接后 `is_verified = true`
  - 验证 token 24小时过期
  - 重发限频：2分钟内不可重发
  - 验证前用户可登录但权限受限
- **OAuth**: 支持 Google 登录，但 `signIn` callback 中限制仅 `@nyu.edu` 账号可通过
  - Google OAuth 用户首次登录后需在 `/onboarding` 页补填入学信息
- **注册时必填**: email, password, name, programLevel (UNDERGRADUATE/MASTERS), enrollmentSemester (如 "Fall 2025")
- **入学信息修改**: 注册后可修改1次入学学期和项目类型（`enrollment_edits_remaining` 默认1）

---

## 12. Enrollment & Semester Tracking

### 入学学期存储
- 注册时填写 `program_level` (UNDERGRADUATE/MASTERS) 和 `enrollment_semester` ("Fall 2025")
- 存储在 User 表，注册后仅允许修改1次

### 当前学期计算（纯函数，不存储）
- **计算规则**: Fall = 一个学期，Spring+Summer = 一个学期，每年2个学期递增
- **示例** (入学 Fall 2025):
  - Fall 2025 → 第1学期
  - Spring+Summer 2026 → 第2学期
  - Fall 2026 → 第3学期
- **实现**: `computeCurrentSemester(enrollmentSemester, now)` 在 `src/lib/semester.ts`
- **课程分类**: 课程列表仍按 Fall/Spring/Summer 三个学期分类展示

---

## 13. Access Control (Give-Before-Get)

### 访问层级

| 用户状态 | 可搜索/浏览课程 | 可查看评论/成绩分布 | 可写评论/上传成绩 |
| -------- | --------------- | ------------------- | ----------------- |
| 未登录 | Yes | No | No |
| 已登录 + 未验证邮箱 | Yes | No | No |
| 已登录 + 已验证 + 第1学期 | Yes | Yes (豁免) | Yes |
| 已登录 + 已验证 + 非第1学期 + 无成绩 | Yes | No | Yes |
| 已登录 + 已验证 + 非第1学期 + 有成绩 | Yes | Yes | Yes |

### 核心逻辑 (`src/lib/access.ts`)
```
canViewReviews(user):
  if not logged in → false
  if not verified → false
  if no enrollmentSemester → false
  if isFirstSemester(computed) → true
  if gradeReport.count >= 1 → true
  return false
```

### 第一学期豁免
新生第一学期没有成绩可上传，自动豁免上传要求。当学期递增到第2学期后，需至少上传1门成绩才能查看评论。

---

## 14. Review Quality & Voting

### 基础规则
- 评论文字最低5个字符
- 所有字段必填（rating, difficulty, workload, comment, wouldRecommend, semesterTaken）
- 每人每课每学期只能写1条评论（`@@unique([userId, courseId, semesterTaken])`）

### 社区投票
- 每条评论可被 upvote 或 downvote
- 每人每条评论只能投1票（`@@unique([userId, reviewId])`）
- 可以改票（UP → DOWN 或反之）
- 评论列表按 net score (upvotes - downvotes) 排序

---

## 11. Deployment

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Vercel   │ ──────> │ Supabase  │         │  Cron     │
│  Next.js  │         │ PostgreSQL│ <────── │  Scraper  │
│  App      │         │           │         │ (Vercel)  │
└──────────┘         └──────────┘         └──────────┘
```

- **Vercel**: 部署 Next.js 应用，自动 CI/CD
- **Supabase**: 托管 PostgreSQL，免费 500MB 存储
- **Cron Job**: 使用 Vercel Cron Functions 触发每日课程同步
- **环境变量**: 数据库连接串、NextAuth secret、OAuth credentials 存放在 Vercel 环境变量中
