import { calculateGeometry } from './page-geometry';
import { DEFAULT_SETTINGS, resolvePaper } from './paper';

test('converts headers, footers and body capacity through the same DOM-to-paper ratio', () => {
  const paper = resolvePaper(DEFAULT_SETTINGS);
  const result = calculateGeometry(paper, 800, 40, 20);
  expect(result.headerHeight).toBeCloseTo(40 * result.ratio);
  expect(result.capacity * result.ratio + result.bodyTop + 6).toBeCloseTo(result.footerY);
});

test('page geometry with page number disabled reserves no page number gap', () => {
  const paper = resolvePaper(DEFAULT_SETTINGS);
  const withPageNo = calculateGeometry(paper, 800, undefined, undefined, true);
  const withoutPageNo = calculateGeometry(paper, 800, undefined, undefined, false);
  expect(withoutPageNo.capacity).toBeGreaterThan(withPageNo.capacity);
  expect((withoutPageNo.capacity - withPageNo.capacity) * withoutPageNo.ratio).toBeCloseTo(14);
});

test('top page numbers reserve their own lane below the header and never overlap body', () => {
  const paper = resolvePaper(DEFAULT_SETTINGS);
  const top = calculateGeometry(paper, 800, 40, 20, { enabled: true, position: 'top-center' });
  const bottom = calculateGeometry(paper, 800, 40, 20, { enabled: true, position: 'bottom-center' });
  expect(top.capacity).toBeCloseTo(bottom.capacity);
  expect(top.bodyTop).toBeCloseTo(bottom.bodyTop + 14);
  expect(top.pageNumberY).toBeLessThan(top.bodyTop);
  expect(top.pageNumberY - 9).toBeGreaterThanOrEqual(top.headerY + top.headerHeight);
  expect(() => calculateGeometry(paper, 0, undefined, undefined)).toThrow('无效');
  expect(() => calculateGeometry(paper, 800, Infinity, undefined)).toThrow('无效');
});
