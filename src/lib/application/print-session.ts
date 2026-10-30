import { createPageCapture } from '../adapters/canvas/page-capture';
import { composePageCanvas } from '../output/image-writer';
import { PrintSettings } from '../core/types';
import { checkCancelled } from './cancellation';
import { LayoutOptions, prepareLayout } from './print-pipeline';
import { DocumentExportOptions, exportPreparedLayout } from './print-service';

/** A frozen document shared by preview, inspection and all output formats. */
export async function createPrintSession(options: LayoutOptions) {
  const settings: Partial<PrintSettings> | undefined = options.settings
    ? JSON.parse(JSON.stringify(options.settings))
    : undefined;
  const lifetime = new AbortController();
  const forwardAbort = () => lifetime.abort();
  options.signal?.addEventListener('abort', forwardAbort, { once: true });
  if (options.signal?.aborted) lifetime.abort();
  const started = performance.now();
  let layout;
  try {
    layout = await prepareLayout({
      ...options,
      settings,
      signal: lifetime.signal,
    });
  } catch (error) {
    options.signal?.removeEventListener('abort', forwardAbort);
    throw error;
  }
  let renderer: ReturnType<typeof createPageCapture>;
  try {
    renderer = createPageCapture(layout.width, lifetime.signal);
  } catch (error) {
    layout.cleanup();
    options.signal?.removeEventListener('abort', forwardAbort);
    throw error;
  }
  let disposed = false;
  let busy = false;
  const assertLive = () => {
    if (disposed) throw new Error('打印会话已关闭，请重新生成预览');
    checkCancelled(lifetime.signal);
    if (busy) throw new Error('正在处理上一项任务，请稍候');
  };
  const preparedMs = performance.now() - started;
  return {
    layout,
    preparedMs,
    async thumbnail(index: number, maxWidth = 480): Promise<string> {
      assertLive();
      if (!Number.isInteger(index) || index < 0 || index >= layout.pages.length)
        throw new Error('预览页码无效');
      busy = true;
      let sheet: HTMLCanvasElement | undefined;
      let thumb: HTMLCanvasElement | undefined;
      try {
        const page = layout.pages[index];
        const body = await renderer.capture(
          layout.root,
          page.start,
          page.end - page.start,
        );
        try {
          let headerCanvas: HTMLCanvasElement | undefined;
          let footerCanvas: HTMLCanvasElement | undefined;
          try {
            headerCanvas = layout.header
              ? await renderer.capture(
                  layout.header,
                  0,
                  layout.headerHeight / layout.ratio,
                )
              : undefined;
            footerCanvas = layout.footer
              ? await renderer.capture(
                  layout.footer,
                  0,
                  layout.footerHeight / layout.ratio,
                )
              : undefined;
            sheet = composePageCanvas(
              body,
              (page.end - page.start) * layout.ratio,
              index,
              {
                geometry: layout,
                settings,
                headerCanvas,
                footerCanvas,
                totalPages: layout.pages.length,
              },
            );
          } finally {
            if (headerCanvas) renderer.release(headerCanvas);
            if (footerCanvas) renderer.release(footerCanvas);
          }
        } finally {
          renderer.release(body);
        }
        thumb = document.createElement('canvas');
        thumb.width = Math.max(1, Math.min(640, maxWidth, sheet.width));
        thumb.height = Math.ceil((sheet.height * thumb.width) / sheet.width);
        const ctx = thumb.getContext('2d');
        if (!ctx) throw new Error('浏览器无法生成预览');
        ctx.drawImage(sheet, 0, 0, thumb.width, thumb.height);
        checkCancelled(lifetime.signal);
        return thumb.toDataURL('image/jpeg', 0.85);
      } finally {
        if (sheet) {
          sheet.width = 0;
          sheet.height = 0;
        }
        if (thumb) {
          thumb.width = 0;
          thumb.height = 0;
        }
        busy = false;
      }
    },
    async exportDocument(
      params: Omit<DocumentExportOptions, 'element' | 'settings'>,
    ) {
      assertLive();
      busy = true;
      const controller = new AbortController();
      const cancel = () => controller.abort();
      lifetime.signal.addEventListener('abort', cancel, { once: true });
      params.signal?.addEventListener('abort', cancel, { once: true });
      if (params.signal?.aborted || lifetime.signal.aborted) controller.abort();
      try {
        return await exportPreparedLayout(
          layout,
          { ...params, settings, signal: controller.signal },
          preparedMs,
        );
      } finally {
        lifetime.signal.removeEventListener('abort', cancel);
        params.signal?.removeEventListener('abort', cancel);
        busy = false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      renderer.dispose();
      layout.cleanup();
      options.signal?.removeEventListener('abort', forwardAbort);
    },
  };
}
export type PrintSession = Awaited<ReturnType<typeof createPrintSession>>;
