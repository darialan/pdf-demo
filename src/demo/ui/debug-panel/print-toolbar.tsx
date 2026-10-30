import {
  ObservabilityStats,
  PrintInspectionResult,
  PrintSettings,
  resolvePaper,
} from '../../../lib';
import { Button } from 'antd';
import { PrintSettingsButton } from '../config-panel/settings-panel';
import './print-toolbar.css';

export interface PrintToolbarActionsProps {
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

  const paperLabel =
    settings.paper === 'custom'
      ? `自定义 · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`
      : `${settings.paper.toUpperCase()} · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`;

  return (
    <div className="print-tab-bar-extra">
      <span className="print-paper-badge">
        📄 {paperLabel}
      </span>

      <PrintSettingsButton value={settings} disabled={loading} onChange={onSettingsChange} />

      <Button
        type={debugActive ? 'primary' : 'default'}
        danger={debugActive}
        onClick={onToggleDebug}
        disabled={loading}
      >
        {debugActive ? '退出检查' : '🔍 检查分页'}
      </Button>

      <Button type="primary" onClick={onExport} loading={exporting} disabled={loading && !exporting}>
        导出 PDF
      </Button>

      {exporting && (
        <Button onClick={onCancelExport} danger>
          取消
        </Button>
      )}
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
          版面容量: <strong>{Math.round(inspection.capacity)}px</strong>
        </span>
        <span style={{ color: 'var(--line, #cbd5e1)' }}>•</span>
        <span>
          测量耗时: <strong>{inspection.timing.totalMs.toFixed(1)}ms</strong>
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
