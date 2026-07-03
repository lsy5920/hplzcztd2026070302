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

### 第 3 步:创建 D1 数据库并初始化表结构

1. 回到 Cloudflare 控制台首页,左侧菜单点 **「Workers & Pages」→「D1」**。
2. 点 **「Create database」**,名称填 `hplz-db`,点确认。
3. 数据库创建后,点进去,找到 **「Console」(控制台)** 标签页。
4. 打开本项目根目录的 `schema.sql` 文件,把**全部内容**复制进控制台文本框。
5. 点 **「Execute」**,看到绿色 **「Success」** 即建表完成。

> **验证建表成功**:在控制台执行 `SELECT * FROM users;`,如果不报错(返回空结果)即说明表已创建。

---

### 第 4 步:把 D1 绑定到 Pages 项目

1. 回到 Pages 项目页面(**Workers & Pages → hplz-website**)。
2. 点 **「Settings」→「Functions」**,找到 **「D1 database bindings」**。
3. 点 **「Add binding」**:
   - **Variable name(变量名)**:填 `DB`(必须大写,和代码里一致)
   - **D1 database**:选择刚才创建的 `hplz-db`
4. 点 **「Save」**。
5. 回到 **「Deployments」** 标签页,点 **「Retry deployment」** 重新部署一次(让绑定生效)。

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
