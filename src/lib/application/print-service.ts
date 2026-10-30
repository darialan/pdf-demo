import { createPageCapture } from '../adapters/canvas/page-capture';
import { measureDocument } from '../adapters/dom/measurement';
import { createOutputWriter, OutputFormat, OutputWriter, validateOutputFormat } from '../output';
import { validatePageBreaks } from '../core/pagination/paginator';
import { buildPrintRules, getPrintRules } from '../core/rules/print-rules';
import { Interval, MeasurementStats, PageSlice } from '../core/types';
import { checkCancelled } from './cancellation';
import { LayoutOptions, PreparedLayout, prepareLayout, resolvePrintElement } from './print-pipeline';

export interface ExportOptions extends LayoutOptions {
  filename: string;
  download?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

export interface DocumentExportOptions extends ExportOptions {
  format?: OutputFormat;
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

/** Share snapshot, pagination and page capture across all output formats. */
export async function outputDocument({ format = 'pdf', filename, download = true, onProgress, ...options }: DocumentExportOptions) {
  validateOutputFormat(format);
  const started = performance.now();
  const layout = await prepareLayout(options);
  try {
    const result = await exportPreparedLayout(layout, { format, filename, download, onProgress, settings: options.settings, signal: options.signal }, performance.now() - started);
    return { ...result, totalMs: performance.now() - started };
  } finally { layout.cleanup(); }
}

/** Export an already frozen layout. The session owns its cleanup. */
export async function exportPreparedLayout(layout: PreparedLayout, options: Omit<DocumentExportOptions, 'element'>, layoutMs = 0) {
  const { format = 'pdf', filename, download = true, onProgress } = options;
  validateOutputFormat(format);
  const started = performance.now();
  const { root, headerHeight, footerHeight, ratio, pages } = layout;
  let renderer: ReturnType<typeof createPageCapture> | undefined;
  let writer: OutputWriter | undefined;
  try {
    renderer = createPageCapture(layout.width, options.signal);
    const { capture, release } = renderer;
    const headerCanvas = layout.header ? await capture(layout.header, 0, headerHeight / ratio) : undefined;
    const footerCanvas = layout.footer ? await capture(layout.footer, 0, footerHeight / ratio) : undefined;
    writer = await createOutputWriter(format, {
      signal: options.signal,
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
      try { await writer.addPageSlice(i, canvas, (page.end - page.start) * ratio); }
      finally { release(canvas); }
      onProgress?.(i + 1, pages.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkCancelled(options.signal);
    const blob = await writer.finalize(filename, download);
    return {
      blob,
      pages: pages.length,
      layoutMs,
      totalMs: performance.now() - started,
      bytes: blob.size,
    };
  } finally {
    writer?.dispose?.();
    renderer?.dispose();
  }
}

/** Backward-compatible PDF entry point. */
export function outputPDF(options: ExportOptions) {
  return outputDocument({ ...options, format: 'pdf' });
}

/** Run full snapshot measurement and pagination validation, returning structured diagnostics. */
export async function inspectPrintLayout({
  contentElement,
  ...options
}: PreviewPaginationOptions): Promise<PrintInspectionResult> {
  const started = performance.now();
  const target = resolvePrintElement(contentElement);
  const layout = await prepareLayout({ element: target, ...options });
  try {
    const pageBreaks = layout.pages.map(page => page.start);
    const rules = options.rules || (options.ruleConfig ? buildPrintRules(options.ruleConfig) : getPrintRules());
    // Removing ignore nodes can reflow flex/grid and collapse margins. Comparing
    // those print coordinates with live source coordinates is invalid. Validate
    // against the actual snapshot used by both preview and export instead.
    const snapshotMeasurement = measureDocument(layout.root, layout.capacity, rules);
    validatePageBreaks(layout.pages, snapshotMeasurement.ranges);
    const result: PrintInspectionResult = {
      pageBreaks,
      pages: layout.pages,
      totalHeight: snapshotMeasurement.height,
      capacity: layout.capacity,
      protectedRanges: snapshotMeasurement.ranges,
      stats: layout.stats,
      timing: {
        measurementMs: layout.timing?.measurementMs ?? 0,
        paginationMs: layout.timing?.paginationMs ?? 0,
        totalMs: performance.now() - started,
      },
    };
    window.dispatchEvent(new CustomEvent('print-inspection', { detail: result }));
    // Existing integrations can migrate their listener without a breaking change.
    window.dispatchEvent(new CustomEvent('pdf-print-inspection', { detail: result }));
    return result;
  } finally {
    layout.cleanup();
  }
}

/** Uses the exact snapshot measurement and page planner used by PDF export, with coordinates relative to the prepared print snapshot. */
export async function calculatePagesArray(options: PreviewPaginationOptions) {
  const result = await inspectPrintLayout(options);
  return result.pageBreaks;
}
