/**
 * Wait for one settle pass of layout-affecting async work that `img.decode()`/`fonts.ready`
 * cannot observe: component libraries (e.g. Ant Design Table) that measure their container via
 * `ResizeObserver` and correct column widths on a later frame after initial mount. Without this,
 * `planDocument` can measure the offscreen clone one frame too early, producing row heights that
 * disagree with the live DOM once its own ResizeObserver settles — surfacing as a false
 * "分页预览与原页面布局不一致" validation failure.
 * Two rAF ticks cover the common ResizeObserver dispatch pattern (initial callback + one correction
 * pass); the trailing microtask flush lets any React state update from that callback commit and repaint.
 */
async function waitForLayoutSettle(signal?: AbortSignal) {
  for (let i = 0; i < 2; i++) {
    if (signal?.aborted) throw new Error('导出已取消');
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
  await new Promise(resolve => setTimeout(resolve, 0));
}

export async function waitForResources(host: HTMLElement, signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('导出已取消');
  let timeout: ReturnType<typeof setTimeout>;
  let abort: () => void = () => {};
  const guard = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('字体或图片加载超时，请稍后重试')), 15000);
    abort = () => reject(new Error('导出已取消'));
    signal?.addEventListener('abort', abort, { once: true });
  });
  try {
    await Promise.race([
      guard,
      Promise.all([
        document.fonts?.ready,
        ...Array.from(host.querySelectorAll('img')).map(async img => {
          try {
            await img.decode();
          } catch {
            throw new Error(`图片加载失败：${img.alt || '未命名图片'}`);
          }
          if (!img.naturalWidth) throw new Error(`图片内容为空：${img.alt || '未命名图片'}`);
        }),
      ]),
    ]);
    if (signal?.aborted) throw new Error('导出已取消');
    await waitForLayoutSettle(signal);
  } finally {
    clearTimeout(timeout!);
    signal?.removeEventListener('abort', abort);
  }
}
