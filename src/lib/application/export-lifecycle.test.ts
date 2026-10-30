import { outputPDF } from './print-service';
import { prepareLayout } from './print-pipeline';
import { createPageCapture } from '../adapters/canvas/page-capture';
import { createPdfWriter } from '../adapters/pdf/jspdf-writer';

jest.mock('./print-pipeline', () => ({ prepareLayout: jest.fn() }));
jest.mock('../adapters/canvas/page-capture', () => ({ createPageCapture: jest.fn() }));
jest.mock('../adapters/pdf/jspdf-writer', () => ({ createPdfWriter: jest.fn() }));

beforeEach(() => jest.clearAllMocks());
function arrange() {
  const cleanup = jest.fn(), dispose = jest.fn(), release = jest.fn();
  const canvas = document.createElement('canvas');
  const capture = jest.fn().mockResolvedValue(canvas);
  const finalize = jest.fn().mockResolvedValue(new Blob(['pdf']));
  (prepareLayout as jest.Mock).mockResolvedValue({ cleanup, width: 800, ratio: 1, root: document.createElement('div'), pages: [{ start: 0, end: 100 }] });
  (createPageCapture as jest.Mock).mockReturnValue({ capture, dispose, release });
  (createPdfWriter as jest.Mock).mockResolvedValue({ addPageSlice: jest.fn(), finalize });
  return { cleanup, dispose, release, capture, finalize };
}

test('capture factory failure still cleans the layout and releases the root lock', async () => {
  const { cleanup } = arrange();
  (createPageCapture as jest.Mock).mockImplementation(() => { throw new Error('unsupported canvas'); });
  await expect(outputPDF({ element: null, filename: 'test' })).rejects.toThrow('unsupported canvas');
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test('capture failure disposes canvases and snapshot; no PDF is downloaded', async () => {
  const { cleanup, dispose, capture, finalize } = arrange();
  capture.mockRejectedValue(new Error('image failed'));
  await expect(outputPDF({ element: null, filename: 'test' })).rejects.toThrow('image failed');
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(finalize).not.toHaveBeenCalled();
});

test('cancellation before finalization cannot download a partial PDF', async () => {
  const { cleanup, dispose, finalize } = arrange();
  const abort = new AbortController();
  await expect(outputPDF({ element: null, filename: 'test', signal: abort.signal,
    onProgress: completed => { if (completed) abort.abort(); } })).rejects.toThrow('取消');
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(finalize).not.toHaveBeenCalled();
});

test('image output uses the same layout and slice boundaries as PDF and releases resources on writer failure', async () => {
  const { outputDocument } = await import('./print-service');
  const { createImageWriter } = await import('../output/image-writer');
  const { cleanup, dispose, release, capture } = arrange();
  const addPageSlice = jest.fn().mockRejectedValue(new Error('encoding failed'));
  (createImageWriter as jest.Mock).mockReturnValue({ addPageSlice, finalize: jest.fn() });
  await expect(outputDocument({ element: null, filename: 'test', format: 'png' })).rejects.toThrow('encoding failed');
  expect(capture).toHaveBeenCalledWith(expect.any(HTMLElement), 0, 100);
  expect(addPageSlice).toHaveBeenCalledWith(0, expect.any(HTMLCanvasElement), 100);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});
jest.mock('../output/image-writer', () => ({ createImageWriter: jest.fn() }));

test('unknown output formats fail before allocating a snapshot', async () => {
  const { outputDocument } = await import('./print-service');
  await expect(outputDocument({ element: null, filename: 'test', format: 'toString' as any })).rejects.toThrow('不支持的输出格式');
  expect(prepareLayout).not.toHaveBeenCalled();
});
