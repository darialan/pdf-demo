# Web Printer

把已渲染的长网页按内容分页，保留现有样式，输出 PDF 或逐页 PNG。

[在线工作台](https://pdf-demo-phi.vercel.app/#/playground) · [安装与迁移](docs/migration-to-web-printer.md) · [输出层说明](docs/output-formats.md)

## 安装

```sh
npm install @darialan/web-printer
```

`html2canvas` 与 `jspdf` 随包安装。核心入口不依赖 React；React Hook 从可选的 `/react` 入口使用。

## 导出 PDF 或分页图片

```ts
import { outputDocument } from '@darialan/web-printer';

await outputDocument({
  element: document.getElementById('content'),
  filename: 'report',
  format: 'pdf', // 'png'：逐页 PNG，打包为 ZIP 下载
  settings: {
    paper: 'a4',
    marginTopMm: 12,
    marginRightMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 12,
  },
});
```

`download: false` 返回 Blob；`signal` 支持取消；`onProgress(completed, total)` 报告实际页进度。PDF 与图片共用布局、测量、分页和截图管线，由独立 writer 组装输出。旧 PDF 专用接口 `outputPDF()` 保留。

## React

```tsx
import { useRef } from 'react';
import { useWebPrinter } from '@darialan/web-printer/react';

export function Report() {
  const content = useRef<HTMLDivElement>(null);
  const { exportDocument, isExporting, error, cancel } = useWebPrinter();
  return <>
    <button disabled={isExporting} onClick={() => {
      exportDocument({ element: content.current, filename: 'report', format: 'png' })
        .catch(() => { /* error 已记录，可在界面展示 */ });
    }}>导出分页图片</button>
    {isExporting && <button onClick={cancel}>取消导出</button>}
    {error && <p role="alert">{error.message}</p>}
    <div ref={content}>你的页面内容</div>
  </>;
}
```

React 由宿主项目安装。旧名 `usePdfPrint` 在同一 `/react` 入口作为兼容别名保留；`exportPDF` 与 `isPrinting` 仍可使用。

## 内容保护与排除

```html
<article data-print-splittable="true">长文章正文</article>
<figure data-print-atomic="true">整块保护的配图与说明</figure>
<div data-print-ignore="true">不参与输出的工具栏</div>
```

| 标记 | 行为 |
| --- | --- |
| `data-print-atomic="true"` / `.print-atomic` | 整块换页；整块高于一页时报错，提示调整布局或尺寸 |
| `data-print-splittable="true"` / `.print-splittable` | 继续深入内容，按文字行与子元素分页 |
| `data-print-ignore="true"` / `.print-ignore` | 快照排版前移除，不占用输出空间 |
| `data-print-keep-together="split"` / `.print-keep-or-split` | 优先整体换页，过高时允许深入拆分；表格行默认采用该规则 |

`PRINT_ATTRIBUTES` 与 `PRINT_CLASSES` 提供协议常量。旧 `data-pdf-*` / `.pdf-*` 与旧常量继续可用，详见[迁移说明](docs/migration-to-web-printer.md)。

`configurePrint()` 可注册组件库选择器；`inspectPrintLayout()` 只测量与检查，不导出；`visualizePageBreaks()` 显示 `atomic`、`splittable`、`ignore` 和 `page-break`，`clearPageBreaks()` 清理标记。

## 四个真实场景

| 场景 | 验证内容 |
| --- | --- |
| 长表格 | 45 行采购明细，行保护与超高单元格文字分页 |
| 长文章 | 连续段落按实际文字行换页 |
| 复杂图文 | 原样式文章中的配图、公式和代码整体保护 |
| 自定义页眉页脚 | 品牌信息与页码跨页重复 |

工作台支持尺寸、方向、边距、页码、纸张与社媒图片比例。检查包含页面标记和纸张预览，两部分独立失败与重试。

## 支持边界

核心为 TypeScript，接收 DOM，可在原生 JS、Vue、React 等客户端页面使用。图片和字体需完成加载，跨域图片需允许 CORS。复杂 CSS 的还原受 html2canvas 支持范围影响；跨域 iframe、Shadow DOM 和视频不属于无条件完整支持范围。PDF 正文为光栅图像，没有可搜索的文字层；PNG 像素尺寸受截图清晰度与画布预算影响，页面 px 用于布局。

默认最多 100 页；采用逐页画布，避免创建整篇长画布。压缩图像字节仍会随总页数增长，不表示任意长度文档无内存成本。

## 开发与验证

```sh
npm ci
npm start
npm run check
```

`npm run check` 依次执行 TypeScript、单测、ESM/CJS 与类型构建、网页生产构建及 Chromium 自动化。浏览器测试覆盖真实 PDF/PNG 下载、预览一致性、取消、重试、主题、键盘与窄屏。

源码布局：`src/lib/core` 为分页与几何，`adapters` 为 DOM/画布/PDF 适配，`application` 编排生命周期，`output` 区分格式，`hooks` 提供可选 React 集成；`src/demo` 和 `src/landing` 分别为工作台与首页。

MIT License。原包 `@darialan/web-pdf-printer@1.0.2` 保持可下载，新开发建议使用 `@darialan/web-printer`。
