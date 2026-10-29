import { ElementRule, PrintRule, PrintRuleConfig } from '../types';
export type { ElementRule, PrintRule, PrintRuleConfig } from '../types';

export interface ClassifiableNode {
  nodeType: number;
  textContent?: string | null;
  matches?: (selector: string) => boolean;
}

const TEXT_NODE_TYPE = 3;
const ELEMENT_NODE_TYPE = 1;

/**
 * 打印系统三大标准属性协议 (Data Attributes & Classes)
 * 纯原生技术无关的标准协议，业务方自写组件或页面时直接绑定：
 * 1. atomic: 最小原子单元，不可分割，跨页整块推移
 * 2. splittable: 可分割流式内容，允许分页线从中穿透
 * 3. ignore: 不打印，完全排除在打印纸张外
 */
export const PDF_PRINT_ATTRIBUTES = {
  /** 不可分割：最小原子化单元，严禁跨页切断，当前页放不下整块换到下一页 */
  ATOMIC: 'data-pdf-atomic="true"',
  /** 可分割：声明为流式内容，允许分页线直接穿透内部 */
  SPLITTABLE: 'data-pdf-splittable="true"',
  /** 打印忽略：不参与测量、快照与打印渲染 */
  IGNORE: 'data-pdf-ignore="true"',

  // 兼容别名
  KEEP_TOGETHER: 'data-pdf-keep-together="true"',
  KEEP_OR_SPLIT: 'data-pdf-keep-together="split"',
  FORCE_SPLIT: 'data-pdf-break="split"',
} as const;

export const PDF_PRINT_CLASSES = {
  ATOMIC: 'pdf-atomic',
  SPLITTABLE: 'pdf-splittable',
  IGNORE: 'pdf-ignore',

  // 兼容别名
  KEEP_TOGETHER: 'pdf-keep-together',
  KEEP_OR_SPLIT: 'pdf-keep-or-split',
  FORCE_SPLIT: 'pdf-force-split',
} as const;

/**
 * 核心基础规则（BASE_PRINT_RULES）
 * 遵循技术无关、纯原生标准原则：只包含 HTML 标准元素与通用打印协议，绝不硬编码任何具体前端组件库类名
 */
export const BASE_PRINT_RULES: readonly PrintRule[] = [
  // 1. 忽略规则（不打印：标准不可见标签与协议标记）
  {
    selector: 'script, style, template, [hidden], [data-pdf-debug], [data-pdf-ignore="true"], .pdf-ignore',
    result: { kind: 'ignore' },
  },
  // 2. 自由可分割规则（流式容器与段落流，允许分页线穿透）
  {
    selector: '[data-pdf-splittable="true"], .pdf-splittable, [data-pdf-break="split"], .pdf-force-split',
    result: { kind: 'container' },
  },
  // 3. 不可分割规则（显式声明的原子保护块：严禁拆分，超高报错）
  {
    selector:
      '[data-pdf-atomic="true"], .pdf-atomic, [data-pdf-keep-together="true"], .pdf-keep-together',
    result: { kind: 'atomic', label: '不可分割区域', overflow: 'error' },
  },
  // 4. 不可分割规则（表格行与复合原子项：放不下整块换页，超高深入拆分）
  {
    selector: '[data-pdf-keep-together="split"], .pdf-keep-or-split, tr',
    result: { kind: 'atomic', label: '表格行与复合块', overflow: 'split' },
  },
  // 5. 原生不可切图片媒体与标题
  {
    selector: 'img, canvas, svg',
    result: { kind: 'atomic', label: '图片媒体', overflow: 'error' },
  },
  {
    selector: 'h1, h2, h3, h4, h5, h6',
    result: { kind: 'atomic', label: '标题', overflow: 'error' },
  },
];

export const DEFAULT_PRINT_RULES: readonly PrintRule[] = BASE_PRINT_RULES;

/**
 * 根据基础规则与配置构造最终生效的规则列表
 */
export function buildPrintRules(config?: PrintRuleConfig): PrintRule[] {
  if (!config) return [...BASE_PRINT_RULES];

  const customList: PrintRule[] = [];

  // 用户完全自定义的高级规则优先
  if (config.customRules?.length) {
    customList.push(...config.customRules);
  }

  // 自定义忽略（不打印）
  if (config.ignore?.length) {
    customList.push({
      selector: config.ignore.join(', '),
      result: { kind: 'ignore' },
    });
  }

  // 自定义自由可分割内容（splittable）
  const splittableSelectors = [
    ...(config.splittable || []),
    ...(config.forceSplit || []),
  ];
  if (splittableSelectors.length) {
    customList.push({
      selector: splittableSelectors.join(', '),
      result: { kind: 'container' },
    });
  }

  // 自定义不可分割原子项（atomic）
  const atomicSelectors = [
    ...(config.atomic || []),
    ...(config.keepTogether || []),
    ...(config.keepOrSplit || []),
  ];
  if (atomicSelectors.length) {
    customList.push({
      selector: atomicSelectors.join(', '),
      result: { kind: 'atomic', label: '自定义原子项', overflow: 'split' },
    });
  }

  // 兜底追加纯原生基础内置规则
  return [...customList, ...BASE_PRINT_RULES];
}

let activePrintRules: PrintRule[] = buildPrintRules();

/**
 * 全局统一配置打印规则（业务层通过此处注册各自技术栈/组件库的选择器）
 */
export function configurePrint(config: PrintRuleConfig): void {
  activePrintRules = buildPrintRules(config);
}

/**
 * 获取当前全局生效的打印规则列表
 */
export function getPrintRules(): readonly PrintRule[] {
  return activePrintRules;
}

/**
 * 重置全局规则为原生基础规则
 */
export function resetPrintRules(): void {
  activePrintRules = buildPrintRules();
}

/**
 * 对节点进行分类匹配，首个匹配的选择器生效
 */
export function classifyPrintNode(
  node: ClassifiableNode,
  rules: readonly PrintRule[] = getPrintRules()
): ElementRule {
  if (node.nodeType === TEXT_NODE_TYPE) {
    return node.textContent?.trim() ? { kind: 'text' } : { kind: 'ignore' };
  }
  if (node.nodeType !== ELEMENT_NODE_TYPE || typeof node.matches !== 'function') {
    return { kind: 'ignore' };
  }
  return rules.find(rule => node.matches!(rule.selector))?.result || { kind: 'container' };
}

export function resolveAtomicOverflow(
  rule: Extract<ElementRule, { kind: 'atomic' }>,
  height: number,
  capacity: number,
  customLabel?: string | null
): 'protect' | 'descend' {
  if (height <= capacity) return 'protect';
  if (rule.overflow === 'split') return 'descend';
  const label = customLabel || rule.label;
  throw new Error(
    `不可拆分区域「${label}」高 ${Math.ceil(height)}px，超过正文可用高度 ${Math.floor(capacity)}px，请缩小该区域或增大页面高度`
  );
}
