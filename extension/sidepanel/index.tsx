import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PAPER_PRESETS,
  getPresetUnit,
  PX_PER_MM,
  resolvePaper,
} from '../../src/lib/core/geometry/paper';
import { Paper, PrintSettings } from '../../src/lib/core/types';
import {
  CHANNEL,
  Command,
  PrinterState,
  defaultSettings,
  userError,
  validateSettings,
} from '../shared/protocol';
import { createClient } from './client';
import './style.css';
const labels: Record<Paper, string> = {
  a4: 'A4',
  a3: 'A3',
  a5: 'A5',
  letter: 'Letter',
  'card-3x4': '图片 · 3:4',
  'card-4x5': '图片 · 4:5',
  'square-1x1': '图片 · 1:1',
  'story-9x16': '图片 · 9:16',
  'ecom-750x1000': '电商 · 750 × 1000',
  custom: '自定义',
};
function App() {
  const [state, setState] = useState<PrinterState>();
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [format, setFormat] = useState<'pdf' | 'png'>('pdf');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [image, setImage] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preparedKey, setPreparedKey] = useState('');
  const [previewVersion, setPreviewVersion] = useState(0);
  const [menu, setMenu] = useState(false);
  const client = useRef<ReturnType<typeof createClient>>();
  const connectVersion = useRef(0);
  const connectedTab = useRef<number>();
  const thumbnailVersion = useRef(0);
  const cached = useRef(new Map<string, string>());
  const formatRef = useRef<HTMLDivElement>(null);
  const settingsKey = JSON.stringify(settings);
  const busy = state?.phase === 'exporting' || state?.phase === 'preparing';
  const settingsValid = (() => {
    try {
      validateSettings(settings);
      return '';
    } catch (e) {
      return userError(e);
    }
  })();
  const request = useCallback(
    async (command: Command, payload?: Record<string, unknown>) => {
      if (!client.current) throw new Error('请重新连接网页');
      return client.current.request(command, payload);
    },
    [],
  );
  const action = (command: Command, payload?: Record<string, unknown>) => {
    setError('');
    void request(command, payload).catch((e) => setError(userError(e)));
  };
  const connect = useCallback(async () => {
    const version = ++connectVersion.current;
    client.current?.close();
    client.current = undefined;
    setConnected(false);
    setState(undefined);
    setImage('');
    setError('');
    cached.current.clear();
    try {
      const result = await chrome.runtime.sendMessage({
        channel: CHANNEL,
        command: 'connect',
      });
      if (version !== connectVersion.current) return;
      if (!result?.ok) throw new Error(result?.error || '无法连接网页');
      connectedTab.current = result.tabId;
      client.current = createClient(
        result.tabId,
        (s) => {
          if (version === connectVersion.current) {
            setState(s);
            setConnected(true);
          }
        },
        () => {
          if (version === connectVersion.current) {
            setConnected(false);
            setError('页面连接已断开，请回到网页后重新连接。');
          }
        },
      );
      await client.current.request('status');
    } catch (e) {
      if (version === connectVersion.current) setError(userError(e));
    }
  }, []);
  useEffect(() => {
    void chrome.storage.local.get('preferences').then(({ preferences: p }) => {
      if (p) {
        try {
          setSettings(validateSettings(p.settings));
          if (p.format === 'pdf' || p.format === 'png') setFormat(p.format);
        } catch {}
      }
      setLoaded(true);
    });
    void connect();
    const activate = () => {
      void connect();
    };
    const update = (tabId: number, change: chrome.tabs.TabChangeInfo) => {
      if (tabId === connectedTab.current && change.status === 'complete')
        void connect();
    };
    chrome.tabs.onActivated.addListener(activate);
    chrome.tabs.onUpdated.addListener(update);
    return () => {
      connectVersion.current++;
      client.current?.close();
      chrome.tabs.onActivated.removeListener(activate);
      chrome.tabs.onUpdated.removeListener(update);
    };
  }, [connect]);
  useEffect(() => {
    if (loaded && !settingsValid)
      void chrome.storage.local.set({ preferences: { settings, format } });
  }, [loaded, settingsKey, format, settingsValid]);
  const prepare = useCallback(async () => {
    setError('');
    setPreviewError('');
    setImage('');
    setIndex(0);
    cached.current.clear();
    thumbnailVersion.current++;
    try {
      validateSettings(settings);
      await request('prepare', { settings });
      setPreparedKey(JSON.stringify(settings));
      setPreviewVersion((x) => x + 1);
    } catch (e) {
      setError(userError(e));
    }
  }, [settingsKey, request]);
  // Only selection/settings changes trigger automatic layout. A stale page requires an explicit refresh.
  const previous = useRef('');
  useEffect(() => {
    if (
      !loaded ||
      !connected ||
      !state ||
      state.summary === '尚未选择内容' ||
      state.phase === 'selecting'
    )
      return;
    const key = state.sessionId + ':' + state.revision + ':' + settingsKey;
    if (previous.current === key) return;
    previous.current = key;
    if (settingsValid || state.phase === 'stale') return;
    const timer = setTimeout(() => {
      void prepare();
    }, 300);
    return () => {
      clearTimeout(timer);
      previous.current = '';
    };
  }, [
    loaded,
    connected,
    state?.sessionId,
    state?.revision,
    settingsKey,
    settingsValid,
    prepare,
  ]);
  // Runs BEFORE the thumbnail effect: on the same commit that flips phase to
  // 'ready', this must clear the cache and bump the version first, so the
  // thumbnail effect then captures a valid version and cannot hit stale cache
  // entries. (Declared after, it would invalidate the fetch it just started —
  // the preview never rendered.)
  const prevInvalidation = useRef<{
    sessionId?: string;
    revision?: number;
    preparedAt?: number;
  }>({});
  useEffect(() => {
    const prev = prevInvalidation.current;
    const sessionChanged =
      prev.sessionId !== state?.sessionId || prev.revision !== state?.revision;
    prevInvalidation.current = {
      sessionId: state?.sessionId,
      revision: state?.revision,
      preparedAt: state?.preparedAt,
    };
    setImage('');
    // Auto-refresh (same session, new preparedAt) keeps the user's page when
    // it still exists; only selection/regeneration resets to page 1.
    if (sessionChanged) setIndex(0);
    else
      setIndex((i) =>
        Math.min(i, Math.max(0, (state?.pages || 1) - 1)),
      );
    cached.current.clear();
    thumbnailVersion.current++;
  }, [state?.sessionId, state?.revision, state?.preparedAt]);
  useEffect(() => {
    if (
      !state?.pages ||
      !['ready', 'success', 'error'].includes(state.phase) ||
      !connected ||
      settingsKey !== preparedKey
    )
      return;
    const version = ++thumbnailVersion.current;
    const key = `${state.sessionId}:${state.revision}:${previewVersion}:${index}`;
    const hit = cached.current.get(key);
    if (hit) {
      setImage(hit);
      setPreviewBusy(false);
      return;
    }
    setPreviewBusy(true);
    setImage('');
    setPreviewError('');
    void request('thumbnail', { index })
      .then(({ image: data }) => {
        if (version !== thumbnailVersion.current) return;
        if (cached.current.size >= 3)
          cached.current.delete(cached.current.keys().next().value!);
        cached.current.set(key, data);
        setImage(data);
      })
      .catch((e) => {
        if (version === thumbnailVersion.current) setPreviewError(userError(e));
      })
      .finally(() => {
        if (version === thumbnailVersion.current) setPreviewBusy(false);
      });
    return () => {
      thumbnailVersion.current++;
    };
  }, [
    state?.sessionId,
    state?.revision,
    state?.pages,
    state?.phase,
    index,
    previewVersion,
    connected,
    preparedKey,
    settingsKey,
    request,
  ]);
  useEffect(() => {
    if (state?.phase === 'stale' || !connected) {
      thumbnailVersion.current++;
      setImage('');
      setPreviewBusy(false);
    }
  }, [state?.phase, connected]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const items = Array.from(
      formatRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role=menuitemradio]',
      ) || [],
    );
    items.find((el) => el.getAttribute('aria-checked') === 'true')?.focus();
    const outside = (e: MouseEvent) => {
      if (!formatRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const keys = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'Escape') {
        setMenu(false);
        formatRef.current
          ?.querySelector<HTMLButtonElement>('.format-toggle')
          ?.focus();
        return;
      }
      const current = items.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      items[
        (current + (e.key === 'ArrowDown' ? 1 : items.length - 1)) %
          items.length
      ]?.focus();
    };
    document.addEventListener('mousedown', outside);
    formatRef.current?.addEventListener('keydown', keys);
    const ref = formatRef.current;
    return () => {
      document.removeEventListener('mousedown', outside);
      ref?.removeEventListener('keydown', keys);
    };
  }, [menu]);
  const update = (patch: Partial<PrintSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));
  const unit = settings.unit || 'mm';
  const factor = unit === 'px' ? PX_PER_MM : 1;
  const numeric = (field: keyof PrintSettings, label: string) => (
    <label>
      {label}
      <span className="number-field">
        <input
          aria-label={label}
          type="number"
          min="0"
          max={2000 * factor}
          step="any"
          value={
            Number.isFinite(settings[field] as number)
              ? Number(((settings[field] as number) * factor).toFixed(2))
              : ''
          }
          onChange={(e) =>
            update({
              [field]:
                e.target.value === '' ? NaN : Number(e.target.value) / factor,
            })
          }
        />
        <span>{unit}</span>
      </span>
    </label>
  );
  let paperText = '';
  try {
    const p = resolvePaper(settings);
    paperText = `${Number((p.widthMm * factor).toFixed(1))} × ${Number((p.heightMm * factor).toFixed(1))} ${unit}`;
  } catch {}
  const hasContent = state && state.summary !== '尚未选择内容';
  const canExport =
    connected &&
    hasContent &&
    ['ready', 'success', 'error'].includes(state.phase) &&
    state.pages > 0 &&
    settingsKey === preparedKey &&
    !settingsValid &&
    !previewBusy;
  const progress = state?.progress;
  return (
    <div className="app">
      <header className="brand">
        <img src="./brand-mark.svg" alt="" width="24" height="24" />
        <h1>Web Printer</h1>
        <span>网页分页</span>
      </header>
      <main>
        <section aria-labelledby="content-title">
          <div className="section-heading">
            <h2 id="content-title">打印内容</h2>
            {hasContent && (
              <button
                className="text"
                onClick={() => action('parent')}
                disabled={busy}
              >
                选父级
              </button>
            )}
          </div>
          <p className="summary">
            {state?.summary || '连接当前网页后，选择要保存的内容。'}
          </p>
          <div className="row">
            <button
              onClick={() => action('select')}
              disabled={!connected || busy}
            >
              {hasContent ? '重新选择' : '选择区域'}
            </button>
            <button
              onClick={() => action('whole')}
              disabled={!connected || busy}
            >
              整个页面
            </button>
          </div>
          {hasContent && (
            <div className="sub-actions">
              <button
                className="text"
                disabled={busy}
                onClick={() => action('exclude')}
              >
                排除内容
              </button>
              {!!state.excluded && (
                <button
                  className="text"
                  disabled={busy}
                  onClick={() => action('undo')}
                >
                  撤销排除（{state.excluded}）
                </button>
              )}
            </div>
          )}
          {state?.phase === 'selecting' && (
            <p role="status" className="notice">
              在网页上点击所需内容，按 Esc 退出。
            </p>
          )}
        </section>
        <section aria-labelledby="settings-title">
          <h2 id="settings-title">输出设置</h2>
          <fieldset disabled={busy}>
            <div className="grid">
              <label>
                页面尺寸
                <select
                  aria-label="页面尺寸"
                  value={settings.paper}
                  onChange={(e) => {
                    const paper = e.target.value as Paper;
                    update({
                      paper,
                      ...PAPER_PRESETS[paper],
                      unit: getPresetUnit(paper),
                    });
                  }}
                >
                  {Object.entries(labels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                方向
                <select
                  aria-label="方向"
                  value={settings.orientation}
                  disabled={settings.paper === 'custom'}
                  onChange={(e) =>
                    update({
                      orientation: e.target.value as 'portrait' | 'landscape',
                    })
                  }
                >
                  <option value="portrait">纵向</option>
                  <option value="landscape">横向</option>
                </select>
              </label>
            </div>
            {settings.paper === 'custom' ? (
              <>
                <div className="grid">
                  {numeric('widthMm', '宽度')}
                  {numeric('heightMm', '高度')}
                </div>
                <label>
                  尺寸单位
                  <select
                    aria-label="尺寸单位"
                    value={unit}
                    onChange={(e) =>
                      update({ unit: e.target.value as 'mm' | 'px' })
                    }
                  >
                    <option value="mm">毫米（mm）</option>
                    <option value="px">像素（px）</option>
                  </select>
                </label>
              </>
            ) : (
              <p className="dimensions">{paperText}</p>
            )}
            <details>
              <summary>边距、页眉页脚</summary>
              <div className="grid margins">
                {numeric('marginTopMm', '上边距')}
                {numeric('marginBottomMm', '下边距')}
                {numeric('marginLeftMm', '左边距')}
                {numeric('marginRightMm', '右边距')}
              </div>
              <label>
                页眉文字
                <input
                  aria-label="页眉文字"
                  maxLength={120}
                  value={settings.header?.text || ''}
                  onChange={(e) =>
                    update({
                      header: {
                        enabled: !!e.target.value,
                        text: e.target.value,
                        align: 'left',
                        showDivider: true,
                      },
                    })
                  }
                />
              </label>
              <label>
                页脚文字
                <input
                  aria-label="页脚文字"
                  maxLength={120}
                  value={settings.footer?.text || ''}
                  onChange={(e) =>
                    update({
                      footer: {
                        enabled: !!e.target.value,
                        text: e.target.value,
                        align: 'left',
                      },
                    })
                  }
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.pageNumber?.enabled !== false}
                  onChange={(e) =>
                    update({
                      pageNumber: {
                        enabled: e.target.checked,
                        position: 'bottom-right',
                        format: 'slash',
                      },
                    })
                  }
                />
                显示页码
              </label>
              <button
                className="text"
                onClick={() => setSettings(defaultSettings())}
              >
                恢复默认设置
              </button>
            </details>
          </fieldset>
          {settingsValid && (
            <p className="error" role="alert">
              {settingsValid}
            </p>
          )}
        </section>
        <section aria-labelledby="preview-title" className="preview-section">
          <div className="section-heading">
            <h2 id="preview-title">分页预览</h2>
            {hasContent && (
              <button
                className="text"
                disabled={busy || !!settingsValid}
                onClick={() => void prepare()}
              >
                重新生成
              </button>
            )}
          </div>
          <div
            className="preview"
            aria-busy={previewBusy || state?.phase === 'preparing'}
          >
            {image && (
              <img
                className="sheet"
                src={image}
                alt={`第 ${index + 1} 页，共 ${state?.pages} 页`}
                draggable={false}
              />
            )}
            {!image && (
              <div className="preview-empty">
                <svg
                  width="34"
                  height="42"
                  viewBox="0 0 34 42"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 1h16l12 12v28H1V1h4M21 1v12h12M8 22h18M8 28h18M8 34h12"
                    stroke="currentColor"
                  />
                </svg>
                <p>
                  {previewBusy
                    ? '正在渲染这一页…'
                    : state?.phase === 'preparing'
                      ? '正在准备分页…'
                      : state?.phase === 'stale'
                        ? '内容已变化，请重新生成'
                        : previewError
                          ? '这一页暂时无法预览'
                          : hasContent && state?.phase === 'error'
                            ? '暂时无法生成预览，请查看下方提示'
                            : '选择内容后，在这里查看分页'}
                </p>
                {previewError && (
                  <button onClick={() => setPreviewVersion((x) => x + 1)}>
                    重试预览
                  </button>
                )}
              </div>
            )}
          </div>
          {!!state?.pages && (
            <nav className="page-nav" aria-label="预览翻页">
              <button
                aria-label="上一页"
                disabled={
                  index === 0 || previewBusy || busy || state.phase === 'stale'
                }
                onClick={() => setIndex((x) => x - 1)}
              >
                ←
              </button>
              <span>
                {index + 1} / {state.pages} 页
              </span>
              <button
                aria-label="下一页"
                disabled={
                  index >= state.pages - 1 ||
                  previewBusy ||
                  busy ||
                  state.phase === 'stale'
                }
                onClick={() => setIndex((x) => x + 1)}
              >
                →
              </button>
            </nav>
          )}
          {previewError && (
            <p className="error" role="alert">
              {previewError}
            </p>
          )}
          {hasContent && (
            <label className="check inspect">
              <input
                type="checkbox"
                checked={state.inspecting}
                disabled={busy}
                onChange={() => action('inspect')}
              />
              显示分页标记
            </label>
          )}
          {state?.inspectionError && (
            <p className="notice">{state.inspectionError}</p>
          )}
          {state?.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
        </section>
        {(error || state?.error) && (
          <div className="error-box" role="alert">
            <p>{error || state?.error}</p>
            <button
              onClick={() => (connected ? void prepare() : void connect())}
              disabled={busy}
            >
              {connected ? '重试' : '重新连接'}
            </button>
          </div>
        )}
      </main>
      <footer>
        <div className="export-status" role="status">
          {state?.phase === 'exporting'
            ? `正在导出：${progress?.completed || 0} / ${progress?.total || state.pages} 页`
            : state?.lastExport
              ? `已生成 · ${state.lastExport.pages} 页 · ${(state.lastExport.bytes / 1024).toFixed(0)} KB`
              : hasContent
                ? '内容在本地处理'
                : '无需上传网页内容'}
        </div>
        {state?.phase === 'exporting' ? (
          <>
            <progress
              max={progress?.total || 1}
              value={progress?.completed || 0}
            />
            <button className="cancel" onClick={() => action('cancel')}>
              取消导出
            </button>
          </>
        ) : (
          <div className="export-control">
            <button
              className="primary"
              disabled={!canExport}
              onClick={() => action('export', { format })}
            >
              导出 {format === 'pdf' ? 'PDF' : 'PNG 图片'}
            </button>
            <div className="format-menu" ref={formatRef}>
              <button
                aria-label="选择导出格式"
                aria-expanded={menu}
                className="primary format-toggle"
                disabled={busy}
                onClick={() => setMenu((x) => !x)}
              >
                ⌄
              </button>
              {menu && (
                <div role="menu" className="menu">
                  {(['pdf', 'png'] as const).map((v) => (
                    <button
                      key={v}
                      role="menuitemradio"
                      aria-checked={format === v}
                      onClick={() => {
                        setFormat(v);
                        setMenu(false);
                      }}
                    >
                      {v === 'pdf' ? 'PDF 文档' : 'PNG 分页图片（ZIP）'}
                      {format === v ? (
                        <span className="selected-format">已选</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
