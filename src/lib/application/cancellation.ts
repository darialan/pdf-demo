export function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('导出已取消');
}
