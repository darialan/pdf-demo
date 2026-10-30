import { createPrintSession } from './print-session';
import { prepareLayout } from './print-pipeline';
import { exportPreparedLayout } from './print-service';
import { createPageCapture } from '../adapters/canvas/page-capture';
import { DEFAULT_SETTINGS } from '../core/geometry/paper';
jest.mock('./print-pipeline', () => ({ prepareLayout: jest.fn() }));
jest.mock('./print-service', () => ({ exportPreparedLayout: jest.fn() }));
jest.mock('../adapters/canvas/page-capture', () => ({
  createPageCapture: jest.fn(),
}));
const prepare = prepareLayout as jest.Mock;
const output = exportPreparedLayout as jest.Mock;
let cleanup: jest.Mock, dispose: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  cleanup = jest.fn();
  dispose = jest.fn();
  prepare.mockResolvedValue({
    root: document.createElement('div'),
    width: 800,
    pages: [
      { start: 0, end: 900 },
      { start: 900, end: 1100 },
    ],
    cleanup,
  });
  (createPageCapture as jest.Mock).mockReturnValue({
    capture: jest.fn(),
    release: jest.fn(),
    dispose,
  });
  output.mockResolvedValue({ pages: 2, blob: new Blob(['file']) });
});
test('PDF and PNG share one frozen layout; source settings cannot mutate an existing session', async () => {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const session = await createPrintSession({
    element: document.createElement('div'),
    settings,
  });
  settings.marginTopMm = 99;
  await session.exportDocument({
    filename: 'report',
    format: 'pdf',
    download: false,
  });
  await session.exportDocument({
    filename: 'report',
    format: 'png',
    download: false,
  });
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(output.mock.calls[0][0]).toBe(output.mock.calls[1][0]);
  expect(output.mock.calls[1][1]).toMatchObject({
    format: 'png',
    settings: { marginTopMm: 10 },
  });
  expect(cleanup).not.toHaveBeenCalled();
  session.dispose();
  session.dispose();
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(dispose).toHaveBeenCalledTimes(1);
  await expect(session.exportDocument({ filename: 'again' })).rejects.toThrow(
    '关闭',
  );
});
test('preparation failure does not leave an abort listener attached', async () => {
  prepare.mockRejectedValue(new Error('broken image'));
  const abort = new AbortController();
  const remove = jest.spyOn(abort.signal, 'removeEventListener');
  await expect(
    createPrintSession({ element: null, signal: abort.signal }),
  ).rejects.toThrow('broken image');
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});
test('cancelled export can be retried on same session without repagination', async () => {
  output.mockImplementationOnce(async (_layout, options) => {
    options.signal.throwIfAborted?.();
    if (options.signal.aborted) throw Error('取消');
  });
  const session = await createPrintSession({ element: null });
  const abort = new AbortController();
  abort.abort();
  await expect(
    session.exportDocument({ filename: 'cancel', signal: abort.signal }),
  ).rejects.toThrow();
  await session.exportDocument({ filename: 'retry', format: 'png' });
  expect(prepare).toHaveBeenCalledTimes(1);
  session.dispose();
});
test('rejects simultaneous capture/export and disposes an in-flight operation', async () => {
  let finish: () => void = () => {};
  output.mockImplementationOnce(
    (_layout, options) =>
      new Promise<void>((resolve, reject) => {
        finish = resolve;
        options.signal.addEventListener('abort', () =>
          reject(Error('cancelled')),
        );
      }),
  );
  const session = await createPrintSession({ element: null });
  const pending = session.exportDocument({ filename: 'report' });
  await expect(
    session.exportDocument({ filename: 'duplicate' }),
  ).rejects.toThrow('上一项');
  session.dispose();
  await expect(pending).rejects.toThrow('cancelled');
  expect(cleanup).toHaveBeenCalledTimes(1);
  finish();
});
test('thumbnail validates page index before allocating a canvas', async () => {
  const session = await createPrintSession({ element: null });
  await expect(session.thumbnail(-1)).rejects.toThrow('页码');
  await expect(session.thumbnail(2)).rejects.toThrow('页码');
  session.dispose();
});

test('renderer initialization failure releases the prepared root lock', async () => {
  (createPageCapture as jest.Mock).mockImplementationOnce(() => {
    throw new Error('canvas unavailable');
  });
  await expect(createPrintSession({ element: null })).rejects.toThrow(
    'canvas unavailable',
  );
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test('thumbnail footer capture failure releases both body and already captured header', async () => {
  const body = document.createElement('canvas'),
    header = document.createElement('canvas');
  const release = jest.fn();
  const capture = jest
    .fn()
    .mockResolvedValueOnce(body)
    .mockResolvedValueOnce(header)
    .mockRejectedValueOnce(Error('footer failed'));
  (createPageCapture as jest.Mock).mockReturnValueOnce({
    capture,
    release,
    dispose: jest.fn(),
  });
  prepare.mockResolvedValueOnce({
    root: document.createElement('article'),
    header: document.createElement('div'),
    footer: document.createElement('div'),
    headerHeight: 10,
    footerHeight: 10,
    ratio: 1,
    width: 800,
    pages: [{ start: 0, end: 900 }],
    cleanup,
  });
  const session = await createPrintSession({ element: null });
  await expect(session.thumbnail(0)).rejects.toThrow('footer failed');
  expect(release).toHaveBeenCalledWith(body);
  expect(release).toHaveBeenCalledWith(header);
  session.dispose();
});
