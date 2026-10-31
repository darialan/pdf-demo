# 站点访问分析

> 适用版本：`@darialan/web-printer` 1.1.0（站点）· 最后核对：2026-10-31 · 状态：现行

在线工作台部署在 Vercel（`pdf-demo-phi.vercel.app`）。本文记录访问分析的选型依据、当前接入方式、开启步骤与数据口径。

## 选型

| 方案 | 免费额度 | 国内可用性 | hash 路由的站内跳转 | 数据出口 |
| --- | --- | --- | --- | --- |
| **Vercel Web Analytics（当前接入）** | Hobby 每月 5 万 events，超额停止采集，不额外计费 | 脚本由站点自身域名提供（`/_vercel/insights/script.js`），不依赖被墙域名 | 脚本默认不统计，需要按 route 手动上报（本项目已处理） | Vercel Dashboard |
| Cloudflare Web Analytics | 无限 | 脚本与上报分别在 `static.cloudflareinsights.com` 与 `cloudflareinsights.com`，国内时延需实测 | `spa: true` 只监听 `pushState` / `replaceState`，hash 路由不统计 | Cloudflare Dashboard，无数据 API |
| Google Analytics 4 | 无限 | gtag 与 GA 域名国内不可达，国内访客基本采不到，后台也需代理 | 支持 `hashchange` | Google Analytics |

备选：Plausible（开源项目有免费额度）、Umami（自建或用 Cloud 免费额度）、百度统计（国内可用，适合中文受众）。这些都要额外部署服务或第三方域名，且 hash 路由同样需要自己补上报。

结论：站点已经跑在 Vercel 上，Vercel 自带的 Web Analytics 不需要额外域名、额外服务，也不需要 Cookie 同意弹窗，脚本走同域路径在国内最稳，因此选它。

## 接入方式

代码集中在 `src/analytics.ts`，接入点在 `src/App.tsx`。

站点是 hash 路由的单页应用（`#/`、`#/playground`）。Vercel 的统计脚本按 pathname 去重、只监听 `pushState` / `popstate`，hash 变化不会被算成新的 PV；面向 React 的通用封装也不带路由支持。所以这里关掉脚本的自动上报，改成按路由手动发 pageview：

- `toAnalyticsRoute()` 把 hash 归一：`#/` → `/`，`#/playground?scene=purchase-order` → `/playground`，页内锚点 `#features` → `/`（锚点跳转不算一次新访问）。
- `trackRoute()` 只在 route 变化时上报一次，避免同一路由重复计数。

开关：

- 开发与测试环境不上报（`NODE_ENV !== 'production'`）。
- 构建时设置 `REACT_APP_DISABLE_ANALYTICS=1` 可整体关闭。

## 开启步骤

1. 打开 Vercel Dashboard → `pdf-demo` 项目 → **Analytics** → **Enable**。开启后 Vercel 会在下次部署时加上 `/_vercel/insights/*` 路由。
2. 部署：push 到 `main`，或本地 `vercel --prod`。
3. 访问一次站点，确认浏览器 Network 面板里能看到 `/_vercel/insights/script.js` 与随后的上报请求。

没有在 Dashboard 开启时脚本会 404，控制台会打印 `[Vercel Web Analytics] Failed to load script...`，属于预期提示。

## 数据口径

- **Visitors（UV）**：服务端按访客去重。脚本默认不写 Cookie（`enableCookie` 是可选项）。
- **Page Views（PV）**：一次 pageview 记一次。本项目按 route 计数，首页与工作台是两条独立 route。
- **Referrer**：只在会话的第一个 PV 带上，后续 PV 不带来源。
- 页面维度取 `path`，路由维度取 `route`，两者在 Dashboard 分开展示。

## 免费额度与限制

- Hobby：每月 5 万 events，团队内所有项目共享；超出后有 3 天宽限期，随后停止采集，不产生账单。
- 报表窗口 1 个月（Pro 起可延长）。
- Hobby 不支持自定义事件，`track()` 类的交互埋点（"点了导出 PDF"）暂时记不了，Pro 起才开放。
- Hobby 不展开 UTM 参数。

## 换供应商时改哪里

所有上报都收在 `src/analytics.ts`，换供应商只需要改这个文件和 `src/App.tsx` 里的调用点，页面其余部分不受影响。
