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
  root.getBoundingClientRect = () => ({ width: 800 } as any);
  const decode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: () => Promise.reject(new Error('bad image')),
  });
  try {
    await expect(prepareLayout({ element: root })).rejects.toThrow('损坏的凭证');
    expect(document.querySelector('[data-print-snapshot]')).toBeNull();
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
  root.getBoundingClientRect = () => ({ width: 800 } as any);
  const controller = new AbortController();
  controller.abort();
  await expect(prepareLayout({ element: root, signal: controller.signal })).rejects.toThrow('取消');
  expect(document.querySelector('[data-print-snapshot]')).toBeNull();
  root.remove();
});

test('supports cross-realm elements from an iframe document', async () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  expect(iframeDoc).toBeTruthy();
  if (iframeDoc) {
    const div = iframeDoc.createElement('div');
    div.innerHTML = '<h2>沙箱嵌入文档标题</h2><p>沙箱嵌入文档正文内容段落</p>';
    iframeDoc.body.appendChild(div);
    div.getBoundingClientRect = () =>
      ({ width: 600, height: 200, top: 0, bottom: 200, left: 0, right: 600 } as any);

    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: 600, height: 200, top: 0, bottom: 200, left: 0, right: 600 } as any;
    };
    try {
      const layout = await prepareLayout({ element: div });
      expect(layout.pages.length).toBeGreaterThan(0);
      layout.cleanup();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  }
  iframe.remove();
});

test('开发者级声明式页眉与页脚自动生成并预留页面空间', async () => {
  const root = document.createElement('div');
  root.innerHTML = '<p>正文内容测试</p>';
  document.body.appendChild(root);
  root.getBoundingClientRect = () => ({ width: 800, height: 400, top: 0, bottom: 400, left: 0, right: 800 } as any);

  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 800, height: 40, top: 0, bottom: 40, left: 0, right: 800 } as any;
  };

  try {
    const layout = await prepareLayout({
      element: root,
      settings: {
        header: { enabled: true, text: '公司财务报表', align: 'center', showDivider: true },
        footer: { enabled: true, text: '机密文件', align: 'center', showDivider: true },
        pageNumber: { enabled: false },
      },
    });

    expect(layout.header).toBeTruthy();
    expect(layout.header?.textContent).toBe('公司财务报表');
    expect(layout.footer).toBeTruthy();
    expect(layout.footer?.textContent).toBe('机密文件');
    expect(layout.headerHeight).toBeGreaterThan(0);
    expect(layout.footerHeight).toBeGreaterThan(0);
    layout.cleanup();
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    root.remove();
  }
});
