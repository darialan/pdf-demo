import jsPDF from 'jspdf';
import { PageGeometry } from '../../core/geometry/page-geometry';
import { mmToPt } from '../../core/geometry/paper';
import { PrintSettings } from '../../core/types';

export interface PdfDocumentWriterOptions {
  geometry: PageGeometry;
  settings?: PrintSettings;
  headerCanvas?: HTMLCanvasElement;
  footerCanvas?: HTMLCanvasElement;
  totalPages: number;
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
  const rightMarginPt = settings ? mmToPt(settings.marginRightMm) : mmToPt(10);

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
      pdf.setFontSize(9);
      if (!settings?.slicingMode) {
        pdf.text(`${pageIndex + 1} / ${totalPages}`, pageWidth - rightMarginPt, pageNumberY, { align: 'right' });
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
