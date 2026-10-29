/**
 * WebPDF Printer (@darialan/web-pdf-printer)
 * High-performance, pixel-accurate client-side DOM-to-PDF pagination and export engine.
 */

// Core types & definitions
export * from './core/types';

// Core domain logic & pure algorithms
export * from './core/geometry';
export * from './core/pagination';
export * from './core/rules';

// Adapters
export * from './adapters/dom';
export * from './adapters/resources';
export * from './adapters/canvas';
export * from './adapters/pdf';

// Application orchestration & pipeline
export * from './application/cancellation';
export * from './application/print-pipeline';
export * from './application/print-service';

// Visual inspector overlay (Vanilla DOM)
export {
  visualizePageBreaks,
  clearPageBreaks,
} from './overlay/page-break-overlay';
export type { ObservabilityStats } from './overlay/page-break-overlay';

// React Hook (Convenience binding for React applications)
export {
  usePdfPrint,
} from './hooks/use-pdf-print';
export type {
  UsePdfPrintProgress,
  UsePdfPrintState,
  ExportPdfParams,
  InspectLayoutParams,
} from './hooks/use-pdf-print';
