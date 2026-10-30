/** @deprecated Import useWebPrinter from @darialan/web-printer/react. */
export { useWebPrinter as usePdfPrint } from './use-web-printer';
export type { UseWebPrinterProgress as UsePdfPrintProgress, ExportPdfParams, InspectLayoutParams } from './use-web-printer';
export type UsePdfPrintState = Omit<import('./use-web-printer').UseWebPrinterState, 'isExporting'> & { isPrinting: boolean };
