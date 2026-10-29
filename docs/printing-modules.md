# 打印模块分层架构与扩展方式

本文对应当前分层实现。库源码统一位于 `src/lib`，示例工程位于 `src/demo`，保持单向依赖与清晰的职责边界。

## 一、五层模块职责

| 模块 | 工程含义 | 当前项目职责 |
| --- | --- | --- |
| `src/demo` | Examples / Playground | 采购业务单据（订单/验收单/结算单）、表格、长文本、图片、签认区等复杂分页案例 |
| `src/demo/ui` | Presentation Layer | 打印设置面板（`config-panel`）、分页线预览（`preview`）、调试与导出工具栏（`debug-panel`）及工作台容器 |
| `src/lib/application` | Application Layer | 串联快照准备、资源等待、DOM 测量、分页计算、逐页截图与 PDF 输出（`print-pipeline`、`print-service`） |
| `src/lib/core` | Domain / Core Engine | 公共类型（`types`）、节点分类与溢出策略（`rules`）、纯分页算法（`pagination`）、纸张与页面几何换算（`geometry`） |
| `src/lib/adapters` | Infrastructure / Adapters | 对接浏览器 DOM 遍历/测量/快照（`dom`）、字体图片资源就绪（`resources`）、Canvas 截图（`canvas`）、jsPDF 输出（`pdf`） |

## 二、调用链与依赖边界

`demo / ui → application (print-service → print-pipeline) → adapters (dom / resources / canvas / pdf) + core (geometry / rules / pagination)`

1. **`core` 与 `adapters` 分离**：`core` 不依赖 DOM、React、`html2canvas` 或 `jsPDF`，只接收测量数值与区间并输出分页计划（`PageSlice[]`）和页面几何参数（`PageGeometry`），可独立单测。
2. **`application` 与 `core` 分离**：`core` 负责怎么算；`application`（`print-pipeline.ts`、`print-service.ts`）负责什么时候算、按什么顺序算，以及超时、取消、异常与快照/Canvas 资源释放。
3. **`demo` 与 `ui` 分离**：`demo` 只提供业务单据和分页测试内容；`ui` 提供通用设置弹窗、分页线预览和导出状态栏，新增业务单据无需修改 `ui` 或 `core`。
