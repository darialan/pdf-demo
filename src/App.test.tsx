import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
jest.mock('jspdf', () => jest.fn());
import { businessRows, orderedTotal, acceptedTotal, payable } from './pdf-demo/pages/business-data';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn() })) });
});
test('原有 Tabs 包含三个业务场景，且保留基础 Demo', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: '段落' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '采购订单' }));
  expect(document.getElementById('print-content6')).toBeInTheDocument();
  expect(screen.getByText('交货与包装 / Delivery & Packaging')).toBeInTheDocument();
  expect(businessRows).toHaveLength(45);
  expect(orderedTotal - acceptedTotal).toBe(396000);
  expect(payable).toBe(11046400);
  expect(screen.getByRole('tab', { name: '收货验收单' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '采购结算单' })).toBeInTheDocument();
});
