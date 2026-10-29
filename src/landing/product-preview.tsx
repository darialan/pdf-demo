import { useRef, useState } from 'react';
import { Icon } from './icons';

const modes = ['采购订单', '长文段落', '签字盖章'] as const;
type Mode = typeof modes[number];

export function ProductPreview() {
  const [mode, setMode] = useState<Mode>('采购订单');
  const [guides, setGuides] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const paperRef = useRef<HTMLDivElement>(null);

  async function exportSample() {
    if (!paperRef.current || exporting) return;
    setExporting(true);
    setStatus('正在生成示例 PDF…');
    try {
      const { outputPDF } = await import('../lib');
      const result = await outputPDF({ element: paperRef.current, filename: `WebPDF-${mode}.pdf` });
      setStatus(`已导出 ${result.pages} 页 PDF`);
    } catch (error) {
      setStatus(error instanceof Error ? `导出失败：${error.message}` : '导出失败，请在工作台重试');
    } finally { setExporting(false); }
  }

  return <div className="product-preview">
    <div className="preview-windowbar"><div className="window-dots" aria-hidden="true"><i /><i /><i /></div><span>WebPDF Printer</span><span className="preview-live"><i /> 可交互示例</span></div>
    <div className="preview-modes">
      <div role="group" aria-label="示例文档类型">{modes.map((item, index) => <button type="button" key={item} aria-label={item} aria-pressed={mode === item} className={mode === item ? 'is-active' : ''} onClick={() => { setMode(item); setStatus(''); }} disabled={exporting}><Icon name={(['grid', 'file', 'sliders'] as const)[index]} size={13} />{item}</button>)}</div>
      <span className="preview-paper-size">A4 / 纵向</span>
    </div>
    <div className="preview-body">
      <div className="preview-canvas">
        <div className="preview-paper" ref={paperRef}>
          <div className="paper-topline"><span>ACME / STUDIO</span><span>DOCUMENT 001</span></div>
          <div className="paper-title">{mode}</div><div className="paper-subtitle">{mode === '采购订单' ? 'PURCHASE ORDER' : mode === '长文段落' ? 'PROJECT DOCUMENTATION' : 'ACCEPTANCE & SIGNATURE'}</div>
          <div className="paper-meta"><div><small>文档编号</small><span>PO-2026-1029</span></div><div><small>创建日期</small><span>2026.10.29</span></div></div>
          {mode === '采购订单' ? <><div className="paper-section-title">01 <span>采购明细</span></div><table className="sample-table"><thead><tr><th>项目 / ITEM</th><th>数量</th><th>金额</th></tr></thead><tbody>{[['品牌视觉设计', '1', '8,000.00'], ['产品界面设计', '2', '12,000.00'], ['交互原型制作', '1', '4,500.00'], ['设计规范交付', '1', '3,000.00']].map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table><div className="paper-total"><span>合计 / TOTAL</span><b>¥ 27,500.00</b></div></> : mode === '长文段落' ? <><div className="paper-section-title">01 <span>项目说明</span></div><p className="paper-paragraph" data-pdf-splittable="true">好的文档，从清晰的表达开始。让段落顺着文字自然延续，让每一行都完整呈现。无论内容有多长，都为阅读保留恰当的空间。</p><p className="paper-paragraph">从浏览器里的业务页面，到纸张上的正式交付，内容与排版都值得被认真对待。</p></> : <><div className="paper-section-title">01 <span>交付验收</span></div><p className="paper-paragraph">已核对本次交付内容，项目资料与验收清单一致。下方签认区域作为完整内容保留。</p><div className="sample-signature" data-pdf-atomic="true"><div><span>验收人签字</span><img src={`${process.env.PUBLIC_URL}/demo-assets/signature.svg`} alt="示例签名" /></div><img src={`${process.env.PUBLIC_URL}/demo-assets/sample-seal.svg`} alt="示例印章" /></div></>}
          <div className="paper-note" data-pdf-atomic="true"><span>交付说明</span><p>请以最终确认的交付清单为准。<br />本单据为产品演示数据。</p></div>
          <div className="paper-footer"><span>WebPDF Printer · 示例文档</span><span>01</span></div>
        </div>
        {guides && <div className="preview-guide" aria-hidden="true"><span>纸张边界参考</span><i /></div>}
      </div>
    </div>
    <div className="preview-bottom"><button className="guide-toggle" type="button" onClick={() => setGuides(!guides)} aria-pressed={guides}><span className={`mini-switch ${guides ? 'is-on' : ''}`} /> 纸张参考线</button><button type="button" className="preview-export" onClick={exportSample} disabled={exporting}>{exporting ? '生成中…' : '导出示例'} <Icon name="arrow" size={13} /></button></div>
    <div className="preview-status" role="status">{status}</div>

  </div>;
}
