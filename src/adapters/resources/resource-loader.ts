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
  } finally {
    clearTimeout(timeout!);
    signal?.removeEventListener('abort', abort);
  }
}
