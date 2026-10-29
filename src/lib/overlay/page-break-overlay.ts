import { walkPrintTree } from '../adapters/dom/traversal';
import { classifyPrintNode } from '../core/rules/print-rules';

export interface ObservabilityStats {
  atomic: number;
  splittable: number;
  ignore: number;
}

let restorePosition: (() => void) | undefined;

export function clearPageBreaks(owner?: Document | HTMLElement) {
  const doc = owner ? ('nodeType' in owner && owner.nodeType === 9 ? (owner as Document) : owner.ownerDocument) : document;
  doc?.querySelectorAll('[data-pdf-debug]').forEach(node => node.remove());
  if (doc !== document && typeof document !== 'undefined') {
    document.querySelectorAll('[data-pdf-debug]').forEach(node => node.remove());
  }
  restorePosition?.();
  restorePosition = undefined;
}

export function visualizePageBreaks(
  pages: number[],
  element: HTMLElement
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
    restorePosition = () => {
      if (position) element.style.setProperty('position', position, priority);
      else element.style.removeProperty('position');
    };
  }

  const rootRect = element.getBoundingClientRect();
  const borderTop = computed ? (parseFloat(computed.borderTopWidth) || 0) : 0;
  const borderLeft = computed ? (parseFloat(computed.borderLeftWidth) || 0) : 0;

  // 扫描当前打印区域内各节点，严格按照 3 种元素语义分类：
  // 1. ignore (不打印)
  // 2. atomic (不可分割最小原子项)
  // 3. splittable (可分割流式项)
  walkPrintTree(element, node => {
    if (node.nodeType !== 1) return 'descend';
    const el = node as HTMLElement;
    if (el.hasAttribute('data-pdf-debug')) return 'skip';

    // 1. ignore (不打印：交互控件 / 分页器 / 隐藏元素)
    const isIgnored =
      el.matches(
        '.ant-pagination, .ant-pagination-item, .ant-pagination-prev, .ant-pagination-next, [data-pdf-ignore="true"], .pdf-ignore, script, style, template, [hidden]'
      ) ||
      classifyPrintNode(el).kind === 'ignore';

    if (isIgnored) {
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

    const rule = classifyPrintNode(el);
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 'skip';

    const left = rect.left - rootRect.left - borderLeft;
    const top = rect.top - rootRect.top - borderTop;
    const width = rect.width;
    const height = rect.height;

    // 2. atomic (不可分割原子项：表格行、标题、图片媒体、卡片、业务注册原子项)
    const isTinyIcon = el.tagName.toLowerCase() === 'svg' && width <= 24 && height <= 24;
    const isAtomic =
      !isTinyIcon &&
      (rule.kind === 'atomic' ||
        el.matches(
          'tr, .ant-table-row, .el-table__row, [data-pdf-atomic="true"], .pdf-atomic, [data-pdf-keep-together], .pdf-keep-together, .pdf-keep-or-split'
        ));

    if (isAtomic) {
      stats.atomic++;
      element.appendChild(
        createOverlay({
          left,
          top,
          width,
          height,
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

    // 3. splittable (可分割流式项：段落、长文本流、自由容器，允许被物理分页线切断)
    const isSplittableContainer = el.matches(
      '[data-pdf-splittable="true"], .pdf-splittable, [data-pdf-break="split"], .pdf-force-split'
    );
    const isSplittableFlow =
      isSplittableContainer ||
      el.matches(
        'p, blockquote, .ant-typography:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)'
      ) ||
      (el.tagName === 'DIV' && el.childElementCount === 0 && Boolean(el.textContent?.trim()));

    if (isSplittableFlow) {
      stats.splittable++;
      element.appendChild(
        createOverlay({
          left,
          top,
          width,
          height,
          borderColor: '#3b82f6',
          borderStyle: 'dashed',
          backgroundColor: 'rgba(59, 130, 246, 0.04)',
          badgeText: 'splittable',
          badgeBg: '#3b82f6',
          badgePosition: 'right',
        })
      );
      if (isSplittableContainer && el.childElementCount > 0) {
        return 'descend';
      }
      return 'skip';
    }

    return 'descend';
  });

  // 绘制分页切割线与 page-break 指示标签（使用高辨识度紫色，避免与 atomic 红色混淆）
  pages.slice(1).forEach((breakY, index) => {
    const lineY = breakY - borderTop;
    const lineContainer = document.createElement('div');
    lineContainer.setAttribute('data-pdf-debug', 'true');
    lineContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: ${lineY}px;
      width: 100%;
      height: 0;
      border-top: 2px dashed #7c3aed;
      z-index: 990;
      pointer-events: none;
      box-sizing: border-box;
    `;

    const pill = document.createElement('span');
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
    z-index: 920;
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
    z-index: 921;
    opacity: 0.95;
    letter-spacing: 0.2px;
  `;

  box.appendChild(badge);
  return box;
}
