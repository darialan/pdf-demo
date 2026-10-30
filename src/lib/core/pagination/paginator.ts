import { Interval, PageSlice } from '../types';
export type { Interval, PageSlice } from '../types';

/** CSS-pixel intervals relative to the print root. No DOM or UI dependencies. */
export function paginate(height: number, capacity: number, protectedRanges: Interval[], maxPages = 100): PageSlice[] {
  if (![height, capacity].every(Number.isFinite) || height <= 0 || capacity <= 0 || !Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new Error('打印区域或纸张尺寸无效');
  }
  // Merge overlapping protections once. Repeatedly scanning every line for every
  // page used to be quadratic for overlapping inline text fragments.
  const ranges: Interval[] = [];
  const sorted = protectedRanges.map(range => {
    if (!Number.isFinite(range.top) || !Number.isFinite(range.bottom) || range.bottom < range.top) {
      throw new Error('分页测量结果无效');
    }
    return { top: Math.max(0, range.top), bottom: Math.min(height, range.bottom) };
  }).filter(range => range.bottom > range.top).sort((a, b) => a.top - b.top);
  for (const range of sorted) {
    if (range.bottom - range.top > capacity) {
      throw new Error('存在超过单页高度且不可拆分的内容，请缩小图片或调整布局');
    }
    const previous = ranges[ranges.length - 1];
    if (previous && range.top < previous.bottom) previous.bottom = Math.max(previous.bottom, range.bottom);
    else ranges.push({ ...range });
  }
  if (ranges.some(range => range.bottom - range.top > capacity)) {
    throw new Error('重叠的不可拆分内容超过单页高度，无法安全分页');
  }
  const pages: PageSlice[] = [];
  let start = 0;
  let cursor = 0;
  while (start < height) {
    if (pages.length >= maxPages) throw new Error(`文档超过 ${maxPages} 页限制，请拆分导出或增大页面高度`);
    let end = Math.min(start + capacity, height);
    if (end < height) {
      while (cursor < ranges.length && ranges[cursor].bottom <= end) cursor++;
      if (cursor < ranges.length && ranges[cursor].top < end) end = ranges[cursor].top;
    }
    if (end <= start) throw new Error('页面高度不足，无法安全分页，请增大页面高度');
    pages.push({ start, end });
    start = end;
  }
  return pages;
}

/** Verify that planned page breaks do not cut through protected intervals. */
export function validatePageBreaks(pages: PageSlice[], ranges: Interval[], tolerance = 0.25) {
  const intersections = pages.slice(1).filter(page => ranges.some(range =>
    range.top + tolerance < page.start && range.bottom - tolerance > page.start));
  if (intersections.length) {
    throw new Error(`分页预览与原页面布局不一致：${intersections.length} 个断点穿过受保护内容，首个位置 ${intersections[0].start.toFixed(1)}px`);
  }
}
