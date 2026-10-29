import {
  clearPageBreaks,
  cloneWithResolvedStyles,
  DEFAULT_SETTINGS,
  inspectPrintLayout,
  ObservabilityStats,
  outputPDF,
  PrintInspectionResult,
  PrintSettings,
  resolvePaper,
  visualizePageBreaks,
} from '@darialan/web-pdf-printer';
import { message, Tabs, Tooltip } from 'antd';
import { ReactNode, useRef, useState } from 'react';
import {
  PrintObservabilityBanner,
  PrintToolbarActions,
} from './debug-panel/print-toolbar';
import { calculateHtmlPaperGeometry, HtmlPreviewData } from './preview/pdf-preview-modal';
import { MiniPdfPreview } from './preview/mini-pdf-preview';
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
  const el = document.getElementById(contentId);
  if (!el) return null;
  if (el.tagName.toLowerCase() === 'iframe') {
    const iframeDoc = (el as HTMLIFrameElement).contentDocument || (el as HTMLIFrameElement).contentWindow?.document;
    if (iframeDoc?.body) {
      return (iframeDoc.getElementById('iframe-report-content') as HTMLElement) || iframeDoc.body;
    }
  }
  return el;
}

export function PrintWorkbench({ scenes, initialSceneKey }: { scenes: PrintSceneItem[]; initialSceneKey?: string }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(() => scenes.find(scene => scene.key === initialSceneKey)?.key || scenes[0]?.key || 'anti-cutoff');
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [debugActive, setDebugActive] = useState(false);
  const [inspection, setInspection] = useState<PrintInspectionResult | null>(null);
  const [stats, setStats] = useState<ObservabilityStats | undefined>(undefined);

  // 调试模式下浮动迷你纸张预览小窗数据
  const [miniPreviewData, setMiniPreviewData] = useState<HtmlPreviewData | null>(null);

  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const handleTabChange = (key: string) => {
    if (busy.current) return;
    clearPageBreaks();
    setMiniPreviewData(null);
    setDebugActive(false);
    setInspection(null);
    setStats(undefined);
    setTab(key);
  };

  const handleCloseDebug = () => {
    clearPageBreaks();
    setMiniPreviewData(null);
    setDebugActive(false);
    setInspection(null);
    setStats(undefined);
  };

  const handleToggleDebug = async () => {
    if (debugActive) {
      handleCloseDebug();
      return;
    }
    const currentScene = scenes.find(item => item.key === tab);
    if (!currentScene) return;

    const el = resolveWorkbenchElement(currentScene.contentId);
    if (!el) {
      message.error('未找到待测量的打印区域');
      return;
    }

    setLoading(true);
    try {
      const headerEl = currentScene.headerId ? document.getElementById(currentScene.headerId) : null;
      const footerEl = currentScene.footerId ? document.getElementById(currentScene.footerId) : null;

      const result = await inspectPrintLayout({
        contentElement: el,
        header: headerEl,
        footer: footerEl,
        settings,
      });

      const observedStats = visualizePageBreaks(result.pageBreaks, el);
      setInspection(result);
      setStats(observedStats);

      // 同步生成悬浮小窗的纯 HTML 纸张切片预览（冻结计算样式，确保与页面断页线 100% 吻合）
      const geometry = calculateHtmlPaperGeometry(settings, el, headerEl, footerEl);
      const clone = cloneWithResolvedStyles(el);
      const headerClone = headerEl ? cloneWithResolvedStyles(headerEl) : null;
      const footerClone = footerEl ? cloneWithResolvedStyles(footerEl) : null;

      const paper = resolvePaper(settings);
      const unitFactor = settings.unit === 'px' ? 96 / 25.4 : 1;
      const displayWidth = Number((paper.widthMm * unitFactor).toFixed(1));
      const displayHeight = Number((paper.heightMm * unitFactor).toFixed(1));
      const paperLabel =
        settings.paper === 'custom'
          ? `自定义 · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`
          : `${settings.paper.toUpperCase()} · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`;

      setMiniPreviewData({
        paperLabel,
        pages: result.pages,
        geometry,
        sourceHtml: clone.outerHTML,
        headerHtml: headerClone ? headerClone.outerHTML : undefined,
        footerHtml: footerClone ? footerClone.outerHTML : undefined,
        totalMs: result.timing.totalMs,
        filename: currentScene.label || 'document',
      });

      setDebugActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(`检查分页失败：${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (busy.current) return;
    const currentScene = scenes.find(item => item.key === tab);
    if (!currentScene) return;

    const el = resolveWorkbenchElement(currentScene.contentId);
    if (!el) {
      message.error('找不到待导出的打印内容');
      return;
    }

    busy.current = true;
    setLoading(true);
    controller.current = new AbortController();
    const hideLoading = message.loading('正在排版、测量并逐页渲染 PDF…', 0);

    try {
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
    }
  };

  return (
    <div className="print-workbench-container">
      <div className="print-console-card">
        <Tabs
          className="print-tab-custom"
          activeKey={tab}
          items={scenes.map(({ key, label, scenario, problem, children }) => {
            const hasTooltip = Boolean(scenario || problem);
            const tooltipTitle = hasTooltip ? (
              <div style={{ maxWidth: 260, padding: '2px 0', lineHeight: 1.5, fontSize: 12 }}>
                {scenario && (
                  <div style={{ color: '#f8fafc', fontWeight: 500, marginBottom: problem ? 4 : 0 }}>
                    {scenario}
                  </div>
                )}
                {problem && (
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    {problem}
                  </div>
                )}
              </div>
            ) : null;

            return {
              key,
              label: hasTooltip ? (
                <Tooltip title={tooltipTitle} placement="bottomLeft" mouseEnterDelay={0.45}>
                  <span style={{ cursor: 'pointer', display: 'inline-block' }}>{label}</span>
                </Tooltip>
              ) : (
                label
              ),
              children: (
                <div>
                  {debugActive && (
                    <PrintObservabilityBanner
                      inspection={inspection}
                      stats={stats}
                      onClose={handleCloseDebug}
                    />
                  )}
                  <div style={{ padding: '12px 4px' }}>{children}</div>
                </div>
              ),
            };
          })}
          onChange={handleTabChange}
          tabBarExtraContent={
            <PrintToolbarActions
              loading={loading}
              settings={settings}
              debugActive={debugActive}
              onExport={handleExport}
              onToggleDebug={handleToggleDebug}
              onCancel={() => controller.current?.abort()}
              onSettingsChange={next => {
                setSettings(next);
                if (debugActive) handleCloseDebug();
              }}
            />
          }
        />
      </div>

      {/* 检查分页时右下角随之浮现的小巧纸张滚动预览窗口 */}
      {debugActive && miniPreviewData && (
        <MiniPdfPreview
          data={miniPreviewData}
          onClose={() => setMiniPreviewData(null)}
        />
      )}
    </div>
  );
}
