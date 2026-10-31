import {
  sourceBaseline,
  hasContentChanges,
} from '../../../extension/content/mutations';
async function changes(root: HTMLElement, edit: () => void) {
  const baseline = sourceBaseline(root);
  let result: MutationRecord[] = [];
  const observer = new MutationObserver((records) => {
    result.push(...records);
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  edit();
  await Promise.resolve();
  observer.disconnect();
  return hasContentChanges(result, baseline);
}
beforeEach(() => {
  document.body.innerHTML = '<article><p>Original</p></article>';
});
test('ignores html2canvas temporary bound/font probes, including their subtree mutations', async () => {
  expect(
    await changes(document.body, () => {
      const div = document.createElement('div');
      document.body.append(div);
      const span = document.createElement('span');
      div.append(span);
      span.textContent = 'measurement';
      span.style.fontSize = '16px';
      div.remove();
      const bound = document.createElement('boundtest');
      document.body.append(bound);
      bound.remove();
    }),
  ).toBe(false);
});
test('retained additions, source edits, and permanent source removal must invalidate', async () => {
  expect(
    await changes(document.body, () =>
      document.body.append(document.createElement('p')),
    ),
  ).toBe(true);
  expect(
    await changes(document.body, () => {
      document.querySelector('p')!.textContent = 'Updated';
    }),
  ).toBe(true);
  expect(
    await changes(document.body, () => {
      const article = document.querySelector('article')!;
      article.remove();
      document.body.append(article);
      article.remove();
    }),
  ).toBe(true);
});
test('own snapshot, overlay and capture iframe do not invalidate a whole-page selection', async () => {
  expect(
    await changes(document.body, () => {
      const host = document.createElement('div');
      host.setAttribute('data-print-snapshot', 'true');
      document.body.append(host);
      host.innerHTML = '<p>Print-only copy</p>';
      const iframe = document.createElement('iframe');
      iframe.className = 'html2canvas-container';
      document.body.append(iframe);
      iframe.remove();
      host.remove();
    }),
  ).toBe(false);
});
