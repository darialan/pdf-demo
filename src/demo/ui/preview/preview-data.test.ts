import { prepareLayout, serializePrintSnapshot, DEFAULT_SETTINGS } from '../../../lib';
import { buildHtmlPreviewData } from './print-preview-modal';

jest.mock('../../../lib', () => ({
  ...jest.requireActual('../../../lib'), prepareLayout: jest.fn(), serializePrintSnapshot: jest.fn(),
}));

test('preview serializes the measured snapshot and declarative header/footer, then releases it', async () => {
  const source = document.createElement('article');
  const root = document.createElement('article');
  const header = document.createElement('header');
  const footer = document.createElement('footer');
  root.getBoundingClientRect = () => ({ width: 800 } as DOMRect);
  header.getBoundingClientRect = () => ({ height: 40 } as DOMRect);
  footer.getBoundingClientRect = () => ({ height: 20 } as DOMRect);
  const cleanup = jest.fn();
  (prepareLayout as jest.Mock).mockResolvedValue({ root, header, footer, pages: [{ start: 0, end: 200 }], cleanup });
  (serializePrintSnapshot as jest.Mock).mockReturnValue('<div>snapshot</div>');
  const abort = new AbortController();
  const data = await buildHtmlPreviewData({ contentElement: source, settings: DEFAULT_SETTINGS, filename: 'report', signal: abort.signal });
  expect(prepareLayout).toHaveBeenCalledWith(expect.objectContaining({ element: source, signal: abort.signal }));
  expect(serializePrintSnapshot).toHaveBeenCalledWith(root);
  expect(serializePrintSnapshot).toHaveBeenCalledWith(header);
  expect(serializePrintSnapshot).toHaveBeenCalledWith(footer);
  expect(data.headerHtml).toBe('<div>snapshot</div>');
  expect(data.geometry.bodyTopPx).toBeGreaterThan(data.geometry.marginTopPx + data.geometry.headerHeightPx);
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test('serialization failure also releases the snapshot', async () => {
  const root = document.createElement('div');
  root.getBoundingClientRect = () => ({ width: 800 } as DOMRect);
  const cleanup = jest.fn();
  (prepareLayout as jest.Mock).mockResolvedValue({ root, pages: [{ start: 0, end: 200 }], cleanup });
  (serializePrintSnapshot as jest.Mock).mockImplementation(() => { throw new Error('canvas inaccessible'); });
  await expect(buildHtmlPreviewData({ contentElement: root, settings: DEFAULT_SETTINGS, filename: 'report' })).rejects.toThrow('canvas inaccessible');
  expect(cleanup).toHaveBeenCalledTimes(1);
});
