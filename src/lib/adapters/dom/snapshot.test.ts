import { cloneWithResolvedStyles, copyResolvedStyle } from './snapshot';
import { measureTextLines } from './text-range';

test('whole-page body root is retagged as a div so the offscreen capture uses element bounds', () => {
  const body = document.body;
  const section = document.createElement('section');
  section.textContent = '整个页面正文';
  body.appendChild(section);
  try {
    const target = cloneWithResolvedStyles(body);
    expect(target.tagName).not.toBe('BODY');
    expect(target.textContent).toContain('整个页面正文');
  } finally {
    section.remove();
  }
});

test('print root keeps ancestor-provided typography after moving to body', () => {
  const original = document.createElement('div');
  const target = document.createElement('div');
  const style = {
    length: 3,
    item: (i: number) => ['font-size', 'line-height', 'font-family'][i],
    getPropertyValue: (key: string) => ({ 'font-size': '14px', 'line-height': '22px', 'font-family': 'Arial' }[key] || ''),
    getPropertyPriority: () => '',
  };
  const mock = jest.spyOn(window, 'getComputedStyle').mockReturnValue(style as unknown as CSSStyleDeclaration);
  try {
    copyResolvedStyle(original, target);
    expect(target.style.fontSize).toBe('14px');
    expect(target.style.lineHeight).toBe('22px');
    expect(target.style.fontFamily).toBe('Arial');
  } finally {
    mock.mockRestore();
  }
});

test('protects complete line height rather than only the font rectangle', () => {
  const root = document.createElement('div');
  root.style.lineHeight = '22px';
  root.textContent = 'two wrapped lines';
  root.getBoundingClientRect = () => ({ top: 100 } as DOMRect);
  const mock = jest.spyOn(document, 'createRange').mockReturnValue({
    selectNodeContents: jest.fn(),
    getClientRects: () => [
      { top: 104, bottom: 120, height: 16, width: 100 },
      { top: 126, bottom: 142, height: 16, width: 80 },
    ],
  } as unknown as Range);
  try {
    expect(measureTextLines(root)).toEqual([
      { top: 1, bottom: 23 },
      { top: 23, bottom: 45 },
    ]);
  } finally {
    mock.mockRestore();
  }
});

test('snapshot does not turn auto physical/logical dimensions into fixed inline constraints', () => {
  const source = document.createElement('div');
  source.style.minHeight = '40px';
  const target = source.cloneNode(true) as HTMLElement;
  const values: Record<string, string> = {
    height: '80px',
    width: '400px',
    'block-size': '80px',
    'inline-size': '400px',
    'min-height': '40px',
    'font-size': '14px',
  };
  const mock = jest.spyOn(window, 'getComputedStyle').mockReturnValue({
    length: Object.keys(values).length,
    item: (i: number) => Object.keys(values)[i],
    getPropertyValue: (key: string) => values[key],
    getPropertyPriority: () => '',
  } as unknown as CSSStyleDeclaration);
  try {
    copyResolvedStyle(source, target);
    expect(target.style.height).toBe('');
    expect(target.style.width).toBe('');
    expect(target.style.getPropertyValue('block-size')).toBe('');
    expect(target.style.getPropertyValue('inline-size')).toBe('');
    expect(target.style.minHeight).toBe('40px');
    expect(target.style.fontSize).toBe('14px');
  } finally {
    mock.mockRestore();
  }
});


test('snapshot preserves media and table sizes defined by ancestor-dependent CSS', () => {
  const values: Record<string, string> = { width: '640px', height: '210px', 'max-width': '100%', 'min-height': '48px' };
  const mock = jest.spyOn(window, 'getComputedStyle').mockReturnValue({
    length: Object.keys(values).length,
    item: (i: number) => Object.keys(values)[i],
    getPropertyValue: (key: string) => values[key],
    getPropertyPriority: () => '',
  } as unknown as CSSStyleDeclaration);
  try {
    for (const tag of ['img', 'table']) {
      const source = document.createElement(tag);
      const target = source.cloneNode(true) as HTMLElement;
      copyResolvedStyle(source, target);
      expect(target.style.width).toBe('640px');
      expect(target.style.height).toBe('210px');
      expect(target.style.maxWidth).toBe('100%');
    }
    const card = document.createElement('div');
    const cardCopy = card.cloneNode(true) as HTMLElement;
    copyResolvedStyle(card, cardCopy);
    expect(cardCopy.style.width).toBe('');
    expect(cardCopy.style.height).toBe('');
    expect(cardCopy.style.minHeight).toBe('48px');
  } finally {
    mock.mockRestore();
  }
});

test('centered print roots start at the page origin while retaining internal margins and padding', () => {
  const source = document.createElement('article');
  source.style.cssText = 'margin:24px 288px; padding:36px 44px; font-size:17px;';
  source.innerHTML = '<p style="margin:12px 16px;line-height:34px">Long article</p>';
  source.getBoundingClientRect = () => ({ width: 800 } as DOMRect);
  const clone = cloneWithResolvedStyles(source);
  const style = window.getComputedStyle(clone);
  expect([style.marginTop, style.marginRight, style.marginBottom, style.marginLeft]).toEqual(['0px', '0px', '0px', '0px']);
  expect(clone.style.width).toBe('800px');
  expect(clone.style.padding).toBe('36px 44px');
  expect(clone.querySelector('p')!.style.margin).toBe('12px 16px');
  expect(source.style.margin).toBe('24px 288px');
  expect(source.style.fontSize).toBe(clone.style.fontSize);
});

test('configured and class-based ignore selectors remove whole subtrees before layout', () => {
  const source = document.createElement('div');
  source.innerHTML = '<div class="filter"><img src="broken.png">excluded</div><p class="print-ignore">excluded</p><p>retained</p>';
  const clone = cloneWithResolvedStyles(source, [
    { selector: '.filter, .print-ignore', result: { kind: 'ignore' } },
  ]);
  expect(clone.querySelector('img')).toBeNull();
  expect(clone.textContent).toBe('retained');
  expect(source.querySelector('img')).not.toBeNull();
});

test('unreadable canvas fails explicitly instead of exporting a blank placeholder', () => {
  const root = document.createElement('div');
  root.innerHTML = '<canvas></canvas>';
  const read = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new Error('SecurityError'); });
  try { expect(() => cloneWithResolvedStyles(root)).toThrow('画布内容无法读取'); }
  finally { read.mockRestore(); }
});

test('legacy ignore attributes and classes still disappear from snapshots', () => {
  const root = document.createElement('div');
  root.innerHTML = '<p data-pdf-ignore="true">old attribute</p><p class="pdf-ignore">old class</p><p>keep</p>';
  expect(cloneWithResolvedStyles(root).textContent).toBe('keep');
});

test('selected exclusions are omitted without adding attributes or mutating source DOM', () => {
  const root=document.createElement('article');root.innerHTML='<p>Keep</p><aside><img src="blocked.png">Exclude</aside><script>window.untrusted=true</script>';
  const aside=root.querySelector('aside')!;const before=root.outerHTML;
  const clone=cloneWithResolvedStyles(root,undefined,[aside]);
  expect(clone.querySelector('aside')).toBeNull();expect(clone.querySelector('script')).toBeNull();expect(clone.textContent).toBe('Keep');expect(root.outerHTML).toBe(before);
});

test('root external absolute placement is normalized without moving the original page',()=>{
  const root=document.createElement('section');root.style.cssText='position:absolute;inset:100px 40px auto 200px;float:right;padding:24px';
  const before=root.getAttribute('style');const clone=cloneWithResolvedStyles(root);
  expect(clone.style.position).toBe('relative');expect(clone.style.inset).toBe('auto');expect(clone.style.cssFloat).toBe('none');expect(clone.style.padding).toBe('24px');expect(root.getAttribute('style')).toBe(before);
});

test('sticky becomes normal-flow relative and fixed becomes snapshot-local without source mutations',()=>{
  const root=document.createElement('article');root.innerHTML='<header style="position:sticky!important;top:40px!important">Header</header><aside style="position:fixed;left:60px;top:124px;width:120px;height:32px">Pin</aside>';
  root.getBoundingClientRect=()=>({left:20,top:100,width:800,height:1000} as DOMRect);
  root.querySelector('aside')!.getBoundingClientRect=()=>({left:60,top:124,width:120,height:32} as DOMRect);
  const original=root.outerHTML;const clone=cloneWithResolvedStyles(root);
  expect(clone.querySelector('header')!.style.position).toBe('relative');expect(clone.querySelector('header')!.style.top).not.toBe('40px');expect(clone.querySelector('header')!.style.inset).toBe('auto');
  const pin=clone.querySelector('aside')!;expect(pin.style.position).toBe('absolute');expect(pin.style.left).toBe('40px');expect(pin.style.top).toBe('24px');expect(pin.style.width).toBe('120px');expect(root.outerHTML).toBe(original);
});
