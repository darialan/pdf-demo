import { clearPageBreaks, visualizePageBreaks } from './page-break-overlay';

beforeEach(() => {
  clearPageBreaks();
});

afterEach(() => {
  clearPageBreaks();
});

test('visualizePageBreaks 能够全覆盖标记 atomic, splittable 与 ignore 规则', () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <h2 style="width: 200px; height: 30px;">标题文本</h2>
    <table>
      <tbody>
        <tr style="width: 200px; height: 30px;"><td>表格行1</td></tr>
        <tr style="width: 200px; height: 30px;"><td>表格行2</td></tr>
      </tbody>
    </table>
    <p style="width: 200px; height: 40px;">段落说明，可按行自由切分</p>
    <div data-pdf-ignore="true" style="width: 200px; height: 20px;">忽略按钮</div>
  `;
  document.body.appendChild(container);

  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
  Array.from(container.querySelectorAll('*')).forEach((node, i) => {
    (node as HTMLElement).getBoundingClientRect = () => ({
      left: 10,
      top: 10 + i * 40,
      width: 200,
      height: 35,
    } as DOMRect);
  });

  const stats = visualizePageBreaks([0, 150, 300], container);

  expect(stats.atomic).toBe(3);      // 1 个 h2 标题 + 2 个 tr (atomic 不可分割)
  expect(stats.splittable).toBe(1); // p 段落文本流 (splittable 可分割)
  expect(stats.ignore).toBe(1);     // 忽略元素 (ignore 不打印)

  // 页面上存在调试遮罩层
  const debugNodes = container.querySelectorAll('[data-pdf-debug="true"]');
  expect(debugNodes.length).toBeGreaterThan(0);
  const labels = Array.from(debugNodes).flatMap(node => Array.from(node.querySelectorAll('span')).map(span => span.textContent));
  expect(labels).toEqual(expect.arrayContaining(['atomic', 'splittable', 'ignore']));
  expect(labels.some(label => label?.includes('page-break'))).toBe(true);

  // 清除后完全移除
  clearPageBreaks();
  expect(container.querySelectorAll('[data-pdf-debug="true"]')).toHaveLength(0);

  container.remove();
});

test('a custom splittable rule overrides native table atomic rules and cleanup is scoped', () => {  const first = document.createElement('div');
  const second = document.createElement('div');
  first.innerHTML = '<table><tbody><tr class="can-split"><td>text</td></tr></tbody></table>';
  second.innerHTML = '<h1>other document</h1>';
  document.body.append(first, second);
  for (const root of [first, second]) {
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 100 } as DOMRect);
    root.querySelectorAll('*').forEach(node => { node.getBoundingClientRect = root.getBoundingClientRect; });
  }
  const stats = visualizePageBreaks([0, 50], first, [{ selector: '.can-split', result: { kind: 'container' } }]);
  expect(stats.atomic).toBe(0);
  visualizePageBreaks([0], second);
  expect(first.querySelector('[data-pdf-debug]')).not.toBeNull();
  clearPageBreaks(first);
  expect(first.querySelector('[data-pdf-debug]')).toBeNull();
  expect(second.querySelector('[data-pdf-debug]')).not.toBeNull();
  clearPageBreaks(second);
  first.remove(); second.remove();
});

test('媒体包装段落（<p> 里只有一张图）标为 atomic，而不是 splittable', () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <p style="height: 120px;"><img data-pdf-atomic="true" alt="结果图" style="height: 120px;"></p>
    <p style="height: 40px;">普通段落，可被分页线切断</p>
  `;
  document.body.appendChild(container);
  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
  Array.from(container.querySelectorAll('*')).forEach(node => {
    (node as HTMLElement).getBoundingClientRect = () => ({ left: 10, top: 10, width: 200, height: 35 } as DOMRect);
  });

  const stats = visualizePageBreaks([0, 200], container);

  // 只保护图片本身；包图片的 p 没有正文，不该被标成可分割正文流
  expect(stats.atomic).toBe(1);
  expect(stats.splittable).toBe(1);

  const badges = Array.from(container.querySelectorAll('[data-pdf-debug="true"] span'))
    .map(span => span.textContent);
  expect(badges.filter(text => text === 'atomic')).toHaveLength(1);
  expect(badges.filter(text => text === 'splittable')).toHaveLength(1);

  container.remove();
});

test('标记层的 z-index 保持在吸顶工具栏与站点导航之下', () => {
  const container = document.createElement('div');
  container.innerHTML = '<p style="height: 40px;">段落</p>';
  document.body.appendChild(container);
  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
  container.querySelectorAll('*').forEach(node => {
    (node as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 40 } as DOMRect);
  });

  visualizePageBreaks([0, 300], container);

  const debugNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-debug="true"]'));
  const layerOf = (node: HTMLElement) => Number(node.style.zIndex || node.querySelector<HTMLElement>('span')?.style.zIndex || 0);
  const top = Math.max(...debugNodes.map(layerOf));
  // 工具栏 z-index 20、站点导航 z-index 100：标记必须更低，否则会把它们盖住
  expect(top).toBeLessThan(20);

  container.remove();
});
