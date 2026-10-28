import { calculateGeometry } from './page-geometry';
import { DEFAULT_SETTINGS, resolvePaper } from './paper';

test('converts headers, footers and body capacity through the same DOM-to-paper ratio', () => {
  const paper = resolvePaper(DEFAULT_SETTINGS);
  const result = calculateGeometry(paper, 800, 40, 20);
  expect(result.headerHeight).toBeCloseTo(40 * result.ratio);
  expect(result.capacity * result.ratio + result.bodyTop + 6).toBeCloseTo(result.footerY);
});

test('slice geometry reserves neither page numbers nor header/footer gaps', () => {
  const paper = resolvePaper({ ...DEFAULT_SETTINGS, slicingMode: true });
  const result = calculateGeometry(paper, 800, undefined, undefined, true);
  expect(result.capacity * result.ratio).toBeCloseTo(paper.pageHeight);
  expect(result.bodyTop).toBe(0);
});
