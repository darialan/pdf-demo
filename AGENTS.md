# AGENTS.md

本文件是 AI agent 的仓库入口。规则与经验在 [`.agents/docs/`](.agents/docs/)，对外文档在 [`docs/`](docs/)。架构不写文档，直接读 `src/lib`。

## 项目

`@darialan/web-printer`：浏览器内把已渲染的长网页按内容分页，输出 PDF 或逐页 PNG。库源码在 `src/lib`，工作台示例在 `src/demo`，落地页在 `src/landing`。

## 常用命令

```sh
npm ci
npm start            # 本地工作台
npm run check        # 类型检查 + npm 包单测（提交门禁）
npm run check:full   # 全量单测 + 构建 + Playwright e2e
npm run build:lib    # 构建 ESM / CJS / .d.ts 到 dist/
```

## 动手前

1. 读代码，不读架构文档：`src/lib/index.ts`（公开 API）→ `core/pagination/`（分页）→ `application/`（编排与取消）→ `output/`（格式）。
2. 改 API、默认值、规则或支持边界时，同一个提交内更新 `docs/` 对应文档，检查清单见 [`.agents/docs/documentation.md`](.agents/docs/documentation.md)。
3. 要沉淀的是规则和经验，不是实现复述；新文档先读 [`.agents/docs/README.md`](.agents/docs/README.md) 的判断标准。

## 硬约束

- `src/lib/core` 不依赖 DOM、React、html2canvas、jsPDF，只做纯计算，保证可单测。
- 依赖方向单向：`demo / ui → application → adapters + core`，不要反向 import。
- 对外文档只写可验证的事实；内部规则与经验只放 `.agents/docs/`。
- 已完成的方案、评审、验收记录直接删除，只保留仍成立的规则或结论。
