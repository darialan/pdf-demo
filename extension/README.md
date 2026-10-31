# Web Printer Chrome 扩展

扩展在本地读取用户选定的网页区域，复用 `src/lib` 分页引擎，生成 PDF 或逐页 PNG ZIP。源文档、图片和文件不会上传。

## 开发与构建

```sh
npm install
npm run typecheck:extension
npm run build:extension
npm run build # 四个 demo 用作扩展验收内容
npm run test:extension
```

可加载扩展位于 `extension/dist`，独立于网站构建和 npm 包发布。开发者模式加载后，点击浏览器工具栏中的 Web Printer 图标打开侧边栏。仅在点击后通过 `activeTab` 临时授权当前网页；不申请全站常驻权限。

## 结构

- `background.ts`：图标入口、按需注入；不承载导出长任务。
- `content/index.ts`：选区／排除、快照会话、资源探测、任务队列、变化监测、取消和下载。
- `sidepanel`：设置、按页预览、格式选择、错误及状态；不接收原始网页 HTML 或最终文件。
- `shared/protocol.ts`：消息结构、设置校验和对外错误文案。
- `../src/lib/application/print-session.ts`：同一份冻结布局用于预览和 PDF／PNG 输出。已有 `outputDocument()` 调用保持兼容。

## 测试边界

`extension-tests` 使用独立临时 Chromium 配置，加载真实 MV3 扩展，并实际注入内容脚本、解析下载 PDF／PNG。为替代无头自动化不能点击浏览器工具栏的用户手势，测试副本仅增加 `http://127.0.0.1/*` host 权限；构建产物没有该权限。该测试不等于已在用户日常 Chrome 安装，也不能代替最终的生产权限／图标入口人工验收。

## 支持边界

首版支持主文档中已完整加载的内容。跨域 iframe、视频、Shadow DOM、虚拟列表与未展开滚动内容会明确提示；可排除相关内容后重试。不自动抓取隐藏数据，不绕过网站资源权限。PNG ZIP 存在累计编码字节内存开销，超过预算会停止，不下载半成品。
