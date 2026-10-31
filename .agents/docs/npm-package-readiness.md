# npm 包生产就绪度 Review（@darialan/web-printer）

- 日期：2026-10-31
- 适用版本：`@darialan/web-printer` 1.1.0（基线 `cafdd35`）
- 范围：`src/lib`（npm 包源码，不含 demo / landing / 浏览器扩展）
- 基线：`cafdd35 feat: 落地页改版为中英双语并接入真实分页预览`，版本 `1.1.0`
- 结论：**核心算法与生命周期达到生产水准；渲染底座和工程配套尚未达到"任意网页通用"的标准。**
- 本轮决策：**只修文档，不改代码**。性能与错误模型问题接受现状，记录在案，下一版再处理。
- 本文档用途：作为缺陷台账与下一版的施工单；发布前按第 7 节清单核对。

---

## 1. 结论摘要

| 维度 | 结论 | 说明 |
| --- | --- | --- |
| 功能正确性（A4/页眉页脚/页码/PDF/PNG） | ✅ 通过 | 真实浏览器导出并校验了 PDF 结构、ZIP 结构与像素内容 |
| 生命周期（取消、清理、并发、源 DOM 隔离） | ✅ 良好 | abort 后快照清理、失败可重试、并发锁、源样式不变 |
| 大文档性能 / 内存 | ⚠️ 可用但接近上限 | 24 页：PDF 13.4s / 13.2MB；PNG 6.6s / 17.7MB |
| CSS 保真度 / 兼容性 | ❌ 有一个阻断问题 | `oklch()` / `color-mix()` 直接抛错（Tailwind v4 默认色板） |
| 错误契约 / API 面 | ⚠️ 待改进 | 无错误码；内部实现全量导出（60 个运行时导出） |
| 发布与测试工程化 | ⚠️ 待改进 | 无 lint / PR CI / 覆盖率 / provenance；打包校验脚本未接入 |
| 接入文档准确性 | ❌ 有实质性错误 | 组件库规则、测试数量、内存结论、PNG 自动化覆盖等多处与代码不符 |

一句话：**自建报表页、CSS 可控的场景可以发布使用；对外宣传"任意网页高保真"之前，必须先处理 oklch 问题。**

---

## 2. 验证环境与证据

验证环境：macOS / Chromium 141（Playwright）/ Node 本地仓库；所有结论均可复现。

### 2.1 静态与单元测试

```sh
npx tsc --noEmit                 # 通过
npm run test:lib                 # 19 suites / 94 tests 全过（npm 包范围）
npx react-scripts test --watchAll=false  # 26 suites / 121 tests 全过（含 demo/landing）
npx playwright test              # 5 tests 全过
npm audit --omit=dev             # 0 vulnerabilities
```

> 注：审查开始时全量测试为 1 红（`src/App.test.tsx` 的场景链接断言仍匹配旧文案），会直接卡住 `prepublishOnly`。已改为按 `45 行` 匹配，本轮修复。

### 2.2 真实导出校验

用 24 页文档（400 段文字 + 原子色块）走 `createPrintSession` → `thumbnail` → `exportDocument`：

| 指标 | 结果 |
| --- | --- |
| 页数 | 24 |
| prepareLayout | 260 ms |
| PDF 导出 | 13.4 s，13.16 MB |
| PNG(ZIP) 导出 | 6.6 s，17.73 MB |
| PDF 结构 | `pdfjs-dist` 解析成功，4 页测试文档为 `595.28 × 841.89 pt`（A4） |
| ZIP 结构 | `unzip -t` 全部 OK，`page-001..004.png` 正常 |
| 像素抽样 | 每页非白像素充足；`data-print-atomic` 红色块完整落在第 4 页，未跨页 |

### 2.3 包与消费者验证

- `npm pack`：约 138 KB tarball / 56 files。
- 临时消费者工程（`moduleResolution: node16`）：ESM、CJS、`/react` 子入口、`.d.ts` 均解析通过。
- `node scripts/verify-package.mjs ./darialan-web-printer-1.1.0.tgz` 通过：在空工程中安装 tarball，验证 ESM、CJS、`/react`、类型与依赖安装。
- 运行时无隐藏依赖：核心只依赖 `html2canvas` + `jspdf`；React 仅 `/react` 入口使用。

### 2.4 快照体积

400 个节点、源 HTML 40 KB 的文档：

| 指标 | 数值 |
| --- | --- |
| 快照 HTML | 2.61 MB |
| 其中内联 `style` | 2.56 MB |
| 平均每节点内联样式 | ≈ 6.4 KB |

原因：`copyResolvedStyle` 对每个元素复制全部 computed property。见 `src/lib/adapters/dom/snapshot.ts:14-29`。

---

## 3. 问题总表

| ID | 级别 | 问题 | 主要位置 | 本轮处理 |
| --- | --- | --- | --- | --- |
| P0-1 | 阻断 | 现代 CSS 颜色函数导致导出直接失败 | `adapters/canvas/page-capture.ts:19` | 文档标注限制 + 下一版换底座 |
| P1-1 | 高 | 无错误码，取消靠匹配中文字符串 | `application/cancellation.ts:2`、`hooks/use-web-printer.ts` | 延期 |
| P1-2 | 高 | PDF/PNG 内存随总页数线性增长，超限发现太晚 | `adapters/pdf/jspdf-writer.ts:78`、`output/image-writer.ts:100,120` | 延期（文档写明上限） |
| P1-3 | 高 | 公共 API 面过大，内部实现进入 semver | `src/lib/index.ts:7-35` | 延期 |
| P1-4 | 中 | 快照内联样式膨胀 6.4KB/节点 | `adapters/dom/snapshot.ts:14-29` | 延期 |
| P1-5 | 中 | 预览断点用快照坐标画在源 DOM 上，ignore 节点会造成偏移 | `hooks/use-web-printer.ts:54-56` | 延期 |
| P1-6 | 中 | e2e 只断言 `bytes > 1000`，防不住白页回归 | `e2e/engine.spec.mjs` | 延期（文档如实描述） |
| P1-7 | 中 | 包元数据与发布流程缺少护栏 | `package.json`、`scripts/release.mjs`、CI | 部分改为文档 |
| P1-8 | 中 | 接入文档与实现不一致（多处） | README、`docs/*.md` | **本轮修复** |
| P1-9 | 高（流程） | 全量测试 1 红，`prepublishOnly` 会直接阻断发版 | `src/App.test.tsx:106` | **本轮修复** |
| P2-* | 低 | 见第 6 节 | — | 记录 |

---

## 4. P0：现代 CSS 颜色函数

### 现象

打印区域内任何元素只要使用了 `oklch()`、`color-mix()`、`lab()`、`lch()`、`color()` 等现代颜色函数，导出会在逐页截图阶段抛错：

```text
Error: Attempting to parse an unsupported color function "oklch"
```

`color-mix(in srgb, red, blue)` 会抛出：

```text
Error: Attempting to parse an unsupported color function "color"
```

（Chrome 会把 `color-mix` 的计算值归一成 `color(srgb ...)`。）

错误栈完全落在 `node_modules/html2canvas` 内部，**不包含元素、选择器或页码信息**；此时 `prepareLayout` 已成功，前面页面的截图工作作废，用户只看到一条英文底层错误。

### 复现

```ts
root.innerHTML = '<div style="height:40px;background:oklch(0.6 0.2 30)">x</div>';
await createPrintSession({ element: root }); // 截图阶段抛错
```

### 影响面

- `html2canvas@1.4.1` 的最后一个版本发布于 **2022-01-22**，之后没有新版本，对现代 CSS 支持停滞。
- **Tailwind CSS v4 的默认调色板就是 oklch**：`bg-*` / `text-*` / `border-*` 全部命中。大量新项目会直接无法导出。
- 目前 README 只写了"复杂 CSS 的还原受 html2canvas 支持范围影响"，不足以让接入方预判这个硬失败。

### 下一版修复建议（约半天）

首选：**替换渲染底座为 `html2canvas-pro`**（API 兼容分支，明确支持 `color()` / `lab()` / `lch()` / `oklab()` / `oklch()`）。

- 接入点只有 `src/lib/adapters/canvas/page-capture.ts:1,19`；
- 同步改 `package.json` 依赖与 `vite.config.lib.ts` 的 `external`；
- 实测版本注意：`2.5.4` 已验证包含 `color-mix` 解析（`2.5.0` 尚未包含），`2.5.4`/`2.6.0` 的 `package.json` 把 `engines.node` 写成 `>=24`，安装时会告警但不影响浏览器运行，需锁版本并在发版说明中注明；
- 替换后必须重跑 `npm run check:full`，并新增 oklch/color-mix 像素断言用例。

兜底：保留 html2canvas，在 `copyResolvedStyle` 阶段把颜色归一化。1×1 canvas 探针可行：

```ts
ctx.fillStyle = 'oklch(0.6 0.2 30)'; // Chrome 接受
ctx.fillRect(0,0,1,1);
// getImageData → 222,62,45
```

但该方案只覆盖纯色，渐变/阴影/伪元素里的颜色仍需额外处理，维护成本更高。

### 本轮临时措施（文档）

在接入指南的 FAQ 中明确写出该限制与规避方式（打印区域内改用 `rgb()`/十六进制）；README 面向首次使用者，不单列限制章节，避免把已知缺陷放在产品门面上。

---

## 5. P1 详情

### P1-1 没有错误模型

`application/cancellation.ts:2` 只抛 `new Error('导出已取消')`；所有错误都是中文纯文本，没有 `code` / `cause` / 类型。

后果：

- 业务方只能用 `error.message.includes('取消')` 判断取消；
- 无法区分资源超时、图片跨域、页数超限、像素超限；
- 库无法做 i18n。

建议（下一版）：`PrintError extends Error` + `code` 枚举（`CANCELLED | NO_ELEMENT | INVALID_SETTINGS | RESOURCE_TIMEOUT | IMAGE_CORS | PAGE_LIMIT | CANVAS_LIMIT | ENCODER_FAILED`）+ `isPrintCancelled()`。文档示例里目前也在教用户匹配字符串（`docs/npm-package-guide.md` 3.3 节），届时一并改掉。

### P1-2 内存与页数上限

- PDF：整本驻留 jsPDF 内存，`pdf.output('blob')` 再复制一份。实测 24 页 ≈ 13 MB，线性推算 100 页 ≈ 55 MB blob + base64 中间态，移动端 Safari 有 OOM 风险。
- PNG：`maxBytes` 默认 128 MiB，但边导边攒、**超限才报错**，用户等几分钟后才失败；社媒大图单页可达 2–5 MB。
- `maxPages` 默认 100，与上述预算并不自洽。

建议：导出前按页数/面积预估字节并 fail-fast；默认上限与预算对齐；文档明确"建议 ≤ N 页"；长期考虑流式落盘或换可控内存的 writer。

### P1-3 公共 API 面过大

`src/lib/index.ts` 用 `export *` 暴露了 `walkPrintTree`、`readRootHeight`、`createTextMeasurer`、`cloneWithResolvedStyles`、`composePageCanvas`、`createZipArchive`、`planDocument`、`resource-loader` 等内部实现，`dist/index.mjs` 实测 **60 个运行时导出**。

后果：任何内部重构都可能变成 breaking change，semver 被内部实现绑架。

建议：顶层显式具名导出；内部模块收进 `./internal` 或不导出；高级能力走 `exports` 子路径。

### P1-4 快照内联样式膨胀

见第 2.4 节。建议为 `copyResolvedStyle` 建立属性白名单（布局/字体/颜色/背景/边框/transform 等约 80 条），跳过与初始值相同的属性；收益是内存和逐页截图耗时同时下降。

### P1-5 预览坐标与导出坐标不一致

`hooks/use-web-printer.ts:54-56` 把 `inspectPrintLayout`（快照坐标系）的断点画在源 DOM 上；而 `print-service.ts:109-115` 自己注释了"移除 ignore 节点会 reflow，快照坐标与源坐标不可比"。

只要 ignore 规则移除了页面上方的工具栏，overlay 线就整体偏移。demo 的 `markSource` 又改用源 DOM 测量，两套逻辑并存。

建议：统一坐标系——要么把快照可视化呈现，要么返回源坐标系断点；在类型/文档中写明坐标系。

### P1-6 测试强度不足

现有 e2e 对 PDF 只断言 `bytes > 1000`，**空白画布编码后的图像也有数 KB，无法区分内容与白页**。本次是额外做像素抽样才确认内容真的在。

建议：

- 抽样正文、原子块、页眉页脚、页码的关键像素，或做整页截图 diff；
- 增加 oklch/color-mix、grid/flex、`::before`、跨域图片失败路径的浏览器用例；
- 单测覆盖率阈值；e2e 纳入 PR CI。

### P1-7 包元数据与发布流程

- 缺 `"sideEffects": false`：核心只有一个 chunk，`import { paginate }` 也会带上 DOM/PDF 代码；
- 缺 `"./package.json"` 导出、`engines`、`CHANGELOG.md`；
- `react-dom` 在 `src/lib` 中完全没用到，却作为 optional peer，造成多余安装提示；
- peer 范围 `">=16.8.0 || >=17.0.0 || >=18.0.0"` 等价于 `>=16.8.0`；
- `/react` 入口没有 `'use client'`，Next.js App Router 用户会踩"useState only works in Client Components"；
- `release.mjs` 用 `npm config set registry` **永久修改开发者本机 registry**，应改为命令级 `--registry`；
- `scripts/verify-package.mjs`（空消费者安装 + ESM/CJS/类型校验）已经存在，但**没有接进 `prepublishOnly` / release / CI**；
- CI 只在发布时跑测试，没有 PR 检查、lint、coverage、e2e、浏览器矩阵；发布使用长期 token，建议 trusted publishing + `publishConfig.provenance`；
- `dist/*.map` 带 `sourcesContent` 随包发布（约占 dist 一半体积）。

本轮：只改文档（发布指南补充 `verify-package.mjs` 与 registry 警告）。

### P1-8 接入文档与实现不一致

详见第 7 节，本轮修复。

---

## 6. P2 清单

| ID | 问题 | 位置 |
| --- | --- | --- |
| P2-1 | 先设 `src` 再设 `crossOrigin`，会触发二次请求 | `adapters/dom/snapshot.ts:83-97` |
| P2-2 | overlay 的 `restorers` 用 `Map` 强引用 DOM，忘记清理会泄漏 | `overlay/page-break-overlay.ts:11` |
| P2-3 | `inspectPrintLayout` 默认向 `window` 广播两个全局事件 | `application/print-service.ts:129-131` |
| P2-4 | SSR 下 import 安全，但调用只会得到 `document is not defined` | 全局 |
| P2-5 | `PrintSettings.unit` 运行时未生效；custom 的 px 尺寸硬编码 200/2 | `core/geometry/paper.ts:139-195` |
| P2-6 | `strict: true` 但 `noImplicitAny: false`，另有 `as any` 两处 | `tsconfig.json`、`snapshot.ts:101`、`print-pipeline.ts:112` |
| P2-7 | `inspectPrintLayout` 对快照二次测量，诊断路径多一倍成本 | `application/print-service.ts:114` |
| P2-8 | README 里相对链接在 npmjs 页面会 404 | `README.md` |
| P2-9 | 图/字体等待超时固定 15s，慢网络下可能需要可配置 | `adapters/resources/resource-loader.ts:20` |

---

## 7. 本轮发版：只修文档

> 维护者决定：性能、错误模型、API 收敛全部延期；本次发版的价值在于"文档说的就是代码做的"。

本轮修复清单：

0. **发版门禁**：修复 `src/App.test.tsx` 的过期断言（场景链接文案已随落地页改版变化），使 `npm run test:once` 恢复 26 suites / 121 tests，避免 `prepublishOnly` 阻断发布。
1. **README**
   - 按主流 OSS README 的结构重写：一句话定位 → 特性 → 安装 → 快速开始 → 标记协议 → React → 常用参数 → 已知限制 → 文档 → 开发 → License；
   - 删除 demo 场景表、工作台交互、源码布局等与接入无关的内容，开发细节移到 `CONTRIBUTING.md`；
   - 相对链接在 npmjs 上 404 → 改为 GitHub 绝对地址（`master` 分支）；
   - **删除迭代史内容**：旧 Hook 名、旧 `data-pdf-*` 标记、旧包版本与迁移说明不再出现在 README（README 面向第一次使用的读者），迁移信息保留在 `docs/migration-to-web-printer.md`；
   - 现代颜色函数的限制与规避方式写入接入指南 FAQ；README 不单列“已知限制”，保持面向首次使用者的产品页结构；
   - React 部分保留 Next.js 客户端组件提示。
2. **`docs/npm-package-guide.md`**
   - "14 套单测、44 个用例" → 实际 19 / 94；
   - "零污染、支持 Tree-shaking" → 未声明 `sideEffects`，改为准确描述；
   - 4.2 节代码片段与 `copyResolvedStyle` 实现相反（实际保留 min/max 约束）；
   - 4.3 节 `createTextMeasurer` 片段缺少 leading 计算与字符数上限；
   - 4.4 节分页伪代码是旧实现（当前已改为合并区间 + 游标），复杂度分析随之失效；
   - 4.5 节"内存始终 5~10MB、消除大文档 OOM"与事实不符（PDF 全量驻留、PNG 累积到 finalize）；
   - 5.3 节声称内置 `.ant-table-row` / `.el-table__row` / `.ant-pagination` 规则 → **代码明确不硬编码任何组件库类名**，这是会直接误导接入方的错误；
   - 3.3 节 JSX 里使用 HTML 注释 `<!-- -->`，不是合法 JSX；
   - Q3 的"A4 容量约 950px"未说明依赖源区域宽度。
3. **`docs/output-formats.md`**
   - "验证"一节声称浏览器自动化覆盖 PNG ZIP 下载、逐页解码、非空像素检查 → 当前 e2e **没有**这些用例，改为如实描述。
4. **`.agents/docs/publishing.md`**
   - "10 秒内全自动完成"夸大；
   - 补充已存在的 `scripts/verify-package.mjs` 消费者校验步骤；
   - 标注 `release.mjs` 会永久改写本机 registry；
   - 工作流触发条件与实际 YAML 对齐。
5. **新增 `.agents/docs/documentation.md`**
   - 建立"文档事实 → 代码位置"映射表与发版前文档检查清单，避免下次再漂移。

本轮改动文件：

| 文件 | 说明 |
| --- | --- |
| `README.md` | 按 OSS 惯例重写；只保留定位、特性、安装、快速开始、标记、React、参数、文档、开发、License |
| `CONTRIBUTING.md` | 新增：环境、脚本、提交钩子、源码结构、文档维护与发布前检查 |
| `docs/npm-package-guide.md` | 修正测试数量、内存/分页/快照描述、组件库规则、代码片段、容量公式；补充 `createPrintSession` 与高级参数 |
| `docs/output-formats.md` | 修正 PNG 自动化覆盖描述 |
| `.agents/docs/publishing.md` | 补充 dry-run、verify-package、registry 与 CI 说明 |
| `.agents/docs/documentation.md` | 新增：文档维护约定与发版检查清单 |
| `.agents/docs/npm-package-readiness.md` | 新增：本 review 台账 |
| `src/App.test.tsx` | 仅修正过期测试断言（场景链接文案），无运行时改动 |

发版步骤建议：

```sh
npm run check:full          # 类型 + 单测 + 构建 + e2e
npm pack                    # 生成 tarball
node scripts/verify-package.mjs ./darialan-web-printer-<version>.tgz
npm run release:patch       # 或 release:minor
```

版本口径：纯文档修复用 **patch**；如果同时合入 P0 渲染底座替换，建议 **minor**。

---

## 8. 下一版（若要动代码）的最小路径

按投入产出排序：

1. **P0：换 `html2canvas-pro@>=2.5.4`**（半天）
   - 改 1 个 import、1 个依赖、1 个 external；
   - 新增 oklch/color-mix e2e 像素用例；
   - 重跑 `check:full` + `verify-package.mjs`；
   - 接入指南 FAQ 中的限制条目改为"已支持"。
2. **P1-1：错误码 + `isPrintCancelled`**（半天）
3. **P1-2：页数/内存预估 fail-fast + 文档上限**（半天）
4. **P1-3/P1-7：API 收敛 + 包元数据 + verify-package 接入 CI**（1 天）
5. **P1-6：像素断言 + PR CI**（1 天）

---

## 9. 附录

### 9.1 关键复现片段

```ts
// 现代颜色函数（预期失败）
const root = document.getElementById('fixture')!;
root.innerHTML = '<div style="background:oklch(0.6 0.2 30);height:40px">x</div>';
await outputDocument({ element: root, filename: 'oklch', format: 'png', download: false });

// 颜色归一化探针（兜底方案可行性验证）
const c = document.createElement('canvas'); c.width = c.height = 1;
const ctx = c.getContext('2d')!;
ctx.fillStyle = 'oklch(0.6 0.2 30)';
ctx.fillRect(0, 0, 1, 1);
console.log([...ctx.getImageData(0, 0, 1, 1).data]); // [222, 62, 45, 255]
```

### 9.2 发布前自检

- [ ] `npm run check:full` 通过
- [ ] README 中的链接在 npmjs 上可点（全部绝对地址）
- [ ] 文档中的默认值（100 页 / 128MiB / 15s / 8M 像素 / 200k 字符）与代码一致
- [ ] 测试数量、e2e 覆盖描述与实际一致
- [ ] `npm pack --dry-run` 文件列表符合预期
- [ ] `node scripts/verify-package.mjs <tarball>` 通过
- [ ] CHANGELOG（若新增）包含本次变更
