import { classifyPrintNode } from '../../core/rules/print-rules';
import { Interval } from '../../core/types';
import { walkPrintTree } from './traversal';

export function createTextMeasurer(rootTop: number) {
  const lineHeights = new WeakMap<Element, number>();
  const range = document.createRange();
  let characters = 0;
  return (node: Node): Interval[] => {
    characters += node.textContent?.length || 0;
    if (characters > 200000) throw new Error('文本超过 200,000 字符限制，请拆分导出');
    const parent = node.parentElement;
    if (parent && !lineHeights.has(parent)) {
      lineHeights.set(parent, parseFloat(window.getComputedStyle(parent).lineHeight));
    }
    const lineHeight = parent ? lineHeights.get(parent)! : NaN;
    range.selectNodeContents(node);
    return Array.from(range.getClientRects())
      .filter(rect => rect.width > 0 && rect.height > 0)
      .map(rect => {
        // Existing leading approximation is retained here, isolated from element
        // rules. It is not a complete CSS line-box reconstruction for mixed fonts.
        const leading = Number.isFinite(lineHeight) ? Math.max(0, lineHeight - rect.height) / 2 : 0;
        return { top: rect.top - rootTop - leading, bottom: rect.bottom - rootTop + leading };
      });
  };
}

/** Re-measure visible source text for preview/snapshot consistency checks. */
export function measureTextLines(root: HTMLElement): Interval[] {
  const measure = createTextMeasurer(root.getBoundingClientRect().top);
  const lines: Interval[] = [];
  walkPrintTree(root, node => {
    const rule = classifyPrintNode(node);
    if (rule.kind === 'ignore') return 'skip';
    if (rule.kind === 'text') {
      lines.push(...measure(node));
      return 'skip';
    }
    return 'descend';
  });
  return lines;
}
