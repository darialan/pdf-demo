import {
  classifyPrintNode,
  DEFAULT_PRINT_RULES,
  resolveAtomicOverflow,
} from '../../core/rules/print-rules';
import { DocumentMeasurement, Interval, PrintRule } from '../../core/types';
import { createTextMeasurer } from './text-range';
import { walkPrintTree } from './traversal';

export function readRootHeight(root: HTMLElement): number {
  const height = Math.max(root.getBoundingClientRect().height, root.scrollHeight);
  if (height <= 0 || height > 200000) {
    throw new Error('打印区域为空或超过 200,000px 高度限制');
  }
  return height;
}

/** Read DOM geometry once; atomic subtrees do not need redundant text measurement. */
export function measureDocument(
  root: HTMLElement,
  capacity: number,
  rules: readonly PrintRule[] = DEFAULT_PRINT_RULES
): Required<DocumentMeasurement> {
  const bounds = root.getBoundingClientRect();
  // Coordinates always belong to this DOM. The print snapshot removes ignored
  // subtrees before measuring; live annotations retain the visible page layout.
  const height = readRootHeight(root);
  const ranges: Interval[] = [];
  const text = createTextMeasurer(bounds.top);
  const stats = { visitedNodes: 0, atomicElements: 0, textNodes: 0, textFragments: 0 };
  const rootRule = classifyPrintNode(root, rules);
  if (rootRule.kind === 'ignore') throw new Error('打印区域已被 ignore 规则排除，请选择其他区域');
  if (rootRule.kind === 'atomic' && resolveAtomicOverflow(rootRule, height, capacity,
    root.getAttribute('data-print-label') || root.getAttribute('data-pdf-label') || root.getAttribute('alt')) === 'protect') {
    return { height, ranges: [{ top: 0, bottom: height }], stats: { ...stats, visitedNodes: 1, atomicElements: 1 } };
  }
  const add = (interval: Interval) => {
    const top = Math.max(0, interval.top);
    const bottom = Math.min(height, interval.bottom);
    if (bottom > top) ranges.push({ top, bottom });
  };
  walkPrintTree(root, node => {
    stats.visitedNodes++;
    const rule = classifyPrintNode(node, rules);
    if (rule.kind === 'ignore') return 'skip';
    if (rule.kind === 'container') return 'descend';
    if (rule.kind === 'text') {
      const fragments = text(node);
      stats.textNodes++;
      stats.textFragments += fragments.length;
      fragments.forEach(add);
      return 'skip';
    }
    const element = node as Element;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 'skip';
    const customLabel = element.getAttribute('data-print-label') || element.getAttribute('data-pdf-label') || element.getAttribute('alt');
    if (resolveAtomicOverflow(rule, rect.height, capacity, customLabel) === 'descend') {
      return 'descend';
    }
    stats.atomicElements++;
    add({ top: rect.top - bounds.top, bottom: rect.bottom - bounds.top });
    return 'skip';
  });
  return { height, ranges, stats };
}
