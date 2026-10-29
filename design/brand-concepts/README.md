# WebPDF Printer：Logo 与字标定稿

2026-10-29。使用 brandkit 技能组织设计，通过内置 image_gen 生成。三套均为 1536 × 1024 PNG 概念图，包含图形与字标、导航栏及首屏应用、单色版本和小尺寸示意。

## 已定稿：A · 分页接力

三选一，确认采用 A 方向。概念图是位图设计稿，最终落地为原生 SVG，不是位图裁切。

| 项目 | 落地文件 |
| --- | --- |
| Logo 图形（网站内联） | `src/landing/brand-mark.svg` |
| Logo 图形（独立资产） | `public/brand-mark.svg` |
| 页面图标 | `public/favicon.svg`（明暗自适应） |
| 传统图标 | `public/favicon.ico`（16 / 32 / 48 / 64） |
| PWA 图标 | `public/logo192.png`、`public/logo512.png` |
| 字标 | `BrandWordmark`：`WebPDF` 加粗 + `Printer` 常规 |
| 首屏标题 | 为复杂业务页面，**做好 PDF 分页。**（第二行强调色） |

图形结构：两个错位的开放页框，中间一条深绿色连续带，表达内容跨页延续。图形用 `currentColor` 承接明暗主题，连续带固定为强调色 `--accent`。

字重按尺寸做过光学补偿：页框用同色描边（`stroke-width: 1.9`）向外扩 0.95 单位，等效于加粗 19%。不加粗时 16px 下页框只剩 1.2px，页框与色带糊在一起；加粗后 16–32px 都能读出"两个页框 + 一条色带"。色带不加描边，避免小尺寸下出现描边毛边。

| 方向 | 文件 | 标题 | 判断 |
| --- | --- | --- | --- |
| A · 分页接力 | [a-page-flow.png](a-page-flow.png) | 为复杂业务页面，做好 PDF 分页。 | **已选定。** 两个错位框与连续色带关联到跨页内容。 |
| B · WP 字母 | [b-wp-monogram.png](b-wp-monogram.png) | 把业务页面，交付为 PDF。 | 块面清楚，更偏开发工具。WP 的字母识别需在定稿时打磨。 |
| C · 折页 | [c-folded-page.png](c-folded-page.png) | 网页里的内容，清楚地落在纸上。 | 结构简洁，文档软件的联想更强；品牌区分度弱于 A。 |

提示词见 [prompts.md](prompts.md)。
