import {
  clearPageBreaks,
  calculateGeometry,
  DEFAULT_SETTINGS,
  measureDocument,
  getPrintRules,
  paginate,
  ObservabilityStats,
  outputPDF,
  PrintInspectionResult,
  PrintSettings,
  resolvePaper,
  resolvePrintElement,
  visualizePageBreaks,
} from '../../lib';
import { Alert, message, Tabs } from 'antd';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  PrintObservabilityBanner,
  PrintToolbarActions,
} from './debug-panel/print-toolbar';
import { buildHtmlPreviewData, HtmlPreviewData } from './preview/pdf-preview-modal';
import { MiniPdfPreview, MiniPreviewBoundary } from './preview/mini-pdf-preview';
import './debug-panel/print-toolbar.css';

export interface PrintSceneItem {
  key: string;
  label: string;
  scenario?: string; // 演示的业务场景
  problem?: string;  // 解决的具体问题/痛点
  contentId: string;
  headerId?: string;
  footerId?: string;
  children: ReactNode;
}

function resolveWorkbenchElement(contentId: string): HTMLElement | null {
  return resolvePrintElement(document.getElementById(contentId));
}

export function PrintWorkbench({ scenes, initialSceneKey }: { scenes: PrintSceneItem[]; initialSceneKey?: string }) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState(() => scenes.find(scene => scene.key === initialSceneKey)?.key || scenes[0]?.key || 'purchase-order');
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [debugActive, setDebugActive] = useState(false);
  const [inspection, setInspection] = useState<PrintInspectionResult | null>(null);
  const [stats, setStats] = useState<ObservabilityStats | undefined>(undefined);

  // 调试模式下浮动迷你纸张预览小窗数据
  const [miniPreviewData, setMiniPreviewData] = useState<HtmlPreviewData | null>(null);

  const [markError, setMarkError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const inspectionRun = useRef(0);

  const busy = useRef(false);
  const debugRoot = useRef<HTMLElement | null>(null);
  const controller = useRef<AbortController | null>(null);

  const handleTabChange = (key: string) => {
    if (busy.current) return;
    clearPageBreaks(debugRoot.current || undefined);
    debugRoot.current = null;
    inspectionRun.current++;
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setMarkError(null);
    setMiniPreviewData(null);
    setDebugActive(false);
    setInspection(null);
    setStats(undefined);
    setTab(key);
  };

  const handleCloseDebug = () => {
    clearPageBreaks(debugRoot.current || undefined);
    debugRoot.current = null;
    inspectionRun.current++;
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setMarkError(null);
    setMiniPreviewData(null);
    setDebugActive(false);
    setInspection(null);
    setStats(undefined);
  };

  useEffect(() => {
    const invalidate = () => {
      clearPageBreaks(debugRoot.current || undefined);
      debugRoot.current = null;
      inspectionRun.current++;
      setPreviewOpen(false);
      setPreviewLoading(false);
      setPreviewError(null);
      setMarkError(null);
      setMiniPreviewData(null);
      setDebugActive(false);
      setInspection(null);
      setStats(undefined);
    };
    window.addEventListener('pdf-demo-content-change', invalidate);
    return () => {
      inspectionRun.current++;
      window.removeEventListener('pdf-demo-content-change', invalidate);
      clearPageBreaks(debugRoot.current || undefined);
    };
  }, []);

  const loadPreview = async (currentScene: PrintSceneItem) => {
    const run = ++inspectionRun.current;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setMiniPreviewData(null);
    setPreviewAttempt(attempt => attempt + 1);
    // Let the markers and loading shell paint before preparing the snapshot.
    await new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (run !== inspectionRun.current) return;
    try {
      const el = resolveWorkbenchElement(currentScene.contentId);
      if (!el) throw new Error('未找到打印区域');
      const data = await buildHtmlPreviewData({
        contentElement: el,
        header: currentScene.headerId ? document.getElementById(currentScene.headerId) : null,
        footer: currentScene.footerId ? document.getElementById(currentScene.footerId) : null,
        settings,
        filename: currentScene.label || 'document',
      });
      if (run === inspectionRun.current) setMiniPreviewData(data);
    } catch (err) {
      if (run === inspectionRun.current) {
        setPreviewError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (run === inspectionRun.current) setPreviewLoading(false);
    }
  };

  const handleToggleDebug = () => {
    if (debugActive) {
      handleCloseDebug();
      return;
    }
    const currentScene = scenes.find(item => item.key === tab);
    if (!currentScene || busy.current) return;
    setDebugActive(true);
    setMarkError(null);
    // Source annotations have no dependency on snapshot preparation or validation.
    try {
      const started = performance.now();
      const el = resolveWorkbenchElement(currentScene.contentId);
      if (!el) throw new Error('未找到待测量的打印区域');
      debugRoot.current = el;
      const width = el.getBoundingClientRect().width;
      if (width <= 0) throw new Error('打印区域宽度为零');
      const header = currentScene.headerId ? document.getElementById(currentScene.headerId) : null;
      const footer = currentScene.footerId ? document.getElementById(currentScene.footerId) : null;
      const { capacity } = calculateGeometry(
        resolvePaper(settings), width,
        header?.getBoundingClientRect().height,
        footer?.getBoundingClientRect().height,
        settings.pageNumber?.enabled !== false
      );
      const measurement = measureDocument(el, capacity, getPrintRules());
      const measured = performance.now();
      const pages = paginate(measurement.height, capacity, measurement.ranges, Number.MAX_SAFE_INTEGER);
      const planned = performance.now();
      const pageBreaks = pages.map(page => page.start);
      const observedStats = visualizePageBreaks(pageBreaks, el);
      setStats(observedStats);
      setInspection({
        pages,
        stats: measurement.stats,
        pageBreaks,
        totalHeight: measurement.height,
        capacity,
        protectedRanges: measurement.ranges,
        timing: { measurementMs: measured - started, paginationMs: planned - measured, totalMs: performance.now() - started },
      });
    } catch (err) {
      clearPageBreaks(debugRoot.current || undefined);
      debugRoot.current = null;
      setMarkError(err instanceof Error ? err.message : String(err));
    }
    // Always attempt the preview, including when source annotation failed.
    void loadPreview(currentScene);
  };

  const handleRetryPreview = () => {
    const scene = scenes.find(item => item.key === tab);
    if (scene) void loadPreview(scene);
  };

  const handleClosePreview = () => {
    inspectionRun.current++;
    setPreviewOpen(false);
  };

  const handleExport = async () => {
    if (busy.current) return;
    const currentScene = scenes.find(item => item.key === tab);
    if (!currentScene) return;

    busy.current = true;
    setLoading(true);
    setExporting(true);
    controller.current = new AbortController();
    const hideLoading = message.loading('正在排版、测量并逐页渲染 PDF…', 0);

    try {
      const el = resolveWorkbenchElement(currentScene.contentId);
      if (!el) throw new Error('找不到待导出的打印内容');
      const result = await outputPDF({
        element: el,
        header: currentScene.headerId ? document.getElementById(currentScene.headerId) : null,
        footer: currentScene.footerId ? document.getElementById(currentScene.footerId) : null,
        settings,
        signal: controller.current.signal,
        filename: currentScene.label || 'document',
      });
      message.success(`导出完成：共 ${result.pages} 页 · ${(result.totalMs / 1000).toFixed(1)} 秒 · ${(result.bytes / 1024).toFixed(0)} KB`);
    } catch (err) {
      if (!controller.current.signal.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        message.error(`导出失败：${msg}`);
      }
    } finally {
      hideLoading();
      busy.current = false;
      controller.current = null;
      setLoading(false);
      setExporting(false);
    }
  };

  return (
    <div className="print-workbench-container">
      <div className="print-console-card">
        <Tabs
          className="print-tab-custom"
          activeKey={tab}
          items={scenes.map(({ key, label, children }) => {
            return {
              key,
              label,
              children: (
                <div>
                  {debugActive && markError && (
                    <Alert type="error" showIcon message={`页面标记失败：${markError}`} />
                  )}
                  {debugActive && (
                    <PrintObservabilityBanner
                      inspection={inspection}
                      stats={stats}
                      onClose={handleCloseDebug}
                    />
                  )}
                  <div style={{ padding: '16px 12px 32px', pointerEvents: loading ? 'none' : undefined }} onChangeCapture={() => { if (debugActive) handleCloseDebug(); }} onClickCapture={event => { if (debugActive && (event.target as Element).closest('button, .ant-select')) handleCloseDebug(); }}>{children}</div>
                </div>
              ),
            };
          })}
          onChange={handleTabChange}
          tabBarExtraContent={
            <PrintToolbarActions
              loading={loading}
              exporting={exporting}
              settings={settings}
              debugActive={debugActive}
              onExport={handleExport}
              onToggleDebug={handleToggleDebug}
              onCancelExport={() => controller.current?.abort()}
              onSettingsChange={next => {
                setSettings(next);
                if (debugActive) handleCloseDebug();
              }}
            />
          }
        />
      </div>

      {/* 检查分页时右下角随之浮现的小巧纸张滚动预览窗口 */}
      {debugActive && previewOpen && (
        <MiniPreviewBoundary
          key={previewAttempt}
          onRetry={handleRetryPreview}
          onClose={handleClosePreview}
        >
          <MiniPdfPreview
            data={miniPreviewData}
            loading={previewLoading}
            error={previewError}
            onRetry={handleRetryPreview}
            onClose={handleClosePreview}
          />
        </MiniPreviewBoundary>
      )}
    </div>
  );
}
