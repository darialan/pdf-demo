import { prepareContent } from './prepare-content';
import { hasContentChanges, sourceBaseline } from './mutations';
import {
  createPrintSession,
  PrintSession,
} from '../../src/lib/application/print-session';
import { extensionPrintRules } from '../shared/print-presets';
import {
  visualizePageBreaks,
  clearPageBreaks,
} from '../../src/lib/overlay/page-break-overlay';
import {
  CHANNEL,
  Envelope,
  PrinterState,
  defaultSettings,
  isEnvelope,
  userError,
  validateSettings,
} from '../shared/protocol';

// Injection is repeatable. The isolated-world sentinel is invisible to page JS.
const runtime = globalThis as typeof globalThis & {
  __webPrinterInstalled?: boolean;
};
if (!runtime.__webPrinterInstalled) {
  runtime.__webPrinterInstalled = true;
  install();
}
function install() {
  const sessionId = crypto.randomUUID();
  let state: PrinterState = {
    sessionId,
    revision: 0,
    phase: 'idle',
    summary: '尚未选择内容',
    pages: 0,
    excluded: 0,
    warnings: [],
    inspecting: false,
  };
  let root: HTMLElement | undefined;
  let excluded: HTMLElement[] = [];
  let session: PrintSession | undefined;
  let controller = new AbortController();
  let exportController: AbortController | undefined;
  let epoch = 0;
  let changedDuringExport = false;
  let hasViewportPositioning = false;
  let queue: Promise<unknown> = Promise.resolve();
  let pickerCleanup = () => {};
  let lastSettings: unknown;
  let autoTimer: ReturnType<typeof setTimeout> | undefined;
  let lastAutoPrepareAt = 0;
  // Backoff bookkeeping: a page that churns forever (animations, scroll
  // reveals) must not trigger endless full-page re-snapshots. Consecutive
  // auto-prepares back off exponentially; a quiet page resets the streak.
  let autoPrepareStreak = 0;
  let lastInvalidateAt = 0;
  let autoPreparing = false;
  let pendingChange = false;
  let observeCleanup = () => {};
  const ports = new Set<chrome.runtime.Port>();
  const rules = extensionPrintRules();
  const snapshotState = () => ({ ...state, excluded: excluded.length });
  const broadcast = () => {
    for (const port of ports) {
      try {
        port.postMessage({
          channel: CHANNEL,
          event: 'state',
          state: snapshotState(),
        });
      } catch {}
    }
  };
  const publish = (patch: Partial<PrinterState>) => {
    state = { ...state, ...patch };
    broadcast();
  };
  const clearInspection = () => {
    if (root) clearPageBreaks(root);
    state.inspecting = false;
  };
  const disposeLayout = () => {
    epoch++;
    controller.abort();
    controller = new AbortController();
    session?.dispose();
    session = undefined;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = undefined; }
    clearInspection();
  };
  const refreshInspection = () => {
    if (!root || !session) return;
    try {
      // Source and print coordinates only coincide when nothing was removed/reflowed.
      const sourceHeight = root.getBoundingClientRect().height;
      const comparable = Boolean(
        !excluded.length &&
          !hasViewportPositioning &&
          Math.abs(
            sourceHeight - session.layout.root.getBoundingClientRect().height,
          ) < 0.5,
      );
      visualizePageBreaks(
        comparable ? session!.layout.pages.map((p) => p.start) : [],
        root,
        rules,
        excluded,
      );
      publish({
        inspectionError: comparable
          ? undefined
          : '已显示内容规则；排除或重排后的 page-break 请在预览查看。',
      });
    } catch (error) {
      publish({ inspectionError: userError(error) });
    }
  };
  /**
   * Content changes auto-refresh the session instead of demanding a manual
   * regeneration. Lazy-loaded articles mutate as the user scrolls through them
   * (already watch()ed pages churn constantly), so a hard "stale" wall made the
   * tool feel broken there. Auto-prepare stays serial via the command queue and
   * throttles itself; only export-time changes still drop to a manual refresh.
   */
  const scheduleAutoRefresh = () => {
    if (autoTimer) return;
    autoTimer = setTimeout(autoRefresh, 800);
  };
  const autoRefresh = () => {
    autoTimer = undefined;
    if (!root?.isConnected || !lastSettings) return;
    if (state.phase === 'exporting') return;
    // A change was detected just before an in-flight prepare started; wait it
    // out and refresh afterwards so the mutation is not lost.
    if (state.phase === 'preparing') {
      autoTimer = setTimeout(autoRefresh, 800);
      return;
    }
    if (state.phase !== 'ready' && state.phase !== 'success') return;
    if (Date.now() - lastInvalidateAt > 2000) autoPrepareStreak = 0;
    const backoff = Math.min(1500 * 2 ** autoPrepareStreak, 12000);
    const sinceLast = Date.now() - lastAutoPrepareAt;
    if (sinceLast < backoff) {
      autoTimer = setTimeout(autoRefresh, Math.max(200, backoff - sinceLast));
      return;
    }
    autoPrepareStreak++;
    lastAutoPrepareAt = Date.now();
    const execute = async () => {
      if (!root?.isConnected || !lastSettings) return;
      if (!['ready', 'success'].includes(state.phase)) return;
      autoPreparing = true;
      publish({
        phase: 'preparing',
        error: undefined,
        inspectionError: undefined,
        progress: undefined,
        lastExport: undefined,
        pages: 0,
      });
      try {
        await run({
          channel: CHANNEL,
          sessionId,
          requestId: crypto.randomUUID(),
          revision: state.revision,
          command: 'prepare',
          payload: { settings: lastSettings },
        });
      } catch (error) {
        publish({ phase: 'error', error: userError(error) });
      } finally {
        autoPreparing = false;
      }
    };
    queue = queue.then(execute, execute);
  };
  const watch = () => {
    observeCleanup();
    if (!root) return;
    const target = root;
    const width = target.getBoundingClientRect().width;
    const invalidate = () => {
      lastInvalidateAt = Date.now();
      if (state.phase === 'exporting') {
        changedDuringExport = true;
        return;
      }
      // While a prepare is in flight there is no session yet; remember the
      // change so the freshly prepared result refreshes again immediately.
      if (!session) {
        if (state.phase === 'preparing') pendingChange = true;
        return;
      }
      scheduleAutoRefresh();
    };
    const baseline = sourceBaseline(target);
    const mutation = new MutationObserver((records) => {
      if (hasContentChanges(records, baseline)) invalidate();
    });
    mutation.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    // Also detect removal/replacement of the selected root from outside its subtree.
    const detachment = new MutationObserver(() => {
      if (!target.isConnected) invalidate();
    });
    detachment.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    const resize = new ResizeObserver(() => {
      if (Math.abs(target.getBoundingClientRect().width - width) > 0.5)
        invalidate();
    });
    resize.observe(target);
    target.addEventListener('input', invalidate, true);
    target.addEventListener('change', invalidate, true);
    observeCleanup = () => {
      mutation.disconnect();
      detachment.disconnect();
      resize.disconnect();
      target.removeEventListener('input', invalidate, true);
      target.removeEventListener('change', invalidate, true);
    };
  };
  const chooseRoot = (target: HTMLElement) => {
    observeCleanup();
    disposeLayout();
    root = target;
    excluded = [];
    publish({
      phase: 'idle',
      revision: state.revision + 1,
      summary:
        target.querySelector('h1,h2')?.textContent?.trim().slice(0, 60) ||
        target.getAttribute('aria-label') ||
        (target === document.body
          ? document.title
          : target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60)) ||
        '所选区域',
      pages: 0,
      error: undefined,
      lastExport: undefined,
      warnings: [],
    });
  };
  const pick = (mode: 'select' | 'exclude') => {
    if (mode === 'exclude' && !root) throw new Error('请先选择打印区域');
    pickerCleanup();
    const host = document.createElement('div');
    host.setAttribute('data-web-printer-ui', 'true');
    host.setAttribute('data-print-debug', 'true');
    host.style.cssText =
      'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'closed' });
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;border:2px solid #23765c;background:#23765c14;box-sizing:border-box;pointer-events:none;';
    const label = document.createElement('div');
    label.textContent =
      mode === 'select'
        ? '点击选择打印区域 · Esc 退出'
        : '点击排除此内容 · Esc 退出';
    label.style.cssText =
      'position:fixed;top:12px;left:12px;background:#17221e;color:white;padding:10px 14px;border-radius:6px;font:14px system-ui;';
    shadow.append(box, label);
    document.documentElement.append(host);
    let current: HTMLElement | null = null;
    const move = (e: MouseEvent) => {
      let node = e.target instanceof Element ? e.target : null;
      if (node && !(node instanceof HTMLElement))
        node = node.closest('svg')?.parentElement || node.parentElement;
      current = node instanceof HTMLElement ? node : null;
      if (
        !current ||
        current.closest(
          '[data-web-printer-ui],[data-print-snapshot],[data-print-debug]',
        ) ||
        (mode === 'exclude' && (current === root || !root?.contains(current)))
      ) {
        current = null;
        box.style.display = 'none';
        return;
      }
      const r = current.getBoundingClientRect();
      Object.assign(box.style, {
        display: 'block',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
    };
    const finish = () => {
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      host.remove();
      pickerCleanup = () => {};
    };
    const click = (e: MouseEvent) => {
      move(e);
      if (!current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const target = current;
      finish();
      if (mode === 'select') chooseRoot(target);
      else {
        disposeLayout();
        if (!excluded.includes(target)) excluded.push(target);
        publish({
          phase: 'idle',
          revision: state.revision + 1,
          error: undefined,
          pages: 0,
        });
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
        publish({ phase: session ? 'ready' : 'idle' });
      }
    };
    document.addEventListener('mousemove', move, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);
    pickerCleanup = finish;
    publish({ phase: 'selecting', error: undefined });
  };
  async function run(message: Envelope) {
    const payload = message.payload || {};
    if (message.command === 'status') return snapshotState();
    if (message.sessionId !== sessionId)
      throw new Error('页面已刷新，请重新连接');
    if (
      message.command !== 'cancel' &&
      message.command !== 'dispose' &&
      message.revision !== state.revision
    )
      throw new Error('内容已变化，请重新生成预览。');
    if (
      state.phase === 'exporting' &&
      !['cancel', 'dispose', 'status'].includes(message.command)
    )
      throw new Error('正在导出，请等待完成或取消导出');
    switch (message.command) {
      case 'select':
        pick('select');
        break;
      case 'whole':
        pickerCleanup();
        chooseRoot(document.body);
        break;
      case 'parent':
        if (root?.parentElement && root !== document.body)
          chooseRoot(root.parentElement);
        break;
      case 'exclude':
        pick('exclude');
        break;
      case 'undo':
        if (excluded.length) {
          disposeLayout();
          excluded.pop();
          publish({
            phase: 'idle',
            revision: state.revision + 1,
            error: undefined,
            pages: 0,
          });
        }
        break;
      case 'prepare': {
        if (!root?.isConnected)
          throw new Error('找不到有效的打印区域，请重新选择');
        const settings = validateSettings(
          payload.settings || defaultSettings(),
        );
        lastSettings = settings;
        // A user-initiated prepare is intent: the backoff streak starts over.
        if (!autoPreparing) autoPrepareStreak = 0;
        pendingChange = false;
        const keepInspection = state.inspecting;
        observeCleanup();
        disposeLayout();
        const runId = epoch;
        publish({
          phase: 'preparing',
          error: undefined,
          inspectionError: undefined,
          progress: undefined,
          lastExport: undefined,
          pages: 0,
        });
        let prepared: PrintSession;
        let content: Awaited<ReturnType<typeof prepareContent>>;
        try {
          content = await prepareContent(root, excluded, rules, controller.signal);
          hasViewportPositioning = content.hasViewportPositioning;
          prepared = await createPrintSession({
            element: root,
            settings,
            excludedElements: content.excludedElements,
            resourceExcludedElements: content.resourceExcludedElements,
            transformSnapshotNode: content.transformSnapshotNode,
            rules,
            signal: controller.signal,
          });
        } catch (error) {
          if (runId !== epoch) return snapshotState();
          throw error;
        }
        if (runId !== epoch) {
          prepared.dispose();
          return;
        }
        session = prepared;
        watch();
        publish({
          phase: 'ready',
          pages: session.layout.pages.length,
          preparedMs: session.preparedMs,
          preparedAt: Date.now(),
          warnings: [
            ...(root === document.body ? ['整个页面仅包含当前已加载的主文档内容。'] : []),
            ...content!.warnings,
          ],
        });
        if (keepInspection && state.inspecting === false) {
          publish({ inspecting: true });
          refreshInspection();
        }
        // Content changed while this prepare was running: the new session is
        // already outdated, refresh it once more right away.
        if (pendingChange) {
          pendingChange = false;
          scheduleAutoRefresh();
        }
        break;
      }
      case 'thumbnail': {
        if (!session) throw new Error('请先生成预览');
        const current = session;
        const revision = state.revision;
        const image = await current.thumbnail(Number(payload.index));
        if (session !== current || revision !== state.revision)
          throw new Error('内容已变化，请重新生成预览。');
        return { image, index: Number(payload.index) };
      }
      case 'inspect': {
        observeCleanup();
        if (!root?.isConnected) throw new Error('请先选择有效的打印区域');
        if (state.inspecting) {
          clearInspection();
          publish({ inspectionError: undefined });
          watch();
          break;
        }
        refreshInspection();
        publish({ inspecting: true });
        watch();
        break;
      }
      case 'export': {
        if (!session || state.phase === 'stale')
          throw new Error('请先重新生成预览');
        if (payload.format !== 'pdf' && payload.format !== 'png')
          throw new Error('请选择 PDF 或 PNG 格式');
        exportController = new AbortController();
        changedDuringExport = false;
        const current = session;
        const id = epoch;
        publish({
          phase: 'exporting',
          error: undefined,
          progress: { completed: 0, total: state.pages },
        });
        try {
          const result = await current.exportDocument({
            format: payload.format,
            filename:
              document.title
                .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
                .slice(0, 100) || 'Web Printer',
            download: true,
            signal: exportController.signal,
            onProgress: (completed, total) => {
              if (epoch === id) publish({ progress: { completed, total } });
            },
          });
          if (epoch === id)
            publish({
              phase: 'success',
              progress: undefined,
              lastExport: {
                format: payload.format,
                pages: result.pages,
                bytes: result.bytes,
                totalMs: result.totalMs,
              },
              error: undefined,
            });
        } catch (error) {
          if (epoch === id) {
            if (exportController.signal.aborted)
              publish({
                phase: 'ready',
                progress: undefined,
                error: undefined,
              });
            else
              publish({
                phase: 'error',
                progress: undefined,
                error: userError(error),
              });
          }
        } finally {
          exportController = undefined;
          if (changedDuringExport && session) {
            observeCleanup();
            disposeLayout();
            publish({
              phase: 'stale',
              revision: state.revision + 1,
              error: '原页面已变化，继续导出前请重新生成预览。',
            });
          }
        }
        break;
      }
      case 'cancel':
        exportController?.abort();
        if (state.phase === 'preparing') {
          disposeLayout();
          publish({ phase: 'idle', progress: undefined });
        } else if (state.phase === 'selecting') {
          pickerCleanup();
          publish({ phase: session ? 'ready' : 'idle' });
        }
        break;
      case 'dispose':
        pickerCleanup();
        observeCleanup();
        exportController?.abort();
        disposeLayout();
        publish({ phase: 'idle', pages: 0, progress: undefined });
        break;
    }
    return snapshotState();
  }
  chrome.runtime.onConnect.addListener((port) => {
    if (
      port.name !== CHANNEL ||
      port.sender?.id !== chrome.runtime.id ||
      !port.sender.url?.startsWith(chrome.runtime.getURL(''))
    )
      return;
    ports.add(port);
    broadcast();
    port.onMessage.addListener((value) => {
      if (!isEnvelope(value)) return;
      const message = value;
      const execute = async () => {
        try {
          const data = await run(message);
          port.postMessage({
            channel: CHANNEL,
            requestId: message.requestId,
            ok: true,
            data,
            state: snapshotState(),
          });
        } catch (error) {
          const messageText = userError(error);
          if (
            message.command === 'prepare' &&
            message.sessionId === sessionId &&
            message.revision === state.revision
          )
            publish({ phase: 'error', error: messageText });
          try {
            port.postMessage({
              channel: CHANNEL,
              requestId: message.requestId,
              ok: false,
              error: messageText,
              state: snapshotState(),
            });
          } catch {}
        }
      };
      if (['cancel', 'dispose', 'status'].includes(message.command))
        void execute();
      else queue = queue.then(execute, execute);
    });
    port.onDisconnect.addListener(() => {
      ports.delete(port);
      if (!ports.size) {
        pickerCleanup();
        observeCleanup();
        exportController?.abort();
        disposeLayout();
        state = { ...state, phase: 'idle', pages: 0, progress: undefined };
      }
    });
  });
  window.addEventListener('pagehide', () => {
    pickerCleanup();
    observeCleanup();
    exportController?.abort();
    disposeLayout();
  });
}
