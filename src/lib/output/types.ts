import { PageGeometry } from '../core/geometry/page-geometry';
import { PrintSettings } from '../core/types';

export type OutputFormat = 'pdf' | 'png';

/** Writers consume the same rendered page slices; pagination is format-independent. */
export interface OutputWriterOptions {
  geometry: PageGeometry;
  settings?: Partial<PrintSettings>;
  headerCanvas?: HTMLCanvasElement;
  footerCanvas?: HTMLCanvasElement;
  totalPages: number;
  signal?: AbortSignal;
  /** Encoded image retention budget; defaults to 128 MiB. */
  maxBytes?: number;
}

export interface OutputWriter {
  addPageSlice(index: number, canvas: HTMLCanvasElement, heightPt: number): void | Promise<void>;
  finalize(filename: string, download?: boolean): Promise<Blob>;
  dispose?(): void;
}
