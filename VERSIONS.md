# 版本管理使用说明（VERSIONS）

目标：随时能**回退**到「v1.0 这一版」，也能安全地**更迭**出新版本，绝不丢失旧版本。

---

## 一、版本都在哪
| 位置 | 说明 |
|------|------|
| `https://sh-bookfair-query.onrender.com` | 线上运行的网站（Render 免费服务，auto-deploy 已开） |
| `上海书城/上海书展查询.html` | 你的本地原件（日常打开/查看用） |
| `上海书城/render-deploy/index.html` | 部署副本（推到 GitHub 后由 Render 拉取上线） |
| `上海书城/render-deploy/versions/` | 每个版本的独立完整快照（如 `index.v1.0.html`） |
| Git 标签 `v1.0` 等 | 可回退的版本历史（在 `render-deploy/` 仓库里） |

> 约定：`上海书展查询.html` 与 `render-deploy/index.html` 内容保持一致。改完原件后同步一次即可。

---

## 二、只是想「看看旧版本长啥样」
直接用浏览器打开 `render-deploy/versions/index.v1.0.html`，**不影响任何东西**。

---

## 三、回退到某个版本（本地文件）
**方式 A — 用快照（推荐，不需要 git）：**
1. 把 `render-deploy/versions/index.v1.0.html` 复制为 `render-deploy/index.html`
2. 同时也复制为 `上海书城/上海书展查询.html`（保持两个原件一致）

**方式 B — 用 git 标签：**
```bash
cd 上海书城/render-deploy
git checkout v1.0 -- index.html
```

---

## 四、回退线上（让网站也变回旧版）
前提：本地已按「三」回退好 `index.html`。

- **最简法（不动 git）**：打开 Render 后台 → 该服务 **Deploys** → 找到 v1.0 对应的那次部署 → 点 **Redeploy**（重新部署）。
- **git 法（从你本机推送）**：注意本仓库「本地 git 历史」与 GitHub 上「API 创建的提交」是两条独立历史，直接 `git push` 会被拒绝。确认无误时用：
  ```bash
  git push --force-with-lease origin main && git push --force origin refs/tags/v1.0
  ```
  （仅此个人单用途仓库、且你确认无误时才强制推送；否则直接走上面的 Redeploy 更稳。）

---

## 五、更迭出新版本（正常迭代流程）
1. 修改 `上海书城/上海书展查询.html`（你的本地原件）。
2. 同步到部署副本：
   ```bash
   cp 上海书城/上海书展查询.html 上海书城/render-deploy/index.html
   ```
3. 提交并打标签（在本地做，离线即可）：
   ```bash
   cd 上海书城/render-deploy
   git add -A
   git commit -m "v1.1: <本次改了什么>"
   git tag -a v1.1 -m "v1.1: <本次改了什么>"
   ```
   推送上线二选一：
   - **让我推（推荐）**：你给我一个一次性 GitHub Token（repo 权限），我用 GitHub API 推送 —— 沙箱里 git 协议被限制，直接 push 不通，API 通道可用。
   - **你本机推**：因本地与 GitHub 历史独立，需强制推送 reconciling：
     ```bash
     git push --force-with-lease origin main && git push --force origin refs/tags/v1.1
     ```
     （仅此个人仓库、确认无误时执行；强制推送会覆盖 GitHub 历史。）
4. 生成快照并登记：
   ```bash
   cp index.html versions/index.v1.1.html
   ```
   在 `CHANGELOG.md` 追加一行 v1.1 的记录。
5. 推送后 Render 自动上线新版本。

---

## 六、重要约定
- **v1.0 是保底基准版**，除非你明确同意，不会被覆盖。
- 每次大改都会升一个版本号，**绝不直接改写 v1.0**。
- 某次更新不满意？按「三 / 四」回退即可，旧版本都还在。
- 如果由我代你推送 GitHub / 重建部署，需要你提供一次性的 GitHub Token 或 Render Key（用完即废）。
