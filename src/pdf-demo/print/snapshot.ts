/** Freeze resolved CSS so moving the print root outside Tabs does not change typography or layout. */
export function copyResolvedStyle(source: Element, target: HTMLElement | SVGElement) {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  target.style.animation = 'none';
  target.style.transition = 'none';
}

export function measureTextLines(root: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  const lines: { top: number; bottom: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let characters = 0;
  while ((node = walker.nextNode())) {
    characters += node.textContent?.length || 0;
    if (characters > 200000) throw new Error('文本超过 200,000 字符限制，请拆分导出');
    if (!node.textContent?.trim() || node.parentElement?.closest('script,style')) continue;
    const lineHeight = node.parentElement ? parseFloat(window.getComputedStyle(node.parentElement).lineHeight) : NaN;
    const range = document.createRange();
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach(rect => {
      if (rect.width > 0 && rect.height > 0) {
        // Range rects cover font bounds, not the full CSS line box. Keep the
        // leading on both sides too, so a cut does not sit against the glyphs.
        const leading = Number.isFinite(lineHeight) ? Math.max(0, lineHeight - rect.height) / 2 : 0;
        lines.push({ top: rect.top - rootRect.top - leading, bottom: rect.bottom - rootRect.top + leading });
      }
    });
  }
  return lines;
}
