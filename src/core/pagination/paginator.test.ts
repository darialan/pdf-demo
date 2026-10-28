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
