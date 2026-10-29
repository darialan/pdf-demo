# WebPDF Printer (@darialan/web-pdf-printer) NPM 官方源发布与一键迭代指南

本文档作为项目维护者专用指南，详细记录将 `@darialan/web-pdf-printer` 发布至 [NPM 官方注册表](https://www.npmjs.com/package/@darialan/web-pdf-printer) 的前置准备、**一键自动化发版（One-Click Release）** 机制，以及常见故障排查手册。

---

## 目录

1. [项目发布现状与前置校验](#一项目发布现状与前置校验)
2. [首次发布前置准备（仅需一次）](#二首次发布前置准备仅需一次)
3. [🚀 核心推荐：一键极速发版命令](#三-核心推荐一键极速发版命令)
4. [手动分步发版标准流程](#四手动分步发版标准流程)
5. [🤖 进阶：GitHub Actions 云端自动发版](#五-进阶github-actions-云端自动发版)
6. [常见发版报错与排查手册 (FAQ)](#六常见发版报错与排查手册-faq)

---

## 一、项目发布现状与前置校验

本项目已在 `package.json` 和构建层完成全套标准化配置：

- **双模块导出规范**：构建产物位于 `dist/`，包含 ESM 格式（`index.mjs`）、CommonJS 格式（`index.cjs`）及全套 TypeScript 声明（`index.d.ts` 与 `types/`）。
- **Scoped 包公开权限**：`package.json` 已配置 `"publishConfig": { "access": "public", "registry": "https://registry.npmjs.org/" }`，避免 Scoped 包默认被判定为私有包而触发 402 错误。
- **依赖隔离**：核心打印引擎仅将 `html2canvas`、`jspdf` 和 `react` 声明为 `peerDependencies`，Demo 依赖（`antd`、`react-scripts`、单测套件等）已安全移入 `devDependencies`，外部项目安装体积仅约 **89 KB**。
- **自动化安全守卫**：配置了 `prepublishOnly` 脚本，在执行发布前会自动拦截并运行 `npm run test:once && npm run build:lib`，单测失败或打包报错将自动中断发布。

---

## 二、首次发布前置准备（仅需一次）

### 1. 确保切换为 NPM 官方源（关键）
国内开发经常使用淘宝/腾讯镜像源，镜像源是**只读**的，发布必须切回官方源：
```bash
npm config set registry https://registry.npmjs.org/
```
> 验证命令：`npm config get registry`，输出应为 `https://registry.npmjs.org/`。

### 2. 登录 NPM 维护者账号
在本地终端中运行：
```bash
npm login
```
终端将提示输入用户名、密码及邮箱，并在浏览器中或通过终端完成动态验证码（OTP/2FA）认证。
> 验证命令：`npm whoami`，应正确输出你的 NPM 用户名。

### 3. 确认命名空间权限
当前包名为 `@darialan/web-pdf-printer`：
- 若你的 NPM 账号名即为 `darialan`，默认拥有该 Scope 权限。
- 若你的账号名为其他名称，需在 [npmjs.com](https://www.npmjs.com/) 网页端点击右上角头像 -> **Add Organization** -> 创建名为 `darialan` 的免费公开（Public）组织并将自己设为主管理员。

---

## 三、🚀 核心推荐：一键极速发版命令

为彻底解放双手，项目内置了全自动化发版工具脚本 [`scripts/release.mjs`](../scripts/release.mjs)。当你修改了功能或修复了问题，**仅需在终端敲一行命令**即可完成全套发布：

### 常用发版命令

```bash
# 1. 修复 Bug、细节微调（最常用：补丁发版，如 1.0.0 -> 1.0.1）
npm run release
# 或明确指定：
npm run release:patch

# 2. 新增功能、扩展 API（次版本发版，如 1.0.1 -> 1.1.0）
npm run release:minor

# 3. 架构重构、存在非向下兼容变更（主版本发版，如 1.1.0 -> 2.0.0）
npm run release:major
```

### ⚡ 脚本内部自动执行的 9 道安全流水线：

```
Git 工作区清洁度检查
       ↓
NPM 官方源自动校验/纠偏
       ↓
NPM 账号登录态校验 (npm whoami)
       ↓
自动化全量单测回归 (npm run test:once) —— 失败自动熔断
       ↓
自动化纯净库打包 (npm run build:lib)
       ↓
自增 package.json 版本号并自动打 Git Tag (如 v1.0.1)
       ↓
推送到 NPM 官方仓库 (npm publish --access public)
       ↓
自动推送本地 Git Commit 与 Tags 到 GitHub 远程仓库
       ↓
打印发布成功报告与直接访问的 NPMJS 包地址
```

全程无需手动修改 `package.json` 中的版本号，也无需手动敲 `git push --tags`，10 秒内全自动完成。

---

## 四、手动分步发版标准流程

若需要进行精细化控制或排查流程问题，可以按照以下步骤手动执行：

### 步骤 1：本地提交代码
确保工作区改动均已提交：
```bash
git status
git commit -am "feat: xxx"
```

### 步骤 2：全量自测与构建
```bash
# 运行全量单元测试
npm run test:once

# 构建最新产物
npm run build:lib
```

### 步骤 3：模拟发版打包演练 (Dry Run)
在不真正上传的情况下检查打包内容和体积：
```bash
npm publish --dry-run
```
确保仅包含 `dist/`、`README.md`、`LICENSE` 等核心必要文件。

### 步骤 4：升级版本号并生成 Tag
```bash
# 升级 patch 版本并生成提交记录和 Git Tag
npm version patch -m "chore(release): v%s"
```

### 步骤 5：正式推送到 NPM
```bash
npm publish --access public
```

### 步骤 6：同步推送到 GitHub
```bash
git push && git push --tags
```

---

## 五、🤖 进阶：GitHub Actions 云端自动发版

除了本地一键脚本外，还可以配置 GitHub 自动化工作流。只需在 GitHub 网页上新建一个 Release，云端即可自动执行测试、打包并发布。

### 1. 配置 NPM Access Token
1. 登录 [npmjs.com](https://www.npmjs.com/)，点击头像 -> **Access Tokens** -> **Generate New Token** -> 选择 **Automation**。
2. 复制生成的 Token（形如 `npm_xxxxxxxxxxxx`）。
3. 打开 GitHub 仓库页面 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**。
4. Name 填写 `NPM_TOKEN`，Secret 粘贴上述 Token 并保存。

### 2. 工作流配置文件
项目已包含 `.github/workflows/npm-publish.yml`（可在 GitHub 触发：推送 `v*` 格式标签或手动点击 Run workflow 触发发布）。

---

## 六、常见发版报错与排查手册 (FAQ)

### Q1: 报错 `402 Payment Required - You must sign up for private packages to publish scoped packages`
- **原因**：带有 `@` 符号的包（Scoped 包）默认被 NPM 视为私有包，私有包需要付费订阅。
- **解决办法**：发布时加上 `--access public` 参数，或确保 `package.json` 中配置了：
  ```json
  "publishConfig": {
    "access": "public"
  }
  ```

### Q2: 报错 `403 Forbidden` 或 `You do not have permission to publish "@darialan/web-pdf-printer"`
- **原因**：当前登录的 NPM 账号不是 `darialan`，且没有 `@darialan` 组织的所有权或写权限。
- **解决办法**：
  1. 登录 [npmjs.com](https://www.npmjs.com/)，在个人账号下创建名为 `darialan` 的公开组织；
  2. 或者在 `package.json` 中将包名命名空间改为你的 NPM 用户名（如 `@<你的用户名>/web-pdf-printer`）。

### Q3: 报错 `ENEEDAUTH` 或 `401 Unauthorized`
- **原因**：本地 NPM 未登录或登录 Token 已过期失效。
- **解决办法**：重新在终端运行 `npm login` 完成二次验证（2FA）。

### Q4: 报错 `404 Not Found - PUT https://registry.npmmirror.com/...`
- **原因**：当前误用镜像源（淘宝源/腾讯源）进行上传操作，镜像源不支持写操作。
- **解决办法**：
  ```bash
  npm config set registry https://registry.npmjs.org/
  ```

### Q5: 提示工作区有未提交的代码
- **原因**：为了保证代码仓库与发布的包版本强一致，`npm run release` 脚本会检查 Git 状态。
- **解决办法**：发版前先执行 `git add . && git commit -m "feat: xxx"` 保存修改。
