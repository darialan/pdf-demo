import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { checkCancelled, LayoutOptions, prepareLayout } from './print/layout';
export interface ExportOptions extends LayoutOptions {
  filename: string;
  download?: boolean;
  onProgress?: (completed: number, total: number) => void;
}
const resolveRight = (mm: number) => mm * 72 / 25.4;
const MAX_PIXELS = 8_000_000;
/** Render bounded page canvases; never allocate one canvas for the whole document. */
export async function outputPDF({ filename, download = true, onProgress, ...options }: ExportOptions) {
  const started = performance.now();
  const layout = await prepareLayout(options);
  const { root, pageWidth, pageHeight, contentWidth, headerHeight, footerHeight, ratio, pages } = layout;
  const layoutMs = performance.now() - started;
  const canvases = new Set<HTMLCanvasElement>();
  async function capture(element: HTMLElement, y: number, height: number) {
    checkCancelled(options.signal);
    const width = layout.width;
    const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (Math.ceil(width) * Math.ceil(height))), 8192 / width, 8192 / height);
    if (!Number.isFinite(scale) || scale < 0.5) throw new Error('页面像素超限，请缩小打印区域宽度');
    const canvas = await html2canvas(element, {
      x: 0, y, width, height, scale, useCORS: true, allowTaint: false,
      backgroundColor: '#ffffff', logging: false, imageTimeout: 15000,
      ignoreElements: node => node.hasAttribute('data-pdf-debug'),
    });
    canvases.add(canvas);
    checkCancelled(options.signal);
    if (!canvas.width || !canvas.height) throw new Error('截图为空，请检查打印区域');
    return canvas;
  }
  const release = (canvas: HTMLCanvasElement) => { canvas.width = 0; canvas.height = 0; canvases.delete(canvas); };
  try {
    const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ unit: 'pt', format: [pageWidth, pageHeight], orientation });
    const header = layout.header ? await capture(layout.header, 0, headerHeight / ratio) : undefined;
    const footer = layout.footer ? await capture(layout.footer, 0, footerHeight / ratio) : undefined;
    onProgress?.(0, pages.length);
    for (let i = 0; i < pages.length; i++) {
      checkCancelled(options.signal);
      const page = pages[i];
      const canvas = await capture(root, page.start, page.end - page.start);
      if (i) pdf.addPage();
      pdf.addImage(canvas, 'PNG', layout.left, layout.bodyTop, contentWidth, (page.end - page.start) * ratio, undefined, 'FAST');
      release(canvas);
      if (header) pdf.addImage(header, 'PNG', layout.left, layout.headerY, contentWidth, headerHeight, 'print-header', 'FAST');
      if (footer) pdf.addImage(footer, 'PNG', layout.left, layout.footerY, contentWidth, footerHeight, 'print-footer', 'FAST');
      pdf.setFontSize(9);
      if (!options.settings?.slicingMode) pdf.text(`${i + 1} / ${pages.length}`, pageWidth - (options.settings ? resolveRight(options.settings.marginRightMm) : 10 * 72 / 25.4), layout.pageNumberY, { align: 'right' });
      onProgress?.(i + 1, pages.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkCancelled(options.signal);
    const blob = pdf.output('blob');
    if (download) await pdf.save(`${filename.replace(/\.pdf$/i, '') || 'document'}.pdf`, { returnPromise: true });
    return { blob, pages: pages.length, layoutMs, totalMs: performance.now() - started, bytes: blob.size };
  } finally {
    canvases.forEach(release);
    layout.cleanup();
  }
}
