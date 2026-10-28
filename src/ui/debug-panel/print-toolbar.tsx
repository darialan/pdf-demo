import { Button, Tag } from 'antd';
import { resolvePaper } from '../../core/geometry/paper';
import { PrintSettings } from '../../core/types';
import { PrintSettingsButton } from '../config-panel/settings-panel';
import { ObservabilityStats } from '../preview/page-break-overlay';
import { PrintInspectionResult } from '../../application/print-service';
import './print-toolbar.css';

export interface PrintToolbarActionsProps {
  loading: boolean;
  settings: PrintSettings;
  debugActive: boolean;
  onExport: () => void;
  onToggleDebug: () => void;
  onCancel: () => void;
  onSettingsChange: (next: PrintSettings) => void;
}

export function PrintToolbarActions({
  loading,
  settings,
  debugActive,
  onExport,
  onToggleDebug,
  onCancel,
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
      <Tag color="blue" style={{ margin: 0, padding: '2px 8px', fontSize: 12 }}>
        📄 {paperLabel}
        {settings.slicingMode ? ' · 细切片' : ''}
      </Tag>

      <PrintSettingsButton value={settings} disabled={loading} onChange={onSettingsChange} />

      <Button
        type={debugActive ? 'primary' : 'default'}
        danger={debugActive}
        onClick={onToggleDebug}
        disabled={loading}
      >
        {debugActive ? '✓ 调试中 (点击关闭)' : '🔍 检查分页 (调试)'}
      </Button>

      <Button type="primary" onClick={onExport} loading={loading}>
        导出 PDF
      </Button>

      {loading && (
        <Button onClick={onCancel} danger>
          取消
        </Button>
      )}
    </div>
  );
}

export interface PrintObservabilityBannerProps {
  inspection: PrintInspectionResult | null;
  stats?: ObservabilityStats;
  onClose: () => void;
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
        <span className="observability-status-tag">OBSERVABILITY</span>
        <span>
          Pages: <strong>{inspection.pages.length}</strong>
        </span>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <span>
          Capacity: <strong>{Math.round(inspection.capacity)}px</strong>
        </span>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <span>
          Timing: <strong>{inspection.timing.totalMs.toFixed(1)}ms</strong>
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
        <span className="legend-item legend-item-ignore">
          <span className="legend-dot" style={{ background: '#94a3b8' }} />
          ignore: {stats?.ignore ?? 0}
        </span>
        <span className="legend-item legend-item-line">
          ✂️ page-break
        </span>

        <Button size="small" type="text" onClick={onClose} style={{ marginLeft: 6, fontSize: 11, color: '#64748b' }}>
          ✕ Close
        </Button>
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
        settings={settings}
        debugActive={false}
        onExport={onExport}
        onToggleDebug={onInspect}
        onCancel={onCancel}
        onSettingsChange={onSettingsChange}
      />
      <span role="status" style={{ color: '#64748b', fontSize: 12 }}>
        {progress || report}
      </span>
    </div>
  );
}
