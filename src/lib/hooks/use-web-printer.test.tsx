import { act, renderHook } from '@testing-library/react';
import { outputDocument, inspectPrintLayout } from '../application/print-service';
import { useWebPrinter } from './use-web-printer';
import { usePdfPrint } from './use-pdf-print';
jest.mock('../application/print-service', () => ({ outputDocument: jest.fn(), inspectPrintLayout: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

for (const format of ['pdf', 'png'] as const) {
  test(`exports ${format} with the shared service and actual progress`, async () => {
    (outputDocument as jest.Mock).mockImplementation(async options => { options.onProgress(1, 2); return { pages: 2 }; });
    const { result } = renderHook(() => useWebPrinter());
    await act(async () => { await result.current.exportDocument({ element: null, filename: 'test', format }); });
    expect(outputDocument).toHaveBeenCalledWith(expect.objectContaining({ format, signal: expect.any(AbortSignal) }));
    expect(result.current.progress).toEqual({ completed: 1, total: 2, percent: 50 });
    expect(result.current.isExporting).toBe(false);
  });
}
test('legacy hook and PDF method remain compatible', async () => {
  expect(usePdfPrint).toBe(useWebPrinter);
  (outputDocument as jest.Mock).mockResolvedValue({ pages: 1 });
  const { result } = renderHook(() => usePdfPrint());
  await act(async () => { await result.current.exportPDF({ element: null, filename: 'test', showOverlay: true }); });
  expect(outputDocument).toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf' }));
  expect(result.current.isPrinting).toBe(false);
});
test('a cancelled stale export cannot clear a newer task or overwrite its progress', async () => {
  const resolves: Array<(value: any) => void> = [];
  (outputDocument as jest.Mock).mockImplementation(() => new Promise(resolve => resolves.push(resolve)));
  const { result } = renderHook(() => useWebPrinter());
  let first: Promise<any>; let second: Promise<any>;
  act(() => { first = result.current.exportDocument({ element: null, filename: 'first' }); });
  const firstSignal = (outputDocument as jest.Mock).mock.calls[0][0].signal;
  act(() => { second = result.current.exportDocument({ element: null, filename: 'second', format: 'png' }); });
  expect(firstSignal.aborted).toBe(true);
  await act(async () => { resolves[0]({}); await first!; });
  expect(result.current.isExporting).toBe(true);
  act(() => { (outputDocument as jest.Mock).mock.calls[0][0].onProgress(99, 100); });
  expect(result.current.progress.completed).toBe(0);
  await act(async () => { resolves[1]({}); await second!; });
  expect(result.current.isExporting).toBe(false);
});
test('unmount aborts inspection and prevents stale completion from rendering', async () => {
  let resolve!: (value: any) => void;
  (inspectPrintLayout as jest.Mock).mockImplementation(() => new Promise(done => { resolve = done; }));
  const { result, unmount } = renderHook(() => useWebPrinter());
  let task: Promise<any>;
  act(() => { task = result.current.inspectLayout({ contentElement: null }); });
  const signal = (inspectPrintLayout as jest.Mock).mock.calls[0][0].signal;
  unmount(); expect(signal.aborted).toBe(true);
  await act(async () => { resolve({ pages: [], pageBreaks: [] }); await task!; });
});
