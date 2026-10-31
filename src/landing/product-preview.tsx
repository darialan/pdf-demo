import { useEffect, useRef, useState } from 'react';
import type { PageGeometry, PageSlice } from '../lib';
import { copy, Locale } from './locale';
import { Icon } from './icons';

type Preview = { html: string; pages: PageSlice[]; geometry: PageGeometry; width: number };

/** Distance between two pages in the viewer; kept in sync with the CSS gap. */
const SHEET_GAP = 16;
/** How much of the next page stays visible, so the viewer reads as scrollable. */
const PEEK_WIDTH = 104;

/** A small real document, measured by the same pipeline as the workbench. */
export function ProductPreview({ locale = 'zh' }: { locale?: Locale }) {
  const t = copy[locale].preview;
  const source = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<'a4' | 'square'>('a4');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sheetWidth, setSheetWidth] = useState(320);
  const [visibleSheets, setVisibleSheets] = useState(1);
  const [current, setCurrent] = useState(0);
  const pendingBuild = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const resize = () => {
      const style = window.getComputedStyle(node);
      const inner = node.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
      // One page is shown at a readable size; the next page only peeks in at the right edge.
      const count = inner >= 456 ? 2 : 1;
      setVisibleSheets(count);
      setSheetWidth(count === 2
        ? Math.max(240, Math.min(430, inner - SHEET_GAP - PEEK_WIDTH))
        : Math.min(430, inner));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setPreview(null); setError(''); setCurrent(0);
    async function build() {
      const { prepareLayout, serializePrintSnapshot, DEFAULT_SETTINGS } = await import('../lib');
      if (abort.signal.aborted || !source.current) return;
      const layout = await prepareLayout({
        element: source.current, signal: abort.signal,
        settings: { ...DEFAULT_SETTINGS, paper: shape === 'a4' ? 'a4' : 'square-1x1' },
      });
      try {
        if (!abort.signal.aborted) setPreview({ html: serializePrintSnapshot(layout.root), pages: layout.pages, geometry: layout, width: layout.width });
      } finally { layout.cleanup(); }
    }
    // A cancelled measurement must finish its cleanup before the next uses the same source.
    const task = pendingBuild.current.catch(() => {}).then(build);
    pendingBuild.current = task;
    task.catch(reason => { if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : t.unavailable); });
    return () => abort.abort();
  }, [shape, retry, locale, t.unavailable]);

  const geometry = preview?.geometry;
  const zoom = geometry ? sheetWidth / geometry.pageWidth : 1;
  return <div className="pagination-demo" data-ui>
    <div className="preview-window">
      <div className="preview-bar">
        <div className="preview-bar-lead">
          <span className="preview-doc-icon"><Icon name="file" size={15} /></span>
          <span className="preview-doc-title">{t.title}</span>
        </div>
        <div className="preview-bar-trail">
          <span className="preview-select">
            <select aria-label={t.size} value={shape} onChange={event => setShape(event.target.value as typeof shape)}>
              <option value="a4">{t.a4}</option><option value="square">{t.square}</option>
            </select>
            <Icon name="chevron" size={13} />
          </span>
          <span className="preview-status" role="status">{preview ? t.status(preview.pages.length) : error ? t.unavailable : t.loading}</span>
        </div>
      </div>
      <div className={`pagination-stage preview-canvas${visibleSheets > 1 ? ' has-peek' : ''}`} ref={stage} aria-label={t.label} aria-busy={!preview && !error}>
        {preview && geometry ? preview.pages.slice(current, current + visibleSheets).map((page, offset) => <div className={`landing-sheet sheet-${offset}`} key={`${shape}-${current + offset}`}
          style={{ width: sheetWidth, height: geometry.pageHeight * zoom }}>
          <div style={{ position: 'absolute', overflow: 'hidden', left: geometry.left * zoom, top: geometry.bodyTop * zoom,
            width: geometry.contentWidth * zoom, height: (page.end - page.start) * geometry.ratio * zoom }}>
            <iframe title={t.page(current + offset + 1)} sandbox="" tabIndex={-1} aria-hidden="true"
              style={{ width: preview.width, height: page.end - page.start, border: 0, pointerEvents: 'none', transformOrigin: 'top left', transform: `scale(${geometry.ratio * zoom})` }}
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;color-scheme:light}</style></head><body><div style="transform:translateY(${-page.start}px)">${preview.html}</div></body></html>`} />
          </div>
        </div>) : <div className="pagination-empty">{error ? <><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>{t.retry}</button></> : <p>{t.measuring}</p>}</div>}
      </div>
      <div className="preview-foot">
        <a className="preview-workbench" href="#/playground">{t.open}<Icon name="arrow" size={15} /></a>
        {preview && <div className="pagination-pager">
          <button disabled={current === 0} onClick={() => setCurrent(value => value - 1)} aria-label={t.previous}><span className="previous-arrow"><Icon name="arrow" size={15} /></span></button>
          <span>{t.from(current + 1)}<span className="pager-total"> · {t.total(preview.pages.length)}</span></span>
          <button disabled={current >= preview.pages.length - 1} onClick={() => setCurrent(value => value + 1)} aria-label={t.next}><Icon name="arrow" size={15} /></button>
        </div>}
      </div>
    </div>
    <div className="landing-source-host" aria-hidden="true">
      <div ref={source} style={{ width: 600, background: '#fff', color: '#202321', fontFamily: 'Avenir Next, PingFang SC, sans-serif', fontSize: 21, lineHeight: 1.72 }}>
        <h2 style={{ fontSize: 31, margin: '0 0 20px', letterSpacing: '-.02em' }}>{t.docTitle}</h2>
        <p style={{ margin: '0 0 26px' }}>{t.intro}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 19 }}>
          <thead><tr>{t.columns.map(text => <th key={text} style={{ background: '#eef4f0', padding: '13px 12px', textAlign: 'left', fontWeight: 600 }}>{text}</th>)}</tr></thead>
          <tbody>{t.rows.map((row, i) => <tr key={i}>{row.map((text, j) => <td key={j} style={{ padding: '13px 12px', borderBottom: '1px solid #e5e9e6' }}>{text}</td>)}</tr>)}</tbody>
        </table>
        <h2 style={{ fontSize: 27, margin: '28px 0 12px' }}>{t.outcome}</h2>
        {t.paragraphs.map((text, i) => <p key={i} style={{ margin: '0 0 20px' }}>{text}</p>)}
      </div>
    </div>
  </div>;
}
