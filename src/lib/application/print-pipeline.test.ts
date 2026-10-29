import { prepareLayout } from './print-pipeline';

test('rejects missing or hidden print roots instead of silently succeeding', async () => {
  await expect(prepareLayout({ element: null })).rejects.toThrow('有效');
  const root = document.createElement('div');
  document.body.appendChild(root);
  await expect(prepareLayout({ element: root })).rejects.toThrow('宽度为零');
  root.remove();
});

test('cleans snapshots after resource failure and allows retry', async () => {
  const root = document.createElement('div');
  root.innerHTML = '<img alt="损坏的凭证" src="bad.png" />';
  document.body.appendChild(root);
  root.getBoundingClientRect = () => ({ width: 800 } as DOMRect);
  const decode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: () => Promise.reject(new Error('bad image')),
  });
  try {
    await expect(prepareLayout({ element: root })).rejects.toThrow('损坏的凭证');
    expect(document.querySelector('[data-pdf-snapshot]')).toBeNull();
    await expect(prepareLayout({ element: root })).rejects.toThrow('损坏的凭证');
  } finally {
    if (decode) Object.defineProperty(HTMLImageElement.prototype, 'decode', decode);
    else delete (HTMLImageElement.prototype as any).decode;
    root.remove();
  }
});

test('cancellation is rejected before any snapshot allocation', async () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  root.getBoundingClientRect = () => ({ width: 800 } as DOMRect);
  const controller = new AbortController();
  controller.abort();
  await expect(prepareLayout({ element: root, signal: controller.signal })).rejects.toThrow('取消');
  expect(document.querySelector('[data-pdf-snapshot]')).toBeNull();
  root.remove();
});
