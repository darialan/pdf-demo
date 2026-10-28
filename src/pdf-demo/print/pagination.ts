export interface Interval { top: number; bottom: number }
export interface PageSlice { start: number; end: number }

/** All coordinates are CSS pixels relative to the print root. */
export function paginate(height: number, capacity: number, protectedRanges: Interval[], maxPages = 100): PageSlice[] {
  if (![height, capacity, maxPages].every(Number.isFinite) || height <= 0 || capacity <= 0 || maxPages < 1) {
    throw new Error('打印区域或纸张尺寸无效');
  }
  const ranges = protectedRanges.map(range => {
    if (!Number.isFinite(range.top) || !Number.isFinite(range.bottom) || range.bottom < range.top) throw new Error('分页测量结果无效');
    if (range.bottom - range.top > capacity) throw new Error('存在超过单页高度且不可拆分的内容，请缩小图片或调整布局');
    return range;
  }).sort((a, b) => a.top - b.top);
  const pages: PageSlice[] = [];
  let start = 0;
  while (start < height) {
    if (pages.length >= maxPages) throw new Error(`文档超过 ${maxPages} 页限制，请拆分导出`);
    let end = Math.min(start + capacity, height);
    if (end < height) {
      // Retreat to the beginning of every intersecting line/block, including overlaps.
      for (;;) {
        let next = end;
        for (const range of ranges) {
          if (range.top < end && range.bottom > end) next = Math.min(next, range.top);
        }
        if (next === end) break;
        end = next;
      }
    }
    if (end <= start) throw new Error('重叠的不可拆分内容超过单页高度，无法安全分页');
    pages.push({ start, end });
    start = end;
  }
  return pages;
}
