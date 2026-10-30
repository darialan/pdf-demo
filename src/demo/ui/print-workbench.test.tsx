import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { measureDocument, visualizePageBreaks } from '@darialan/web-pdf-printer';
import { buildHtmlPreviewData } from './preview/pdf-preview-modal';
import { PrintWorkbench } from './print-workbench';

jest.mock('@darialan/web-pdf-printer', () => ({
  DEFAULT_SETTINGS: { pageNumber: { enabled: true } },
  resolvePrintElement: (el: HTMLElement) => el,
  resolvePaper: () => ({}),
  calculateGeometry: () => ({ capacity: 500 }),
  getPrintRules: () => [],
  measureDocument: jest.fn(),
  paginate: () => [{ start: 0, end: 500 }],
  outputPDF: jest.fn(),
  visualizePageBreaks: jest.fn(),
  clearPageBreaks: () => global.document.querySelectorAll('[data-pdf-debug]').forEach(el => el.remove()),
}));
jest.mock('./preview/pdf-preview-modal', () => ({ buildHtmlPreviewData: jest.fn() }));
jest.mock('./debug-panel/print-toolbar', () => ({
  PrintObservabilityBanner: () => <div>标记统计</div>,
  PrintToolbarActions: ({ debugActive, onToggleDebug }: any) => <button onClick={onToggleDebug}>{debugActive ? '退出检查' : '检查分页'}</button>,
}));
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return { ...actual, Tabs: ({ items, activeKey, onChange, tabBarExtraContent }: any) => <>
    {items.map((item: any) => <button key={item.key} onClick={() => onChange(item.key)}>{item.label}</button>)}
    {tabBarExtraContent}{items.find((item: any) => item.key === activeKey)?.children}
  </> };
});

const data = {
  paperLabel: 'A4', pages: [{ start: 0, end: 500 }], sourceHtml: '<p>预览正文</p>',
  totalMs: 1, filename: 'test',
  geometry: { paperWidthPx: 794, paperHeightPx: 1123, sourceWidth: 800, scale: 1,
    marginTopPx: 10, marginBottomPx: 10, marginLeftPx: 10, marginRightPx: 10,
    printableWidthPx: 774, printableHeightPx: 1103, headerHeightPx: 0, footerHeightPx: 0 },
};
function setup() {
  render(<PrintWorkbench scenes={[
    { key: 'a', label: '场景一', contentId: 'source-a', children: <div id="source-a"><p>源页面一</p></div> },
    { key: 'b', label: '场景二', contentId: 'source-b', children: <div id="source-b"><p>源页面二</p></div> },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: '检查分页' }));
}
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks();
  (visualizePageBreaks as jest.Mock).mockImplementation((_pages, root) => {
    const marker = document.createElement('span');
    marker.setAttribute('data-pdf-debug', 'true');
    marker.textContent = '页面标记';
    root.appendChild(marker);
    return { atomic: 1, splittable: 1, ignore: 0 };
  });
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800 } as DOMRect);
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1; });
  (measureDocument as jest.Mock).mockReturnValue({ height: 500, ranges: [], stats: {} });
  (buildHtmlPreviewData as jest.Mock).mockResolvedValue(data);
});
afterEach(() => jest.restoreAllMocks());

test('标记先显示，预览独立等待；失败后保留标记，重试成功', async () => {
  (buildHtmlPreviewData as jest.Mock).mockRejectedValueOnce(new Error('快照失败'));
  setup();
  expect(screen.getByText('页面标记')).toBeInTheDocument();
  expect(screen.getByText('计算分页中…')).toBeInTheDocument();
  expect(await screen.findByText('纸张预览失败：快照失败')).toBeInTheDocument();
  expect(screen.getByText('页面标记')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重试预览' }));
  expect(await screen.findByText('预览正文')).toBeInTheDocument();
  expect(visualizePageBreaks).toHaveBeenCalledTimes(1);
});

test('标记失败仍然生成预览', async () => {
  (visualizePageBreaks as jest.Mock).mockImplementationOnce(() => { throw new Error('标记异常'); });
  setup();
  expect(screen.getByText('页面标记失败：标记异常')).toBeInTheDocument();
  expect(await screen.findByText('预览正文')).toBeInTheDocument();
});

test('预览渲染异常只影响小窗', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  (buildHtmlPreviewData as jest.Mock).mockResolvedValue({ ...data, geometry: undefined });
  setup();
  expect(await screen.findByRole('button', { name: '重试预览' })).toBeInTheDocument();
  expect(screen.getByText('页面标记')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '退出检查' })).toBeInTheDocument();
  log.mockRestore();
});

test.each(['关闭预览小窗', '退出检查', '场景二'])('等待期间%s，迟到的预览不重新打开', async action => {
  const pending = deferred();
  (buildHtmlPreviewData as jest.Mock).mockReturnValue(pending.promise);
  setup();
  await waitFor(() => expect(buildHtmlPreviewData).toHaveBeenCalledTimes(1));
  if (action === '关闭预览小窗') fireEvent.click(screen.getByTitle(action));
  else fireEvent.click(screen.getByRole('button', { name: action }));
  pending.resolve(data);
  await waitFor(() => expect(screen.queryByText('计算分页中…')).not.toBeInTheDocument());
  expect(screen.queryByText('预览正文')).not.toBeInTheDocument();
  if (action === '关闭预览小窗') expect(screen.getByText('页面标记')).toBeInTheDocument();
  else expect(screen.queryByText('页面标记')).not.toBeInTheDocument();
});
