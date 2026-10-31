# 导出入口简化

本轮仅调整工具栏组件，保留周围界面与当前内容，不重新抽取整页设计方向。遵循 design-taste-frontend 的单组件例外：沿用现有方向，跳过 draw；按 app-screen 检查工具栏层级、状态和三种屏宽。

屏幕的问题：在当前分页结果上，下一步如何直接导出？

设计决定：格式属于导出动作，收进同一个分体式按钮。主体导出当前格式，箭头展开 PDF 文档 / PNG 分页图片菜单；选择格式只改变按钮当前动作，不自动下载。保留纸张的纯文本信息与“打印设置 / 检查分页”工具组。使用现有品牌绿色，移除按钮阴影，提高主按钮白字对比度。不新增提示文案、常驻字段或展示卡片。

ROUND 1
Seen in one second: 文章正文与右上角导出操作。
Idea (one sentence): 两种分页输出共用一个导出入口，格式选择只在需要时展开。
Live thing: 主按钮直接导出，右侧箭头切换格式。
Layout words by section: toolbar=metadata / tools / split-action; content=existing-document.
Scores: design 7 · usability 6 · creativity 6 · content 8 → overall 6.0
Caps applied: 改版前有按钮阴影与 active tab 文字阴影；评分只针对本次工具栏组件，不套用营销页面的图片、动画要求。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. before/mobile-fold.jpg：常驻标签与 select 把操作挤为两行。将格式收进导出菜单。
2. before/desktop-fold.jpg：格式选择和导出分为两个视觉单元。改为一个相连的导出控件。
3. before/tablet-fold.jpg：额外字段占据工具栏宽度，按钮阴影与低对比度蓝色增加杂乱。减少控件、去除阴影，使用现有品牌色。

ROUND 2
Seen in one second: 正文仍是主角，工具栏只保留设置、检查和导出。
Idea (one sentence): 输出格式从常驻配置收回导出动作内部。
Live thing: 点击或键盘打开格式菜单；选中后，主体按钮显示对应输出并保留一键导出。
Layout words by section: toolbar=metadata / tools / split-action; content=existing-document.
Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8
Caps applied: 无营销页面规则套用；手机文章标题 30px 是打印内容原样展示，非本轮重设的应用标题。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. after-dev/desktop-fold.jpg：分体按钮继承了 Ant Design 蓝色接缝。统一为半透明白色接缝。
2. after-dev/tablet-fold.jpg：active tab 仍用框架文字阴影。删除文字阴影。
3. after-dev/mobile-fold.jpg：右侧箭头容易成为小点击区。保持至少 44px 宽度。

静态 lint 会报告原有检查图例的 scissors/close 字符、紫色 page-break 颜色，以及协议术语等宽字体。本轮不重设这些分页诊断语义及对应标记配色；它们不属于改动的导出控件。最终验收以生产构建的三屏宽截图、菜单键盘/触屏边界测试和真实导出回归为准。

ROUND 3
Seen in one second: 内容占据主体，右侧仅一组紧凑操作。
Idea (one sentence): 格式是导出动作的变体，不占用常驻工具栏空间。
Live thing: 分体式导出按钮与可由 Enter / Escape 操作的格式菜单。
Layout words by section: toolbar=metadata / tools / split-action; content=existing-document.
Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8
Caps applied: 无；本轮只评工具栏组件。生产构建的 1440 / 768 / 390px 检查无 FAIL。剩余文章标题大小 WARN 属于保留原样的打印内容，不收缩正文以满足应用 chrome 的标题规则。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 三种宽度的最终 idle 截图没有工具栏溢出或多余配置字段。
2. 手机菜单用点击打开，箭头至少 44px 宽；不依赖 hover 或提示文案。
3. 格式菜单沿用现有品牌颜色和文字，不增加新图标或说明区。

验收：20 项浏览器自动化全部通过（1.7 分钟），包括四个场景的 PDF/PNG 真实下载、390px 下工具栏高度不超过 44px、格式菜单不越界、选格式不意外导出，以及 Enter 打开/Escape 关闭。TypeScript 与前端生产构建通过。保持已有分页和输出层实现，未增加依赖。临时截图和 inspector 数据位于 `/tmp/printer-taste-before` 与 `/tmp/printer-taste-final`。
