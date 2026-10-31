# 架构文档

本目录从 `src/lib` 的实际模块边界生成，面向贡献者与需要理解实现的人，不随 npm 包发布。

- [分层视图](layers.md) — 接入层 / 应用层 / 中间层 / 核心层，回答“系统分成哪些层”
- [C4 Context](c4-context.md) — 系统边界、使用者和外部运行时
- [C4 Container](c4-containers.md) — 仓库内的可发布单元与示例站点
- [C4 Component](c4-components-library.md) — 核心库内部的 7 个组件及协作

## 维护约定

- C4 图只使用 Person / System / Container / Component 四种元素，不发明“子组件”“模块层”等 C4 级别。
- 分层视图是补充视角，不是 C4 的第五层；它用于解释代码分层，不替代 C4。
- 模块职责或依赖方向变化时，同步更新对应图；以 `src/lib` 为准，不以图为准。
- 每张图只表达一个抽象层级；细节放在文字说明里。
