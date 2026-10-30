/**
 * 站点访问分析：Vercel Web Analytics。
 *
 * 为什么不用脚本自带的自动上报：
 * 站点是 hash 路由的单页应用（`#/`、`#/playground`），而 Vercel 脚本按 pathname
 * 去重、只监听 pushState / popstate，hash 变化不会被算成新的 PV。改用按 route
 * 手动上报，首页与工作台才会各自成为一条可区分的记录。
 *
 * 开关：构建时设置 `REACT_APP_DISABLE_ANALYTICS=1` 即可关闭，不影响其他功能。
 */
import { inject, pageview } from '@vercel/analytics';

export const analyticsEnabled =
  process.env.NODE_ENV === 'production' && process.env.REACT_APP_DISABLE_ANALYTICS !== '1';

/**
 * 把 hash 归一成分析用的 route：
 * - `#/`、`#` → `/`（首页）
 * - `#/playground`、`#/playground?scene=purchase-order` → `/playground`
 * - `#features` 这类页内锚点 → `/`，锚点跳转不算一次新访问
 */
export function toAnalyticsRoute(hash: string): string {
  if (!hash.startsWith('#/')) return '/';
  const path = hash.slice(1).split('?')[0];
  return path || '/';
}

let lastRoute: string | null = null;

/** 路由变化时上报一次 pageview，同一个 route 重复触发不会重复计数 */
export function trackRoute(hash: string): void {
  if (!analyticsEnabled) return;
  const route = toAnalyticsRoute(hash);
  if (route === lastRoute) return;
  lastRoute = route;
  inject({ mode: 'production', disableAutoTrack: true });
  pageview({ route, path: route });
}
