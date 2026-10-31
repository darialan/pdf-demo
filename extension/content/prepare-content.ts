import { classifyPrintNode } from '../../src/lib/core/rules/print-rules';
import { PrintRule } from '../../src/lib/core/types';
import type { SnapshotNodeTransform } from '../../src/lib/adapters/dom/snapshot';
import { checkCancelled } from '../../src/lib/application/cancellation';

/** Make a printable copy of a normal webpage, without loosening the library's default strict policy. */
export async function prepareContent(root: HTMLElement, excluded: readonly Element[], rules: readonly PrintRule[], signal: AbortSignal) {
  const omitted = [...excluded];
  const resourceExcludedElements: Element[] = [];
  const replacements = new WeakMap<Element, string>();
  const backgrounds = new WeakSet<Element>();
  const scrollers = new WeakSet<Element>();
  const counts = new Map<string, number>();
  const warn = (key: string) => counts.set(key, (counts.get(key) || 0) + 1);
  const nodes: Element[] = [];
  const pending: Element[] = [root];
  let hasViewportPositioning = false;
  while (pending.length) {
    checkCancelled(signal);
    const node = pending.pop()!;
    if (excluded.includes(node) || classifyPrintNode(node, rules).kind === 'ignore') continue;
    const css = getComputedStyle(node);
    if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse') {
      if (node !== root) omitted.push(node);
      continue;
    }
    if (nodes.length >= 20000) throw new Error('区域内容超过处理上限，请选择更小的打印区域');
    nodes.push(node);
    if (['sticky', 'fixed'].includes(css.position)) hasViewportPositioning = true;
    if (node.matches('[data-virtualized],.ReactVirtualized__Grid,.ReactVirtualized__List,.rc-virtual-list-holder') ||
      (node.matches('[aria-rowcount]') && Number(node.getAttribute('aria-rowcount')) > node.querySelectorAll('[role=row],tr').length)) {
      throw new Error('此区域使用虚拟列表，只加载了部分内容。请选择已完整展开的区域。');
    }
    if (node.matches('iframe,object,embed,video') || node.shadowRoot) {
      const reason = node.shadowRoot ? 'Shadow DOM 内容' : node.matches('video') ? '视频' : '嵌入内容';
      if (node === root) throw new Error(`选中的是${reason}，请选择包含正文的父级区域；无法读取的内容会显示占位提示。`);
      replacements.set(node, `${reason}未导出`);
      warn(reason);
      continue;
    }
    const overflowY = css.overflowY || css.overflow;
    const overflowX = css.overflowX || css.overflow;
    if ((/auto|scroll/.test(overflowY) && node.scrollHeight > node.clientHeight + 2) ||
      (/auto|scroll/.test(overflowX) && node.scrollWidth > node.clientWidth + 2)) {
      scrollers.add(node);
      warn('滚动区域');
    }
    for (let i = node.children.length - 1; i >= 0; i--) pending.push(node.children[i]);
  }
  // Decode remote resources under canvas/CORS rules. A bad image becomes a labelled
  // placeholder rather than making the rest of an otherwise printable document fail.
  const probes = new Map<string, Promise<boolean>>();
  const probe = (url: string) => {
    if (!probes.has(url)) probes.set(url, new Promise<boolean>(resolve => {
      const image = new Image();
      let finished = false;
      const done = (ok: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        image.onload = null; image.onerror = null;
        resolve(ok);
      };
      const cancel = () => { done(false); image.src = ''; };
      const timer = setTimeout(() => { done(false); image.src = ''; }, 5000);
      signal.addEventListener('abort', cancel, { once: true });
      image.crossOrigin = 'anonymous';
      image.onload = () => done(image.naturalWidth > 0);
      image.onerror = () => done(false);
      image.src = url;
    }));
    return probes.get(url)!;
  };
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(6, nodes.length) }, async () => {
    while (cursor < nodes.length) {
      checkCancelled(signal);
      const node = nodes[cursor++];
      if (replacements.has(node)) continue;
      if (node instanceof HTMLImageElement) {
        resourceExcludedElements.push(node);
        const url = node.currentSrc || node.src;
        let remote = false;
        try { remote = new URL(url, location.href).origin !== location.origin; } catch {}
        if (!url || ((remote || !node.complete || !node.naturalWidth) && !await probe(url))) {
          replacements.set(node, `图片未能读取${node.alt ? `：${node.alt}` : ''}`);
          warn('图片');
        }
      }
      const css = getComputedStyle(node);
      for (const match of Array.from(css.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))) {
        const url = new URL(match[1], location.href);
        if (url.origin !== location.origin && !await probe(url.href)) {
          backgrounds.add(node); warn('背景图片'); break;
        }
      }
    }
  }));
  checkCancelled(signal);
  const transformSnapshotNode: SnapshotNodeTransform = (source, clone) => {
    if (source === root) {
      clone.style.setProperty('transform', 'none', 'important');
      clone.style.setProperty('translate', 'none', 'important');
      clone.style.setProperty('rotate', 'none', 'important');
      clone.style.setProperty('scale', 'none', 'important');
    }
    if (scrollers.has(source)) {
      for (const property of ['height', 'max-height', 'block-size', 'max-block-size']) clone.style.setProperty(property, property.startsWith('max') ? 'none' : 'auto', 'important');
      clone.style.setProperty('overflow', 'visible', 'important');
      if (source.matches('pre,code')) {
        clone.style.setProperty('white-space', 'pre-wrap', 'important');
        clone.style.setProperty('overflow-wrap', 'anywhere', 'important');
      }
    }
    if (backgrounds.has(source)) clone.style.setProperty('background-image', 'none', 'important');
    const label = replacements.get(source);
    if (label) {
      const placeholder = document.createElement('div');
      const rect = source.getBoundingClientRect();
      placeholder.setAttribute('data-web-printer-placeholder', 'true');
      placeholder.textContent = label;
      placeholder.style.cssText = `box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:${Math.max(80, rect.width)}px;max-width:100%;height:${Math.max(40, rect.height)}px;padding:12px;background:#f1f3f2;color:#4a534d;font:14px/1.5 system-ui;overflow:hidden;`;
      clone.replaceWith(placeholder);
    }
  };
  const warnings = [...counts].map(([kind, count]) => kind === '滚动区域'
    ? `已在打印副本中展开 ${count} 处滚动区域，仅包含已加载的内容。`
    : kind === '背景图片'
      ? `${count} 处背景图片无法读取，输出中已省略。`
      : `${count} 处${kind}无法完整读取，输出中保留占位提示。`);
  return { excludedElements: omitted, resourceExcludedElements, transformSnapshotNode, warnings, hasViewportPositioning };
}
