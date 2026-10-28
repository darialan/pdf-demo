import { message, Tabs } from 'antd';
import { ReactNode, useRef, useState } from 'react';
import { cloneWithResolvedStyles } from '../adapters/dom/snapshot';
import { inspectPrintLayout, outputPDF, PrintInspectionResult } from '../application/print-service';
import { DEFAULT_SETTINGS, resolvePaper } from '../core/geometry/paper';
import { PrintSettings } from '../core/types';
import {
  PrintObservabilityBanner,
  PrintToolbarActions,
} from './debug-panel/print-toolbar';
import { clearPageBreaks, ObservabilityStats, visualizePageBreaks } from './preview/page-break-overlay';
import { calculateHtmlPaperGeometry, HtmlPreviewData } from './preview/pdf-preview-modal';
import { MiniPdfPreview } from './preview/mini-pdf-preview';
import './debug-panel/print-toolbar.css';

export interface PrintSceneItem {
  key: string;
  label: string;
  contentId: string;
  headerId?: string;
  footerId?: string;
  children: ReactNode;
}

export function PrintWorkbench({ scenes }: { scenes: PrintSceneItem[] }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(scenes[0]?.key || '0');
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

    const el = document.getElementById(currentScene.contentId);
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

    const el = document.getElementById(currentScene.contentId);
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
          items={scenes.map(({ key, label, children }) => ({
            key,
            label,
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
          }))}
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
