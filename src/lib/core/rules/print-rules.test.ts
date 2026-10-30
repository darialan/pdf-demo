import {
  BASE_PRINT_RULES,
  buildPrintRules,
  classifyPrintNode,
  configurePrint,
  PDF_PRINT_CLASSES,
  resetPrintRules,
} from './print-rules';

afterEach(() => {
  resetPrintRules();
});

test('基础层技术无关且仅使用原生标准协议与标签', () => {
  // 原生 tr 默认受保护
  const tr = document.createElement('tr');
  expect(classifyPrintNode(tr)).toMatchObject({ kind: 'atomic', overflow: 'split' });

  // 原生图片和标题受保护
  const img = document.createElement('img');
  expect(classifyPrintNode(img)).toMatchObject({ kind: 'atomic', overflow: 'error' });

  // 基础规则绝对不硬编码第三方组件库类名（如 .ant-table-row 默认仅作为普通容器）
  const antRow = document.createElement('div');
  antRow.className = 'ant-table-row';
  expect(classifyPrintNode(antRow)).toMatchObject({ kind: 'container' });

  // 基础规则选择器中不应包含任何第三方组件库特定前缀
  BASE_PRINT_RULES.forEach(rule => {
    expect(rule.selector).not.toContain('ant-');
    expect(rule.selector).not.toContain('el-');
  });
});

test('支持三大标准属性协议与类名约定 (atomic, splittable, ignore)', () => {
  // 1. 不可分割 (Atomic)
  const elAtomicAttr = document.createElement('div');
  elAtomicAttr.setAttribute('data-pdf-atomic', 'true');
  expect(classifyPrintNode(elAtomicAttr)).toMatchObject({ kind: 'atomic' });

  const elAtomicClass = document.createElement('div');
  elAtomicClass.className = PDF_PRINT_CLASSES.ATOMIC;
  expect(classifyPrintNode(elAtomicClass)).toMatchObject({ kind: 'atomic' });

  // 兼容别名 (keep-together / keep-or-split)
  const elKeepAttr = document.createElement('div');
  elKeepAttr.setAttribute('data-pdf-keep-together', 'true');
  expect(classifyPrintNode(elKeepAttr)).toMatchObject({ kind: 'atomic' });

  const elSplitAttr = document.createElement('div');
  elSplitAttr.setAttribute('data-pdf-keep-together', 'split');
  expect(classifyPrintNode(elSplitAttr)).toMatchObject({ kind: 'atomic' });

  // 2. 自由可分割流式项 (Splittable)
  const elSplittableAttr = document.createElement('div');
  elSplittableAttr.setAttribute('data-pdf-splittable', 'true');
  expect(classifyPrintNode(elSplittableAttr)).toMatchObject({ kind: 'container' });

  const elSplittableClass = document.createElement('div');
  elSplittableClass.className = PDF_PRINT_CLASSES.SPLITTABLE;
  expect(classifyPrintNode(elSplittableClass)).toMatchObject({ kind: 'container' });

  // 兼容别名 force-split
  const elBreakAttr = document.createElement('div');
  elBreakAttr.setAttribute('data-pdf-break', 'split');
  expect(classifyPrintNode(elBreakAttr)).toMatchObject({ kind: 'container' });

  // 3. 忽略打印 (Ignore)
  const elIgnoreAttr = document.createElement('div');
  elIgnoreAttr.setAttribute('data-pdf-ignore', 'true');
  expect(classifyPrintNode(elIgnoreAttr)).toMatchObject({ kind: 'ignore' });

  const elIgnoreClass = document.createElement('div');
  elIgnoreClass.className = PDF_PRINT_CLASSES.IGNORE;
  expect(classifyPrintNode(elIgnoreClass)).toMatchObject({ kind: 'ignore' });
});

test('业务方通过 configurePrint 统一注册组件库类名', () => {
  const antRow = document.createElement('div');
  antRow.className = 'ant-table-row';

  const elRow = document.createElement('div');
  elRow.className = 'el-table__row';

  // 配置前为普通容器
  expect(classifyPrintNode(antRow)).toMatchObject({ kind: 'container' });
  expect(classifyPrintNode(elRow)).toMatchObject({ kind: 'container' });

  // 业务层统一配置组件库选择器
  configurePrint({
    atomic: ['.ant-table-row', '.el-table__row', '.my-sign-stamp'],
  });

  // 配置后自动按对应规则生效
  expect(classifyPrintNode(antRow)).toMatchObject({ kind: 'atomic' });
  expect(classifyPrintNode(elRow)).toMatchObject({ kind: 'atomic' });

  const stamp = document.createElement('div');
  stamp.className = 'my-sign-stamp';
  expect(classifyPrintNode(stamp)).toMatchObject({ kind: 'atomic' });

  // 重置后恢复纯原生
  resetPrintRules();
  expect(classifyPrintNode(antRow)).toMatchObject({ kind: 'container' });
});

test('buildPrintRules 支持独立构造规则列表，不污染全局状态', () => {
  const localRules = buildPrintRules({
    atomic: ['.isolated-widget'],
  });

  const node = document.createElement('div');
  node.className = 'isolated-widget';

  expect(classifyPrintNode(node, localRules)).toMatchObject({ kind: 'atomic' });
  expect(classifyPrintNode(node)).toMatchObject({ kind: 'container' });
});

test('explicit atomic configuration rejects overflow while keepOrSplit remains a fallback', () => {
  const { buildPrintRules, classifyPrintNode, resolveAtomicOverflow } = require('./print-rules');
  const node = document.createElement('div');
  node.className = 'group';
  const strict = classifyPrintNode(node, buildPrintRules({ atomic: ['.group'] }));
  expect(() => resolveAtomicOverflow(strict, 600, 500)).toThrow('超过');
  const flexible = classifyPrintNode(node, buildPrintRules({ keepOrSplit: ['.group'] }));
  expect(resolveAtomicOverflow(flexible, 600, 500)).toBe('descend');
});
