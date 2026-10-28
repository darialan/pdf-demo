import { copyResolvedStyle, measureTextLines } from './snapshot';
import { DEFAULT_SETTINGS, PrintSettings, resolvePaper } from './settings';
import { Interval, paginate, PageSlice } from './pagination';
export type Orientation = 'portrait' | 'landscape';
export interface LayoutOptions {
  element: HTMLElement | null;
  header?: HTMLElement | null;
  footer?: HTMLElement | null;
  orientation?: Orientation;
  settings?: PrintSettings;
  signal?: AbortSignal;
  maxPages?: number;
}
export interface PreparedLayout {
  root: HTMLElement; header?: HTMLElement; footer?: HTMLElement;
  width: number; pageWidth: number; pageHeight: number; contentWidth: number;
  headerHeight: number; footerHeight: number; ratio: number; pages: PageSlice[];
  left: number; bodyTop: number; headerY: number; footerY: number; pageNumberY: number;
  cleanup: () => void;
}
export const checkCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('导出已取消');
};
const activeRoots = new WeakSet<HTMLElement>();
export async function prepareLayout(options: LayoutOptions): Promise<PreparedLayout> {
  const { element, header, footer, signal, orientation = 'portrait', maxPages = options.settings?.slicingMode ? Number.MAX_SAFE_INTEGER : 100 } = options;
  if (!(element instanceof HTMLElement) || !element.isConnected) throw new Error('找不到有效的打印区域');
  if (!['portrait', 'landscape'].includes(orientation)) throw new Error('纸张方向必须为 portrait 或 landscape');
  const paper = resolvePaper(options.settings || { ...DEFAULT_SETTINGS, orientation });
  if (activeRoots.has(element)) throw new Error('该区域正在导出，请勿重复提交');
  const width = element.getBoundingClientRect().width;
  if (!Number.isFinite(width) || width <= 0) throw new Error('打印区域宽度为零，请先显示内容');
  checkCancelled(signal);
  activeRoots.add(element);
  const host = document.createElement('div');
  host.setAttribute('data-pdf-snapshot', 'true');
  host.style.cssText = `position:absolute;left:-100000px;top:0;width:${width}px;pointer-events:none;background:white;`;
  const clone = (source: HTMLElement) => {
    const target = source.cloneNode(true) as HTMLElement;

    // Preserve form and canvas state that cloneNode does not copy.
    const sources = [source, ...Array.from(source.querySelectorAll('*'))];
    const targets = [target, ...Array.from(target.querySelectorAll('*'))];
    sources.forEach((node, i) => {
      const copy = targets[i];
      if (node instanceof HTMLInputElement && copy instanceof HTMLInputElement) { copy.value = node.value; copy.checked = node.checked; }
      if (node instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) copy.value = node.value;
      if (node instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) copy.selectedIndex = node.selectedIndex;
      if (node instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) { copy.width = node.width; copy.height = node.height; copy.getContext('2d')?.drawImage(node, 0, 0); }
      if (copy instanceof HTMLElement || copy instanceof SVGElement) copyResolvedStyle(node, copy);
      if (copy instanceof HTMLImageElement) {
        copy.loading = 'eager';
        // Fail during preparation when a remote image cannot be used by canvas.
        if (/^https?:/.test(copy.src) && new URL(copy.src).origin !== window.location.origin) copy.crossOrigin = 'anonymous';
      }
    });
    target.style.width = `${width}px`;
    target.style.maxWidth = 'none';
    target.style.boxSizing = 'border-box';
    target.querySelectorAll('[data-pdf-debug]').forEach(node => node.remove());
    host.appendChild(target);
    return target;
  };
  const cleanup = () => { host.remove(); activeRoots.delete(element); };
  try {
    const root = clone(element);
    const slicing = options.settings?.slicingMode;
    const headerClone = header && !slicing ? clone(header) : undefined;
    const footerClone = footer && !slicing ? clone(footer) : undefined;
    document.body.appendChild(host);
    await ready(host, signal);
    checkCancelled(signal);
    const { pageWidth, pageHeight } = paper;
    const contentWidth = pageWidth - paper.left - paper.right;
    const ratio = contentWidth / width;
    const headerHeight = (headerClone?.getBoundingClientRect().height || 0) * ratio;
    const footerHeight = (footerClone?.getBoundingClientRect().height || 0) * ratio;
    const bodyTop = paper.top + headerHeight + (headerClone ? 6 : 0);
    const footerY = pageHeight - paper.bottom - (slicing ? 0 : 14) - footerHeight;
    const capacity = (footerY - (footerClone ? 6 : 0) - bodyTop) / ratio;
    if (capacity <= 0) throw new Error('页眉页脚过高，没有剩余正文空间');
    const rect = root.getBoundingClientRect();
    const height = Math.max(rect.height, root.scrollHeight);
    if (height <= 0 || height > 200000) throw new Error('打印区域为空或超过 200,000px 高度限制');
    const ranges: Interval[] = [];
    const add = (r: DOMRect) => { if (r.height > 0 && r.width > 0) ranges.push({ top: Math.max(0, r.top - rect.top), bottom: Math.min(height, r.bottom - rect.top) }); };
    if (!slicing) root.querySelectorAll('tr, img, canvas, [data-pdf-keep-together="true"], h1, h2, h3, h4, h5, h6').forEach(node => {
      const bounds = node.getBoundingClientRect();
      if (node.matches('tr') && bounds.height > capacity) return; // Oversize rows split only at measured text lines.
      add(bounds);
    });
    if (!slicing) ranges.push(...measureTextLines(root).map(line => ({
      top: Math.max(0, line.top), bottom: Math.min(height, line.bottom),
    })));
    return { left: paper.left, bodyTop, headerY: paper.top, footerY, pageNumberY: pageHeight - Math.max(6, paper.bottom / 2), root, header: headerClone, footer: footerClone, width, pageWidth, pageHeight, contentWidth, headerHeight, footerHeight, ratio, pages: paginate(height, capacity, slicing ? [] : ranges, maxPages), cleanup };
  } catch (error) { cleanup(); throw error; }
}
async function ready(host: HTMLElement, signal?: AbortSignal) {
  let timeout: ReturnType<typeof setTimeout>;
  let abort: () => void = () => {};
  const guard = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('字体或图片加载超时，请稍后重试')), 15000);
    abort = () => reject(new Error('导出已取消'));
    signal?.addEventListener('abort', abort, { once: true });
  });
  try {
    await Promise.race([guard, Promise.all([
      document.fonts?.ready,
      ...Array.from(host.querySelectorAll('img')).map(async img => {
        try { await img.decode(); } catch { throw new Error(`图片加载失败：${img.alt || '未命名图片'}`); }
        if (!img.naturalWidth) throw new Error(`图片内容为空：${img.alt || '未命名图片'}`);
      })
    ])]);
  } finally { clearTimeout(timeout!); signal?.removeEventListener('abort', abort); }
}
