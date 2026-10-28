import { PrintSettingsButton } from './print/settings-panel';
import { DEFAULT_SETTINGS, PrintSettings, resolvePaper } from './print/settings';
import { Button, Row, Tabs, TabsProps, message } from 'antd';
import { BusinessDemo } from './pages/business-demo';
import { useRef, useState } from 'react';
import { PDF_PRINT_IDS } from './constants';
import {
  Paragraph,
  PdfDemo1,
  PdfDemo2,
  PdfDemo3,
  PdfDemo4,
  PdfDemo5
} from './pages/demo';
import { outputPDF } from './pdf-print';
import { calculatePagesArray, clearPageBreaks, visualizePageBreaks } from './pages-debug';

const items: TabsProps['items'] = [
  {
    key: '0',
    label: '段落',
    children: <Paragraph />
  },
  {
    key: '1',
    label: '单页',
    children: <PdfDemo1 />
  },
  {
    key: '2',
    label: '多页',
    children: <PdfDemo2 />
  },
  {
    key: '3',
    label: '多页分页截断',
    children: <PdfDemo3 />
  },
  {
    key: '4',
    label: '自定义页眉页脚',
    children: <PdfDemo4 />
  },
  {
    key: '5',
    label: '横向',
    children: <PdfDemo5 />
  },
  { key: '6', label: '采购订单', children: <BusinessDemo kind="purchase" /> },
  { key: '7', label: '收货验收单', children: <BusinessDemo kind="receipt" /> },
  { key: '8', label: '采购结算单', children: <BusinessDemo kind="settlement" /> }
];

const PdfDownload = () => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(items[0].key);
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState('');
  const handleChange = (key: string) => {
    if (busy.current) return;
    clearPageBreaks();
    setReport('');
    setTab(key);

  };
  const run = async (debug = false) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setReport('');
    setProgress('正在准备字体、图片和分页…');
    controller.current = new AbortController();
    clearPageBreaks();
    const options = {
      element: document.getElementById(PDF_PRINT_IDS[`content${tab}`]),
      header: tab === '4' ? document.getElementById(PDF_PRINT_IDS.header) : null,
      footer: tab === '4' ? document.getElementById(PDF_PRINT_IDS.footer) : null,
      settings,
      signal: controller.current.signal,
    };
    try {
      if (debug) {
        const pages = await calculatePagesArray({ contentElement: options.element, ...options });
        visualizePageBreaks(pages, options.element!);
        setReport(`分页检查：${pages.length} 页，红色虚线为换页位置`);
      } else {
        const result = await outputPDF({ ...options, filename: items.find(item => item.key === tab)?.label as string || 'document', onProgress: (done, total) => setProgress(`正在生成 ${done} / ${total} 页`) });
        setReport(`导出完成：${result.pages} 页 · ${(result.totalMs / 1000).toFixed(1)} 秒 · ${(result.bytes / 1024).toFixed(0)} KB`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setReport(detail);
      if (!controller.current.signal.aborted) message.error(`导出失败：${detail}`);
    } finally {
      busy.current = false;
      controller.current = null;
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <Row justify={'center'} style={{ flexDirection: 'column', margin: 20 }}>
      <div style={{ margin: '10px auto' }}>
        <Button type="primary" onClick={() => run()} loading={loading}>
          导出pdf
        </Button>
        <Button onClick={() => run(true)} disabled={loading} style={{ marginLeft: 8 }}>检查分页</Button>
        <PrintSettingsButton value={settings} disabled={loading} onChange={next => { setSettings(next); clearPageBreaks(); setReport(''); }} />
        <span style={{ marginLeft: 12, color: '#666' }}>{Number((resolvePaper(settings).widthMm * (settings.unit === 'px' ? 96 / 25.4 : 1)).toFixed(2))} × {Number((resolvePaper(settings).heightMm * (settings.unit === 'px' ? 96 / 25.4 : 1)).toFixed(2))} {settings.unit || 'mm'}{settings.slicingMode ? ' · 细切片测试' : ''}</span>
        {loading && <Button onClick={() => controller.current?.abort()} style={{ marginLeft: 8 }}>取消</Button>}
        <span role="status" style={{ marginLeft: 12 }}>{progress || report}</span>
      </div>
      <Tabs activeKey={tab} items={items} onChange={handleChange} />
    </Row>
  );
};

export default PdfDownload;
