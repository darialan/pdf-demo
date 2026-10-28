import { createPageCapture } from '../adapters/canvas/page-capture';
import { measureDocument } from '../adapters/dom/measurement';
import { createPdfWriter } from '../adapters/pdf/jspdf-writer';
import { validatePageBreaks } from '../core/pagination/paginator';
import { Interval, MeasurementStats, PageSlice } from '../core/types';
import { checkCancelled } from './cancellation';
import { LayoutOptions, prepareLayout } from './print-pipeline';

export interface ExportOptions extends LayoutOptions {
  filename: string;
  download?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

export interface PreviewPaginationOptions extends Omit<LayoutOptions, 'element'> {
  contentElement: HTMLElement | null;
}

export interface PrintInspectionResult {
  pageBreaks: number[];
  pages: PageSlice[];
  totalHeight: number;
  capacity: number;
  protectedRanges: Interval[];
  stats?: MeasurementStats;
  timing: {
    measurementMs: number;
    paginationMs: number;
    totalMs: number;
  };
}

/** Render bounded page canvases and compose PDF; never allocate one canvas for the whole document. */
export async function outputPDF({ filename, download = true, onProgress, ...options }: ExportOptions) {
  const started = performance.now();
  const layout = await prepareLayout(options);
  const { root, headerHeight, footerHeight, ratio, pages } = layout;
  const layoutMs = performance.now() - started;
  const renderer = createPageCapture(layout.width, options.signal);
  const { capture, release } = renderer;
  try {
    const headerCanvas = layout.header ? await capture(layout.header, 0, headerHeight / ratio) : undefined;
    const footerCanvas = layout.footer ? await capture(layout.footer, 0, footerHeight / ratio) : undefined;
    const pdfWriter = createPdfWriter({
      geometry: layout,
      settings: options.settings,
      headerCanvas,
      footerCanvas,
      totalPages: pages.length,
    });
    onProgress?.(0, pages.length);
    for (let i = 0; i < pages.length; i++) {
      checkCancelled(options.signal);
      const page = pages[i];
      const canvas = await capture(root, page.start, page.end - page.start);
      pdfWriter.addPageSlice(i, canvas, (page.end - page.start) * ratio);
      release(canvas);
      onProgress?.(i + 1, pages.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkCancelled(options.signal);
    const blob = await pdfWriter.finalize(filename, download);
    return {
      blob,
      pages: pages.length,
      layoutMs,
      totalMs: performance.now() - started,
      bytes: blob.size,
    };
  } finally {
    renderer.dispose();
    layout.cleanup();
  }
}

/** Run full snapshot measurement, pagination and source consistency check, returning structured diagnostics. */
export async function inspectPrintLayout({
  contentElement,
  ...options
}: PreviewPaginationOptions): Promise<PrintInspectionResult> {
  const started = performance.now();
  const layout = await prepareLayout({ element: contentElement, maxPages: Number.MAX_SAFE_INTEGER, ...options });
  try {
    const pageBreaks = layout.pages.map(page => page.start);
    const sourceMeasurement = options.settings?.slicingMode
      ? { height: layout.pages[layout.pages.length - 1]?.end || 0, ranges: [] }
      : measureDocument(contentElement!, layout.capacity, options.rules);
    validatePageBreaks(layout.pages, sourceMeasurement.ranges);
    const result: PrintInspectionResult = {
      pageBreaks,
      pages: layout.pages,
      totalHeight: sourceMeasurement.height,
      capacity: layout.capacity,
      protectedRanges: sourceMeasurement.ranges,
      stats: layout.stats,
      timing: {
        measurementMs: layout.timing?.measurementMs ?? 0,
        paginationMs: layout.timing?.paginationMs ?? 0,
        totalMs: performance.now() - started,
      },
    };
    window.dispatchEvent(new CustomEvent('pdf-print-inspection', { detail: result }));
    return result;
  } finally {
    layout.cleanup();
  }
}

/** Uses the exact snapshot measurement and page planner used by PDF export, verifying consistency with source DOM. */
export async function calculatePagesArray(options: PreviewPaginationOptions) {
  const result = await inspectPrintLayout(options);
  return result.pageBreaks;
}
