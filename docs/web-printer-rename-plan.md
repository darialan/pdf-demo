# Web Printer 全量更名与发布计划

状态：执行中。日期：2026-10-30。以当前四场景、PDF/PNG 共用输出管线为准。

## 目标与命名

产品名 `Web Printer`；npm 包 `@darialan/web-printer`，新名称首版 `1.0.0`。当前 `@darialan/web-pdf-printer@1.0.2` 继续可下载，不删除、不改写旧版本。更名不改变分页算法，不涉及 Chrome 插件开发。

| 范围 | 当前 | 执行动作 |
| --- | --- | --- |
| 首页与工作台 | WebPDF Printer | 页头、页脚、aria 名称、页面标题、description、manifest 全改为 Web Printer；工作台入口/GitHub Star/安装命令保留 |
| 品牌素材 | 文字标识与四张工作台截图 | 保留现有符号图形，更新文字标识，重新生成含品牌的四场景截图 |
| npm 元数据 | @darialan/web-pdf-printer | 新包名、版本、描述、关键词、主页、仓库链接、lockfile、类型入口、ESM/CJS、安装示例同步 |
| 本地开发 | tsconfig/Jest 包映射、postinstall 自链接 | 映射改新包；删除会改写 node_modules 的自链接脚本；源码相对导入保持有效 |
| 公共输出 API | outputDocument/outputPDF | outputDocument 保持通用主 API；outputPDF 名称只表示 PDF 输出，保留兼容 |
| React | usePdfPrint | 新增 useWebPrinter 与通用 exportDocument；旧 Hook/类型作为兼容别名。通过 `/react` 子入口提供，核心根入口不强制依赖 React |
| HTML 协议 | data-pdf-* / .pdf-* | 新协议 data-print-* / .print-*；内置规则同时识别旧协议。新 Demo/文档使用新协议，专门测试旧协议兼容 |
| 运行时内部 | data-pdf-debug/snapshot 等 | 调试、快照内部标记改 data-print-*；同步测量、克隆、清理与自动化定位 |
| 预览 UI | PdfPreviewModal/MiniPdfPreview 与文件名 | 通用组件、接口、文件、CSS 名称改 Print；PDF writer/jsPDF/格式 MIME 保留 PDF 语义 |
| 文档 | README、接入教程、架构文档、方案与评审 | 当前文档统一品牌和安装/API；历史文档注明旧名关系，历史代码和旧包名仅在兼容/历史语境保留 |
| 发布工具与 CI | 固定旧包名、旧全局名、版本标签触发 | 使用 package.json 元数据；构建全局名 WebPrinter；校验发布包内容与入口；避免已发布版本重复发布 |
| GitHub | darialan/web-pdf-printer | 在可用管理入口更名为 web-printer，保留 GitHub 自带旧地址跳转，更新 remote 与所有当前链接；若管理入口不可用则保留原仓库作为稳定基础设施并明确记录 |
| 线上站点 | Vercel pdf-demo / pdf-demo-phi.vercel.app | 复用已有项目，保留用户原线上 URL；发布新品牌生产构建并验证首页/工作台/资源。部署项目内部 ID、当前工作区目录不为了文字一致而迁移 |

## 顺序与完成标准

1. [x] 本计划写入仓库，完成旧名出现位置清点与发布权限核实。
2. [x] 改品牌、包元数据、协议、内部名称、预览组件与 React 子入口；更新当前文档和迁移指引。
3. [x] 新旧协议兼容单测、Hook 的 PDF/PNG 导出及取消清理；类型检查、全量单测、库与前端生产构建。
4. [x] 全量浏览器回归，真实 PDF/PNG 文件校验、四场景、首页与主题；更新截图后冻结最终构建。
5. [x] npm pack 检查包名、版本、ESM/CJS、类型、/react；在临时空项目安装 tarball，验证无 React 环境下根入口可导入、React 子入口可导入、类型可编译。
6. [x] 提交已验证源码，发布新 npm 包；从官方 registry 下载，在全新临时目录安装并验证实际 API 与依赖。
7. [x] 发布现有 Vercel 生产项目；HTTP 与真实浏览器检查线上首页/工作台品牌、入口与资源；安装命令指向真实已发布包。
8. [x] 更新本计划实际结果、commit、版本、线上 URL 与验证证据后结束。

## 执行结果（2026-10-30）

| 项 | 结果 |
| --- | --- |
| 提交 | `c454d8f refactor!: 项目更名为 Web Printer，npm 包改为 @darialan/web-printer`（更名）；`95287be`（首页二期与依赖调整）；`877c1d2`、`6726057`（输出设置） |
| npm 包 | `@darialan/web-printer@1.0.1` 已发布，`dist-tags.latest = 1.0.1`（1.0.1 修正了 repository / bugs 指向新仓库）；旧包 `@darialan/web-pdf-printer@1.0.2` 保持可下载 |
| 线上站点 | https://pdf-demo-phi.vercel.app 已发布新品牌生产构建（Vercel 项目 `pdf-demo`，部署 `pdf-demo-re1kz9d1l`） |
| 类型检查 / 单测 | `tsc --noEmit` 通过；24 个套件 103 项测试通过（含新旧协议兼容、Hook 导出与取消清理） |
| 构建 | `build:lib` 产出 `index.mjs/index.cjs/react.mjs/react.cjs` 与 `dist/types`；前端 `build` 通过 |
| 浏览器回归 | 24 项 Playwright 通过：四个场景真实下载 PDF 与 PNG ZIP、首页三档视口、暗色主题、错误重试、窄屏 |
| 包校验 | `scripts/verify-package.mjs` 在空目录安装 tarball 与 registry 版本：ESM/CJS 根入口可导入且不含 React，安装 React 后 `/react` 子入口可导入，TypeScript 编译通过 |
| 线上复核 | 真实浏览器打开线上首页与工作台：标题「Web Printer · 长网页，分好每一页」、安装命令 `npm install @darialan/web-printer`、四张场景截图 1440×1000 正常加载、分页预览可用、真实导出「长表格.pdf」成功，无失败请求与页面错误 |

### 仓库更名结果

仓库已在 GitHub 端更名为 `darialan/web-printer`，旧地址 `darialan/web-pdf-printer` 返回 301 跳转到新地址。代码内所有指向源码仓库的链接（package.json 的 repository / bugs、首页与工作台的 GitHub 入口、release 脚本输出、e2e 断言）与 git remote 一并切换到新地址。npm 包为此发布 1.0.1，只改元数据，不涉及运行时行为。

### 本轮确认保留的旧名

- 旧 npm 包 `@darialan/web-pdf-printer@1.0.2` 不下架。
- `data-pdf-*` / `.pdf-*` 协议、`usePdfPrint` / `outputPDF` 等旧 API 作为兼容别名保留，由专门单测覆盖。

## 异常与恢复

发布前失败只修复本地内容。npm 版本不可覆盖，发布前必须先完成 tarball 校验。npm/部署身份校验若需要用户完成登录或动态认证，保留已完成工作并明确指出唯一缺少的认证；不索取聊天中的密钥。发布后不删除旧包。线上部署异常使用 Vercel 前一生产版本恢复。不可把本地构建成功当作 npm 发布或线上验证成功。

站点继续使用现有生产 URL；仓库地址变更只影响源码链接，不影响已发布产物。
