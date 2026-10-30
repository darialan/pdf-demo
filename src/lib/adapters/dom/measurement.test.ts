import { classifyPrintNode, DEFAULT_PRINT_RULES } from '../../core/rules/print-rules';
import { measureDocument } from './measurement';
import { walkPrintTree } from './traversal';

const rect = (top: number, height: number) => ({ top, bottom: top + height, height, width: 300 } as DOMRect);
const setRect = (element: Element, top: number, height: number) => {
  element.getBoundingClientRect = () => rect(top, height);
};

test('classification is independent of Ant Design classes and can be extended', () => {
  const row = document.createElement('tr');
  expect(classifyPrintNode(row)).toMatchObject({ kind: 'atomic', overflow: 'split' });
  row.setAttribute('data-pdf-keep-together', 'true');
  expect(classifyPrintNode(row)).toMatchObject({ kind: 'atomic', overflow: 'error' });
  row.setAttribute('data-pdf-keep-together', 'split');
  expect(classifyPrintNode(row)).toMatchObject({ kind: 'atomic', overflow: 'split' });
  const ignored = document.createElement('div');
  ignored.setAttribute('data-pdf-ignore', 'true');
  expect(classifyPrintNode(ignored)).toEqual({ kind: 'ignore' });
  const quote = document.createElement('blockquote');
  expect(
    classifyPrintNode(quote, [
      { selector: 'blockquote', result: { kind: 'atomic', label: '引用', overflow: 'error' } },
      ...DEFAULT_PRINT_RULES,
    ])
  ).toMatchObject({ kind: 'atomic', label: '引用' });
});

test('depth-first traversal can stop at an atomic subtree without visiting its descendants', () => {
  const root = document.createElement('div');
  root.innerHTML = '<section><img><span>caption</span></section><p>tail</p>';
  const seen: string[] = [];
  walkPrintTree(root, node => {
    seen.push(node.nodeName);
    return node.nodeName === 'SECTION' ? 'skip' : 'descend';
  });
  expect(seen).toEqual(['SECTION', 'P', '#text']);
});

test('collects rows, images and signature groups once, without remeasuring their internal text', () => {
  const root = document.createElement('div');
  root.innerHTML =
    '<p style="line-height:16px">outside</p><table><tbody><tr><td>row</td></tr></tbody></table><img alt="凭证"><section data-pdf-keep-together="true">signature <span>date</span></section>';
  setRect(root, 100, 900);
  setRect(root.querySelector('tr')!, 200, 70);
  setRect(root.querySelector('img')!, 500, 100);
  setRect(root.querySelector('section')!, 650, 100);
  const select = jest.fn();
  const range = jest.spyOn(document, 'createRange').mockReturnValue({
    selectNodeContents: select,
    getClientRects: () => [rect(120, 16)],
  } as unknown as Range);
  try {
    const result = measureDocument(root, 300);
    expect(result.ranges).toEqual([
      { top: 20, bottom: 36 },
      { top: 100, bottom: 170 },
      { top: 400, bottom: 500 },
      { top: 550, bottom: 650 },
    ]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(result.stats.atomicElements).toBe(3);
  } finally {
    range.mockRestore();
  }
});

test('an oversized table row descends into its text and still protects nested images', () => {
  const root = document.createElement('div');
  root.innerHTML = '<table><tbody><tr><td style="line-height:20px">long text<img alt="小图"></td></tr></tbody></table>';
  setRect(root, 0, 500);
  setRect(root.querySelector('tr')!, 0, 500);
  setRect(root.querySelector('img')!, 120, 40);
  const range = jest.spyOn(document, 'createRange').mockReturnValue({
    selectNodeContents: jest.fn(),
    getClientRects: () => [rect(0, 20), rect(80, 20)],
  } as unknown as Range);
  try {
    expect(measureDocument(root, 100).ranges).toEqual([
      { top: 0, bottom: 20 },
      { top: 80, bottom: 100 },
      { top: 120, bottom: 160 },
    ]);
  } finally {
    range.mockRestore();
  }
});

test('an oversized explicit group reports the named region instead of silently cutting it', () => {
  const root = document.createElement('div');
  root.innerHTML = '<section data-pdf-keep-together="true" data-pdf-label="审批签名与日期">signature</section>';
  setRect(root, 0, 500);
  setRect(root.firstElementChild!, 100, 220);
  expect(() => measureDocument(root, 100)).toThrow('审批签名与日期');
  expect(() => measureDocument(root, 100)).toThrow('220px');
});

test('ignored toolbar margins disappear from both document height and protected row coordinates', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div data-pdf-ignore="true" style="margin-bottom:16px">filters</div><table><tbody><tr><td>row</td></tr></tbody></table>';
  setRect(root, 100, 548);
  setRect(root.firstElementChild!, 100, 32);
  setRect(root.querySelector('tr')!, 248, 55);
  const result = measureDocument(root, 300);
  expect(result.height).toBe(500);
  expect(result.ranges).toEqual([{ top: 100, bottom: 155 }]);
});
