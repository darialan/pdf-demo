import { Button, Modal, Spin, Tag } from 'antd';
import React, { useState } from 'react';
import { cloneWithResolvedStyles } from '../../adapters/dom/snapshot';
import { inspectPrintLayout } from '../../application/print-service';
import { resolvePaper } from '../../core/geometry/paper';
import { PageSlice, PrintSettings } from '../../core/types';
import './pdf-preview-modal.css';

export interface HtmlPaperGeometry {
  paperWidthPx: number;
  paperHeightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  printableWidthPx: number;
  printableHeightPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  sourceWidth: number;
  scale: number;
  slicingMode?: boolean;
}

export interface HtmlPreviewData {
  paperLabel: string;
  pages: PageSlice[];
  geometry: HtmlPaperGeometry;
  sourceHtml: string;
  headerHtml?: string;
  footerHtml?: string;
  totalMs: number;
  filename: string;
}

/**
 * 极速计算虚拟纸张规范（基于物理标准与 96 DPI CSS 像素精确转换）
 */
export function calculateHtmlPaperGeometry(
  settings: PrintSettings,
  sourceElement: HTMLElement,
  headerElement?: HTMLElement | null,
  footerElement?: HTMLElement | null
): HtmlPaperGeometry {
  const paper = resolvePaper(settings);
  const PX_PER_MM = 96 / 25.4;

  const paperWidthPx = paper.widthMm * PX_PER_MM;
  const paperHeightPx = paper.heightMm * PX_PER_MM;
  const marginTopPx = settings.slicingMode ? 0 : settings.marginTopMm * PX_PER_MM;
  const marginRightPx = settings.slicingMode ? 0 : settings.marginRightMm * PX_PER_MM;
  const marginBottomPx = settings.slicingMode ? 0 : settings.marginBottomMm * PX_PER_MM;
  const marginLeftPx = settings.slicingMode ? 0 : settings.marginLeftMm * PX_PER_MM;

  const printableWidthPx = Math.max(10, paperWidthPx - marginLeftPx - marginRightPx);
  const printableHeightPx = Math.max(10, paperHeightPx - marginTopPx - marginBottomPx);

  const sourceWidth = sourceElement.getBoundingClientRect().width || 800;
  const scale = printableWidthPx / sourceWidth;

  const headerHeightPx = (headerElement ? headerElement.getBoundingClientRect().height : 0) * scale;
  const footerHeightPx = (footerElement ? footerElement.getBoundingClientRect().height : 0) * scale;

  return {
    paperWidthPx,
    paperHeightPx,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    printableWidthPx,
    printableHeightPx,
    headerHeightPx,
    footerHeightPx,
    sourceWidth,
    scale,
    slicingMode: settings.slicingMode,
  };
}

/**
 * 构建原生 HTML 虚拟纸张预览数据（仅需几毫秒，彻底摒弃耗时的 Canvas/PDF 逐页光栅化合成）
 */
export async function buildHtmlPreviewData({
  contentElement,
  header,
  footer,
  settings,
  filename,
}: {
  contentElement: HTMLElement;
  header?: HTMLElement | null;
  footer?: HTMLElement | null;
  settings: PrintSettings;
  filename: string;
}): Promise<HtmlPreviewData> {
  const started = performance.now();

  // 1. 毫秒级分页切点计算（纯数学区间计算，耗时通常 < 20ms）
  const inspection = await inspectPrintLayout({
    contentElement,
    header,
    footer,
    settings,
  });

  // 2. 计算标准物理纸张与视窗缩放规格
  const geometry = calculateHtmlPaperGeometry(settings, contentElement, header, footer);

  // 3. 克隆并冻结计算样式，剥离调试遮罩后的纯净 HTML 结构（确保与测量阶段尺寸完全一致）
  const clone = cloneWithResolvedStyles(contentElement);
  const headerClone = header ? cloneWithResolvedStyles(header) : null;
  const footerClone = footer ? cloneWithResolvedStyles(footer) : null;

  const paper = resolvePaper(settings);
  const unitFactor = settings.unit === 'px' ? 96 / 25.4 : 1;
  const displayWidth = Number((paper.widthMm * unitFactor).toFixed(1));
  const displayHeight = Number((paper.heightMm * unitFactor).toFixed(1));
  const paperLabel =
    settings.paper === 'custom'
      ? `自定义 · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`
      : `${settings.paper.toUpperCase()} · ${displayWidth} × ${displayHeight} ${settings.unit || 'mm'}`;

  return {
    paperLabel,
    pages: inspection.pages,
    geometry,
    sourceHtml: clone.outerHTML,
    headerHtml: headerClone ? headerClone.outerHTML : undefined,
    footerHtml: footerClone ? footerClone.outerHTML : undefined,
    totalMs: performance.now() - started,
    filename,
  };
}

export interface PdfPreviewModalProps {
  open: boolean;
  loading?: boolean;
  previewData?: HtmlPreviewData | null;
  onClose: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

export function PdfPreviewModal({
  open,
  loading = false,
  previewData,
  onClose,
  onExport,
  onRefresh,
}: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(0.85);

  const handleZoomIn = () => setZoom(prev => Math.min(1.5, Number((prev + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))));
  const handleZoomReset = () => setZoom(0.85);

  return (
    <Modal
      className="pdf-preview-modal"
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ maxWidth: 1360, top: 16 }}
      destroyOnClose={false}
      closable={false}
    >
      <div className="pdf-preview-header">
        <div className="pdf-preview-title-area">
          <span className="pdf-preview-title">📄 打印效果预览 (HTML 虚拟纸张)</span>
          <div className="pdf-preview-tags">
            {previewData?.paperLabel && (
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                {previewData.paperLabel}
              </Tag>
            )}
            {previewData && (
              <>
                <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                  共 {previewData.pages.length} 页
                </Tag>
                <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                  即时渲染: {previewData.totalMs.toFixed(0)}ms
                </Tag>
              </>
            )}
          </div>
        </div>

        {/* 缩放控制器 */}
        <div className="pdf-preview-center-controls">
          <Button size="small" type="text" onClick={handleZoomOut} disabled={zoom <= 0.4}>
            －
          </Button>
          <span className="pdf-preview-zoom-text">{Math.round(zoom * 100)}%</span>
          <Button size="small" type="text" onClick={handleZoomIn} disabled={zoom >= 1.5}>
            ＋
          </Button>
          <Button size="small" type="link" onClick={handleZoomReset} style={{ fontSize: 11, padding: '0 4px' }}>
            适应
          </Button>
        </div>

        <div className="pdf-preview-actions">
          {onRefresh && (
            <Button size="small" onClick={onRefresh} disabled={loading}>
              🔄 重新排版
            </Button>
          )}
          {onExport && (
            <Button size="small" type="primary" onClick={onExport} disabled={loading}>
              ⬇️ 导出真实 PDF
            </Button>
          )}
          <Button size="small" onClick={onClose}>
            ✕ 关闭
          </Button>
        </div>
      </div>

      <div className="html-preview-workspace">
        {loading && (
          <div className="pdf-preview-loading">
            <Spin size="large" />
            <div className="pdf-preview-loading-text">正在计算物理纸张排版与切片视窗…</div>
          </div>
        )}

        {previewData && previewData.pages.length > 0 ? (
          previewData.pages.map((page, index) => (
            <HtmlPageSheet
              key={index}
              pageIndex={index}
              totalPages={previewData.pages.length}
              page={page}
              geometry={previewData.geometry}
              sourceHtml={previewData.sourceHtml}
              headerHtml={previewData.headerHtml}
              footerHtml={previewData.footerHtml}
              zoom={zoom}
            />
          ))
        ) : (
          !loading && (
            <div className="pdf-preview-empty">
              <span>暂无预览数据</span>
              {onRefresh && (
                <Button type="primary" size="small" onClick={onRefresh}>
                  重新生成
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

export function HtmlPageSheet({
  pageIndex,
  totalPages,
  page,
  geometry,
  sourceHtml,
  headerHtml,
  footerHtml,
  zoom,
}: {
  pageIndex: number;
  totalPages: number;
  page: PageSlice;
  geometry: HtmlPaperGeometry;
  sourceHtml: string;
  headerHtml?: string;
  footerHtml?: string;
  zoom: number;
}) {
  const {
    paperWidthPx,
    paperHeightPx,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    printableWidthPx,
    headerHeightPx,
    footerHeightPx,
    sourceWidth,
    scale,
    slicingMode,
  } = geometry;

  const sliceHeightPx = (page.end - page.start) * scale;

  return (
    <div className="html-page-sheet-container">
      <div className="html-page-sheet-header-badge">
        第 {pageIndex + 1} 页 / 共 {totalPages} 页 · 切片高度 {Math.round(page.end - page.start)}px
      </div>

      <div
        className="html-page-sheet"
        style={{
          width: paperWidthPx * zoom,
          height: paperHeightPx * zoom,
          padding: `${marginTopPx * zoom}px ${marginRightPx * zoom}px ${marginBottomPx * zoom}px ${marginLeftPx * zoom}px`,
        }}
      >
        {/* 页眉 */}
        {headerHtml && (
          <div
            className="html-sheet-header-box"
            style={{
              height: headerHeightPx * zoom,
              width: printableWidthPx * zoom,
            }}
          >
            <div
              style={{
                width: sourceWidth,
                transform: `scale(${scale * zoom})`,
                transformOrigin: 'top left',
              }}
              dangerouslySetInnerHTML={{ __html: headerHtml }}
            />
          </div>
        )}

        {/* 正文切片视窗 */}
        <div
          className="html-sheet-body-viewport"
          style={{
            width: printableWidthPx * zoom,
            height: sliceHeightPx * zoom,
            maxHeight: sliceHeightPx * zoom,
          }}
        >
          <div
            className="html-sheet-body-content"
            style={{
              width: sourceWidth,
              transform: `scale(${scale * zoom}) translateY(-${page.start}px)`,
              transformOrigin: 'top left',
            }}
            dangerouslySetInnerHTML={{ __html: sourceHtml }}
          />
        </div>

        {/* 页脚 */}
        {footerHtml && (
          <div
            className="html-sheet-footer-box"
            style={{
              height: footerHeightPx * zoom,
              width: printableWidthPx * zoom,
            }}
          >
            <div
              style={{
                width: sourceWidth,
                transform: `scale(${scale * zoom})`,
                transformOrigin: 'top left',
              }}
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          </div>
        )}

        {/* 页码 */}
        {!slicingMode && (
          <div
            className="html-sheet-page-number"
            style={{
              right: marginRightPx * zoom,
              bottom: Math.max(4, (marginBottomPx / 3) * zoom),
              fontSize: Math.max(9, 10 * zoom),
            }}
          >
            {pageIndex + 1} / {totalPages}
          </div>
        )}
      </div>
    </div>
  );
}
