import {
  clearPageBreaks, calculateGeometry, DEFAULT_SETTINGS, measureDocument, getPrintRules,
  paginate, ObservabilityStats, outputDocument, OutputFormat, PrintInspectionResult, PrintSettings,
  resolvePaper, resolvePrintElement,
} from '../../lib';
import { visualizePageBreaks } from '../../lib';
import { Alert, Button, message, Tabs } from 'antd';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { PrintObservabilityBanner, PrintToolbarActions } from './debug-panel/print-toolbar';
import { buildHtmlPreviewData, HtmlPreviewData } from './preview/print-preview-modal';
import { MiniPrintPreview, MiniPreviewBoundary } from './preview/mini-print-preview';
import './debug-panel/print-toolbar.css';

export interface PrintSceneItem {
  key: string;
  label: string;
  contentId: string;
  headerId?: string;
  footerId?: string;
  children: ReactNode;
}

function resolveWorkbenchElement(contentId: string): HTMLElement {
  const element = resolvePrintElement(document.getElementById(contentId));
  if (!element) throw new Error('未找到打印内容，请重新打开此场景');
  if (element.dataset.printStatus === 'loading') throw new Error('内容正在加载，请加载完成后重试');
  if (element.dataset.printStatus === 'error') throw new Error('内容加载失败，请先重试加载');
  return element;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export function PrintWorkbench({ scenes, initialSceneKey }: { scenes: PrintSceneItem[]; initialSceneKey?: string }) {
  const [tab, setTab] = useState(() => scenes.find(scene => scene.key === initialSceneKey)?.key || scenes[0]?.key || '');
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [ready, setReady] = useState(true);
  const [debugActive, setDebugActive] = useState(false);
  const [inspection, setInspection] = useState<PrintInspectionResult | null>(null);
  const [stats, setStats] = useState<ObservabilityStats>();
  const [miniPreviewData, setMiniPreviewData] = useState<HtmlPreviewData | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  // 用 hook 版 message，toast 才会继承 AntD 主题（静态方法固定用默认蓝色）
  const [messageApi, messageHolder] = message.useMessage();
  const workbenchRoot = useRef<HTMLDivElement>(null);
  const inspectionRun = useRef(0);
  const mounted = useRef(true);
  const busy = useRef(false);
  const debugRoot = useRef<HTMLElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const previewController = useRef<AbortController | null>(null);
  const previewTask = useRef<Promise<void>>(Promise.resolve());
  const scene = scenes.find(item => item.key === tab);

  const stopPreview = () => {
    inspectionRun.current++;
    previewController.current?.abort();
    previewController.current = null;
  };
  const handleCloseDebug = () => {
    stopPreview();
    if (debugRoot.current) clearPageBreaks(debugRoot.current);
    debugRoot.current = null;
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setMarkError(null);
    setMiniPreviewData(null);
    setDebugActive(false);
    setInspection(null);
    setStats(undefined);
  };
  const handleTabChange = (key: string) => {
    if (busy.current) return;
    handleCloseDebug();
    setExportError(null);
    setTab(key);
  };

  useEffect(() => {
    mounted.current = true;
    const runGeneration = inspectionRun;
    return () => {
      mounted.current = false;
      runGeneration.current++;
      previewController.current?.abort();
      controller.current?.abort();
      if (debugRoot.current) clearPageBreaks(debugRoot.current);
    };
  }, []);

  useEffect(() => {
    let observedRoot: HTMLElement | null = null;
    let lastReady: boolean | undefined;
    const updateReady = () => {
      const root = scene ? document.getElementById(scene.contentId) : null;
      const next = Boolean(root) && !['loading', 'error'].includes(root?.dataset.printStatus || '');
      if (next !== lastReady) { lastReady = next; setReady(next); }
      if (root && root !== observedRoot) {
        observedRoot = root;
        observer.disconnect();
        observer.observe(root, { attributes: true, attributeFilter: ['data-print-status'] });
      }
    };
    const observer = new MutationObserver(updateReady);
    // Ant Tabs can mount a panel after this effect. Once found, only observe its
    // readiness attribute, rather than every DOM change made by the inspector.
    if (workbenchRoot.current) observer.observe(workbenchRoot.current, { childList: true, subtree: true });
    updateReady();
    const invalidate = (event: Event) => {
      const changedId = (event as CustomEvent).detail?.contentId;
      if (changedId && changedId !== scene?.contentId) return;
      updateReady();
      handleCloseDebug();
    };
    window.addEventListener('print-demo-content-change', invalidate);
    return () => {
      observer?.disconnect();
      window.removeEventListener('print-demo-content-change', invalidate);
    };
    // Scene DOM has committed before this subscription is installed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.contentId]);

  useEffect(() => {
    if (!debugActive || !scene) return;
    const root = document.getElementById(scene.contentId);
    if (!root) return;
    const original = root.getBoundingClientRect();
    const invalidate = () => {
      const current = root.getBoundingClientRect();
      if (Math.abs(current.width - original.width) > 0.5 || Math.abs(current.height - original.height) > 0.5) handleCloseDebug();
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    observer?.observe(root);
    window.addEventListener('resize', invalidate);
    return () => { observer?.disconnect(); window.removeEventListener('resize', invalidate); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugActive, scene?.contentId]);

  const loadPreview = (currentScene: PrintSceneItem) => {
    const previous = previewTask.current;
    stopPreview();
    const run = inspectionRun.current;
    const abort = new AbortController();
    previewController.current = abort;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setMiniPreviewData(null);
    setPreviewAttempt(attempt => attempt + 1);
    previewTask.current = (async () => {
      // Paint the source markers and loading shell before freezing computed CSS.
      await new Promise(resolve => setTimeout(resolve, 0));
      await previous;
      if (abort.signal.aborted || run !== inspectionRun.current) return;
      try {
        const data = await buildHtmlPreviewData({
          contentElement: resolveWorkbenchElement(currentScene.contentId),
          header: currentScene.headerId ? document.getElementById(currentScene.headerId) : null,
          footer: currentScene.footerId ? document.getElementById(currentScene.footerId) : null,
          settings, filename: currentScene.label || 'document', signal: abort.signal,
        });
        if (mounted.current && run === inspectionRun.current) setMiniPreviewData(data);
      } catch (error) {
        if (mounted.current && run === inspectionRun.current && !abort.signal.aborted) setPreviewError(errorText(error));
      } finally {
        if (mounted.current && run === inspectionRun.current) setPreviewLoading(false);
      }
    })();
  };

  const markSource = (currentScene: PrintSceneItem) => {
    setMarkError(null);
    try {
      const started = performance.now();
      const el = resolveWorkbenchElement(currentScene.contentId);
      debugRoot.current = el;
      const width = el.getBoundingClientRect().width;
      const header = currentScene.headerId ? document.getElementById(currentScene.headerId) : null;
      const footer = currentScene.footerId ? document.getElementById(currentScene.footerId) : null;
      const { capacity } = calculateGeometry(resolvePaper(settings), width,
        header?.getBoundingClientRect().height, footer?.getBoundingClientRect().height, settings.pageNumber ?? true);
      const rules = getPrintRules();
      const measurement = measureDocument(el, capacity, rules);
      const measured = performance.now();
      const pages = paginate(measurement.height, capacity, measurement.ranges);
      const planned = performance.now();
      const pageBreaks = pages.map(page => page.start);
      setStats(visualizePageBreaks(pageBreaks, el, rules));
      setInspection({ pages, stats: measurement.stats, pageBreaks, totalHeight: measurement.height,
        capacity, protectedRanges: measurement.ranges,
        timing: { measurementMs: measured - started, paginationMs: planned - measured, totalMs: performance.now() - started } });
    } catch (error) {
      if (debugRoot.current) clearPageBreaks(debugRoot.current);
      debugRoot.current = null;
      setMarkError(errorText(error));
    }
  };
  const handleToggleDebug = () => {
    if (debugActive) return handleCloseDebug();
    if (!scene || busy.current) return;
    setDebugActive(true);
    markSource(scene);
    loadPreview(scene);
  };
  const handleRetryPreview = () => { if (scene && !busy.current) loadPreview(scene); };
  const handleClosePreview = () => { stopPreview(); setPreviewLoading(false); setPreviewOpen(false); };

  const handleExport = async () => {
    if (busy.current || !scene) return;
    busy.current = true;
    setExporting(true);
    setExportError(null);
    setProgress('正在准备内容…');
    // Reclaim any in-flight preview snapshot before exporting the same root.
    stopPreview();
    setPreviewLoading(false);
    if (!miniPreviewData) setPreviewOpen(false);
    const abort = new AbortController();
    controller.current = abort;
    const outputLabel = outputFormat === 'pdf' ? 'PDF' : 'PNG 图片';
    const hideLoading = messageApi.loading(`正在生成 ${outputLabel}…`, 0);
    try {
      await previewTask.current;
      if (abort.signal.aborted) return;
      const result = await outputDocument({
        format: outputFormat,
        element: resolveWorkbenchElement(scene.contentId),
        header: scene.headerId ? document.getElementById(scene.headerId) : null,
        footer: scene.footerId ? document.getElementById(scene.footerId) : null,
        settings, signal: abort.signal, filename: scene.label || 'document',
        onProgress: (completed, total) => {
          if (mounted.current) setProgress(`正在生成 ${outputLabel}：${completed} / ${total} 页`);
        },
      });
      if (mounted.current) messageApi.success(`已导出 ${result.pages} 页 ${outputLabel}，用时 ${(result.totalMs / 1000).toFixed(1)} 秒`);
    } catch (error) {
      if (mounted.current && !abort.signal.aborted) setExportError(errorText(error));
    } finally {
      hideLoading();
      busy.current = false;
      if (controller.current === abort) controller.current = null;
      if (mounted.current) { setExporting(false); setProgress(''); }
    }
  };

  return <div ref={workbenchRoot} className="print-workbench-container">
    {messageHolder}
    <div className="print-console-card">
      <Tabs className="print-tab-custom" activeKey={tab}
        items={scenes.map(({ key, label, children }) => ({ key, label, disabled: exporting, children: <div>
          {key === tab && debugActive && markError && <Alert type="error" showIcon message={`页面标记失败：${markError}`}
            action={<Button size="small" onClick={() => scene && markSource(scene)}>重试标记</Button>} />}
          {key === tab && debugActive && <PrintObservabilityBanner inspection={inspection} stats={stats} />}
          {key === tab && exportError && <Alert className="print-export-error" type="error" showIcon message={`导出失败：${exportError}`}
            action={<Button size="small" onClick={handleExport} disabled={exporting}>重试导出</Button>} closable onClose={() => setExportError(null)} />}
          <div className="print-scene-content" data-exporting={exporting} aria-busy={!ready || exporting}
            onChangeCapture={() => { if (debugActive) handleCloseDebug(); }}
            onClickCapture={event => { if (debugActive && (event.target as Element).closest('button, .ant-select')) handleCloseDebug(); }}>
            {children}
          </div>
        </div> }))}
        onChange={handleTabChange}
        tabBarExtraContent={<PrintToolbarActions loading={exporting} exporting={exporting} ready={ready}
          outputFormat={outputFormat} onOutputFormatChange={next => { setOutputFormat(next); setExportError(null); }}
          progress={progress} settings={settings} debugActive={debugActive} previewOpen={previewOpen}
          onOpenPreview={handleRetryPreview} onExport={handleExport} onToggleDebug={handleToggleDebug}
          onCancelExport={() => controller.current?.abort()}
          onSettingsChange={next => { setSettings(next); setExportError(null); handleCloseDebug(); }} />}
      />
    </div>
    {debugActive && previewOpen && <MiniPreviewBoundary key={previewAttempt} onRetry={handleRetryPreview} onClose={handleClosePreview}>
      <MiniPrintPreview data={miniPreviewData} loading={previewLoading} error={previewError}
        onRetry={handleRetryPreview} onClose={handleClosePreview} />
    </MiniPreviewBoundary>}
  </div>;
}
