import {
  ObservabilityStats,
  OutputFormat,
  PrintInspectionResult,
  PrintSettings,
  resolvePaper,
} from '../../../lib';
import { Button, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { cloneElement } from 'react';
import { PrintSettingsButton } from '../config-panel/settings-panel';
import { getOutputPresetName } from '../config-panel/output-presets';
import './print-toolbar.css';

export interface PrintToolbarActionsProps {
  outputFormat?: OutputFormat;
  onOutputFormatChange?: (format: OutputFormat) => void;
  ready?: boolean;
  progress?: string;
  previewOpen?: boolean;
  onOpenPreview?: () => void;
  loading: boolean;
  exporting: boolean;
  settings: PrintSettings;
  debugActive: boolean;
  onExport: () => void;
  onToggleDebug: () => void;
  onCancelExport: () => void;
  onSettingsChange: (next: PrintSettings) => void;
}

export function PrintToolbarActions({
  outputFormat = 'pdf', onOutputFormatChange,
  ready = true, progress, previewOpen = true, onOpenPreview,
  loading,
  exporting,
  settings,
  debugActive,
  onExport,
  onToggleDebug,
  onCancelExport,
  onSettingsChange,
}: PrintToolbarActionsProps) {
  const paper = resolvePaper(settings);
  const unitFactor = settings.unit === 'px' ? 96 / 25.4 : 1;
  const displayWidth = Number((paper.widthMm * unitFactor).toFixed(1));
  const displayHeight = Number((paper.heightMm * unitFactor).toFixed(1));

  const paperName = getOutputPresetName(settings.paper);
  const paperSize = `${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`;

  return (
    <div className="print-tab-bar-extra">
      {/* 信息区：只读的文档上下文，弱化为文字，不与按钮抢视觉 */}
      <div className="print-toolbar-meta" aria-label="输出规格">
        <svg className="print-meta-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <path d="M4 1.5h5L13 5.5v9H4z" strokeLinejoin="round" />
          <path d="M9 1.5v4h4" strokeLinejoin="round" />
        </svg>
        <span className="print-meta-label">尺寸</span>
        <span className="print-meta-value">{paperName}</span>
        <span className="print-meta-dim">{paperSize}</span>
      </div>

      <span className="print-toolbar-divider" aria-hidden="true" />

      {/* 操作区：导出进行中时整体收敛成一条任务状态，不再和禁用按钮混排 */}
      <div className="print-toolbar-actions">
        {exporting ? (
          <div className="print-export-task" role="status" aria-live="polite">
            <span className="print-export-spinner" aria-hidden="true" />
            <span className="print-export-task-text">{progress || '正在导出…'}</span>
            <Button type="text" size="small" danger onClick={onCancelExport}>取消导出</Button>
          </div>
        ) : (
          <>
            <div className="print-toolbar-group">
              <PrintSettingsButton value={settings} disabled={loading} onChange={onSettingsChange} />

              <Button
                type={debugActive ? 'primary' : 'default'}
                ghost={debugActive}
                onClick={onToggleDebug}
                disabled={loading || !ready}
                aria-pressed={debugActive}
              >
                {debugActive ? '退出检查' : '检查分页'}
              </Button>

              {debugActive && !previewOpen && onOpenPreview && (
                <Button onClick={onOpenPreview} disabled={loading}>打开预览</Button>
              )}
            </div>
            {onOutputFormatChange ? (
              <Dropdown.Button
                className="print-export-control"
                overlayClassName="print-export-menu"
                type="primary"
                disabled={!ready || loading}
                trigger={['click']}
                placement="bottomRight"
                icon={<DownOutlined />}
                onClick={onExport}
                buttonsRender={([action, toggle]) => [action, cloneElement(toggle as React.ReactElement, {
                  'aria-label': '选择导出格式',
                })]}
                menu={{
                  selectable: true,
                  selectedKeys: [outputFormat],
                  items: [
                    { key: 'pdf', label: 'PDF 文档' },
                    { key: 'png', label: 'PNG 分页图片' },
                  ],
                  onClick: ({ key }) => onOutputFormatChange(key as OutputFormat),
                }}
              >
                {outputFormat === 'pdf' ? '导出 PDF' : '导出图片'}
              </Dropdown.Button>
            ) : (
              <Button type="primary" onClick={onExport} disabled={!ready || loading}>导出 PDF</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface PrintObservabilityBannerProps {
  inspection: PrintInspectionResult | null;
  stats?: ObservabilityStats;
  onClose?: () => void;
}

export function PrintObservabilityBanner({
  inspection,
  stats,
  onClose,
}: PrintObservabilityBannerProps) {
  if (!inspection) return null;

  return (
    <div className="print-observability-panel">
      <div className="observability-metrics">
        <span>
          总页数: <strong>{inspection.pages.length} 页</strong>
        </span>
        <span style={{ color: 'var(--line, #cbd5e1)' }}>•</span>
        <span>
          每页正文高度: <strong>{Math.round(inspection.capacity)}px</strong>
        </span>
        <span style={{ color: 'var(--line, #cbd5e1)' }}>•</span>
        <span>
          标记耗时: <strong>{inspection.timing.totalMs.toFixed(1)}ms</strong>
        </span>
      </div>

      <div className="observability-legend">
        <span className="legend-item legend-item-keep">
          <span className="legend-dot" style={{ background: '#ef4444' }} />
          atomic: {stats?.atomic ?? 0}
        </span>
        <span className="legend-item legend-item-break">
          <span className="legend-dot" style={{ background: '#3b82f6' }} />
          splittable: {stats?.splittable ?? 0}
        </span>
        <span className="legend-item legend-item-line">
          ✂️ page-break
        </span>
        {(stats?.ignore ?? 0) > 0 && <span className="legend-item legend-item-ignore">ignore: {stats?.ignore}</span>}
        {onClose && (
          <button
            type="button"
            className="observability-close-btn"
            onClick={onClose}
            title="退出检查"
            aria-label="退出检查"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// 保持向下兼容导出
export interface PrintDebugToolbarProps {
  loading: boolean;
  settings: PrintSettings;
  progress: string;
  report: string;
  onExport: () => void;
  onInspect: () => void;
  onCancel: () => void;
  onSettingsChange: (next: PrintSettings) => void;
}

export function PrintDebugToolbar({
  loading,
  settings,
  progress,
  report,
  onExport,
  onInspect,
  onCancel,
  onSettingsChange,
}: PrintDebugToolbarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <PrintToolbarActions
        loading={loading}
        exporting={loading}
        settings={settings}
        debugActive={false}
        onExport={onExport}
        onToggleDebug={onInspect}
        onCancelExport={onCancel}
        onSettingsChange={onSettingsChange}
      />
      <span role="status" style={{ color: '#64748b', fontSize: 12 }}>
        {progress || report}
      </span>
    </div>
  );
}
