import { formatPageNumber } from '../../output/page-number';
import { PageGeometry } from '../../core/geometry/page-geometry';
import { mmToPt } from '../../core/geometry/paper';
import { PrintSettings } from '../../core/types';

export interface PdfDocumentWriterOptions {
  geometry: PageGeometry;
  settings?: Partial<PrintSettings>;
  headerCanvas?: HTMLCanvasElement;
  footerCanvas?: HTMLCanvasElement;
  totalPages: number;
}

export { formatPageNumber } from '../../output/page-number';

/** Adapter around jsPDF for composing multi-page rendered slices, headers, footers and page numbers. */
export async function createPdfWriter({
  geometry,
  settings,
  headerCanvas,
  footerCanvas,
  totalPages,
}: PdfDocumentWriterOptions) {
  const { jsPDF } = await import('jspdf');
  const { pageWidth, pageHeight, contentWidth, headerHeight, footerHeight, left, bodyTop, headerY, footerY, pageNumberY } =
    geometry;
  const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'pt', format: [pageWidth, pageHeight], orientation });
  const rightMarginPt = settings?.marginRightMm !== undefined ? mmToPt(settings.marginRightMm) : mmToPt(10);

  return {
    addPageSlice(pageIndex: number, canvas: HTMLCanvasElement, sliceHeightPt: number) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas, 'PNG', left, bodyTop, contentWidth, sliceHeightPt, undefined, 'FAST');
      if (headerCanvas) {
        pdf.addImage(headerCanvas, 'PNG', left, headerY, contentWidth, headerHeight, 'print-header', 'FAST');
      }
      if (footerCanvas) {
        pdf.addImage(footerCanvas, 'PNG', left, footerY, contentWidth, footerHeight, 'print-footer', 'FAST');
      }

      const pageNoConfig = settings?.pageNumber;
      const showPageNumber = pageNoConfig ? pageNoConfig.enabled : true;
      if (showPageNumber) {
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        const position = pageNoConfig?.position || 'bottom-right';
        const text = formatPageNumber(pageIndex, totalPages, pageNoConfig?.format);
        let x: number;
        let align: 'left' | 'center' | 'right';
        if (position === 'bottom-center' || position === 'top-center') {
          x = pageWidth / 2;
          align = 'center';
        } else {
          x = pageWidth - rightMarginPt;
          align = 'right';
        }
        const y = pageNumberY;
        if (pageNoConfig?.format === 'chinese') {
          // Built-in PDF fonts do not contain Chinese glyphs. Use the browser's
          // system font for this tiny label instead of exporting garbled text.
          const label = document.createElement('canvas');
          label.width = 640; label.height = 48;
          const context = label.getContext('2d');
          if (!context) throw new Error('浏览器无法渲染中文页码');
          context.font = '24px sans-serif';
          const width = Math.ceil(context.measureText(text).width);
          context.fillStyle = '#787878';
          context.fillText(text, 0, 34);
          const labelWidth = width * 9 / 24;
          const offset = align === 'center' ? labelWidth / 2 : labelWidth;
          pdf.addImage(label, 'PNG', x - offset, y - 12.75, 240, 18);
          label.width = 0; label.height = 0;
        } else pdf.text(text, x, y, { align });
      }
    },
    async finalize(filename: string, download = true) {
      const blob = pdf.output('blob');
      if (download) {
        await pdf.save(`${filename.replace(/\.pdf$/i, '') || 'document'}.pdf`, { returnPromise: true });
      }
      return blob;
    },
  };
}
