# 文档维护约定

> 适用版本：`@darialan/web-printer` 1.1.0 · 最后核对：2026-10-31 · 状态：现行

这份文档解决一个问题：**代码改了，接入文档不能悄悄过期。**

`@darialan/web-printer` 的对外文档会随 npm 包发布。用户看到的是 README 和 `docs/` 里随包发布的两份文档，而不是仓库里的全部设计稿。文档一旦与代码不一致，比没有文档更贵——用户会按错误的信息接入，然后来报 bug。

---

## 1. 文档地图

仓库只有两处放文档：`docs/` 是对外资产（接入方、npm 用户能看到），`.agents/docs/` 只放**规则与不可从代码推导的知识**。架构、分层、算法、流程以代码为准，不写文档副本。

| 文档 | 受众 | 是否随 npm 包发布 | 维护时机 |
| --- | --- | --- | --- |
| `README.md` | 接入方 | 是（npm 自动展示） | 任何 API / 默认值 / 支持边界变化 |
| `CONTRIBUTING.md` | 贡献者 | 否 | 开发脚本、提交钩子、源码结构变化 |
| `AGENTS.md` | AI agent | 否 | 命令、硬约束、文档入口变化 |
| **对外资产 `docs/`** | | | |
| `docs/migration-to-web-printer.md` | 老包迁移用户 | 是（`files` 白名单） | 命名、入口、兼容别名变化 |
| `docs/output-formats.md` | 接入方 | 是（`files` 白名单） | 输出格式、writer 协议、失败/取消行为变化 |
| `docs/npm-package-guide.md` | 接入方 / 架构师 | 否（仓库内公开） | 算法、规则、构建方式、测试数量变化 |
| **内部规则与经验 `.agents/docs/`** | | | |
| `.agents/docs/documentation.md` | 维护者 | 否 | 文档分组、事实来源、发版检查项变化 |
| `.agents/docs/publishing.md` | 维护者 | 否 | 发布脚本、CI、校验步骤变化 |
| `.agents/docs/analytics.md` | 维护者 | 否 | 分析供应商、上报口径变化 |
| `.agents/docs/chrome-extension.md` | agent / 贡献者 | 否 | 插件产品范围、权限或隐私约束变化 |
| `.agents/docs/npm-package-readiness.md` | 维护者 | 否 | 缺陷修复后勾掉；问题清空即删除 |

规则：

- 面向用户的文档一律放 `docs/`，`.agents/docs/` 里的内容不承诺对外准确。
- `.agents/` 是隐藏目录：agent 通过根目录 `AGENTS.md` 进入，人类贡献者通过 `CONTRIBUTING.md` 进入，两边都指向 `.agents/docs/README.md`。
- 增加"随包发布"的文档时，必须同步修改 `package.json` 的 `files` 字段，否则用户拿不到。
- 不写架构文档、不看架构文档：分层与算法直接读 `src/lib`；文档只记录代码里没有的规则、约束和判断依据。
- 修改已完成方案的记录、评审、验收日志，一律删除；仍有约束力的结论并入上面五篇之一。

---

## 2. 事实来源映射（改代码时对照）

| 文档里的事实 | 唯一事实来源 |
| --- | --- |
| 入口、子路径、类型文件 | `package.json` 的 `main` / `module` / `types` / `exports` |
| 公开 API 名单 | `src/lib/index.ts`、`src/lib/react.ts` |
| `data-print-*` / `.print-*` 协议与默认规则 | `src/lib/core/rules/print-rules.ts` 的 `PRINT_ATTRIBUTES` / `PRINT_CLASSES` / `BASE_PRINT_RULES` |
| 纸张尺寸、默认边距、单位换算 | `src/lib/core/geometry/paper.ts` |
| 页眉页脚/页码占位、容量公式 | `src/lib/core/geometry/page-geometry.ts` |
| 页码格式 | `src/lib/output/page-number.ts` |
| 默认 `maxPages`、超时、像素/字符上限 | `print-pipeline.ts`（100 页）、`resource-loader.ts`（15s）、`page-capture.ts`（8M px）、`text-range.ts`（200k 字符）、`image-writer.ts`（128 MiB） |
| 支持的能力边界（iframe / Shadow DOM / 视频 / 文字层） | `print-pipeline.ts`、`snapshot.ts`、`image-writer.ts` 的实现注释 |
| 测试数量与覆盖范围 | `npm run test:lib` 输出、`e2e/engine.spec.mjs` |
| 发布流程 | `scripts/release.mjs`、`scripts/verify-package.mjs`、`.github/workflows/npm-publish.yml` |

> 规则：文档中出现的每个数字、选择器、API 名，都应该能在上表找到出处。找不到出处的句子，不要写进对外文档。

---

## 3. 写作规则

1. **README 面向第一次使用的读者。** 不写旧 Hook 名、旧包名、兼容别名、版本历史、迁移步骤和"本次改动"；这些放进 `docs/migration-*`、发布说明或 `.agents/docs/`。README 只回答：这是什么、为什么用、怎么装、怎么跑、有什么坑、去哪看更多。
2. **只写可验证的事实。** 不写"零污染""10 秒完成""消除 OOM"这类无法验证的结论；改成条件 + 数字，例如"24 页文档约 13 秒、13 MB"。
3. **默认值必须写清适用条件。** 例如"A4 容量约 950px"取决于源区域宽度，应写"源区域宽约 960px 时"。
4. **代码片段要能跑。** JSX 里不要写 `<!-- -->`；示例 API 名必须与 `src/lib/index.ts` 的导出一致。
5. **npm 页面上的链接用绝对地址。** 相对链接在 npmjs 上会 404。随包文档的链接统一写成 `https://github.com/darialan/web-printer/blob/master/...`。
6. **限制要写成"现象 + 规避方式"。** 例如现代颜色函数："`oklch()` / `color-mix()` 会报错；打印区域内请改用 `rgb()` / 十六进制，或等待渲染底座更新。"
7. **不预测未实现的计划。** 未完成的测试覆盖写成"当前覆盖 / 计划补充"，不要写成已覆盖。
8. **每篇内部文档头写版本与状态。** 统一格式：`> 适用版本：@darialan/web-printer x.y.z · 最后核对：YYYY-MM-DD · 状态：现行`。只给仍在生效的规则和经验标版本；过期的直接删，不留"历史记录"。
9. **不复制代码里的事实。** 分层、模块职责、算法步骤、API 默认值都能从 `src/lib` 读出来，写进文档就会随代码过期。文档只写：为什么这样选、什么不能做、出问题怎么处理。

---

## 3.1 文档生命周期

| 状态 | 含义 | 处理 |
| --- | --- | --- |
| 草案 | 方案未落地，可能与代码不一致 | 标 `状态：草案`；方案落地后只保留结论，过程稿删除 |
| 现行 | 规则或经验仍适用于当前版本 | 每次发版核对，更新"适用版本" |
| 过期 | 与当前代码或产品不一致 | 直接删除。git 能找回，留着会持续误导 agent |

发版脚本升级版本号后，`.agents/docs/` 里所有 `适用版本` 低于新版本且状态为"现行"的文档，要么核对后更新版本，要么删除。

---

## 4. 发版前文档检查清单

在 `npm run release:*` 之前逐项确认：

- [ ] `npm run check:full` 通过（类型、单测、构建、e2e）
- [ ] `npm run test:lib` 的实际 suite / 用例数已同步到 `docs/npm-package-guide.md`
- [ ] 所有内部文档的 `适用版本` 已核对，过期文档已删除
- [ ] README 的 API 列表与 `src/lib/index.ts` 的导出一致
- [ ] 默认值（页数、超时、像素、字符、内存预算）与代码一致
- [ ] 规则/属性表与 `BASE_PRINT_RULES` 一致
- [ ] e2e 覆盖描述与实际 `e2e/engine.spec.mjs` 一致
- [ ] 所有 npm 页面可见的链接均为绝对地址
- [ ] 代码片段可直接复制使用（无 JSX/HTML 语法混淆）
- [ ] 新增随包文档已加入 `package.json` 的 `files`
- [ ] `npm pack --dry-run` 的文件列表符合预期
- [ ] `node scripts/verify-package.mjs <tarball>` 通过
- [ ] CHANGELOG（若存在）已更新

---

## 5. 何时必须改文档

出现以下任一变更时，**同一个 PR/提交内**完成文档更新，不另开任务：

- 新增/删除/重命名导出（`src/lib/index.ts`、`src/lib/react.ts`）
- 修改默认值或上限
- 修改 `BASE_PRINT_RULES` 或兼容别名
- 修改错误信息、取消语义、进度回调
- 修改输出格式、文件命名、ZIP/PDF 行为
- 修改构建/发布脚本或 CI
- 发现文档描述与实现不符（按 review 流程记录并修正）

---

## 6. 建议的自动化（下一版）

当前靠清单人工核对。后续可加一个只读脚本 `scripts/check-docs.mjs`：

1. 校验 README 中所有 `docs/**/*.md` 链接为绝对地址；
2. 校验 `package.json.files` 覆盖 README 引用的随包文档；
3. 从 `src/lib/index.ts` 提取导出名，与 README 的 API 表比对；
4. 从 `BASE_PRINT_RULES` 提取选择器，与文档属性表比对；
5. 把 `npm run test:lib` 的统计数字与 guide 中的数字比对。

脚本接入 `npm run check` 即可，不需要引入新依赖。
