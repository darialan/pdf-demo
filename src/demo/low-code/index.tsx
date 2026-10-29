import React, { useEffect, useState } from 'react';
import { clearPageBreaks } from '@darialan/web-pdf-printer';

export const LOW_CODE_CONTENT_ID = 'print-content-lowcode';
export const LOW_CODE_HEADER_ID = 'print-header-lowcode';
export const LOW_CODE_FOOTER_ID = 'print-footer-lowcode';

export type WebMaterialType =
  | 'bento-card'
  | 'chart-widget'
  | 'complex-table'
  | 'float-media-text'
  | 'timeline-feed'
  | 'kv-matrix'
  | 'stamp-box'
  | 'free-box';

export type BlockPolicy =
  | 'atomic'
  | 'splittable'
  | 'ignore'
  | 'default'
  | 'keep-together'
  | 'keep-or-split'
  | 'force-split';

export interface LowCodeBlock {
  id: string;
  type: WebMaterialType;
  label: string;
  policy: BlockPolicy;
  widthPx: number;
  minHeightPx: number;
  rowCount?: number;
  oversizedRowLines?: number;
  itemCount?: number;
}

interface MaterialMeta {
  type: WebMaterialType;
  title: string;
  badge: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultPolicy: BlockPolicy;
  extra?: Partial<LowCodeBlock>;
}

export const WEB_MATERIALS: MaterialMeta[] = [
  {
    type: 'bento-card',
    title: '指标看板卡',
    badge: 'Bento',
    defaultWidth: 280,
    defaultHeight: 190,
    defaultPolicy: 'atomic',
  },
  {
    type: 'chart-widget',
    title: 'SVG 统计图表',
    badge: 'Chart',
    defaultWidth: 580,
    defaultHeight: 220,
    defaultPolicy: 'atomic',
  },
  {
    type: 'timeline-feed',
    title: '纵向时间轴流',
    badge: 'Timeline',
    defaultWidth: 340,
    defaultHeight: 320,
    defaultPolicy: 'atomic',
    extra: { itemCount: 4 },
  },
  {
    type: 'float-media-text',
    title: '图文环绕混排',
    badge: 'Float',
    defaultWidth: 520,
    defaultHeight: 240,
    defaultPolicy: 'splittable',
  },
  {
    type: 'complex-table',
    title: '跨行列复合表',
    badge: 'Table',
    defaultWidth: 880,
    defaultHeight: 260,
    defaultPolicy: 'splittable',
    extra: { rowCount: 5, oversizedRowLines: 8 },
  },
  {
    type: 'kv-matrix',
    title: '异构键值网格',
    badge: 'Matrix',
    defaultWidth: 540,
    defaultHeight: 180,
    defaultPolicy: 'atomic',
  },
  {
    type: 'stamp-box',
    title: '签章与批注盒',
    badge: 'Stamp',
    defaultWidth: 320,
    defaultHeight: 180,
    defaultPolicy: 'atomic',
  },
  {
    type: 'free-box',
    title: '自由尺寸容器',
    badge: 'FreeBox',
    defaultWidth: 420,
    defaultHeight: 200,
    defaultPolicy: 'splittable',
  },
];

let uidSeed = 200;
const createId = (type: string) => `${type}-${++uidSeed}`;

/** 默认初始画布：错落不等高、不同宽度的复杂 Web 混排布局 */
export const INITIAL_STAGGERED_BLOCKS: LowCodeBlock[] = [
  {
    id: 'init-bento',
    type: 'bento-card',
    label: '核心指标卡',
    policy: 'atomic',
    widthPx: 290,
    minHeightPx: 210,
  },
  {
    id: 'init-chart',
    type: 'chart-widget',
    label: '趋势统计图',
    policy: 'atomic',
    widthPx: 570,
    minHeightPx: 250,
  },
  {
    id: 'init-timeline',
    type: 'timeline-feed',
    label: '节点流转记录',
    policy: 'atomic',
    widthPx: 350,
    minHeightPx: 340,
    itemCount: 4,
  },
  {
    id: 'init-float',
    type: 'float-media-text',
    label: '图文环绕批注',
    policy: 'splittable',
    widthPx: 510,
    minHeightPx: 260,
  },
  {
    id: 'init-table',
    type: 'complex-table',
    label: '复合表头明细',
    policy: 'splittable',
    widthPx: 874,
    minHeightPx: 280,
    rowCount: 5,
    oversizedRowLines: 10,
  },
  {
    id: 'init-kv',
    type: 'kv-matrix',
    label: '异构参数矩阵',
    policy: 'atomic',
    widthPx: 530,
    minHeightPx: 185,
  },
  {
    id: 'init-stamp',
    type: 'stamp-box',
    label: '电子签章盒',
    policy: 'atomic',
    widthPx: 330,
    minHeightPx: 185,
  },
];

function policyAttrs(block: LowCodeBlock): Record<string, string | undefined> {
  const policy = block.policy;
  if (policy === 'atomic' || (policy as string) === 'keep-together') {
    return {
      'data-pdf-atomic': 'true',
      'data-pdf-keep-together': 'true',
      'data-pdf-label': block.label,
    };
  }
  if (
    policy === 'splittable' ||
    (policy as string) === 'force-split' ||
    (policy as string) === 'keep-or-split'
  ) {
    return {
      'data-pdf-splittable': 'true',
      'data-pdf-break': 'split',
      'data-pdf-label': block.label,
    };
  }
  if (policy === 'ignore') {
    return { 'data-pdf-ignore': 'true' };
  }
  return {};
}

function renderMaterialContent(block: LowCodeBlock) {
  switch (block.type) {
    case 'bento-card':
      return (
        <div
          style={{
            minHeight: block.minHeightPx,
            padding: 16,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>吞吐达成率 (点击可直接改字)</span>
              <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 10 }}>
                +18.4%
              </span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5, marginBottom: 8 }}>
              98.62<span style={{ fontSize: 16, fontWeight: 500, color: '#64748b' }}>%</span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6, color: '#475569' }}>
              不规则高度窄卡片，与右侧宽图表形成错位并排，检验交错 Y 轴区间的跨页退让。
            </p>
          </div>
          <div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', background: '#2563eb' }} />
            </div>
          </div>
        </div>
      );

    case 'chart-widget': {
      const svgH = Math.max(110, block.minHeightPx - 76);
      return (
        <figure
          style={{
            minHeight: block.minHeightPx,
            margin: 0,
            padding: 16,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, outline: 'none' }}
          >
            <strong style={{ fontSize: 14, color: '#0f172a' }}>多维峰值趋势图 (SVG 矢量画布)</strong>
            <span style={{ fontSize: 12, color: '#64748b' }}>支持右下角拖拽拉伸任意高度</span>
          </div>
          <svg
            width="100%"
            height={svgH}
            viewBox="0 0 520 160"
            preserveAspectRatio="none"
            style={{ display: 'block', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}
          >
            <line x1="20" y1="40" x2="500" y2="40" stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1="20" y1="85" x2="500" y2="85" stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1="20" y1="130" x2="500" y2="130" stroke="#cbd5e1" />
            {[45, 115, 185, 255, 325, 395, 465].map((x, i) => {
              const barH = [65, 95, 52, 110, 84, 102, 76][i];
              return (
                <g key={x}>
                  <rect x={x - 16} y={130 - barH} width="32" height={barH} fill={i === 3 ? '#2563eb' : '#93c5fd'} rx="2" />
                  <text x={x} y="148" textAnchor="middle" fontSize="10" fill="#64748b">
                    Q{i + 1}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.5"
              points="45,70 115,42 185,82 255,24 325,52 395,30 465,58"
            />
          </svg>
        </figure>
      );
    }

    case 'timeline-feed': {
      const count = block.itemCount ?? 4;
      return (
        <section
          style={{
            minHeight: block.minHeightPx,
            padding: 16,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
          }}
          contentEditable
          suppressContentEditableWarning
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>
            异步事件流 (不等高子项树)
          </div>
          <div style={{ borderLeft: '2px solid #3b82f6', paddingLeft: 14, marginLeft: 6 }}>
            {Array.from({ length: count }, (_, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  marginBottom: idx === count - 1 ? 0 : 12,
                  padding: '8px 10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: -20,
                    top: 12,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#2563eb',
                  }}
                />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                  阶段节点 #{idx + 1} · 10:2{idx} AM
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.55, color: '#475569' }}>
                  可直接在画布内编辑或回车增加多行文字，制造任意子项高度差。
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case 'float-media-text':
      return (
        <article
          style={{
            minHeight: block.minHeightPx,
            padding: 16,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
          contentEditable
          suppressContentEditableWarning
        >
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#0f172a' }}>
            图文环绕与多字号富文本混排
          </h3>
          <svg
            width="140"
            height="105"
            viewBox="0 0 140 105"
            style={{
              float: 'left',
              margin: '2px 14px 8px 0',
              border: '1px solid #93c5fd',
              background: '#eff6ff',
              borderRadius: 4,
            }}
          >
            <circle cx="48" cy="45" r="24" fill="#60a5fa" opacity="0.7" />
            <polygon points="75,20 120,85 35,85" fill="#2563eb" opacity="0.65" />
            <text x="70" y="98" textAnchor="middle" fontSize="10" fill="#1e3a8a">
              Float SVG
            </text>
          </svg>
          <p style={{ margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.8, color: '#1e293b' }}>
            浮动图形与多字号文本环绕结构：包含{' '}
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8' }}>18px 高亮内联标签</span>、上标注释
            <sup>[A1]</sup>、行内代码 <code style={{ background: '#f1f5f9', padding: '1px 5px' }}>float: left</code>{' '}
            以及中英混合长句 Typography kerning &amp; line-box measurement。
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: '#334155' }}>
            点击此处可直接输入或粘贴大段文字。分页引擎不仅保护左侧浮动 SVG 图形不被横向切断，还能对环绕在右侧和下方的每一行文字单独计算行盒边界。
          </p>
        </article>
      );

    case 'complex-table': {
      const rows = block.rowCount ?? 5;
      const oversizedLines = block.oversizedRowLines ?? 0;
      const cell: React.CSSProperties = {
        border: '1px solid #cbd5e1',
        padding: '6px 10px',
        fontSize: 12.5,
        lineHeight: 1.55,
        verticalAlign: 'top',
      };
      return (
        <div
          style={{
            minHeight: block.minHeightPx,
            padding: 14,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <table
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
            contentEditable
            suppressContentEditableWarning
          >
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th rowSpan={2} style={{ ...cell, width: 80, textAlign: 'left' }}>
                  分组 / ID
                </th>
                <th colSpan={2} style={{ ...cell, textAlign: 'center' }}>
                  复合双层表头 (ColSpan = 2)
                </th>
                <th rowSpan={2} style={{ ...cell, width: 100, textAlign: 'right' }}>
                  状态权重
                </th>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...cell, width: 150, textAlign: 'left' }}>模块分类</th>
                <th style={{ ...cell, textAlign: 'left' }}>动态可编辑内容明细</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  <td style={cell}>ROW-{String(i + 1).padStart(2, '0')}</td>
                  <td style={cell}>常规原子行</td>
                  <td style={cell}>双击单元格可直接编辑文字或换行，测试不等高表格行跨页退让</td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>{(i + 1) * 15}%</td>
                </tr>
              ))}
              {oversizedLines > 0 && (
                <tr>
                  <td style={cell}>OVER-01</td>
                  <td style={cell}>
                    <strong style={{ color: '#b91c1c' }}>超高跨页行</strong>
                  </td>
                  <td style={cell}>
                    {Array.from({ length: oversizedLines }, (_, lineIdx) => (
                      <p key={lineIdx} style={{ margin: '0 0 4px', lineHeight: 1.55 }}>
                        [{lineIdx + 1}] 超长单元格段落：当单行高度超过整页容量时，自动降级进入内部按文字行拆分。
                      </p>
                    ))}
                  </td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>SPLIT</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    case 'kv-matrix':
      return (
        <div
          style={{
            minHeight: block.minHeightPx,
            padding: 14,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
          }}
          contentEditable
          suppressContentEditableWarning
        >
          {[
            ['拓扑架构', '主备双活多可用区集群'],
            ['渲染管线', '离屏快照 + 按页受控光栅化'],
            ['峰值内存约束', '单页 Canvas ≤ 8,000,000 px'],
            ['坐标精度', 'CSS 像素与 PDF pt 线性映射'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{v}</div>
            </div>
          ))}
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '8px 10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 4,
              fontSize: 12,
              color: '#92400e',
            }}
          >
            跨列备注项：点击任意区域可直接增删文字，或拖拽右下角手柄改变网格宽高。
          </div>
        </div>
      );

    case 'stamp-box':
      return (
        <div
          style={{
            minHeight: block.minHeightPx,
            padding: 16,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          contentEditable
          suppressContentEditableWarning
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              联合会签与电子印章区
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              默认开启原子化保护（atomic），严禁分页线将印章或签名劈成两半。
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#334155' }}>
              <div>签署人：Alex Chen</div>
              <div>日期：2026-10-28</div>
            </div>
            <svg width="78" height="78" viewBox="0 0 90 90" style={{ display: 'block' }}>
              <circle cx="45" cy="45" r="40" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="5 2" />
              <circle cx="45" cy="45" r="34" fill="none" stroke="#dc2626" strokeWidth="1" />
              <text x="45" y="42" textAnchor="middle" fontSize="11" fill="#dc2626" fontWeight="bold">
                电子核准章
              </text>
              <text x="45" y="58" textAnchor="middle" fontSize="9" fill="#dc2626">
                VERIFIED
              </text>
            </svg>
          </div>
        </div>
      );

    case 'free-box':
      return (
        <div
          style={{
            minHeight: block.minHeightPx,
            padding: 16,
            border: '2px dashed #64748b',
            borderRadius: 6,
            background: 'repeating-linear-gradient(135deg, #f8fafc 0px, #f8fafc 12px, #f1f5f9 12px, #f1f5f9 24px)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          contentEditable
          suppressContentEditableWarning
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            {block.label}（{block.widthPx}px × {block.minHeightPx}px）
          </div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            拖拽右下角蓝色手柄可任意拉宽、拉高，或直接在此处输入任意内容，制造错位排版与临界压线场景。
          </div>
        </div>
      );
  }
}

export function LowCodePage() {
  const [blocks, setBlocks] = useState<LowCodeBlock[]>(INITIAL_STAGGERED_BLOCKS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_STAGGERED_BLOCKS[0].id);
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [draggedPaletteType, setDraggedPaletteType] = useState<WebMaterialType | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const notifyMutated = () => {
    clearPageBreaks();
  };

  const addMaterial = (meta: MaterialMeta, insertIndex?: number) => {
    notifyMutated();
    const created: LowCodeBlock = {
      id: createId(meta.type),
      type: meta.type,
      label: meta.title,
      policy: meta.defaultPolicy,
      widthPx: meta.defaultWidth,
      minHeightPx: meta.defaultHeight,
      ...meta.extra,
    };
    setBlocks(prev => {
      if (insertIndex === undefined || insertIndex < 0 || insertIndex > prev.length) {
        return [...prev, created];
      }
      const next = [...prev];
      next.splice(insertIndex, 0, created);
      return next;
    });
    setSelectedId(created.id);
  };

  const updateBlock = (id: string, patch: Partial<LowCodeBlock>) => {
    notifyMutated();
    setBlocks(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const moveBlock = (id: string, delta: -1 | 1) => {
    notifyMutated();
    setBlocks(prev => {
      const idx = prev.findIndex(item => item.id === id);
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const duplicateBlock = (id: string) => {
    notifyMutated();
    setBlocks(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx < 0) return prev;
      const copy: LowCodeBlock = {
        ...prev[idx],
        id: createId(prev[idx].type),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      setSelectedId(copy.id);
      return next;
    });
  };

  const removeBlock = (id: string) => {
    notifyMutated();
    setBlocks(prev => {
      const next = prev.filter(item => item.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id || '');
      return next;
    });
  };

  /** 画布内直接拖拽右下角手柄缩放宽高 */
  const startResize = (e: React.MouseEvent, block: LowCodeBlock) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(block.id);
    notifyMutated();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = block.widthPx;
    const startH = block.minHeightPx;

    const onMove = (moveEvent: MouseEvent) => {
      const nextW = Math.max(180, Math.min(880, Math.round(startW + (moveEvent.clientX - startX))));
      const nextH = Math.max(80, Math.min(1600, Math.round(startH + (moveEvent.clientY - startY))));
      setBlocks(prev =>
        prev.map(item => (item.id === block.id ? { ...item, widthPx: nextW, minHeightPx: nextH } : item))
      );
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    return () => clearPageBreaks();
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
        padding: '4px 0 24px',
      }}
    >
      {/* 左侧：复杂 Web 物料面板 */}
      <aside
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#fafafa',
          position: 'sticky',
          top: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#111827' }}>复杂页面物料</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {WEB_MATERIALS.map(meta => (
            <div
              key={meta.type}
              draggable
              onDragStart={() => setDraggedPaletteType(meta.type)}
              onDragEnd={() => setDraggedPaletteType(null)}
              onClick={() => addMaterial(meta)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '7px 10px',
                background: '#fff',
                cursor: 'grab',
                fontSize: 12.5,
              }}
            >
              <span style={{ color: '#1f2937', fontWeight: 500 }}>+ {meta.title}</span>
              <span style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '1px 5px', borderRadius: 4 }}>
                {meta.badge}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: '#4b5563' }}>画布装饰</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={headerEnabled}
                onChange={e => {
                  notifyMutated();
                  setHeaderEnabled(e.target.checked);
                }}
              />
              <span>页眉</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={footerEnabled}
                onChange={e => {
                  notifyMutated();
                  setFooterEnabled(e.target.checked);
                }}
              />
              <span>页脚</span>
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              notifyMutated();
              setBlocks(INITIAL_STAGGERED_BLOCKS);
              setSelectedId(INITIAL_STAGGERED_BLOCKS[0].id);
            }}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 5,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            重置错落混排布局
          </button>
          <button
            type="button"
            onClick={() => {
              notifyMutated();
              setBlocks([]);
              setSelectedId('');
            }}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              border: '1px solid #fca5a5',
              borderRadius: 5,
              background: '#fff',
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            清空画布
          </button>
        </div>
      </aside>

      {/* 右侧主舞台：支持直接拖拽缩放、内联改字、错落自由排列 */}
      <main
        onDragOver={e => e.preventDefault()}
        onDrop={() => {
          if (draggedPaletteType) {
            const meta = WEB_MATERIALS.find(m => m.type === draggedPaletteType);
            if (meta) addMaterial(meta);
            setDraggedPaletteType(null);
          }
        }}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#f8fafc',
          padding: '24px 16px',
          minHeight: 720,
        }}
      >
        <div
          style={{
            maxWidth: 910,
            margin: '0 auto',
            background: '#fff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            padding: 18,
          }}
        >
          {headerEnabled && (
            <div
              id={LOW_CODE_HEADER_ID}
              contentEditable
              suppressContentEditableWarning
              style={{
                padding: '6px 0',
                borderBottom: '1px solid #cbd5e1',
                marginBottom: 14,
                fontSize: 12,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                outline: 'none',
              }}
            >
              <span>可编辑打印页眉（点击直接修改文字）</span>
              <span>COMPLEX-WEB-PRINT</span>
            </div>
          )}

          {/* 真实打印根节点：采用 Flex Wrap 流式多列错落容器，允许任意宽高物料交错并排 */}
          <div
            id={LOW_CODE_CONTENT_ID}
            style={{
              width: 874,
              margin: '0 auto',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: 14,
              boxSizing: 'border-box',
            }}
          >
            {blocks.length === 0 ? (
              <div
                data-pdf-ignore="true"
                style={{
                  width: '100%',
                  padding: '100px 20px',
                  textAlign: 'center',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              >
                点击或拖拽左侧物料到画布（支持画布内直接拖拽右下角缩放宽高、点击文字直接编辑）
              </div>
            ) : (
              blocks.map((block, index) => {
                const isSelected = block.id === selectedId;
                return (
                  <div
                    key={block.id}
                    onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={e => {
                      e.stopPropagation();
                      if (draggedPaletteType) {
                        const meta = WEB_MATERIALS.find(m => m.type === draggedPaletteType);
                        if (meta) addMaterial(meta, index);
                        setDraggedPaletteType(null);
                        return;
                      }
                      if (draggedBlockId && draggedBlockId !== block.id) {
                        notifyMutated();
                        setBlocks(prev => {
                          const fromIdx = prev.findIndex(b => b.id === draggedBlockId);
                          const toIdx = prev.findIndex(b => b.id === block.id);
                          if (fromIdx < 0 || toIdx < 0) return prev;
                          const next = [...prev];
                          const [moved] = next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, moved);
                          return next;
                        });
                        setDraggedBlockId(null);
                      }
                    }}
                    onClick={() => setSelectedId(block.id)}
                    {...policyAttrs(block)}
                    style={{
                      width: block.widthPx,
                      maxWidth: '100%',
                      position: 'relative',
                      outline: isSelected ? '2px solid #2563eb' : '1px solid transparent',
                      outlineOffset: 2,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* 选中态画布内悬浮操作条：直接在画布内改宽度、切换分页策略、增删行、拖拽移动 */}
                    {isSelected && (
                      <div
                        data-pdf-ignore="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: -28,
                          zIndex: 30,
                          display: 'flex',
                          gap: 4,
                          alignItems: 'center',
                          background: '#1e293b',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        <span
                          draggable
                          onDragStart={() => setDraggedBlockId(block.id)}
                          onDragEnd={() => setDraggedBlockId(null)}
                          title="按住拖拽排序"
                          style={{ cursor: 'grab', paddingRight: 4, color: '#93c5fd', fontWeight: 600 }}
                        >
                          ✥ {block.widthPx}×{block.minHeightPx}
                        </span>

                        <select
                          aria-label="跨页保护策略"
                          value={block.policy}
                          onChange={e => updateBlock(block.id, { policy: e.target.value as BlockPolicy })}
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize: 11,
                            background: '#334155',
                            color: '#fff',
                            border: '1px solid #475569',
                            borderRadius: 3,
                            padding: '1px 4px',
                          }}
                        >
                          <option value="atomic">atomic (原子化)</option>
                          <option value="splittable">splittable (可分割)</option>
                          <option value="ignore">ignore (忽略)</option>
                        </select>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            updateBlock(block.id, { widthPx: 280 });
                          }}
                          style={{ cursor: 'pointer', border: 0, background: '#334155', color: '#fff', borderRadius: 2, padding: '1px 4px' }}
                        >
                          1/3宽
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            updateBlock(block.id, { widthPx: 430 });
                          }}
                          style={{ cursor: 'pointer', border: 0, background: '#334155', color: '#fff', borderRadius: 2, padding: '1px 4px' }}
                        >
                          1/2宽
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            updateBlock(block.id, { widthPx: 874 });
                          }}
                          style={{ cursor: 'pointer', border: 0, background: '#334155', color: '#fff', borderRadius: 2, padding: '1px 4px' }}
                        >
                          整行
                        </button>

                        {block.type === 'complex-table' && (
                          <>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                updateBlock(block.id, { rowCount: (block.rowCount ?? 5) + 3 });
                              }}
                              style={{ cursor: 'pointer', border: 0, background: '#2563eb', color: '#fff', borderRadius: 2, padding: '1px 5px' }}
                            >
                              +3行
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                updateBlock(block.id, {
                                  oversizedRowLines: (block.oversizedRowLines ?? 0) > 0 ? 0 : 14,
                                });
                              }}
                              style={{ cursor: 'pointer', border: 0, background: '#0284c7', color: '#fff', borderRadius: 2, padding: '1px 5px' }}
                            >
                              {(block.oversizedRowLines ?? 0) > 0 ? '关超长行' : '+超长行'}
                            </button>
                          </>
                        )}

                        {block.type === 'timeline-feed' && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              updateBlock(block.id, { itemCount: (block.itemCount ?? 4) + 2 });
                            }}
                            style={{ cursor: 'pointer', border: 0, background: '#2563eb', color: '#fff', borderRadius: 2, padding: '1px 5px' }}
                          >
                            +2节点
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={e => {
                            e.stopPropagation();
                            moveBlock(block.id, -1);
                          }}
                          style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#fff', padding: '0 3px' }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={index === blocks.length - 1}
                          onClick={e => {
                            e.stopPropagation();
                            moveBlock(block.id, 1);
                          }}
                          style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#fff', padding: '0 3px' }}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            duplicateBlock(block.id);
                          }}
                          style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#fff', padding: '0 3px' }}
                        >
                          复制
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            removeBlock(block.id);
                          }}
                          style={{ cursor: 'pointer', border: 0, background: 'transparent', color: '#fca5a5', padding: '0 3px' }}
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {renderMaterialContent(block)}

                    {/* 右下角直接拖拽缩放手柄 (data-pdf-ignore="true") */}
                    <div
                      data-pdf-ignore="true"
                      title="拖拽自由缩放宽高"
                      onMouseDown={e => startResize(e, block)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: 16,
                        height: 16,
                        cursor: 'nwse-resize',
                        background: isSelected ? '#2563eb' : 'rgba(148, 163, 184, 0.35)',
                        color: '#fff',
                        fontSize: 10,
                        lineHeight: '16px',
                        textAlign: 'center',
                        borderTopLeftRadius: 4,
                        userSelect: 'none',
                        zIndex: 25,
                      }}
                    >
                      ↘
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {footerEnabled && (
            <div
              id={LOW_CODE_FOOTER_ID}
              contentEditable
              suppressContentEditableWarning
              style={{
                padding: '6px 0',
                borderTop: '1px solid #cbd5e1',
                marginTop: 14,
                fontSize: 12,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                outline: 'none',
              }}
            >
              <span>可编辑打印页脚（点击直接修改文字）</span>
              <span>CONFIDENTIAL</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
