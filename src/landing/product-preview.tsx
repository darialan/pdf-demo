import { useEffect, useRef, useState } from 'react';
import type { PageGeometry, PageSlice } from '../lib';

type Preview = { html: string; pages: PageSlice[]; geometry: PageGeometry; width: number };

/** A small real document, measured by the same pipeline as the workbench. */
export function ProductPreview() {
  const source = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<'a4' | 'square'>('a4');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sheetWidth, setSheetWidth] = useState(300);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const resize = () => setSheetWidth(Math.min(360, node.clientWidth < 600 ? node.clientWidth - 32 : (node.clientWidth - 72) / 2));
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
    build().catch(reason => { if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : '预览未能生成'); });
    return () => abort.abort();
  }, [shape, retry]);

  const geometry = preview?.geometry;
  const zoom = geometry ? sheetWidth / geometry.pageWidth : 1;
  return <div className="pagination-demo" data-ui>
    <div className="pagination-controls">
      <label>页面尺寸 <select aria-label="页面尺寸" value={shape} onChange={event => setShape(event.target.value as typeof shape)}>
        <option value="a4">A4 纵向</option><option value="square">1:1 方形</option>
      </select></label>
      <span role="status">{preview ? `${preview.pages.length} 页 · 同一份 HTML` : error ? '预览暂不可用' : '正在分页…'}</span>
      <a href="#/playground?scene=purchase-order">查看完整工作台 →</a>
    </div>
    <div className="pagination-stage" ref={stage} aria-label="实际分页预览" aria-busy={!preview && !error}>
      {preview && geometry ? preview.pages.slice(current, current + 2).map((page, offset) => <div className={`landing-sheet sheet-${offset}`} key={`${shape}-${current + offset}`}
        style={{ width: sheetWidth, height: geometry.pageHeight * zoom }}>
        <div style={{ position: 'absolute', overflow: 'hidden', left: geometry.left * zoom, top: geometry.bodyTop * zoom,
          width: geometry.contentWidth * zoom, height: (page.end - page.start) * geometry.ratio * zoom }}>
          <iframe title={`示例文档第 ${current + offset + 1} 页`} sandbox="" tabIndex={-1} aria-hidden="true"
            style={{ width: preview.width, height: page.end - page.start, border: 0, pointerEvents: 'none', transformOrigin: 'top left', transform: `scale(${geometry.ratio * zoom})` }}
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;color-scheme:light}</style></head><body><div style="transform:translateY(${-page.start}px)">${preview.html}</div></body></html>`} />
        </div>
        <span className="landing-sheet-number">{current + offset + 1} / {preview.pages.length}</span>
      </div>) : <div className="pagination-empty">{error ? <><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>重试预览</button></> : <p>正在按页面尺寸测量内容…</p>}</div>}
    </div>
    {preview && <div className="pagination-pager">
      <button disabled={current === 0} onClick={() => setCurrent(value => value - 1)} aria-label="上一页">←</button>
      <span>第 {current + 1} 页起</span>
      <button disabled={current >= preview.pages.length - 1} onClick={() => setCurrent(value => value + 1)} aria-label="下一页">→</button>
    </div>}
    <div className="landing-source-host" aria-hidden="true">
      <div ref={source} style={{ width: 600, background: '#fff', color: '#202321', fontFamily: 'Avenir Next, PingFang SC, sans-serif', fontSize: 20, lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 30, margin: '0 0 20px' }}>门店包材采购明细</h2>
        <p style={{ margin: '0 0 24px' }}>采购明细和配送说明，保留在同一份网页里。表格按行换页，长段落按实际文字行延续。</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18 }}>
          <thead><tr>{['门店', '物料', '数量'].map(text => <th key={text} style={{ background: '#edf4ef', padding: 12, textAlign: 'left' }}>{text}</th>)}</tr></thead>
          <tbody>{Array.from({ length: 24 }, (_, i) => <tr key={i}>{[`门店 ${String(i + 1).padStart(2, '0')}`, ['外带纸袋', '环保餐盒', '封口贴纸'][i % 3], `${12 + i} 箱`].map((text, j) => <td key={j} style={{ padding: '12px', borderBottom: '1px solid #e0e4e0' }}>{text}</td>)}</tr>)}</tbody>
        </table>
        <h2 style={{ fontSize: 26, margin: '24px 0 12px' }}>配送说明</h2>
        {[0, 1, 2].map(i => <p key={i} style={{ margin: '0 0 20px' }}>各门店按采购明细分批收货，仓库在发货前核对物料名称、包装规格和箱数。收货时请检查外包装是否完好，并将实际数量记录在系统中。如果发现数量差异或包装破损，请保留现场照片，联系采购人员确认后再完成入库。</p>)}
      </div>
    </div>
  </div>;
}
