import { measureDocument } from '../adapters/dom/measurement';
import { prepareLayout } from './print-pipeline';
import { calculatePagesArray } from './print-service';

jest.mock('jspdf', () => jest.fn());
jest.mock('./print-pipeline', () => ({ prepareLayout: jest.fn() }));
jest.mock('../adapters/dom/measurement', () => ({ measureDocument: jest.fn() }));

test('preview tolerates subpixel boundary rounding but rejects actual intersections and cleans up', async () => {
  const cleanup = jest.fn();
  const source = document.createElement('div');
  (measureDocument as jest.Mock).mockReturnValue({ ranges: [{ top: 100, bottom: 150 }] });
  (prepareLayout as jest.Mock).mockResolvedValue({
    pages: [
      { start: 0, end: 100.04 },
      { start: 100.04, end: 200 },
    ],
    capacity: 200,
    cleanup,
  });
  await expect(calculatePagesArray({ contentElement: source })).resolves.toEqual([0, 100.04]);

  (prepareLayout as jest.Mock).mockResolvedValue({
    pages: [
      { start: 0, end: 107 },
      { start: 107, end: 200 },
    ],
    capacity: 200,
    cleanup,
  });
  await expect(calculatePagesArray({ contentElement: source })).rejects.toThrow('穿过受保护内容');
  expect(cleanup).toHaveBeenCalledTimes(2);
});
