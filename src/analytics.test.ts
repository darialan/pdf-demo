import { toAnalyticsRoute } from './analytics';

test('hash 路由归一成分析用的 route', () => {
  expect(toAnalyticsRoute('#/')).toBe('/');
  expect(toAnalyticsRoute('#/playground')).toBe('/playground');
  expect(toAnalyticsRoute('#/playground?scene=purchase-order')).toBe('/playground');
});

test('页内锚点与空 hash 都算首页', () => {
  expect(toAnalyticsRoute('')).toBe('/');
  expect(toAnalyticsRoute('#features')).toBe('/');
  expect(toAnalyticsRoute('#faq')).toBe('/');
});
