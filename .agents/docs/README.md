# 内部知识库（规则与经验）

这里只放两类东西：

1. **规则**：必须怎么做、不能怎么做（发布流程、文档规则、权限边界）。
2. **经验与知识**：代码和 README 里看不出来的判断依据（为什么选这个供应商、为什么只申请这几个权限、下一版要修什么）。

**架构、分层、算法、流程不写在这里。** 它们以代码为唯一事实来源，文档一旦复制就会过期，agent 读到旧副本比不读更糟。需要了解实现，直接读：

- 公开 API：`src/lib/index.ts`
- 分页算法：`src/lib/core/pagination/`
- 编排与取消：`src/lib/application/`
- 输出格式：`src/lib/output/`

## 清单

| 文档 | 类型 | 内容 |
| --- | --- | --- |
| [publishing.md](publishing.md) | 规则 | npm 发版流程、一键脚本、CI、报错处理 |
| [documentation.md](documentation.md) | 规则 | 文档放哪、写什么、发版前检查清单 |
| [analytics.md](analytics.md) | 知识 | 站点分析选型、数据口径、开启步骤 |
| [chrome-extension.md](chrome-extension.md) | 知识 | 插件产品范围、权限与隐私约束 |
| [npm-package-readiness.md](npm-package-readiness.md) | 经验 | 当前缺陷台账与下一版施工单 |

## 判断一篇文档该不该写

- 能从代码、类型或 README 推导出来 → **不写**。
- 是某次改动的过程记录（方案、评审、验收日志）→ **改完就删**，只把仍然成立的约束写进规则。
- 是产品范围、权限、供应商选择这类代码里没有的判断 → **写，并标明适用版本**。
- 已经和当前版本对不上 → **直接删**。删掉的能靠 git 找回，留着的会持续误导。
