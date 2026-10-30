import { walkPrintTree } from '../adapters/dom/traversal';
import { classifyPrintNode, getPrintRules } from '../core/rules/print-rules';
import { PrintRule } from '../core/types';

export interface ObservabilityStats {
  atomic: number;
  splittable: number;
  ignore: number;
}

const restorers = new Map<HTMLElement, () => void>();

export function clearPageBreaks(owner?: Document | HTMLElement) {
  const scope = owner || document;
  scope.querySelectorAll('[data-pdf-debug]').forEach(node => node.remove());
  for (const [root, restore] of Array.from(restorers)) {
    if (!owner || owner === root || (owner.nodeType === 9 && root.ownerDocument === owner)) {
      restore();
      restorers.delete(root);
    }
  }
}

export function visualizePageBreaks(
  pages: number[],
  element: HTMLElement,
  rules: readonly PrintRule[] = getPrintRules()
): ObservabilityStats {
  clearPageBreaks(element);

  const stats: ObservabilityStats = {
    atomic: 0,
    splittable: 0,
    ignore: 0,
  };

  const win = element.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  const computed = win?.getComputedStyle ? win.getComputedStyle(element) : null;

  if (computed && computed.position === 'static') {
    const position = element.style.getPropertyValue('position');
    const priority = element.style.getPropertyPriority('position');
    element.style.position = 'relative';
    restorers.set(element, () => {
      if (position) element.style.setProperty('position', position, priority);
      else element.style.removeProperty('position');
    });
  }

  const rootRect = element.getBoundingClientRect();
  const borderTop = computed ? (parseFloat(computed.borderTopWidth) || 0) : 0;
  const borderLeft = computed ? (parseFloat(computed.borderLeftWidth) || 0) : 0;

  // 扫描当前打印区域内各节点，严格按照 3 种元素语义分类：
  // 1. ignore (不打印)
  // 2. atomic (不可分割最小原子项)
  // 3. splittable (可分割流式项)
  // 分类结果必须与 measureDocument 保持一致；否则会出现"标成可分割但实际没被切开"的错位。
  walkPrintTree(element, node => {
    if (node.nodeType !== 1) return 'skip';
    const el = node as HTMLElement;
    if (el.hasAttribute('data-pdf-debug')) return 'skip';

    const rule = classifyPrintNode(el, rules);

    // 1. ignore (不打印：交互控件 / 分页器 / 隐藏元素)
    if (rule.kind === 'ignore') {
      stats.ignore++;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        element.appendChild(
          createOverlay({
            left: rect.left - rootRect.left - borderLeft,
            top: rect.top - rootRect.top - borderTop,
            width: rect.width,
            height: rect.height,
            borderColor: '#94a3b8',
            borderStyle: 'dashed',
            backgroundColor: 'rgba(148, 163, 184, 0.08)',
            badgeText: 'ignore',
            badgeBg: '#64748b',
            badgePosition: 'left',
          })
        );
      }
      return 'skip';
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 'skip';

    // 2. atomic (不可分割原子项：表格行、标题、图片媒体、卡片、业务注册原子项)
    if (rule.kind === 'atomic') {
      stats.atomic++;
      element.appendChild(
        createOverlay({
          left: rect.left - rootRect.left - borderLeft,
          top: rect.top - rootRect.top - borderTop,
          width: rect.width,
          height: rect.height,
          borderColor: '#ef4444',
          borderStyle: 'solid',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          badgeText: 'atomic',
          badgeBg: '#ef4444',
          badgePosition: 'right',
        })
      );
      return 'skip';
    }

    // 行内元素（b / code / 行内公式）不单独成框，避免把一行文字里的片段标成"区域"
    if (isInlineBox(el, win)) return 'skip';

    // 3. splittable (可分割流式项：真正拥有正文文本的块，允许被物理分页线切断)
    const explicitSplit = el.matches(SPLIT_CONTAINER_SELECTOR);
    const ownsFlowingText = hasOwnText(el);
    if (explicitSplit || ownsFlowingText) {
      stats.splittable++;
      element.appendChild(
        createOverlay({
          left: rect.left - rootRect.left - borderLeft,
          top: rect.top - rootRect.top - borderTop,
          width: rect.width,
          height: rect.height,
          borderColor: '#3b82f6',
          borderStyle: 'dashed',
          backgroundColor: 'rgba(59, 130, 246, 0.04)',
          badgeText: 'splittable',
          badgeBg: '#3b82f6',
          badgePosition: 'right',
        })
      );
      // 显式声明的可分割容器继续下钻，让内部的原子子项照常标红
      return explicitSplit ? 'descend' : 'skip';
    }

    // 本身没有正文的容器（例如只包了一张图的 <p>）继续下钻，
    // 让真正的媒体子孙节点按 atomic 标红，而不是把整段标成 splittable。
    return 'descend';
  });

  // 绘制分页切割线与 page-break 指示标签（使用高辨识度紫色，避免与 atomic 红色混淆）
  pages.slice(1).forEach((breakY, index) => {
    const lineY = breakY - borderTop;
    const lineContainer = element.ownerDocument.createElement('div');
    lineContainer.setAttribute('data-pdf-debug', 'true');
    lineContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: ${lineY}px;
      width: 100%;
      height: 0;
      border-top: 2px dashed #7c3aed;
      z-index: ${MARKER_LAYER.line};
      pointer-events: none;
      box-sizing: border-box;
    `;

    const pill = element.ownerDocument.createElement('span');
    pill.textContent = `✂️ page-break: ${Math.round(breakY)}px (p.${index + 1} ➔ p.${index + 2})`;
    pill.style.cssText = `
      position: absolute;
      right: 16px;
      top: -11px;
      background: #7c3aed;
      color: #fff;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      line-height: 1;
      padding: 3px 8px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0.2px;
      box-shadow: 0 1px 4px rgba(124, 58, 237, 0.35);
      white-space: nowrap;
    `;

    lineContainer.appendChild(pill);
    element.appendChild(lineContainer);
  });

  return stats;
}

const SPLIT_CONTAINER_SELECTOR =
  '[data-pdf-splittable="true"], .pdf-splittable, [data-pdf-break="split"], .pdf-force-split';

/**
 * 标记层必须留在页面内容与站点外壳之间：
 * 打印根节点不会创建独立层叠上下文，若这里用 900+ 的 z-index，
 * 标记会盖住吸顶的工具条（z-index 20）与站点导航（z-index 100）。
 * 只要盖过文档正文即可，所以统一用一个很小的区间。
 */
const MARKER_LAYER = { box: 2, badge: 3, line: 4 } as const;

/** 行内语义标签：即使是 flex/grid 子项被 blockify，也不该被当成一块独立可分割区域 */
const INLINE_TAGS = new Set([
  'SPAN', 'B', 'STRONG', 'EM', 'I', 'CODE', 'A', 'SMALL', 'SUP', 'SUB', 'MARK',
  'ABBR', 'CITE', 'Q', 'TIME', 'U', 'S', 'KBD', 'SAMP', 'VAR', 'BR',
]);

/** 只认元素自己的文本节点：`<p><img></p>` 这类媒体包装段落本身没有正文，不该算可分割正文流 */
function hasOwnText(el: HTMLElement): boolean {
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 3 && child.textContent?.trim()) return true;
  }
  return false;
}

function isInlineBox(el: HTMLElement, win: Window | null): boolean {
  if (INLINE_TAGS.has(el.tagName)) return true;
  if (!win?.getComputedStyle) return false;
  return win.getComputedStyle(el).display.startsWith('inline');
}

function createOverlay(opts: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed';
  backgroundColor: string;
  badgeText: string;
  badgeBg: string;
  badgePosition?: 'left' | 'right';
}): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute('data-pdf-debug', 'true');
  box.style.cssText = `
    position: absolute;
    left: ${opts.left}px;
    top: ${opts.top}px;
    width: ${opts.width}px;
    height: ${opts.height}px;
    border: 1.5px ${opts.borderStyle} ${opts.borderColor};
    background: ${opts.backgroundColor};
    box-sizing: border-box;
    z-index: ${MARKER_LAYER.box};
    pointer-events: none;
    border-radius: 2px;
  `;

  const badge = document.createElement('span');
  badge.textContent = opts.badgeText;
  const isRight = opts.badgePosition === 'right';

  // 贴元素内部角隅放置（默认右上），确保在元素自身内部高亮，绝不跨界遮挡上方元素文字
  const badgeTop = '2px';
  const badgeSide = isRight ? 'right: 4px;' : 'left: 4px;';

  badge.style.cssText = `
    position: absolute;
    ${badgeSide}
    top: ${badgeTop};
    background: ${opts.badgeBg};
    color: #ffffff;
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 600;
    line-height: 1;
    padding: 1.5px 5px;
    border-radius: 3px;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0,0,0,0.18);
    z-index: ${MARKER_LAYER.badge};
    opacity: 0.95;
    letter-spacing: 0.2px;
  `;

  box.appendChild(badge);
  return box;
}
