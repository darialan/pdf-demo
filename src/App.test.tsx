import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
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

test('保留基础 Demo 与代表性采购订单业务单据', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: '段落' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '采购订单' }));
  expect(document.getElementById('print-content6')).toBeInTheDocument();
  expect(screen.getByText('交货与包装 / Delivery & Packaging')).toBeInTheDocument();
  expect(purchaseOrderRows).toHaveLength(45);
  expect(orderedTotal).toBeGreaterThan(0);
});

test('低代码 Tab 支持复杂 Web 物料添加、画布内直接调整宽度与跨页保护策略', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: '低代码' }));
  const canvasRoot = document.getElementById('print-content-lowcode')!;
  expect(canvasRoot).toBeInTheDocument();
  expect(screen.getByText('复杂页面物料')).toBeInTheDocument();

  // 点击添加自由尺寸容器
  fireEvent.click(screen.getByText('+ 自由尺寸容器'));

  // 在画布悬浮工具条中直接切换跨页保护策略和宽度
  fireEvent.change(screen.getByLabelText('跨页保护策略'), { target: { value: 'keep-together' } });
  fireEvent.click(screen.getByText('1/2宽'));
  expect(canvasRoot.querySelector('[data-pdf-keep-together="true"]')).not.toBeNull();
});
