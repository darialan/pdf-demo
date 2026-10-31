import { prepareContent } from '../../../extension/content/prepare-content';
import { extensionPrintRules } from '../../../extension/shared/print-presets';
import { cloneWithResolvedStyles } from '../adapters/dom/snapshot';

const rules = extensionPrintRules();
beforeEach(() => { document.body.innerHTML = ''; });

async function plan(root: HTMLElement) {
  return prepareContent(root, [], rules, new AbortController().signal);
}

test('embedded content becomes an explicit placeholder while ordinary text remains printable', async () => {
  document.body.innerHTML = '<article><h1>Report</h1><p>Keep this text</p><iframe style="width:200px;height:100px"></iframe><div hidden><video></video></div></article>';
  const source = document.querySelector('article')!;
  const original = source.outerHTML;
  const content = await plan(source);
  const clone = cloneWithResolvedStyles(source, rules, content.excludedElements, content.transformSnapshotNode);
  expect(content.warnings).toEqual(['1 处嵌入内容无法完整读取，输出中保留占位提示。']);
  expect(clone.querySelector('iframe, video')).toBeNull();
  expect(clone.querySelector('[data-web-printer-placeholder]')).toHaveTextContent('嵌入内容未导出');
  expect(clone).toHaveTextContent('Keep this text');
  expect(source.outerHTML).toBe(original);
});

test('scroll containers and root transforms are normalized only on the detached copy', async () => {
  const root = document.createElement('article');
  root.style.cssText = 'height:100px;max-height:100px;overflow:auto;transform:translate(0px,0px)';
  root.innerHTML = '<p>Loaded content</p>';
  document.body.append(root);
  Object.defineProperties(root, { scrollHeight: { value: 1200 }, clientHeight: { value: 100 } });
  const original = root.outerHTML;
  const content = await plan(root);
  const clone = cloneWithResolvedStyles(root, rules, content.excludedElements, content.transformSnapshotNode);
  expect(clone.style.height).toBe('auto');
  expect(clone.style.maxHeight).toBe('none');
  expect(clone.style.overflow).toBe('visible');
  expect(clone.style.transform).toBe('none');
  expect(content.warnings.join()).toContain('展开 1 处滚动区域');
  expect(root.outerHTML).toBe(original);
});

test('unreadable images do not abort unrelated content and remain visibly marked', async () => {
  const image = jest.spyOn(window, 'Image').mockImplementation(() => {
    const fake = document.createElement('img');
    Object.defineProperty(fake, 'src', { set() { Promise.resolve().then(() => fake.dispatchEvent(new Event('error'))); } });
    return fake;
  });
  try {
    document.body.innerHTML = '<article><p>Keep the article</p><img src="https://example.invalid/broken.png" alt="Product photo" /></article>';
    const root = document.querySelector('article')!;
    const content = await plan(root);
    const clone = cloneWithResolvedStyles(root, rules, content.excludedElements, content.transformSnapshotNode);
    expect(content.resourceExcludedElements).toHaveLength(1);
    expect(clone.querySelector('img')).toBeNull();
    expect(clone).toHaveTextContent('图片未能读取：Product photo');
    expect(clone).toHaveTextContent('Keep the article');
    expect(content.warnings.join()).toContain('1 处图片');
  } finally { image.mockRestore(); }
});

test('virtualized content stays an actionable error because unloaded rows cannot be recovered', async () => {
  document.body.innerHTML = '<article><div aria-rowcount="100"><div role="row">Loaded row</div></div></article>';
  await expect(plan(document.querySelector('article')!)).rejects.toThrow('虚拟列表');
});
