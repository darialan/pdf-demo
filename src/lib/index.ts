/**
 * Web Printer (@darialan/web-printer)
 * High-performance, pixel-accurate client-side HTML pagination engine with PDF and PNG output.
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

// Format-specific output writers and their extension contract.
export * from './output';

export * from "./application/print-session";
