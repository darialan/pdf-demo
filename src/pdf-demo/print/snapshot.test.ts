import { copyResolvedStyle, measureTextLines } from './snapshot';
test('print root keeps ancestor-provided typography after moving to body', () => {
  const original = document.createElement('div');
  const target = document.createElement('div');
  const style = { length: 3, item: (i: number) => ['font-size', 'line-height', 'font-family'][i], getPropertyValue: (key: string) => ({ 'font-size': '14px', 'line-height': '22px', 'font-family': 'Arial' }[key] || ''), getPropertyPriority: () => '' };
  const mock = jest.spyOn(window, 'getComputedStyle').mockReturnValue(style as unknown as CSSStyleDeclaration);
  try {
    copyResolvedStyle(original, target);
    expect(target.style.fontSize).toBe('14px');
    expect(target.style.lineHeight).toBe('22px');
    expect(target.style.fontFamily).toBe('Arial');
  } finally { mock.mockRestore(); }
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
    expect(measureTextLines(root)).toEqual([{ top: 1, bottom: 23 }, { top: 23, bottom: 45 }]);
  } finally { mock.mockRestore(); }
});
