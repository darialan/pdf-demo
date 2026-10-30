import { checkCancelled } from '../application/cancellation';
import { mmToPt } from '../core/geometry/paper';
import { formatPageNumber } from './page-number';
import { OutputWriter, OutputWriterOptions } from './types';
import { createZipArchive } from './zip';

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片编码失败，请重试导出')), 'image/png'));
}
function readBlob(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('图片读取失败，请重试导出'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Compose full paper pages, encode each immediately, and release its canvas before the next page. */
export function createImageWriter({ geometry: g, settings, headerCanvas, footerCanvas, totalPages, signal }: OutputWriterOptions): OutputWriter {
  const entries: { name: string; data: Uint8Array }[] = [];
  return {
    async addPageSlice(index, body, heightPt) {
      checkCancelled(signal);
      const sheet = document.createElement('canvas');
      // Match capture density where possible, while bounding full-paper allocations.
      const density = Math.min(body.width / g.contentWidth, Math.sqrt(8_000_000 / (g.pageWidth * g.pageHeight)), 8192 / g.pageWidth, 8192 / g.pageHeight);
      sheet.width = Math.ceil(g.pageWidth * density); sheet.height = Math.ceil(g.pageHeight * density);
      try {
        const ctx = sheet.getContext('2d');
        if (!ctx) throw new Error('浏览器无法生成分页图片');
        ctx.scale(density, density);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, g.pageWidth, g.pageHeight);
        ctx.drawImage(body, g.left, g.bodyTop, g.contentWidth, heightPt);
        if (headerCanvas) ctx.drawImage(headerCanvas, g.left, g.headerY, g.contentWidth, g.headerHeight);
        if (footerCanvas) ctx.drawImage(footerCanvas, g.left, g.footerY, g.contentWidth, g.footerHeight);
        if (settings?.pageNumber?.enabled !== false) {
          const center = settings?.pageNumber?.position?.endsWith('center');
          ctx.font = '9px sans-serif'; ctx.fillStyle = '#787878'; ctx.textAlign = center ? 'center' : 'right';
          ctx.fillText(formatPageNumber(index, totalPages, settings?.pageNumber?.format), center ? g.pageWidth / 2 : g.pageWidth - mmToPt(settings?.marginRightMm ?? 10), g.pageNumberY);
        }
        const data = await readBlob(await encodePng(sheet));
        checkCancelled(signal);
        entries.push({ name: `page-${String(index + 1).padStart(Math.max(3, String(totalPages).length), '0')}.png`, data });
      } finally { sheet.width = 0; sheet.height = 0; }
    },
    async finalize(filename, download = true) {
      checkCancelled(signal);
      const blob = createZipArchive(entries);
      checkCancelled(signal);
      if (download) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = `${filename.replace(/\.(pdf|zip|png)$/i, '') || 'document'}-pages.zip`;
        document.body.appendChild(anchor);
        try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      }
      return blob;
    },
    dispose() { entries.length = 0; },
  };
}
