import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import WorkbenchPage from './demo/workbench-page';
import { purchaseOrderRows, orderedTotal } from './demo/purchase-order';

jest.mock('jspdf', () => jest.fn());
jest.mock('./landing/product-preview', () => ({ ProductPreview: () => <div aria-label="实际分页预览" /> }));

beforeEach(() => {
  localStorage.setItem('web-printer-locale', 'zh');
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

test('长表格只展示一张完整表格，不包含筛选栏和订单卡片', async () => {
  render(<WorkbenchPage />);
  expect(await screen.findByRole('tab', { name: '长表格' }, { timeout: 4000 })).toBeInTheDocument();
  const root = document.getElementById('print-content6')!;
  expect(within(root).getAllByRole('table')).toHaveLength(1);
  expect(within(root).getAllByRole('row')).toHaveLength(46);
  expect(root.querySelector('input, select, button, .ant-card')).toBeNull();
  expect(screen.queryByText('订单概况')).not.toBeInTheDocument();
  expect(purchaseOrderRows).toHaveLength(45);
  expect(orderedTotal).toBeGreaterThan(0);
});

test('长文章以连续文字展示分页，不包含公式、代码、图片或表格', async () => {
  render(<WorkbenchPage />);
  fireEvent.click(await screen.findByRole('tab', { name: '长文章' }));
  const root = document.getElementById('print-content-long-article')!;
  expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent('把时间留给步行');
  expect(root.querySelectorAll('p')).toHaveLength(25);
  expect(root.textContent!.length).toBeGreaterThan(2500);
  expect(root.querySelector('img, pre, code, table, svg, math')).toBeNull();
});

test('复杂图文页面承接技术文章，原样保留正文样式并保护图片和代码块', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => '<section style="font-size:16px;line-height:30px"><p>原文正文样式</p><pre style="background:#123456"><code>原文代码样式</code></pre><img src="/figure.png" alt="原文配图" /></section>',
  });
  try {
    render(<WorkbenchPage />);
    fireEvent.click(await screen.findByRole('tab', { name: '复杂图文页面' }));
    const root = document.getElementById('print-content-complex-mixed')!;
    expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent('用 TorchOptics 逆向设计一条凸 Accelerating Beam 轨迹');
    expect(await within(root).findByText('原文代码样式')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/demo-assets/torchoptics-article.html', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(root.querySelector('.article-body > section')).toHaveStyle('font-size: 16px; line-height: 30px');
    expect(root.querySelector('pre')).toHaveAttribute('data-print-atomic', 'true');
    expect(root.querySelector('pre')).toHaveStyle('background: #123456');
    expect(root.querySelector('img')).toHaveAttribute('data-print-atomic', 'true');
  } finally {
    global.fetch = originalFetch;
  }
});

test('自定义页眉页脚 Tab 每页重复自定义页眉与页脚内容', async () => {
  render(<WorkbenchPage />);
  fireEvent.click(await screen.findByRole('tab', { name: '自定义页眉页脚' }));
  expect(document.getElementById('print-header-custom')).toHaveTextContent('BX-202610-0086');
  expect(document.getElementById('print-footer-custom')).toHaveTextContent('归档副本');
  expect(document.getElementById('print-content-custom-header-footer')).toBeInTheDocument();
});

test('首页展示产品介绍，并能进入工作台和返回首页', async () => {
  window.history.replaceState(null, '', '/');
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('长网页，分好再导出。');
  expect(screen.queryByRole('tab', { name: '长表格' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '复制安装命令' })).toBeInTheDocument();

  const entry = screen.getAllByRole('link', { name: '体验分页' })[0];
  expect(entry).toHaveAttribute('href', '#/playground');
  window.history.pushState(null, '', '/#/playground');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(await screen.findByRole('tab', { name: '长表格' })).toBeInTheDocument();
  // 工作台是独立页面，不再嵌在落地页的首屏与正文里
  expect(screen.queryByRole('navigation', { name: '全局导航' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '#/');

  window.history.pushState(null, '', '/#/');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('长网页，分好再导出。');
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
});

test('场景链接打开对应的工作台单据，接入示例支持键盘切换', async () => {
  window.history.replaceState(null, '', '/');
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  const sceneLink = screen.getByRole('link', { name: /长表格.*45 行采购明细/ });
  expect(sceneLink).toHaveAttribute('href', '#/playground?scene=purchase-order');

  expect(screen.getByRole('tabpanel')).toHaveTextContent('marginTopMm: 12');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'JavaScript' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'React' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveTextContent("format: 'png'");
  expect(screen.getByRole('tab', { name: 'React' })).toHaveFocus();

  window.history.pushState(null, '', '/#/playground?scene=purchase-order');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(await screen.findByRole('tab', { name: '长表格', selected: true })).toBeInTheDocument();
  expect(document.getElementById('print-content6')).toBeInTheDocument();
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
});


test('首页语言切换覆盖文案与元信息，并保留语言偏好和示例状态', () => {
  window.history.replaceState(null, '', '/');
  const { unmount } = render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: 'Vue' }));
  fireEvent.click(screen.getByRole('button', { name: '切换到英文' }));
  expect(document.documentElement.lang).toBe('en');
  expect(document.title).toBe('Web Printer · Paginated PDF & PNG export');
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content') || '').not.toContain('框架');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Web to PDF.Page by page.');
  expect(screen.getByRole('tab', { name: 'Vue' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Export PDF');
  expect(screen.getByRole('button', { name: 'Copy install command' })).toBeInTheDocument();
  expect(screen.queryByText('GitHub Star')).not.toBeInTheDocument();
  expect(localStorage.getItem('web-printer-locale')).toBe('en');
  unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Switch to Chinese' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Chinese' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('长网页，分好再导出。');
  expect(document.documentElement.lang).toBe('zh-CN');
});
