import html2canvas from 'html2canvas';
import { createPageCapture } from './page-capture';

jest.mock('html2canvas', () => jest.fn());

test('each page clones only its snapshot and head resources, excluding source and preview copies', async () => {
  document.head.innerHTML = '<style>p { color: black; }</style>';
  const source = document.createElement('article');
  const preview = document.createElement('aside');
  const host = document.createElement('div');
  host.innerHTML = '<article><p>print content</p><span data-pdf-debug>marker</span></article>';
  const root = host.firstElementChild as HTMLElement;
  document.body.append(source, preview, host);
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 1000;
  (html2canvas as jest.Mock).mockResolvedValue(canvas);
  const renderer = createPageCapture(800);
  await renderer.capture(root, 0, 1000);
  const { ignoreElements, scale, width, height } = (html2canvas as jest.Mock).mock.calls[0][1];
  expect(ignoreElements(source)).toBe(true);
  expect(ignoreElements(preview)).toBe(true);
  expect(ignoreElements(host)).toBe(false);
  expect(ignoreElements(root)).toBe(false);
  expect(ignoreElements(root.querySelector('p'))).toBe(false);
  expect(ignoreElements(document.head.querySelector('style'))).toBe(false);
  expect(ignoreElements(root.querySelector('[data-pdf-debug]'))).toBe(true);
  expect(scale * scale * width * height).toBeLessThanOrEqual(8_000_000);
  renderer.dispose();
  expect(canvas.width).toBe(0);
  expect(canvas.height).toBe(0);
  source.remove(); preview.remove(); host.remove();
});
