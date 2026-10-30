import { paginate, validatePageBreaks } from './paginator';

test('long blank blocks cover all content, including the tail', () => {
  expect(paginate(2500, 1000, [])).toEqual([
    { start: 0, end: 1000 },
    { start: 1000, end: 2000 },
    { start: 2000, end: 2500 },
  ]);
});

test('moves a crossing row or signature block to the next page', () => {
  expect(paginate(1800, 1000, [{ top: 900, bottom: 1100 }])).toEqual([
    { start: 0, end: 900 },
    { start: 900, end: 1800 },
  ]);
});

test('mixed inline text rectangles retreat until all overlapping lines are safe', () => {
  expect(paginate(1100, 1000, [{ top: 990, bottom: 1010 }, { top: 980, bottom: 995 }])[0].end).toBe(980);
});

test('exact boundaries do not create a trailing empty page', () => {
  expect(paginate(2000, 1000, [])).toHaveLength(2);
});

test('rejects oversized atomic blocks, invalid geometry, and page overflow', () => {
  expect(() => paginate(2000, 1000, [{ top: 0, bottom: 1001 }])).toThrow('不可拆分');
  expect(() => paginate(100, 0, [])).toThrow('无效');
  expect(() => paginate(3000, 1000, [], 2)).toThrow('页限制');
  expect(() => paginate(1500, 1000, [{ top: 0, bottom: 900 }, { top: 800, bottom: 1100 }])).toThrow('重叠');
});

test('fine slicing covers more than 100 slices without gaps or duplicate content', () => {
  const pages = paginate(1000.5, 1, [], Number.MAX_SAFE_INTEGER);
  expect(pages).toHaveLength(1001);
  expect(pages[pages.length - 1]).toEqual({ start: 1000, end: 1000.5 });
  pages.slice(1).forEach((page, i) => expect(page.start).toBe(pages[i].end));
});

test('validatePageBreaks tolerates subpixel rounding but throws on real intersections', () => {
  const ranges = [{ top: 100, bottom: 150 }];
  expect(() => validatePageBreaks([{ start: 0, end: 100.04 }, { start: 100.04, end: 200 }], ranges)).not.toThrow();
  expect(() => validatePageBreaks([{ start: 0, end: 107 }, { start: 107, end: 200 }], ranges)).toThrow('穿过受保护内容');
});

test('seeded fractional layouts preserve content coverage and every protected interval', () => {
  let seed = 104729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let trial = 0; trial < 300; trial++) {
    const capacity = 80 + random() * 800;
    const ranges: { top: number; bottom: number }[] = [];
    let y = 0;
    for (let i = 0; i < 80; i++) {
      y += random() * 10;
      const bottom = y + random() * capacity * 0.7;
      ranges.push({ top: y, bottom });
      // Mixed inline fragments overlapping the same row.
      ranges.push({ top: y + (bottom - y) * 0.25, bottom });
      y = bottom;
    }
    const height = y + random() * 30;
    const input = ranges.map(range => ({ ...range }));
    const pages = paginate(height, capacity, ranges, 1000);
    expect(pages[0].start).toBe(0);
    expect(pages[pages.length - 1].end).toBe(height);
    pages.forEach((page, index) => {
      expect(page.end).toBeGreaterThan(page.start);
      expect(page.end - page.start).toBeLessThanOrEqual(capacity + 1e-8);
      if (index > 0) expect(page.start).toBe(pages[index - 1].end);
    });
    expect(() => validatePageBreaks(pages, ranges, 0)).not.toThrow();
    expect(ranges).toEqual(input);
  }
});

test('large text documents have bounded work and reject invalid limits', () => {
  const ranges = Array.from({ length: 50000 }, (_, i) => ({ top: i * 2, bottom: i * 2 + 1.5 }));
  expect(paginate(100000, 1000, ranges, 1000)).toHaveLength(100);
  expect(() => paginate(10, 5, [], 1.5)).toThrow('无效');
  expect(() => paginate(10, NaN, [])).toThrow('无效');
  expect(() => paginate(10, 5, [{ top: 1, bottom: Infinity }])).toThrow('无效');
  expect(paginate(10, 5, [{ top: -100, bottom: -20 }, { top: 20, bottom: 30 }])).toHaveLength(2);
});
