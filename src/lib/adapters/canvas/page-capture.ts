import html2canvas from 'html2canvas';

const MAX_PIXELS = 8_000_000;

/** Owns bounded page canvases and their memory; independent of PDF composition. */
export function createPageCapture(width: number, signal?: AbortSignal) {
  const canvases = new Set<HTMLCanvasElement>();
  let disposed = false;
  const release = (canvas: HTMLCanvasElement) => {
    canvas.width = 0;
    canvas.height = 0;
    canvases.delete(canvas);
  };
  return {
    async capture(element: HTMLElement, y: number, height: number) {
      if (signal?.aborted || disposed) throw new Error('导出已取消');
      const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (Math.ceil(width) * Math.ceil(height))), 8192 / width, 8192 / height);
      if (!Number.isFinite(scale) || scale < 0.5) throw new Error('页面像素超限，请缩小打印区域宽度');
      const canvas = await html2canvas(element, {
        x: 0,
        y,
        width,
        height,
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        ignoreElements: node => {
          if (node.hasAttribute('data-print-debug') || node.getAttribute('data-print-ignore') === 'true') return true;
          // html2canvas otherwise clones the entire document for EACH page,
          // including the original long article and every HTML preview copy.
          // Keep this snapshot, its ancestors and head resources only.
          if (node.tagName === 'HEAD' || node.closest('head')) return false;
          return node !== element && !node.contains(element) && !element.contains(node);
        },
      });
      canvases.add(canvas);
      if (signal?.aborted || disposed) { release(canvas); throw new Error('导出已取消'); }
      if (!canvas.width || !canvas.height) { release(canvas); throw new Error('截图为空，请检查打印区域'); }
      return canvas;
    },
    release,
    dispose: () => { disposed = true; canvases.forEach(release); },
  };
}
