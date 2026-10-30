import { waitForResources } from './resource-loader';

test('abort interrupts a stuck image decoder and removes the abort listener', async () => {
  const host = document.createElement('div');
  host.innerHTML = '<img alt="unavailable">';
  host.querySelector('img')!.decode = () => new Promise(() => {});
  const abort = new AbortController();
  const remove = jest.spyOn(abort.signal, 'removeEventListener');
  const result = waitForResources(host, abort.signal);
  abort.abort();
  await expect(result).rejects.toThrow('取消');
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});

test('resource timeout is bounded even when decoding never resolves', async () => {
  jest.useFakeTimers();
  const host = document.createElement('div');
  host.innerHTML = '<img alt="unavailable">';
  host.querySelector('img')!.decode = () => new Promise(() => {});
  const result = expect(waitForResources(host)).rejects.toThrow('超时');
  jest.advanceTimersByTime(15000);
  await result;
  jest.useRealTimers();
});
