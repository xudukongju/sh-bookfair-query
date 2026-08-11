# 部署到 Render（公网实时查看）

本目录是一个**零依赖 Node 静态服务**，把 `index.html`（上海书展·文学周查询页）托管出去。
仿照「甜心小店」项目的 Render 一键部署（方案 A）：用 `render.yaml` + GitHub 推代码。

## 1. 推送到 GitHub
本 `render-deploy/` 目录已是一个独立 Git 仓库（已 `git init` 并提交）。
你只需把它推到你的 GitHub 即可：
```bash
cd render-deploy
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```
> 若你想把 `render-deploy` 作为某个大仓库的子目录，则 Root Directory 要改成子目录路径。

## 2. Render 创建服务
1. 打开 https://dashboard.render.com → 用 **GitHub** 登录并授权。
2. 右上角 **New+ → Web Service** → 选你的仓库。
3. **Name**：`sh-bookfair`（随意）。
4. **Root Directory**：**留空**（仓库根目录即本目录）。
5. **Runtime**：Node（自动识别）。
6. **Build Command**：`echo no-build`（无依赖，无需安装）。
7. **Start Command**：`node server.js`（已写在 package.json 的 start）。
8. **Plan**：Free（免费，region 自动 oregon）。
9. 点击 **Create Web Service**。

部署完成后会得到一个 `https://sh-bookfair-xxxx.onrender.com` 的公网地址，手机/电脑直接打开即可实时查看。

## 3. 开启自动部署（重要）
Render 的 **Auto-Deploy 默认关闭**。创建后到服务 **Settings → Branch → Auto-Deploy** 设为 `On Commit`。
之后每次 `git push`，Render 自动重新构建上线（只对开启后的新提交生效；旧提交需 Manual Deploy 或空提交）。

## 4. 本地预览
```bash
cd render-deploy
node server.js          # 或 npm start
# 浏览器打开 http://localhost:3001
```

## 5. 注意（踩坑，同参考项目）
- 免费实例**首访会有 30–50 秒冷启动唤醒**，属正常。
- 免费计划**磁盘不持久**（本页纯静态、状态用浏览器 localStorage，不受影响）。
- 不要硬编码 `PORT` —— Render 通过环境变量自动注入；`server.js` 已用 `process.env.PORT || 3001` 兼容本地。
- 改了原 `上海书展查询.html` 后，记得重新 `cp 上海书展查询.html render-deploy/index.html` 再推。
