import { Spin } from 'antd';
import React, { useState } from 'react';
import { HtmlPreviewData } from './pdf-preview-modal';
import './mini-pdf-preview.css';

export interface MiniPdfPreviewProps {
  data: HtmlPreviewData | null;
  loading?: boolean;
  onClose?: () => void;
}

export function MiniPdfPreview({ data, loading = false, onClose }: MiniPdfPreviewProps) {
  const [minimized, setMinimized] = useState(false);

  if (!data && !loading) return null;

  const targetWidth = 232;
  const paperWidthPx = data?.geometry.paperWidthPx || 794;
  const miniZoom = targetWidth / paperWidthPx;

  return (
    <div
      className="mini-pdf-preview-widget"
      style={{
        width: minimized ? '200px' : '272px',
      }}
    >
      <div className="mini-preview-header" onClick={() => setMinimized(prev => !prev)}>
        <div className="mini-preview-title-wrap">
          <span>📄 纸张预览</span>
          {data && (
            <span className="mini-preview-badge">
              {data.pages.length} 页
            </span>
          )}
        </div>

        <div
          className="mini-preview-header-actions"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="mini-preview-icon-btn"
            title={minimized ? '展开小窗' : '折叠小窗'}
            onClick={() => setMinimized(prev => !prev)}
          >
            {minimized ? '▢' : '—'}
          </button>
          {onClose && (
            <button
              className="mini-preview-icon-btn"
              title="关闭预览小窗"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <div className="mini-preview-body">
          {loading && (
            <div className="mini-preview-loading">
              <Spin size="small" />
              <span style={{ marginLeft: 8 }}>计算分页中…</span>
            </div>
          )}

          {data &&
            data.pages.map((page, index) => {
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
              } = data.geometry;

              const sliceHeightPx = (page.end - page.start) * scale;
              const sheetWidth = paperWidthPx * miniZoom;
              const sheetHeight = paperHeightPx * miniZoom;

              return (
                <div key={index} className="mini-sheet-container">
                  <div className="mini-sheet-label">
                    P.{index + 1} / {data.pages.length} · {data.paperLabel}
                  </div>

                  <div
                    className="mini-page-sheet"
                    style={{
                      width: sheetWidth,
                      height: sheetHeight,
                      padding: `${marginTopPx * miniZoom}px ${marginRightPx * miniZoom}px ${marginBottomPx * miniZoom}px ${marginLeftPx * miniZoom}px`,
                    }}
                  >
                    {/* 页眉 */}
                    {data.headerHtml && (
                      <div
                        className="mini-sheet-header"
                        style={{
                          height: headerHeightPx * miniZoom,
                          width: printableWidthPx * miniZoom,
                        }}
                      >
                        <div
                          style={{
                            width: sourceWidth,
                            transform: `scale(${scale * miniZoom})`,
                            transformOrigin: 'top left',
                          }}
                          dangerouslySetInnerHTML={{ __html: data.headerHtml }}
                        />
                      </div>
                    )}

                    {/* 正文切片视窗 */}
                    <div
                      className="mini-sheet-viewport"
                      style={{
                        width: printableWidthPx * miniZoom,
                        height: sliceHeightPx * miniZoom,
                      }}
                    >
                      <div
                        className="mini-sheet-content"
                        style={{
                          width: sourceWidth,
                          transform: `scale(${scale * miniZoom}) translateY(-${page.start}px)`,
                          transformOrigin: 'top left',
                        }}
                        dangerouslySetInnerHTML={{ __html: data.sourceHtml }}
                      />
                    </div>

                    {/* 页脚 */}
                    {data.footerHtml && (
                      <div
                        className="mini-sheet-footer"
                        style={{
                          height: footerHeightPx * miniZoom,
                          width: printableWidthPx * miniZoom,
                        }}
                      >
                        <div
                          style={{
                            width: sourceWidth,
                            transform: `scale(${scale * miniZoom})`,
                            transformOrigin: 'top left',
                          }}
                          dangerouslySetInnerHTML={{ __html: data.footerHtml }}
                        />
                      </div>
                    )}

                    {/* 页码 */}
                    {!slicingMode && (
                      <div
                        className="mini-sheet-page-num"
                        style={{
                          right: marginRightPx * miniZoom,
                          bottom: Math.max(3, (marginBottomPx / 3) * miniZoom),
                          fontSize: Math.max(7, 8 * miniZoom),
                        }}
                      >
                        {index + 1} / {data.pages.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
