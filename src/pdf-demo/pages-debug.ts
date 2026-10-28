import { measureTextLines } from './print/snapshot';
import { LayoutOptions, prepareLayout } from './print/layout';
let restorePosition: (() => void) | undefined;
export function clearPageBreaks() {
  document.querySelectorAll('[data-pdf-debug]').forEach(node => node.remove());
  restorePosition?.();
  restorePosition = undefined;
}
/** Uses the exact snapshot measurement and page planner used by PDF export. */
export async function calculatePagesArray({ contentElement, ...options }: Omit<LayoutOptions, 'element'> & { contentElement: HTMLElement | null }) {
  const layout = await prepareLayout({ element: contentElement, maxPages: Number.MAX_SAFE_INTEGER, ...options });
  try {
    const pages = layout.pages.map(page => page.start);
    // Validate the exact on-screen text, not just the detached snapshot.
    const lines = options.settings?.slicingMode ? [] : measureTextLines(contentElement!);
    const intersections = layout.pages.slice(1).filter(page => lines.some(line => line.top < page.start && line.bottom > page.start)).length;
    if (intersections) throw new Error(`分页预览与原页面布局不一致：${intersections} 个断点穿过文字行，请重新检查布局`);
    return pages;
  } finally { layout.cleanup(); }
}
export function visualizePageBreaks(pages: number[], element: HTMLElement) {
  clearPageBreaks();
  if (window.getComputedStyle(element).position === 'static') {
    const position = element.style.getPropertyValue('position');
    const priority = element.style.getPropertyPriority('position');
    element.style.position = 'relative';
    restorePosition = () => {
      if (position) element.style.setProperty('position', position, priority);
      else element.style.removeProperty('position');
    };
  }
  const borderTop = parseFloat(window.getComputedStyle(element).borderTopWidth) || 0;
  pages.slice(1).forEach(top => {
    const line = document.createElement('div');
    line.setAttribute('data-pdf-debug', 'true');
    line.style.cssText = `position:absolute;left:0;top:${top - borderTop}px;width:100%;height:0;outline:1px dashed red;z-index:900;pointer-events:none;`;
    element.appendChild(line);
  });
}
