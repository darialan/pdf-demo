import { useEffect, useState } from 'react';

export type Locale = 'zh' | 'en';
const STORAGE_KEY = 'web-printer-locale';

export const copy = {
  zh: {
    title: 'Web Printer · 网页分页导出', description: '框架无关的浏览器分页库。沿用网页样式，按文字行和内容块分页，导出 PDF 或逐页 PNG。',
    skip: '跳至主要内容', nav: '全局导航', home: 'Web Printer 首页', features: '分页规则', examples: '场景示例', integration: '快速接入', faq: '常见问题', workbench: '打开工作台',
    dark: '切换到暗色主题', light: '切换到亮色主题', github: '查看 GitHub 仓库', language: '切换到英文',
    headline: ['长网页，', '分好再导出。'], lede: '框架无关的网页分页库。沿用页面样式，按内容换页，导出 PDF 或逐页 PNG。', try: '体验分页', viewCode: '查看接入代码', note: 'MIT 开源 · 浏览器内运行', caption: '从一整页 HTML 到多页 PDF：文字按行续排，表格与图文整块保留。',
    stackTitle: '适配你的技术栈', stackBody: '独立的 JavaScript / TypeScript 核心，不绑定框架或组件库。', stackLabel: '技术栈接入示例',
    featureTitle: '分页，照顾到内容。', featureBody: '从现有页面开始，控制内容怎样换页，以及每一页长什么样。',
    rules: [
      { title: '文字，按行延续', body: '按实际文字行测量分页位置。表格优先按整行换页，长内容继续排入下一页。', specimen: '文字行 / 表格行' },
      { title: '图文，整块保护', body: '将图片、公式和代码标记为整体内容；设置需要排除的区域，让按钮和操作栏留在网页里。', specimen: 'data-print-atomic="true"' },
      { title: '尺寸，自己定义', body: '从 A4 到自定义长宽与图片比例，配合边距、页眉页脚和页码，共用一套分页设置。', specimen: 'A4 / 1:1 / 3:4 / 9:16' },
    ],
    examplesTitle: '用真实页面试一试。', examplesBody: '打开示例，调节尺寸、检查分页，再下载结果。', openExample: '打开示例',
    scenes: [
      { title: '长表格', body: '45 行长表格，观察表格行在页边界如何处理。', type: '长表格' },
      { title: '长文章', body: '连续正文按文字行分页，段落跨页自然延续。', type: '文字排版' },
      { title: '复杂图文', body: '真实技术文章，包含配图、公式与代码块。', type: '技术文档' },
      { title: '页眉与页脚', body: '每一页重复固定信息与动态页码。', type: '自定义布局' },
    ],
    integrateTitle: '接入现有项目。', integrateBody: '安装 NPM 包，在页面渲染完成后调用同一个导出接口。', steps: [
      ['安装包', 'TypeScript 类型随包提供，React 集成从可选入口引入。'],
      ['选择内容', '获取要导出的页面容器，等待图片和字体加载完成。'],
      ['选择输出', 'PDF 下载为单文件，逐页 PNG 打包为 ZIP。'],
    ], docs: '阅读接入文档', codeTabs: '框架接入示例', copy: '复制', copied: '已复制', copyError: '请手动复制', copyInstall: '复制安装命令', copyCommand: '复制命令', copyCode: '复制代码', install: 'npm 安装命令',
    faqTitle: '接入前，了解这些。', faqBody: '运行方式、输出形式，以及当前的支持边界。',
    questions: [
      ['依赖框架或组件库吗？', '核心入口不依赖 React，也不绑定组件库。它处理已渲染的网页内容，可在原生 JavaScript、Vue、React 等客户端项目中调用。React Hook 由独立的 /react 入口提供。'],
      ['需要部署 PDF 生成服务吗？', '分页与导出在浏览器内完成，无需额外的生成服务。页面中的图片、字体等资源仍需正常加载，跨域图片需要对应服务器允许 CORS。'],
      ['哪些内容需要先验证？', '复杂 CSS 的还原受 html2canvas 支持范围影响。跨域 iframe、视频和 Shadow DOM 不属于完整支持范围；超出一页的整体内容也需要验证分页结果。建议先用自己的业务页面测试。'],
      ['PDF 中的文字能搜索和复制吗？', '当前 PDF 正文是画布渲染后的图像，不包含可搜索、可复制的文本层。PDF 与 PNG 共用分页逻辑，PNG 按页生成并打包为 ZIP。'],
      ['可以用于商业项目吗？', '可以。NPM 包采用 MIT 许可，分发时需保留版权和许可声明。'],
    ],
    footerLine: '让网页，成为可交付的每一页。', footerNote: 'MIT 开源许可',
  },
  en: {
    title: 'Web Printer · Paginated PDF & PNG export', description: 'A framework-independent browser pagination library. Keep your page styles, break around content, and export PDF or individual PNG pages.',
    skip: 'Skip to content', nav: 'Main navigation', home: 'Web Printer home', features: 'Page breaks', examples: 'Examples', integration: 'Quick start', faq: 'FAQ', workbench: 'Open workbench',
    dark: 'Switch to dark theme', light: 'Switch to light theme', github: 'View GitHub repository', language: 'Switch to Chinese',
    headline: ['Web to PDF.', 'Page by page.'], lede: 'Framework-independent page export for the browser. Keep your page styles, break around content, and export PDF or individual PNGs.', try: 'Try pagination', viewCode: 'View the code', note: 'MIT licensed · Runs in your browser', caption: 'From one HTML page to a paginated PDF: text flows by line; tables and figures stay whole.',
    stackTitle: 'Your stack. Your choice.', stackBody: 'A standalone JavaScript / TypeScript core, independent of frameworks and component libraries.', stackLabel: 'Framework integration examples',
    featureTitle: 'Page breaks that fit.', featureBody: 'Start with your existing page. Choose how content breaks and how each page is laid out.',
    rules: [
      { title: 'Text flows by line', body: 'Measure actual text lines to find page breaks. Keep table rows together where they fit, and continue long content on the next page.', specimen: 'Text lines / Table rows' },
      { title: 'Keep content together', body: 'Mark images, formulas and code as atomic blocks. Exclude buttons and toolbars from the exported document.', specimen: 'data-print-atomic="true"' },
      { title: 'Choose your page size', body: 'Use A4, custom dimensions or image ratios, with margins, repeating headers, footers and page numbers.', specimen: 'A4 / 1:1 / 3:4 / 9:16' },
    ],
    examplesTitle: 'Try a real page.', examplesBody: 'Open an example, adjust its size, inspect the page breaks and download the result.', openExample: 'Open example',
    scenes: [
      { title: 'Long tables', body: 'A 45-row table shows how table rows behave at page boundaries.', type: 'Long table' },
      { title: 'Long-form articles', body: 'Continuous text breaks by line, with paragraphs flowing between pages.', type: 'Text layout' },
      { title: 'Mixed content', body: 'A technical article with images, formulas and code blocks.', type: 'Technical document' },
      { title: 'Headers & footers', body: 'A document with repeating headers and dynamic page numbers.', type: 'Custom layout' },
    ],
    integrateTitle: 'Add it to your app.', integrateBody: 'Install the NPM package and call the same export API after your page renders.', steps: [
      ['Install the package', 'TypeScript types are included. React integration has its own optional entry point.'],
      ['Choose your content', 'Get the page container to export and wait for its images and fonts to load.'],
      ['Choose your output', 'Download a single PDF, or individual PNG pages bundled in a ZIP.'],
    ], docs: 'Read the integration docs', codeTabs: 'Framework integration examples', copy: 'Copy', copied: 'Copied', copyError: 'Copy manually', copyInstall: 'Copy install command', copyCommand: 'Copy command', copyCode: 'Copy code', install: 'npm install command',
    faqTitle: 'Before you integrate.', faqBody: 'How it runs, what it exports, and the current rendering limits.',
    questions: [
      ['Do I need a framework?', 'The core entry point has no React dependency and is independent of component libraries. It works with rendered web content in client-side JavaScript, Vue, React and other apps. React Hooks are available from the separate /react entry point.'],
      ['Do I need a PDF generation server?', 'Pagination and export run in the browser. An additional generation service is not required. Images and fonts still need to load, and cross-origin images require CORS permission from their server.'],
      ['What should I test first?', 'Complex CSS rendering depends on html2canvas support. Cross-origin iframes, video and Shadow DOM are not fully supported. Atomic content taller than a page also needs checking. Test your actual business page before integrating.'],
      ['Can I search or copy text in the PDF?', 'PDF pages currently contain canvas-rendered images, with no searchable or selectable text layer. PDF and PNG share the same pagination logic. PNG output is generated per page and bundled in a ZIP.'],
      ['Can I use it commercially?', 'Yes. The NPM package uses the MIT license. Keep the copyright and license notice when distributing it.'],
    ],
    footerLine: 'From web content to pages you can share.', footerNote: 'MIT licensed',
  },
};

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get('lang');
      if (requested === 'zh' || requested === 'en') return requested;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch { /* Storage can be unavailable in private contexts. */ }
    return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = copy[locale].title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy[locale].description);
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* Keep switching functional without storage. */ }
  }, [locale]);
  return [locale, setLocale] as const;
}
