# 胡拍乱造创作组 · 团队官网

> 把脑洞拍出来,把日子造有趣。

四个普通年轻人的抖音创作团队官网,基于 **Cloudflare Pages + D1** 搭建。零服务器、零月费,推代码即上线。

---

## 一、项目介绍

本网站是「胡拍乱造创作组」的对外官网与团队内部协作平台,一站解决：

- **宣传展示** — 团队介绍、六大系列企划、24 个选题方向、12 周路线图
- **手册在线化** — 执行手册 V1.1 全文在线(15 章 + 8 个附录)
- **创作工具** — 20 分选题评分器、灵感卡生成器、周日拍摄清单、粗剪反馈生成器、每周复盘六问
- **账号系统** — 注册/登录/退出,第一个注册用户自动成为主理人
- **申请加入** — 公开申请表单,数据真实入库,主理人在线审核
- **灵感池看板** — 团队共享灵感卡,支持四列状态流转(灵感池 → 待评估 → 已入选 → 暂存)

---

## 二、环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows / macOS / Linux 均可 |
| Node.js | v18 或更高(用于本地调试) |
| npm | 随 Node.js 自带 |
| Git | 任意版本 |
| GitHub 账号 | 用于托管代码仓库 |
| Cloudflare 账号 | 免费版即可,需绑定邮箱 |
| 浏览器 | Chrome / Edge / Firefox 最新版 |

> **纯静态 + Cloudflare Functions**:无需 Python、数据库服务器或任何后端环境,小白照着教程就能完成。

---

## 三、安装部署教程(保姆级,从零开始)

### 第 1 步:把代码上传到 GitHub

1. 打开 [https://github.com](https://github.com),登录账号。
2. 点右上角 **「+」→「New repository」**。
3. 填写仓库名(例如 `hplz-website`),选 **Private(私有)** 或 Public 均可。
4. **不要**勾选「Add a README file」,直接点 **「Create repository」**。
5. 打开 Windows **命令提示符(cmd)** 或 **PowerShell**,进入本项目文件夹:

```cmd
cd C:\Users\你的用户名\...\hplzcztd2026070302
```

6. 依次执行以下命令(把 `your-username` 和 `hplz-website` 换成你实际的 GitHub 用户名和仓库名):

```cmd
git init
git add .
git commit -m "初次发布:胡拍乱造团队官网"
git branch -M main
git remote add origin https://github.com/your-username/hplz-website.git
git push -u origin main
```

> 如果提示输入用户名和密码,输入 GitHub 账号邮箱和 **Personal Access Token**(在 GitHub → Settings → Developer settings → Personal access tokens 生成)。

---

### 第 2 步:在 Cloudflare 创建 Pages 项目

1. 打开 [https://dash.cloudflare.com](https://dash.cloudflare.com),登录账号。
2. 左侧菜单点 **「Workers & Pages」**。
3. 点 **「Create application」→「Pages」→「Connect to Git」**。
4. 授权 GitHub 访问,选择刚才创建的仓库。
5. 填写构建设置:

| 字段 | 填写内容 |
|------|----------|
| 项目名称 | `hplz-website`(或任意名称) |
| 生产分支 | `main` |
| 构建命令 | **留空** |
| 构建输出目录 | `public` |
| 根目录 | **留空** |

6. 点 **「Save and Deploy」**,等待约 1 分钟,看到 **「Success」** 即部署完成。
7. 此时可以通过 `https://hplz-website.pages.dev` 访问网站(账号功能还不可用,需要先绑定数据库)。

---

### 第 3 步:创建 Supabase 项目并初始化数据库

1. 打开 [https://supabase.com](https://supabase.com),注册/登录账号。
2. 点 **「New project」**,填写项目名称(如 `hplz`)、数据库密码(自己记好)，区域选离你最近的，点 **「Create new project」**，等待约 1 分钟初始化完成。
3. 进入项目后，点左侧菜单 **「SQL Editor」**。
4. 点 **「New query」**，把本项目根目录的 `schema_supabase.sql` 文件**全部内容**粘贴进去。
5. 点 **「Run」**，看到绿色 **「Success. No rows returned」** 即建表完成。

> **验证建表成功**：在 SQL Editor 执行 `SELECT * FROM users;`，不报错（返回空表格）即说明建表成功。左侧 **「Table Editor」** 也能看到 users / sessions / applications / ideas 四张表。

---

### 第 4 步:把 Supabase 密钥配置到 Cloudflare Pages

**获取 Supabase 密钥：**

1. 在 Supabase 项目页，点左侧 **「Settings」→「API」**。
2. 记录以下两个值：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **service_role key**（在 `Project API Keys` 区域，点 **Reveal** 查看）

> ⚠️ `service_role key` 具有完整数据库权限，只能用在服务端，绝对不要暴露在前端代码中。

**在 Cloudflare Pages 配置环境变量：**

1. 打开 Cloudflare Pages 项目页面 → **「Settings」→「Environment variables」**。
2. 点 **「Add variable」**，分别添加以下两条（Production 和 Preview 都勾选）：

| Variable name | Value | 类型 |
|---------------|-------|------|
| `SUPABASE_URL` | 你的 Project URL | 普通变量 |
| `SUPABASE_KEY` | 你的 service_role key | **Secret（勾选 Encrypt）** |

3. 点 **「Save」**。
4. 回到 **「Deployments」** 标签页，点 **「Retry deployment」** 重新部署一次（让环境变量生效）。

---

### 第 5 步:验证网站功能

部署成功后,用浏览器打开你的 Pages 网址,按顺序验证：

- [ ] 首页正常显示,场记板动画播放
- [ ] 点击导航可以跳转各页面
- [ ] 打开「登录/注册」页,注册第一个账号 → 提示「已自动成为主理人」
- [ ] 登录后跳转到成员空间,显示「今日任务」
- [ ] 在灵感池输入一条内容,点「投进灵感池」,看板上出现卡片
- [ ] 打开「申请加入」页,填写表单提交 → 成员空间的申请审核列表出现记录

> 如果注册时提示数据库相关错误,请检查第 3-4 步是否完成。

---

## 四、使用教程

### 4.1 访客(所有人可用)

| 功能 | 路径 | 说明 |
|------|------|------|
| 浏览团队介绍 | 首页 `index.html` | 含开机场记板动画、成员介绍、内容支柱 |
| 查看系列 + 抽脑洞 | `works.html` | 24 个选题随机抽签机 |
| 阅读团队手册 | `manual.html` | 全文 15 章 + 8 附录，带侧边目录和阅读进度条 |
| 使用创作工具 | `tools.html` | 选题评分器、灵感卡（文本）、拍摄清单、粗剪反馈、复盘六问 |
| 申请加入 | `join.html` | 填写角色卡提交申请 |
| 注册账号 | `login.html` | 第一个注册的用户自动成为主理人 |

### 4.2 登录用户（访客角色）

- 可投灵感卡进团队灵感池（`tools.html` → 灵感卡 → 投进团队灵感池）
- 可快速投一句话灵感（成员空间顶部输入框）
- 可查看灵感池看板（只读，不能流转）

### 4.3 团队成员（member 角色）

- 可在看板上移动灵感卡（灵感池 → 待评估 → 已入选 → 暂存）
- 可删除自己提交的灵感卡

> 主理人在成员空间「剧组花名册」里把访客提升为「团队成员」后生效。

### 4.4 主理人（admin 角色，第一个注册用户）

除以上所有权限外：

- **申请审核**：成员空间查看所有入队申请，点「通过」或「婉拒」
- **成员管理**：把注册用户提升为团队成员，或调回访客
- **删除任意灵感卡**

---

## 五、项目目录结构

```
hplzcztd2026070302/          ← 仓库根目录(本文件夹整个上传 GitHub)
│
├── public/                  ← 网站静态文件，Cloudflare Pages 的输出目录
│   ├── index.html           ← 首页(开机动画 + 宣传展示)
│   ├── works.html           ← 系列企划 + 24 个选题 + 脑洞抽签机
│   ├── manual.html          ← 团队手册全文在线版
│   ├── tools.html           ← 创作工具间(五个工具)
│   ├── join.html            ← 申请加入
│   ├── login.html           ← 登录 / 注册
│   ├── dashboard.html       ← 成员空间(需登录)
│   └── assets/
│       ├── css/
│       │   └── style.css    ← 全站设计系统(片场胶带涂鸦风)
│       ├── js/
│       │   ├── app.js       ← 全站共享脚本(导航/页脚/接口/登录状态)
│       │   ├── home.js      ← 首页专属脚本
│       │   ├── works.js     ← 系列页 + 脑洞抽签机
│       │   ├── manual.js    ← 手册侧边目录 + 阅读进度条
│       │   ├── tools.js     ← 五个创作工具逻辑
│       │   ├── join.js      ← 申请表单提交
│       │   ├── login.js     ← 登录 / 注册表单
│       │   └── dashboard.js ← 成员空间逻辑
│       └── img/
│           └── favicon.svg  ← 四格场记板图标
│
├── functions/               ← Cloudflare Pages Functions(后端接口)
│   └── api/
│       ├── _utils.js        ← 共享工具(响应/密码/会话/校验)
│       ├── register.js      ← POST /api/register 注册
│       ├── login.js         ← POST /api/login 登录
│       ├── logout.js        ← POST /api/logout 退出
│       ├── me.js            ← GET  /api/me 查询当前用户
│       ├── apply.js         ← POST /api/apply 提交入队申请
│       ├── applications.js  ← GET  /api/applications 申请列表(admin)
│       ├── applications/
│       │   └── review.js    ← POST /api/applications/review 审核
│       ├── ideas.js         ← GET/POST /api/ideas 灵感卡
│       ├── ideas/
│       │   └── [id].js      ← PATCH/DELETE /api/ideas/:id 单卡操作
│       ├── members.js       ← GET  /api/members 成员列表
│       └── members/
│           └── role.js      ← POST /api/members/role 调整角色
│
├── schema.sql               ← D1 数据库建表语句(第 3 步执行)
├── wrangler.toml            ← Cloudflare 本地开发配置
├── .gitignore               ← 排除 node_modules 等不需上传的文件
└── README.md                ← 本文档
```

---

## 六、常见问题排查

**Q：注册时提示「数据库尚未配置」或「DB」相关错误**

A：说明 D1 数据库还没绑定。按部署教程第 3-4 步操作，在 Cloudflare Pages 的「Settings → Functions → D1 database bindings」添加绑定，变量名填 `DB`，然后重新部署一次。

---

**Q：注册提示「数据库表尚未初始化」**

A：数据库已绑定但还没建表。回到 Cloudflare D1 控制台，找到 `hplz-db`，在「Console」标签页粘贴并执行 `schema.sql` 全部内容。

---

**Q：注册/登录成功但刷新后又变成未登录**

A：Cookie 设置了 `Secure` 标志，必须在 HTTPS 下才有效。直接在 `https://xxx.pages.dev` 上访问即可，不要用 `http://`。本地用 `wrangler pages dev` 调试时 Cookie 也正常生效。

---

**Q：手册页侧边目录不显示**

A：目录由 `manual.js` 从页面 `section[data-toc]` 元素自动收集生成，需要 JavaScript 运行完成后才出现，加载完毕后刷新即可看到。

---

**Q：灵感卡投进去了，但看板上没出现**

A：看板会在页面加载时请求一次数据，投完后需要手动刷新页面（或后续版本可加实时刷新）。

---

**Q：GitHub push 时提示需要 Personal Access Token**

A：在 GitHub → 右上角头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾选 `repo` 权限，生成后复制备用。Push 时密码栏粘贴这个 token 即可。

---

**Q：本地想用 wrangler 调试，命令是什么**

A：先安装 wrangler（只需一次）：

```cmd
npm install -g wrangler@3
```

然后在项目根目录运行：

```cmd
npx wrangler pages dev public --d1 DB
```

首次运行会自动创建本地 SQLite 数据库。再另开一个命令行窗口，执行建表语句：

```cmd
npx wrangler d1 execute hplz-db --local --file=./schema.sql
```

浏览器打开 `http://localhost:8788` 即可本地完整测试。

---

## 七、更新日志

```
2026-07-04 00:00 【初次发布】完成胡拍乱造创作组团队官网全量开发
  - 7 个 HTML 页面:首页/系列/手册/工具间/申请加入/登录注册/成员空间
  - Cloudflare Pages Functions 后端:注册/登录/退出/申请/审核/成员管理/灵感卡
  - Cloudflare D1 真实数据库:users/sessions/applications/ideas 四张表
  - PBKDF2-SHA256 密码哈希 + HttpOnly Cookie 会话
  - 「片场胶带涂鸦风」全站设计系统:胶带纸片卡/图章/场记板/警戒纹/花字
  - 移动端全面适配(320px 起)
  - 五个在线创作工具:20 分评分器/灵感卡/拍摄清单/粗剪反馈/复盘六问
```

```
2026-07-04 01:00 【修复】移除 wrangler.toml 中的 [[d1_databases]] 节
  - 原因:占位文字 database_id 导致 Cloudflare Pages 部署报 Error 8000022
  - 影响范围:生产部署,推代码后重新部署即可恢复
  - D1 绑定改为完全通过 Cloudflare 控制台 Settings → Functions → D1 database bindings 设置
  - 本地调试方式不变,可自行取消注释填入真实 database_id
```

```
2026-07-04 02:00 【优化】顶栏始终悬浮在页面顶部
  - .nav 改为 position:fixed,body 增加 padding-top 等量留空
  - 避免内容被导航栏遮挡

2026-07-04 02:00 【优化】开屏场记板动画改为每次刷新都播放
  - 移除 home.js 中的 sessionStorage 判断逻辑
  - 仍支持点击任意处跳过

2026-07-04 02:00 【新增】全站一键回顶部悬浮按钮
  - 滚动超过一屏后出现,点击平滑回顶
  - 胶带涂鸦风格:带黄色 hover 效果和手工阴影
  - 在 app.js 统一初始化,所有页面均生效

2026-07-04 02:00 【修复】D1 数据库无法通过控制台绑定的问题
  - 根本原因:wrangler.toml 含 pages_build_output_dir 会禁用控制台绑定 UI
  - 修复方案:将 wrangler.toml 加入 .gitignore,不再上传 GitHub
  - 操作步骤:见下方「重新部署步骤」
```
