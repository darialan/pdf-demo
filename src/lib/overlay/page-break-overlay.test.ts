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

  // 清除后完全移除
  clearPageBreaks();
  expect(container.querySelectorAll('[data-pdf-debug="true"]')).toHaveLength(0);

  container.remove();
});
