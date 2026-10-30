import { createImageWriter } from './image-writer';
import { calculateGeometry } from '../core/geometry/page-geometry';
import { DEFAULT_SETTINGS, resolvePaper } from '../core/geometry/paper';

const context = { scale: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), fillText: jest.fn() };
const geometry = calculateGeometry(resolvePaper(DEFAULT_SETTINGS), 800, 20, 30);
let sheets: HTMLCanvasElement[];
beforeEach(() => {
  jest.clearAllMocks(); sheets = [];
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) { sheets.push(this); return context as any; });
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'])));
});
afterEach(() => jest.restoreAllMocks());

test('composes paper, body, repeated brand header/footer and page number; releases full-paper canvas', async () => {
  const canvas = document.createElement('canvas'); canvas.width = 1600;
  const writer = createImageWriter({ geometry, totalPages: 2, headerCanvas: canvas, footerCanvas: canvas });
  await writer.addPageSlice(0, canvas, 100);
  expect(context.drawImage.mock.calls).toEqual([
    [canvas, geometry.left, geometry.bodyTop, geometry.contentWidth, 100],
    [canvas, geometry.left, geometry.headerY, geometry.contentWidth, geometry.headerHeight],
    [canvas, geometry.left, geometry.footerY, geometry.contentWidth, geometry.footerHeight],
  ]);
  expect(context.fillText).toHaveBeenCalledWith('1 / 2', expect.any(Number), geometry.pageNumberY);
  expect(sheets[0].width).toBe(0);
  expect((await writer.finalize('test', false)).type).toBe('application/zip');
});

test('failed PNG encoding and cancellation free canvases and do not produce a download', async () => {
  const canvas = document.createElement('canvas'); canvas.width = 1600;
  const abort = new AbortController();
  const writer = createImageWriter({ geometry, totalPages: 1, signal: abort.signal });
  (HTMLCanvasElement.prototype.toBlob as jest.Mock).mockImplementation(callback => callback(null));
  await expect(writer.addPageSlice(0, canvas, 100)).rejects.toThrow('图片编码失败');
  expect(sheets[0].width).toBe(0);
  abort.abort();
  await expect(writer.finalize('test')).rejects.toThrow('取消');
});

test('disabled page numbers are omitted, including for landscape paper', async () => {
  const canvas = document.createElement('canvas'); canvas.width = 1600;
  const settings = { ...DEFAULT_SETTINGS, orientation: 'landscape' as const, pageNumber: { enabled: false } };
  const g = calculateGeometry(resolvePaper(settings), 800, undefined, undefined, false);
  const writer = createImageWriter({ geometry: g, settings, totalPages: 1 });
  await writer.addPageSlice(0, canvas, 100);
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, g.pageWidth, g.pageHeight);
  expect(g.pageWidth).toBeGreaterThan(g.pageHeight);
  expect(context.fillText).not.toHaveBeenCalled();
});
