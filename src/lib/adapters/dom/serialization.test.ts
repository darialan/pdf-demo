import { serializePrintSnapshot } from './snapshot';

test('passive HTML preview preserves edited form state and removes inline handlers', () => {
  const root = document.createElement('div');
  root.innerHTML = '<input value="old" onchange="window.bad=true"><textarea>old</textarea><select><option>one</option><option>two</option></select><input type="checkbox"><img onerror="window.bad=true">';
  root.querySelector('input')!.value = 'new';
  root.querySelector('textarea')!.value = 'edited note';
  root.querySelector('select')!.selectedIndex = 1;
  root.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked = true;
  const output = document.createElement('div');
  output.innerHTML = serializePrintSnapshot(root);
  expect(output.querySelector('input')!.value).toBe('new');
  expect(output.querySelector('textarea')!.value).toBe('edited note');
  expect(output.querySelector('select')!.value).toBe('two');
  expect(output.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);
  expect(output.querySelector('[onchange], [onerror]')).toBeNull();
  expect(output.querySelector('input')).toHaveAttribute('tabindex', '-1');
});

test('preview ID namespaces preserve SVG paint references without duplicating source IDs', () => {
  const { namespacePreviewHtml } = require('./snapshot');
  const html = '<div id="source"><label for="field">Label</label><input id="field"><svg><defs><linearGradient id="paint"></linearGradient></defs><rect fill="url(#paint)"></rect><use href="#paint"></use></svg></div>';
  const scoped = namespacePreviewHtml(html, 'page-1');
  expect(scoped).toContain('id="page-1-source"');
  expect(scoped).toContain('for="page-1-field"');
  expect(scoped).toContain('url(#page-1-paint)');
  expect(scoped).toContain('href="#page-1-paint"');
  expect(scoped).not.toContain('id="source"');
});

test('a selected canvas root is serialized as an image too', () => {
  const canvas = document.createElement('canvas');
  const read = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
  try { expect(serializePrintSnapshot(canvas)).toMatch(/^<img /); }
  finally { read.mockRestore(); }
});
