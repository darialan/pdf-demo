import { CHANNEL, Command, PrinterState } from '../shared/protocol';
export function createClient(
  tabId: number,
  onState: (state: PrinterState) => void,
  onDisconnect: () => void,
) {
  const port = chrome.tabs.connect(tabId, { name: CHANNEL, frameId: 0 });
  let state: PrinterState | undefined;
  let closed = false;
  const pending = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const close = () => {
    if (closed) return;
    closed = true;
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error('页面连接已断开，请重新连接。'));
    }
    pending.clear();
  };
  port.onMessage.addListener((message) => {
    if (message?.channel !== CHANNEL) return;
    if (message.state) {
      state = message.state;
      onState(state!);
    }
    if (message.requestId) {
      const item = pending.get(message.requestId);
      if (!item) return;
      clearTimeout(item.timer);
      pending.delete(message.requestId);
      if (message.ok) item.resolve(message.data);
      else item.reject(new Error(message.error));
    }
  });
  port.onDisconnect.addListener(() => {
    const intentional = closed;
    close();
    if (!intentional) onDisconnect();
  });
  return {
    request(command: Command, payload?: Record<string, unknown>): Promise<any> {
      if (closed)
        return Promise.reject(new Error('页面连接已断开，请重新连接。'));
      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => {
            pending.delete(requestId);
            reject(new Error('处理超时，请取消后重试。'));
          },
          command === 'export' ? 600000 : 60000,
        );
        pending.set(requestId, { resolve, reject, timer });
        port.postMessage({
          channel: CHANNEL,
          sessionId: state?.sessionId || '',
          requestId,
          revision: state?.revision || 0,
          command,
          payload,
        });
      });
    },
    close() {
      close();
      port.disconnect();
    },
  };
}
