# 从 WebPDF Printer 迁移至 Web Printer

新品牌为 **Web Printer**；新包为 `@darialan/web-printer`。原 `@darialan/web-pdf-printer@1.0.2` 保持可下载。

```sh
npm uninstall @darialan/web-pdf-printer
npm install @darialan/web-printer
```

## 导出 API

`outputDocument({ format: 'pdf' | 'png' })` 是通用接口。`outputPDF()` 仍是仅输出 PDF 的兼容接口；真正与 PDF 格式有关的名称不作无意义替换。

```ts
import { outputDocument, outputPDF } from '@darialan/web-printer';
await outputDocument({ element: document.getElementById('content'), filename: 'report', format: 'png' });
```

React 集成改从独立入口导入，保证普通 JS/Vue 项目导入核心库时不必安装 React：

```tsx
import { useWebPrinter } from '@darialan/web-printer/react';
const { exportDocument, isExporting, progress, cancel } = useWebPrinter();
await exportDocument({ element: document.getElementById('content'), filename: 'report', format: 'png' });
```

旧 Hook 名称 `usePdfPrint`、`UsePdfPrintState`、`UsePdfPrintProgress` 在 `/react` 子入口保留；返回值仍有 `exportPDF`、`isPrinting`。不要从新包根入口导入 React Hook。旧包自己的入口不变。

## HTML 标记

| 推荐 | 仍可识别的旧标记 |
| --- | --- |
| `data-print-atomic="true"` / `.print-atomic` | `data-pdf-atomic="true"` / `.pdf-atomic` |
| `data-print-splittable="true"` / `.print-splittable` | `data-pdf-splittable="true"` / `.pdf-splittable` |
| `data-print-ignore="true"` / `.print-ignore` | `data-pdf-ignore="true"` / `.pdf-ignore` |
| `data-print-keep-together="true"` / `.print-keep-together` | 对应 `data-pdf-*` / `.pdf-*` |
| `data-print-keep-together="split"` / `.print-keep-or-split` | 对应旧属性 / `.pdf-keep-or-split` |
| `data-print-break="split"` / `.print-force-split` | 对应旧属性 / `.pdf-force-split` |

推荐常量为 `PRINT_ATTRIBUTES`、`PRINT_CLASSES`；`PDF_PRINT_ATTRIBUTES`、`PDF_PRINT_CLASSES` 保留旧值。业务选择器配置优先级与分页算法不变。检查事件使用 `print-inspection`；旧 `pdf-print-inspection` 事件继续发送。内部快照/调试属性改为 `data-print-snapshot` / `data-print-debug`，它们属于内部实现，不应由业务代码生成。

GitHub 源码仓库和现有站点 URL 保持稳定；产品名称与 npm 安装入口已更名。工作区目录和 Vercel 项目 ID 属于部署基础设施，不改变内容或下载能力。
