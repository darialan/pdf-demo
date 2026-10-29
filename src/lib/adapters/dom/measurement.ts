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

/**
 * Ignored subtrees (data-pdf-ignore) are still visible on the live page so they can keep working as normal
 * interactive UI (toolbars, filters), but they must behave as if absent from the print document: zero height,
 * nothing below shifted down to make room for them. The real print/export clone already removes these nodes
 * entirely (see cloneWithResolvedStyles), so its layout has no gap where the ignored block used to be.
 * To make a live-DOM measurement match that same coordinate system, every ignored subtree's rendered height
 * must be subtracted from the measurement of anything laid out after it in normal flow.
 */
function collectIgnoredRanges(root: HTMLElement, bounds: DOMRect, rules: readonly PrintRule[]): Interval[] {
  const ignored: Interval[] = [];
  walkPrintTree(root, node => {
    if (node.nodeType !== 1) return 'descend';
    const rule = classifyPrintNode(node, rules);
    if (rule.kind !== 'ignore') return 'descend';
    const rect = (node as Element).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      ignored.push({ top: rect.top - bounds.top, bottom: rect.bottom - bounds.top });
    }
    return 'skip';
  });
  return ignored.sort((a, b) => a.top - b.top);
}

/** Builds a function that collapses out ignored ranges from a Y coordinate, in the sense of CSS `display:none`. */
function createIgnoreCollapser(ignored: Interval[]) {
  if (ignored.length === 0) return { collapse: (y: number) => y, totalIgnoredHeight: 0 };
  const totalIgnoredHeight = ignored.reduce((sum, range) => sum + (range.bottom - range.top), 0);
  const collapse = (y: number) => {
    let offset = 0;
    for (const range of ignored) {
      if (range.bottom <= y) {
        offset += range.bottom - range.top;
      } else if (range.top <= y) {
        // y falls inside an ignored range (should not normally happen since ignored
        // subtrees are skipped before descending); clamp to the range's start.
        offset += y - range.top;
        break;
      } else {
        break;
      }
    }
    return y - offset;
  };
  return { collapse, totalIgnoredHeight };
}

/** Read DOM geometry once; atomic subtrees do not need redundant text measurement. */
export function measureDocument(
  root: HTMLElement,
  capacity: number,
  rules: readonly PrintRule[] = DEFAULT_PRINT_RULES
): Required<DocumentMeasurement> {
  const bounds = root.getBoundingClientRect();
  const rawHeight = readRootHeight(root);
  const ignoredRanges = collectIgnoredRanges(root, bounds, rules);
  const { collapse, totalIgnoredHeight } = createIgnoreCollapser(ignoredRanges);
  const height = rawHeight - totalIgnoredHeight;
  const ranges: Interval[] = [];
  const text = createTextMeasurer(bounds.top, collapse);
  const stats = { visitedNodes: 0, atomicElements: 0, textNodes: 0, textFragments: 0 };
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
    const customLabel = element.getAttribute('data-pdf-label') || element.getAttribute('alt');
    if (resolveAtomicOverflow(rule, rect.height, capacity, customLabel) === 'descend') {
      return 'descend';
    }
    stats.atomicElements++;
    add({ top: collapse(rect.top - bounds.top), bottom: collapse(rect.bottom - bounds.top) });
    return 'skip';
  });
  return { height, ranges, stats };
}
