import { useCallback, useRef, useState } from 'react';
import {
  ExportOptions,
  inspectPrintLayout,
  outputPDF,
  PreviewPaginationOptions,
  PrintInspectionResult,
} from '../application/print-service';
import { clearPageBreaks, visualizePageBreaks } from '../ui/preview/page-break-overlay';

export interface UsePdfPrintProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface UsePdfPrintState {
  isPrinting: boolean;
  isInspecting: boolean;
  progress: UsePdfPrintProgress;
  error: Error | null;
  inspection: PrintInspectionResult | null;
}

export interface ExportPdfParams extends Omit<ExportOptions, 'signal' | 'onProgress'> {
  showOverlay?: boolean;
}

export interface InspectLayoutParams extends PreviewPaginationOptions {
  showOverlay?: boolean;
}

export function usePdfPrint() {
  const [state, setState] = useState<UsePdfPrintState>({
    isPrinting: false,
    isInspecting: false,
    progress: { completed: 0, total: 0, percent: 0 },
    error: null,
    inspection: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const exportPDF = useCallback(
    async (params: ExportPdfParams) => {
      cancel();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState(prev => ({
        ...prev,
        isPrinting: true,
        error: null,
        progress: { completed: 0, total: 0, percent: 0 },
      }));

      try {
        const result = await outputPDF({
          ...params,
          signal: controller.signal,
          onProgress: (completed, total) => {
            setState(prev => ({
              ...prev,
              progress: {
                completed,
                total,
                percent: total > 0 ? Math.round((completed / total) * 100) : 0,
              },
            }));
          },
        });

        setState(prev => ({ ...prev, isPrinting: false }));
        return result;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState(prev => ({ ...prev, isPrinting: false, error }));
        throw error;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [cancel]
  );

  const inspectLayout = useCallback(async (params: InspectLayoutParams) => {
    setState(prev => ({ ...prev, isInspecting: true, error: null }));
    try {
      const result = await inspectPrintLayout(params);
      if (params.showOverlay && params.contentElement) {
        visualizePageBreaks(result.pageBreaks, params.contentElement);
      }
      setState(prev => ({ ...prev, isInspecting: false, inspection: result }));
      return result;
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({ ...prev, isInspecting: false, error }));
      throw error;
    }
  }, []);

  const clearVisualOverlay = useCallback(() => {
    clearPageBreaks();
    setState(prev => ({ ...prev, inspection: null }));
  }, []);

  return {
    ...state,
    exportPDF,
    inspectLayout,
    clearVisualOverlay,
    cancel,
  };
}
