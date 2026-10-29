import jsPDF from 'jspdf';
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

export function formatPageNumber(pageIndex: number, totalPages: number, format?: 'slash' | 'chinese' | 'hyphen') {
  const current = pageIndex + 1;
  switch (format) {
    case 'chinese':
      return `第 ${current} 页 / 共 ${totalPages} 页`;
    case 'hyphen':
      return `- ${current} -`;
    case 'slash':
    default:
      return `${current} / ${totalPages}`;
  }
}

/** Adapter around jsPDF for composing multi-page rendered slices, headers, footers and page numbers. */
export function createPdfWriter({
  geometry,
  settings,
  headerCanvas,
  footerCanvas,
  totalPages,
}: PdfDocumentWriterOptions) {
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
        const y = position.startsWith('top') ? Math.max(12, bodyTop - 6) : pageNumberY;
        pdf.text(text, x, y, { align });
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
