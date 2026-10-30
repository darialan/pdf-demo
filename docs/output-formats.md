# 分页输出层：PDF 与 PNG

以当前四个 playground 场景为基础。分页是核心能力，PDF 和分页图片是同一份分页结果的两种输出；本次不调整测量、保护规则或分页算法。

## 使用

工作台通过导出按钮右侧的箭头选择格式，按钮主体直接导出当前格式。默认 PDF；「PNG 分页图片」将每一页保存为一张完整纸张图片，并统一打包下载，避免多文件自动下载被浏览器拦截。文件按 `page-001.png`、`page-002.png` 排序。图片包含当前纸张尺寸、方向、边距、页眉页脚与页码，末页保留完整纸张高度。切换输出格式不改变分页或关闭预览。输出设置提供 A4/A3/A5/Letter、常见社媒图片比例（3:4、4:5、1:1、9:16）、电商长图和自定义尺寸；社媒图片预设使用像素单位，页面宽高和内边距仍统一换算为毫米保存。设置区同时显示扣除边距后的正文可用尺寸。

```ts
import { outputDocument, outputPDF } from '@darialan/web-pdf-printer';

const controller = new AbortController();
const result = await outputDocument({
  element: document.getElementById('content'),
  filename: '报告',
  format: 'png', // 'pdf' | 'png'，默认 'pdf'
  download: false, // true 时直接下载；false 时由调用方处理 Blob
  signal: controller.signal,
  onProgress: (completed, total) => console.log(completed, total),
});
// PNG 模式：result.blob 是 application/zip，内含逐页 PNG。
// PDF 模式：result.blob 是 application/pdf。
// result.pages / bytes / layoutMs / totalMs 两种格式均可用。

// 原有 PDF 调用保持兼容：
await outputPDF({ element: document.getElementById('content'), filename: '报告' });
```

图片采用与 PDF 正文相同的逐页截图，图片尺寸取决于源区域宽度及截图像素预算，纸张宽高比来自输出设置；不是额外设置的固定 DPI。PNG 是无损光栅图片。页内不含可搜索的文本层。

## 模块边界

- `application/print-service.ts`：共享 prepareLayout、逐页 capture、进度、取消和资源清理。
- `output/types.ts`：输出格式与 `OutputWriter` 协议。writer 接收页截图与纸张坐标，不测量 DOM、不重新分页。
- `output/index.ts`：格式分发。PDF 使用原有 jsPDF adapter；PNG 使用 image writer。
- `output/image-writer.ts`：按共享 geometry 合成完整纸张，逐页编码 PNG 后立即释放合成 canvas。
- `output/zip.ts`：PNG 已压缩，ZIP 使用 STORE，无新增运行时依赖；写入 CRC32 与中央目录。页码文件名固定 ASCII，文档标题仅用于下载包名称。

扩展格式时实现 `OutputWriter`，注册到格式工厂，并增加工具栏选项即可；分页算法、快照和截图链路不需要增加格式判断。原有 React `usePdfPrint().exportPDF()` 继续专用于 PDF；非 React 和 React 调用方均可直接调用 `outputDocument()`。

## 失败与取消

任一页截图或编码失败，整个任务失败，不下载不完整文件。导出前及每页处理后检查取消状态；编码中的原生 canvas 操作结束后停止，不开始下一页或最终下载。所有路径释放快照、截图 canvas 和输出 writer。PNG 字节保留到 ZIP 完成，因此总内存仍随压缩图片总量增长；整篇正文不会合成一张超长 canvas。ZIP 不支持 ZIP64，超出标准 ZIP 容量会明确报错。

## 验证

单测覆盖 ZIP CRC32/目录偏移、纸张合成坐标、页眉页脚与页码、编码失败/取消清理和共享导出链路。浏览器自动化覆盖四个场景的真实 ZIP 下载，逐页解码 PNG、检查非空像素、纸张比例、连续文件名，以及与预览一致的页数；原有 PDF 自动化作为回归继续执行。
