import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import WorkbenchPage from './demo/workbench-page';
import { purchaseOrderRows, orderedTotal } from './demo/purchase-order';

jest.mock('jspdf', () => jest.fn());

beforeEach(() => {
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

test('保留基础 Demo 与代表性采购订单业务单据', async () => {
  render(<WorkbenchPage />);
  expect(await screen.findByRole('tab', { name: '长表格' }, { timeout: 4000 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '长表格' }));
  expect(document.getElementById('print-content6')).toBeInTheDocument();
  expect(screen.getByText('交货与包装 / Delivery & Packaging')).toBeInTheDocument();
  expect(purchaseOrderRows).toHaveLength(45);
  expect(orderedTotal).toBeGreaterThan(0);
});

test('长文章 Tab 展示真实长文标题与摘要，正文区域异步加载原文 HTML', async () => {
  render(<WorkbenchPage />);
  fireEvent.click(await screen.findByRole('tab', { name: '长文章' }));
  const articleRoot = document.getElementById('print-content-long-article')!;
  expect(articleRoot).toBeInTheDocument();
  expect(screen.getByText('用 TorchOptics 逆向设计一条凸 Accelerating Beam 轨迹')).toBeInTheDocument();
  expect(screen.getByText(/Gaussian 输入沿指定凸抛物线轨迹传播/)).toBeInTheDocument();
});

test('复杂图文页面 Tab 混排表单信息、现场照片、长段落与检查表', async () => {
  render(<WorkbenchPage />);
  fireEvent.click(await screen.findByRole('tab', { name: '复杂图文页面' }));
  const mixedRoot = document.getElementById('print-content-complex-mixed')!;
  expect(mixedRoot).toBeInTheDocument();
  expect(screen.getByText('滨江江陵路店 · 前台网络间歇掉线')).toBeInTheDocument();
  expect(mixedRoot.querySelector('[data-pdf-atomic="true"]')).not.toBeNull();
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
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('为复杂业务页面，做好 PDF 分页。');
  expect(screen.queryByRole('tab', { name: '长表格' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '签字盖章' }));
  expect(screen.getByAltText('示例印章')).toBeInTheDocument();

  const entry = screen.getAllByRole('link', { name: '打开打印工作台' })[0];
  expect(entry).toHaveAttribute('href', '#/playground');
  window.history.pushState(null, '', '/#/playground');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(await screen.findByRole('tab', { name: '长表格' })).toBeInTheDocument();
  // 工作台是独立页面，不再嵌在落地页的首屏与正文里
  expect(screen.queryByRole('navigation', { name: '全局导航' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '#/');

  window.history.pushState(null, '', '/#/');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('为复杂业务页面，做好 PDF 分页。');
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
});

test('场景链接打开对应的工作台单据，接入示例支持键盘切换', async () => {
  window.history.replaceState(null, '', '/');
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  const sceneLink = screen.getByRole('link', { name: /45 行采购订单/ });
  expect(sceneLink).toHaveAttribute('href', '#/playground?scene=purchase-order');

  expect(screen.getByRole('tabpanel')).toHaveTextContent('marginTopMm: 12');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'JavaScript' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'React' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('usePdfPrint');
  expect(screen.getByRole('tab', { name: 'React' })).toHaveFocus();

  window.history.pushState(null, '', '/#/playground?scene=purchase-order');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(await screen.findByRole('tab', { name: '长表格', selected: true })).toBeInTheDocument();
  expect(document.getElementById('print-content6')).toBeInTheDocument();
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
});
