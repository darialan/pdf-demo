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
