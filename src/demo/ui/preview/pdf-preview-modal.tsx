import {
  calculateGeometry,
  prepareLayout,
  serializePrintSnapshot,
  namespacePreviewHtml,
  PageNumberConfig,
  PageSlice,
  PrintSettings,
  resolvePaper,
} from '../../../lib';
import { Button, Modal, Spin, Tag } from 'antd';
import React, { useId, useMemo, useState } from 'react';
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
  bodyTopPx?: number;
  footerTopPx?: number;
  pageNumberYPx?: number;
  pageNumber?: PageNumberConfig;
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
  const marginTopPx = settings.marginTopMm * PX_PER_MM;
  const marginRightPx = settings.marginRightMm * PX_PER_MM;
  const marginBottomPx = settings.marginBottomMm * PX_PER_MM;
  const marginLeftPx = settings.marginLeftMm * PX_PER_MM;

  const printableWidthPx = Math.max(10, paperWidthPx - marginLeftPx - marginRightPx);
  const printableHeightPx = Math.max(10, paperHeightPx - marginTopPx - marginBottomPx);

  const sourceWidth = sourceElement.getBoundingClientRect().width;
  const scale = printableWidthPx / sourceWidth;

  const layout = calculateGeometry(paper, sourceWidth, headerElement?.getBoundingClientRect().height,
    footerElement?.getBoundingClientRect().height, settings.pageNumber ?? true);
  const headerHeightPx = layout.headerHeight * 4 / 3;
  const footerHeightPx = layout.footerHeight * 4 / 3;

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
    bodyTopPx: layout.bodyTop * 4 / 3,
    footerTopPx: layout.footerY * 4 / 3,
    pageNumberYPx: layout.pageNumberY * 4 / 3,
    pageNumber: settings.pageNumber,
  };
}

/** Preview and export use the same frozen DOM, resource readiness, planner and paper geometry. */
export async function buildHtmlPreviewData({ contentElement, header, footer, settings, filename, signal }: {
  contentElement: HTMLElement;
  header?: HTMLElement | null;
  footer?: HTMLElement | null;
  settings: PrintSettings;
  filename: string;
  signal?: AbortSignal;
}): Promise<HtmlPreviewData> {
  const started = performance.now();
  const layout = await prepareLayout({ element: contentElement, header, footer, settings, signal });
  try {
    const geometry = calculateHtmlPaperGeometry(settings, layout.root, layout.header, layout.footer);
    const paper = resolvePaper(settings);
    const factor = settings.unit === 'px' ? 96 / 25.4 : 1;
    const paperLabel = `${settings.paper === 'custom' ? '自定义' : settings.paper.toUpperCase()} · ${Number((paper.widthMm * factor).toFixed(1))} × ${Number((paper.heightMm * factor).toFixed(1))} ${settings.unit || 'mm'}`;
    return {
      paperLabel, pages: layout.pages, geometry,
      sourceHtml: serializePrintSnapshot(layout.root),
      headerHtml: layout.header ? serializePrintSnapshot(layout.header) : undefined,
      footerHtml: layout.footer ? serializePrintSnapshot(layout.footer) : undefined,
      totalMs: performance.now() - started, filename,
    };
  } finally { layout.cleanup(); }
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
    pageNumber, bodyTopPx = marginTopPx + headerHeightPx,
    footerTopPx = paperHeightPx - marginBottomPx - footerHeightPx,
    pageNumberYPx = paperHeightPx - marginBottomPx / 2,
  } = geometry;

  const id = useId().replace(/:/g, '');
  const sourceMarkup = useMemo(() => namespacePreviewHtml(sourceHtml, `sheet-${id}-body`), [sourceHtml, id]);
  const headerMarkup = useMemo(() => namespacePreviewHtml(headerHtml || '', `sheet-${id}-header`), [headerHtml, id]);
  const footerMarkup = useMemo(() => namespacePreviewHtml(footerHtml || '', `sheet-${id}-footer`), [footerHtml, id]);
  const sliceHeightPx = (page.end - page.start) * scale;
  const showPageNumber = pageNumber?.enabled !== false;
  const pageNumberText =
    pageNumber?.format === 'chinese'
      ? `第 ${pageIndex + 1} 页 / 共 ${totalPages} 页`
      : pageNumber?.format === 'hyphen'
      ? `- ${pageIndex + 1} -`
      : `${pageIndex + 1} / ${totalPages}`;
  const isCenter = pageNumber?.position === 'bottom-center' || pageNumber?.position === 'top-center';

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
              position: 'absolute', top: marginTopPx * zoom,
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
              dangerouslySetInnerHTML={{ __html: headerMarkup }}
            />
          </div>
        )}

        {/* 正文切片视窗 */}
        <div
          className="html-sheet-body-viewport"
          style={{
            width: printableWidthPx * zoom,
            position: 'absolute', top: bodyTopPx * zoom,
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
            dangerouslySetInnerHTML={{ __html: sourceMarkup }}
          />
        </div>

        {/* 页脚 */}
        {footerHtml && (
          <div
            className="html-sheet-footer-box"
            style={{
              position: 'absolute', top: footerTopPx * zoom,
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
              dangerouslySetInnerHTML={{ __html: footerMarkup }}
            />
          </div>
        )}

        {/* 页码 */}
        {showPageNumber && (
          <div
            className="html-sheet-page-number"
            style={{
              ...(isCenter
                ? { left: '50%', transform: 'translateX(-50%)' }
                : { right: marginRightPx * zoom }),
              top: (pageNumberYPx - 12) * zoom,
              fontSize: 12 * zoom,
              lineHeight: 1,
            }}
          >
            {pageNumberText}
          </div>
        )}
      </div>
    </div>
  );
}
