import { copyResolvedStyle } from './snapshot';
import { measureTextLines } from './text-range';

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
