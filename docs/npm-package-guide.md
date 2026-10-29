# @darialan/web-pdf-printer 开发者接入教程与底层算法原理深度指南

本文档面向第三方开发者与系统架构师，详细阐述 `@darialan/web-pdf-printer` 的工程定位、打包构建架构、在不同前端技术栈中的配置与集成方案，以及核心算法与底层机制的设计推导。

---

## 目录

1. [项目工程与 NPM 打包架构](#一项目工程与-npm-打包架构)
2. [第三方开发者安装与工程配置](#二第三方开发者安装与工程配置)
   - [2.1 包安装与依赖说明](#21-包安装与依赖说明)
   - [2.2 构建工具适配 (Vite / Webpack / Next.js)](#22-构建工具适配-vite--webpack--nextjs)
3. [快速上手与多场景实战](#三快速上手与多场景实战)
   - [3.1 原生 JS / Vanilla 极简调用](#31-原生-js--vanilla-极简调用)
   - [3.2 Vue 3 / Vite 组合式 API 接入](#32-vue-3--vite-组合式-api-接入)
   - [3.3 React 18 / 19 接入 (结合 usePdfPrint)](#33-react-18--19-接入-结合-usepdfprint)
   - [3.4 带有固定页眉、页脚与页码的复杂单据](#34-带有固定页眉页脚与页码的复杂单据)
4. [核心底层机制与算法数学推导](#四核心底层机制与算法数学推导)
   - [4.1 页面几何换算模型与物理容量方程](#41-页面几何换算模型与物理容量方程)
   - [4.2 离屏快照克隆与计算样式冻结 (Style Freezing)](#42-离屏快照克隆与计算样式冻结-style-freezing)
   - [4.3 智能 DOM 遍历与文本行级拆解 (Range ClientRects)](#43-智能-dom-遍历与文本行级拆解-range-clientrects)
   - [4.4 贪心回退避让纯分页算法推导与复杂度分析](#44-贪心回退避让纯分页算法推导与复杂度分析)
   - [4.5 逐页微切片渲染与瞬时内存回收机制](#45-逐页微切片渲染与瞬时内存回收机制)
5. [声明式标记与规则配置系统](#五声明式标记与规则配置系统)
   - [5.1 HTML 属性与通用类名协议](#51-html-属性与通用类名协议)
   - [5.2 编程式规则配置 (PrintRuleConfig)](#52-编程式规则配置-printruleconfig)
   - [5.3 常见 UI 组件库（Ant Design、Element Plus 等）适配规则](#53-常见-ui-组件库ant-designelement-plus-等适配规则)
6. [可视化调试与故障排查](#六可视化调试与故障排查)
7. [生产环境避坑指南与常见问题 (FAQ)](#七生产环境避坑指南与常见问题-faq)

---

## 一、项目工程与 NPM 打包架构

本项目采用 **双模式工程架构**：
1. **工作台 / Demo 演示层**：基于 React 18 + Ant Design，用于业务单据可视化调试与测试验证（执行 `npm start` 即可运行）。
2. **核心库打包层 (`@darialan/web-pdf-printer`)**：基于 Vite Library Mode + TypeScript 编译器，输出零污染、支持 Tree-shaking 的标准化产物。

```
项目根目录
├── dist/                          # 构建产物目录
│   ├── index.mjs                  # ESM 格式入口 (现代打包工具/浏览器原生引用)
│   ├── index.cjs                  # CommonJS 格式入口 (Node.js/旧版打包工具兼容)
│   ├── index.d.ts                 # TypeScript 根类型定义入口
│   └── types/                     # 完整的模块级别 TypeScript .d.ts 文件
├── src/
│   ├── lib/                       # 【NPM 库主导出入口】src/lib/index.ts
│   │   ├── core/                  # 【领域核心】纯数学几何换算、分页避让算法、规则定义（无 DOM 依赖）
│   │   ├── adapters/              # 【基础设施】DOM 测量、样式冻结、html2canvas 切片、jsPDF 组装
│   │   ├── application/           # 【应用服务】print-pipeline 串联流水线、print-service、任务取消机制
│   │   ├── hooks/                 # 【框架适配】React usePdfPrint Hook
│   │   └── overlay/               # 【可视化调试】分页线叠加层（原生 DOM，无 React 依赖）
│   └── demo/                      # 【示例业务场景】采购订单、验收单、结算单等案例
│       └── ui/                    # 【展示层】React 调试面板、迷你预览、工作台
├── vite.config.lib.ts             # 专用于 NPM 库的 Vite 构建配置
└── tsconfig.lib.json              # 专用于 NPM 声明文件生成的 TS 配置
```

### 构建命令

```bash
# 1. 运行单次全量自动化测试（14 套单测，44 个测试用例，覆盖几何、测量、分页及导出服务）
npm run test:once

# 2. 构建生产环境 NPM 产物（生成 ESM、CJS 及全套 TypeScript 类型定义）
npm run build:lib
```

---

## 二、第三方开发者安装与工程配置

### 2.1 包安装与依赖说明

在目标项目终端中执行：

```bash
# 使用 npm
npm install @darialan/web-pdf-printer html2canvas jspdf

# 使用 yarn
yarn add @darialan/web-pdf-printer html2canvas jspdf

# 使用 pnpm
pnpm add @darialan/web-pdf-printer html2canvas jspdf
```

#### 依赖架构设计：
- **`html2canvas`** 与 **`jspdf`** 被声明为 `peerDependencies`。原因在于不同公司或项目可能对这两个底层库有不同版本锁定或定制插件，避免在 `node_modules` 中产生多份冗余副本。
- **`react`** 为可选的对等依赖（`peerDependenciesMeta.react.optional = true`）。若开发者在纯 JS 或 Vue 项目中使用，无需安装 React。

### 2.2 构建工具适配 (Vite / Webpack / Next.js)

`@darialan/web-pdf-printer` 遵循标准 `package.json` 的 `exports` 字段规范：

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

- **Vite (Vue 3 / React)**：开箱即用，自动优先选择 `index.mjs`。
- **Webpack 5 / Create React App**：开箱即用，原生支持 ESM 与 CJS。
- **Next.js (SSR / App Router)**：
  因为 PDF 测量与 Canvas 渲染依赖浏览器全局对象（`document`、`window`、`Range`、`HTMLCanvasElement`），因此在 Next.js 服务端渲染环境下，请在客户端组件中调用：
  ```tsx
  'use client'; // Next.js App Router 客户端组件标记
  import { outputPDF } from '@darialan/web-pdf-printer';
  ```

---

## 三、快速上手与多场景实战

### 3.1 原生 JS / Vanilla 极简调用

适用于任何不使用前端框架的传统多页系统或微前端容器：

```html
<button id="btn-export">导出 PDF</button>

<div id="print-content" style="background: #fff; padding: 20px;">
  <h1>采购验收单</h1>
  <table border="1" style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr><th>物料名称</th><th>规格</th><th>数量</th><th>单价</th></tr>
    </thead>
    <tbody>
      <!-- tr 会被引擎自动作为不可分割原子单元保护 -->
      <tr><td>服务器主板</td><td>Epyc 9654</td><td>10</td><td>¥18,000</td></tr>
      <tr><td>企业级固态硬盘</td><td>3.84TB NVMe</td><td>50</td><td>¥2,400</td></tr>
    </tbody>
  </table>
</div>

<script type="module">
  import { outputPDF } from '@darialan/web-pdf-printer';

  document.getElementById('btn-export').addEventListener('click', async () => {
    const el = document.getElementById('print-content');
    await outputPDF({
      element: el,
      filename: '采购验收单.pdf',
    });
  });
</script>
```

### 3.2 Vue 3 / Vite 组合式 API 接入

```vue
<template>
  <div class="page-container">
    <div class="actions">
      <el-button type="primary" :loading="isExporting" @click="handleExport">
        {{ isExporting ? `正在生成第 ${progress.current}/${progress.total} 页` : '导出 PDF' }}
      </el-button>
    </div>

    <!-- 待导出的单据容器 -->
    <div ref="reportRef" class="invoice-container">
      <h2>业务结算单</h2>
      <el-table :data="tableData" border>
        <el-table-column prop="date" label="账期" />
        <el-table-column prop="amount" label="结算金额" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { outputPDF } from '@darialan/web-pdf-printer';

const reportRef = ref<HTMLElement | null>(null);
const isExporting = ref(false);
const progress = reactive({ current: 0, total: 0 });

const handleExport = async () => {
  if (!reportRef.value) return;
  isExporting.value = true;
  try {
    await outputPDF({
      element: reportRef.value,
      filename: '业务结算单.pdf',
      settings: {
        paper: 'a4',
        orientation: 'portrait',
        marginTopMm: 12,
        marginBottomMm: 12,
        marginLeftMm: 10,
        marginRightMm: 10,
      },
      onProgress: (current, total) => {
        progress.current = current;
        progress.total = total;
      },
    });
  } finally {
    isExporting.value = false;
  }
};
</script>
```

### 3.3 React 18 / 19 接入 (结合 `usePdfPrint`)

使用内置的 React Hook 能够极大简化进度反馈、异常处理与任务取消管理：

```tsx
import React, { useRef } from 'react';
import { usePdfPrint } from '@darialan/web-pdf-printer';
import { Button, Progress, message } from 'antd';

export const PurchaseOrderExportView: React.FC = () => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { isPrinting, progress, exportPDF, cancel } = usePdfPrint();

  const handleExport = async () => {
    if (!printAreaRef.current) return;
    try {
      await exportPDF({
        element: printAreaRef.current,
        filename: 'PO-20261028-001.pdf',
        settings: { paper: 'a4', orientation: 'portrait' },
      });
      message.success('PDF 导出成功！');
    } catch (err: any) {
      if (err.message === '导出已取消') {
        message.info('导出已取消');
      } else {
        message.error(`导出失败: ${err.message}`);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" loading={isPrinting} onClick={handleExport}>
          {isPrinting ? '正在导出' : '导出单据'}
        </Button>
        {isPrinting && (
          <Button danger onClick={cancel} style={{ marginLeft: 8 }}>
            取消
          </Button>
        )}
      </div>

      {isPrinting && (
        <Progress
          percent={progress.percent}
          format={() => `${progress.completed} / ${progress.total} 页`}
          style={{ maxWidth: 300, marginBottom: 16 }}
        />
      )}

      {/* 待打印区域 */}
      <div ref={printAreaRef} style={{ background: '#fff', padding: 24 }}>
        <h1>采购订单</h1>
        <p>订单号：PO-20261028-001</p>
        <!-- 正文内容... -->
      </div>
    </div>
  );
};
```

### 3.4 带有固定页眉、页脚与页码的复杂单据

在企业报表中，通常要求**每一页都有公司的统一页眉（Logo/标题）和固定页脚（制表人/防伪章），并在右下角打上 `页码 / 总页数`**。

在 `@darialan/web-pdf-printer` 中，只需传入独立的页眉和页脚 DOM 元素即可：

```ts
const contentEl = document.getElementById('report-body');
const headerEl = document.getElementById('shared-header');
const footerEl = document.getElementById('shared-footer');

await outputPDF({
  element: contentEl,
  header: headerEl, // 自动按页渲染在正文上方
  footer: footerEl, // 自动按页渲染在正文下方
  filename: '财报明细.pdf',
  settings: {
    paper: 'a4',
    orientation: 'portrait',
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 12,
    marginRightMm: 12,
  },
});
```

### 3.5 iframe 隔离沙箱与独立网页打印

在许多企业应用中，打印模板常以 `<iframe>` 形式隔离渲染（例如微前端子应用页面、包含独立 CSS 的合同单页、第三方发票模板）：

```ts
// 1. 获取同源 iframe 的内部文档对象（支持 srcdoc 或同源 URL）
const iframe = document.getElementById('my-report-iframe') as HTMLIFrameElement;
const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

if (!iframeDoc) throw new Error('无法访问 iframe 内容，请确保同源或使用 srcdoc');

// 2. 提取 iframe 内部待打印的目标容器
const printTarget = iframeDoc.getElementById('iframe-report-content') || iframeDoc.body;

// 3. 一键交由 @darialan/web-pdf-printer 打印
await outputPDF({
  element: printTarget as HTMLElement,
  filename: 'iframe-report.pdf',
  settings: {
    paper: 'a4',
    orientation: 'portrait',
  },
});
```
> **提示**：核心库是纯 DOM 引擎，只要目标节点是一个有效的 `HTMLElement`，无论它存在于主文档还是 `iframe.contentDocument` 中，都可以直接接收并完成计算样式冻结、测量与微切片导出。

---

## 四、核心底层机制与算法数学推导

### 4.1 页面几何换算模型与物理容量方程

打印领域涉及三种标准度量单位：
1. **浏览器屏幕像素 (CSS px)**：屏幕基准分辨率通常采用 $96\text{ DPI}$，即 $1\text{ 英寸} = 96\text{ px}$。
2. **国际物理度量 (毫米 mm)**：真实纸张规格，如 A4 纸为 $210\text{ mm} \times 297\text{ mm}$。
3. **PostScript 打印点数 (PDF pt)**：PDF 内部绝对坐标体系，规定 $72\text{ 点} = 1\text{ 英寸}$。

由此得出换算矩阵：
$$\text{PT\_PER\_MM} = \frac{72}{25.4} \approx 2.83464567$$
$$\text{PX\_PER\_MM} = \frac{96}{25.4} \approx 3.77952756$$
$$\text{MM\_PER\_PX} = \frac{25.4}{96} \approx 0.26458333$$

#### 比例换算因子 (Content Ratio)

假设打印容器在浏览器中的实际测量宽度为 $W_{\text{dom}}$（单位：CSS px）。
选择的纸张总宽度为 $W_{\text{paper}}$，左边距为 $M_{\text{left}}$，右边距为 $M_{\text{right}}$（单位均为 pt）。

实际可打印的正文物理宽度：
$$W_{\text{content}} = W_{\text{paper}} - M_{\text{left}} - M_{\text{right}}$$

缩放比例因子：
$$\text{ratio} = \frac{W_{\text{content}}}{W_{\text{dom}}}$$

#### 正文容量方程 (Body Capacity Equation)

在包含可选页眉高度 $H_{\text{headerPx}}$ 和页脚高度 $H_{\text{footerPx}}$ 的情况下：
$$H_{\text{headerPt}} = H_{\text{headerPx}} \times \text{ratio}$$
$$H_{\text{footerPt}} = H_{\text{footerPx}} \times \text{ratio}$$

正文起始 Y 坐标（在 PDF 页面坐标系中）：
$$\text{bodyTop} = M_{\text{top}} + H_{\text{headerPt}} + (\text{hasHeader} \mathbin{?} 6\text{ pt} : 0)$$

页脚起始 Y 坐标：
$$\text{footerY} = H_{\text{paper}} - M_{\text{bottom}} - 14\text{ pt (页码留白)} - H_{\text{footerPt}}$$

因此，单页在**原 DOM 坐标系下**允许容纳的纯正文高度容量（Capacity，单位：CSS px）：
$$\text{capacity} = \frac{\text{footerY} - (\text{hasFooter} \mathbin{?} 6\text{ pt} : 0) - \text{bodyTop}}{\text{ratio}}$$

如果计算得到的 $\text{capacity} \le 0$，说明页眉、页脚加上边距已经超过了单页纸张的物理高度，算法会在准备阶段立即抛出显式异常：`页眉页脚过高，没有剩余正文空间`，绝不静默输出错误文档。

---

### 4.2 离屏快照克隆与计算样式冻结 (Style Freezing)

#### 为什么简单的 `cloneNode(true)` 会彻底失效？
1. **样式继承断裂**：若原始元素嵌套在某些类名（如 `.ant-layout-content` 或 `@media` 查询）下，克隆出来放入独立沙箱后，由于失去了祖先节点的上下文，CSS 选择器无法匹配，字体、行高、文字颜色发生突变。
2. **行高折叠与布局抖动**：未显式声明宽度的浮动、绝对定位或 Flex 子项，脱离原始文档流后会发生 shrink-wrap（自动收缩），导致原本刚好单行的文字变成折行，使得测量高度与真实渲染高度不符。
3. **运行时表单与 Canvas 丢失**：原生 `cloneNode` 不会复制 `<input>` 的当前用户输入值、单选复选框的 `checked` 状态，更不会复制 `<canvas>` 内部已经绘制好的 ImageData。

#### 解决方案：计算样式深度冻结

在 `cloneWithResolvedStyles` 中执行以下四重保障：
```ts
// 1. 深度遍历所有子节点，并将运行时计算样式固化到 inline style 中
const computed = window.getComputedStyle(sourceNode);
for (let i = 0; i < computed.length; i++) {
  const prop = computed.item(i);
  // 保留原始的尺寸流（避免冻结自动高度破坏 margin 折叠与表格对齐）
  if (/^(min-|max-)?(width|height|block-size|inline-size)$/.test(prop)) continue;
  targetNode.style.setProperty(prop, computed.getPropertyValue(prop), computed.getPropertyPriority(prop));
}

// 2. 状态值补全
if (sourceNode instanceof HTMLInputElement) copy.value = sourceNode.value;
if (sourceNode instanceof HTMLCanvasElement) {
  copy.getContext('2d')?.drawImage(sourceNode, 0, 0);
}

// 3. 严格锁定根节点宽度
targetRoot.style.width = `${sourceWidth}px`;
targetRoot.style.maxWidth = 'none';
targetRoot.style.boxSizing = 'border-box';
```

---

### 4.3 智能 DOM 遍历与文本行级拆解 (Range ClientRects)

对于大段图文混排的长文本段落（如合同条款、技术说明），若将整个 `<p>` 或 `<div>` 当作原子项，一旦一个段落高度达到 200px，当前页剩余 150px 时就会造成高达 150px 的纸张底部大面积空白。

为此，引擎采用了**浏览器底层 Range 行级拆解技术**：

```ts
export function createTextMeasurer(rootTop: number) {
  const range = document.createRange();
  return (node: Node): Interval[] => {
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    const intervals: Interval[] = [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (rect.height <= 0) continue;
      intervals.push({
        top: rect.top - rootTop,
        bottom: rect.bottom - rootTop,
      });
    }
    return intervals;
  };
}
```

- 通过 `range.getClientRects()`，浏览器会返回每一行文本在屏幕上的真实物理微矩形。
- 将每一行文字的顶部与底部登记为一个受保护区间 $[top, bottom]$。
- 这意味着：**分页切割线可以精准穿过行与行之间的行间距（leading gap），但绝不可能切穿任何一行字体的正中间！**

---

### 4.4 贪心回退避让纯分页算法推导与复杂度分析

分页算法位于 `src/lib/core/pagination/paginator.ts` 中的 `paginate` 函数。

#### 算法流程：
- **输入**：
  - 文档总高度 $H$
  - 单页可用正文容量 $C = \text{capacity}$
  - 受保护不可切断区间数组 $R = \{ [t_1, b_1], [t_2, b_2], \dots, [t_n, b_n] \}$，按 $t_i$ 升序排列。
- **循环不变量 (Loop Invariant)**：
  - 每一页的切点 $end$ 满足 $start < end \le \min(start + C, H)$。
  - 对于所有区间 $[t_i, b_i] \in R$，不存在任何一个区间被切点穿透（即不存在 $t_i < end < b_i$）。

```ts
let start = 0;
while (start < height) {
  let end = Math.min(start + capacity, height);
  if (end < height) {
    // 遇到相交区间，不断回退至区间顶部
    for (;;) {
      let next = end;
      for (const range of ranges) {
        if (range.top < end && range.bottom > end) {
          next = Math.min(next, range.top);
        }
      }
      if (next === end) break; // 已经避开所有受保护块，找到安全断点
      end = next;
    }
  }
  if (end <= start) {
    throw new Error('重叠的不可拆分内容超过单页高度，无法安全分页');
  }
  pages.push({ start, end });
  start = end;
}
```

#### 复杂度分析：
- **时间复杂度**：
  - 排序阶段：$O(N \log N)$，其中 $N$ 为受保护区间数（在百页文档中通常为数百至数千）。
  - 分页回退阶段：总页数 $P \le 100$。每页的循环回退次数不超过当前页内的相交区间数 $k$。整体回退时间为 $O(P \cdot N)$。
  - 在典型测试用例中，千行 DOM 的纯分页算法计算耗时 **小于 1 毫秒**！
- **空间复杂度**：
  - 仅存储输出的页面切片数组 `PageSlice[]`，空间复杂度为 $O(P)$，极具轻量化优势。

---

### 4.5 逐页微切片渲染与瞬时内存回收机制

市面常见解决方案通常调用 `html2canvas(document.body)` 一次性获取全量 Canvas。
- 设一个 50 页单据，每页按 96 DPI 算高 1122 px，总高为 $50 \times 1122 = 56,100\text{ px}$。
- 宽度按 1000 px 算，生成的 Canvas 像素总数为：
  $$1000 \times 56100 \times 4\text{ 字节 (RGBA)} \approx 224.4\text{ MB}$$
- 若 Retina 高分屏（`scale = 2`），像素占用内存瞬间达到：
  $$224.4 \times 4 \approx 897.6\text{ MB}$$
- 绝大多数移动端及低内存 PC 浏览器在此阶段会直接触发内核 OOM 崩溃、白屏或浏览器崩溃重启。

#### `@darialan/web-pdf-printer` 的微切片策略：

```ts
// 仅渲染当前页对应的长方形区域 [start, end]
const canvas = await html2canvas(element, {
  x: 0,
  y: page.start,
  width: layoutWidth,
  height: page.end - page.start,
  scale: dynamicScale, // 自动按 800 万像素安全上限钳制
  backgroundColor: '#ffffff',
});

// 写入 jsPDF
pdfWriter.addPageSlice(pageIndex, canvas, sliceHeightPt);

// 核心：立即手动释放显存！
canvas.width = 0;
canvas.height = 0;
```

每生成一页，立即将 Canvas 的宽高置零，解除显存纹理绑定。整个生成生命周期中，内存占用始终平稳保持在 **单页大小（约 5~10MB）**，成功消除了大文档内存溢出隐患。

---

## 五、声明式标记与规则配置系统

### 5.1 HTML 属性与通用类名协议

| 规则类型 | HTML Attribute | CSS Class | 行为逻辑 |
| --- | --- | --- | --- |
| **原子不可分割** | `data-pdf-atomic="true"` | `.pdf-atomic` | 当前页放不下整块移到下一页，单块超过整页报明确错误 |
| **流式可分割** | `data-pdf-splittable="true"` | `.pdf-splittable` | 允许切断，深入测量子元素或文本行 |
| **打印忽略** | `data-pdf-ignore="true"` | `.pdf-ignore` | 完全排除在 PDF 之外 |
| **复合块避让** | `data-pdf-keep-together="split"` | `.pdf-keep-or-split` | 优先整块推移；若单块超出整页高度，降级为可拆分容器 |

### 5.2 编程式规则配置 (`PrintRuleConfig`)

若项目不允许修改业务组件的 HTML 模板，可通过配置选项注入自定义规则选择器：

```ts
await outputPDF({
  element: document.getElementById('report'),
  filename: 'custom.pdf',
  ruleConfig: {
    // 强制作为不可分割原子的选择器
    atomic: [
      '.my-business-card',
      '.signature-wrapper',
      '.chart-container',
    ],
    // 强制作为可分割容器的选择器
    splittable: [
      '.article-body',
      '.long-text-flow',
    ],
    // 忽略不打印的选择器
    ignore: [
      '.ant-pagination',
      '.action-bar',
      '.download-btn',
    ],
  },
});
```

### 5.3 常见 UI 组件库（Ant Design、Element Plus 等）适配规则

`@darialan/web-pdf-printer` 默认内置了与主流组件库无缝兼容的规则：
- **表格行**：所有 `tr`、`.ant-table-row`、`.el-table__row` 自动作为原子项保护，表格行永远不会从中间被斩断。
- **交互控件**：所有 `.ant-pagination`、分页器、隐藏标签自动忽略。
- **标题与媒体**：`h1~h6`、`img`、`svg`、`canvas` 自动作为原子保护。

---

## 六、可视化调试与故障排查

在集成和排错过程中，开发者常常需要肉眼观察：
- “为什么这个卡片被推到了下一页？”
- “切断线具体位于哪两个像素之间？”
- “这个元素有没有被正确识别为 atomic 还是 splittable？”

引擎提供了框架无关的可视化诊断工具：

```ts
import { inspectPrintLayout, visualizePageBreaks, clearPageBreaks } from '@darialan/web-pdf-printer';

const element = document.getElementById('my-report');

// 1. 进行快速布局推演
const diagnostics = await inspectPrintLayout({ contentElement: element });

// 2. 在真实页面上直接渲染高亮标记图层
visualizePageBreaks(diagnostics.pageBreaks, element);

// 控制台打印出详细统计
console.table({
  '总页数': diagnostics.pages.length,
  '正文总高度': `${diagnostics.totalHeight} px`,
  '单页容量': `${diagnostics.capacity} px`,
  '测量耗时': `${diagnostics.timing.measurementMs.toFixed(2)} ms`,
  '纯算法分页耗时': `${diagnostics.timing.paginationMs.toFixed(2)} ms`,
});

// 3. 调试完毕后一键移除标记图层
// clearPageBreaks();
```

### 视觉图层标识含义：
- 🟥 **红色实线框 + `atomic` 标签**：不可分割原子项。
- 🟦 **蓝色虚线框 + `splittable` 标签**：流式可分割容器。
- ⬜ **灰色虚线框 + `ignore` 标签**：打印忽略项。
- 🟪 **紫色虚线 + 剪刀标 `✂️ page-break: 1122px (p.1 ➔ p.2)`**：真实分页物理切割线位置。

---

## 七、生产环境避坑指南与常见问题 (FAQ)

### Q1: 导出的 PDF 中图片变成了空白或控制台报错 `Tainted canvas`？
- **原因**：浏览器的同源安全策略。Canvas 绘制带有外链且未经 CORS 授权的图片时会被污染（Taint），导致无法导出为 DataURL/Blob。
- **解决方式**：
  1. 确保 OSS 或图片 CDN 服务器返回 `Access-Control-Allow-Origin: *` 响应头。
  2. 库内部在克隆时已自动为外链图片增加 `crossOrigin = "anonymous"`。
  3. 若图片无法配置跨域头，可在渲染前将图片转为 Base64 Data URL。

### Q2: 字体在 PDF 中排版异常、图标字体（IconFont）显示为空白？
- **原因**：调用截图时，WebFont（自定义网络字体）尚未加载完成，浏览器回退到系统后备字体，导致字符宽度变化，引发换行截断。
- **解决方式**：
  - 库内置的 `waitForResources` 自动调用了 `document.fonts.ready`。只要项目按标准方式引入 `@font-face`，引擎会自动等待所有字体文件就绪后再启动布局测量与截图。

### Q3: 为什么单页导出偶尔提示“存在超过单页高度且不可拆分的内容”？
- **原因**：某个被标记为 `atomic`（或 `img`）的单体元素高度超过了当前纸张正文的最大容量（例如 A4 纵向容量约为 950px，但有一张高度为 1500px 的整屏大图）。任何避让算法都无法在不裁切它的前提下把它放在任何一页中。
- **解决方式**：
  1. 将过大的图片限制最大高度（例如在 CSS 中设置 `max-height: 800px; object-fit: contain;`）。
  2. 若该容器本身是文字卡片，请为其增加 `data-pdf-splittable="true"` 或 `data-pdf-keep-together="split"`，允许引擎深入其内部进行按行分割。

---

## 结语

`@darialan/web-pdf-printer` 通过将计算样式冻结、行级 Range 测量、贪心回退分页与按页微切片渲染分层解耦，构筑起一套高保真、低内存、零截断的前端打印基础设施。欢迎在各类中后台单据与报表导出场景中深度应用！
