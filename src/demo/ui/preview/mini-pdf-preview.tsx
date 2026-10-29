import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { HtmlPreviewData } from './pdf-preview-modal';
import './mini-pdf-preview.css';

export interface MiniPdfPreviewProps {
  data: HtmlPreviewData | null;
  loading?: boolean;
  onClose?: () => void;
}

export function MiniPdfPreview({ data, loading = false, onClose }: MiniPdfPreviewProps) {
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

  if (!data && !loading) return null;

  const paperWidthPx = data?.geometry.paperWidthPx || 794;

  // 迷你模式下固定等比微缩至 232px；全屏模式下按视窗宽度自适应放大至舒适阅读尺寸
  const baseFullscreenWidth = typeof window !== 'undefined'
    ? Math.min(860, Math.max(540, window.innerWidth * 0.6))
    : 720;

  const currentZoom = fullscreen
    ? baseFullscreenWidth / paperWidthPx
    : 232 / paperWidthPx;

  const handleToggleFullscreen = () => {
    if (minimized) setMinimized(false);
    setFullscreen(prev => !prev);
  };

  return (
    <>
      {fullscreen && (
        <div
          className="mini-pdf-preview-backdrop"
          onClick={() => setFullscreen(false)}
        />
      )}

      <div
        className={`mini-pdf-preview-widget ${fullscreen ? 'is-fullscreen' : ''}`}
        style={{
          width: fullscreen ? 'auto' : minimized ? '200px' : '272px',
        }}
      >
        <div
          className="mini-preview-header"
          onClick={() => !fullscreen && setMinimized(prev => !prev)}
        >
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
            {/* 1. 最小化/折叠按钮 */}
            <button
              className="mini-preview-icon-btn"
              title={minimized ? '展开小窗' : '折叠小窗'}
              onClick={() => {
                if (fullscreen) setFullscreen(false);
                setMinimized(prev => !prev);
              }}
            >
              <MinusOutlined />
            </button>

            {/* 2. 全屏放大 / 退出全屏（还原缩小）按钮 */}
            <button
              className="mini-preview-icon-btn"
              title={fullscreen ? '退出全屏 (Esc)' : '全屏预览'}
              onClick={handleToggleFullscreen}
            >
              {fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>

            {/* 3. 关闭按钮 */}
            {onClose && (
              <button
                className="mini-preview-icon-btn"
                title="关闭预览小窗"
                onClick={() => {
                  if (fullscreen) setFullscreen(false);
                  onClose();
                }}
              >
                <CloseOutlined />
              </button>
            )}
          </div>
        </div>

        {(!minimized || fullscreen) && (
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
                const sheetWidth = paperWidthPx * currentZoom;
                const sheetHeight = paperHeightPx * currentZoom;

                return (
                  <div key={index} className="mini-sheet-container">
                    <div className="mini-sheet-label">
                      P.{index + 1} / {data.pages.length} · {data.paperLabel}
                      {fullscreen && ` · 切片高度 ${Math.round(page.end - page.start)}px`}
                    </div>

                    <div
                      className="mini-page-sheet"
                      style={{
                        width: sheetWidth,
                        height: sheetHeight,
                        padding: `${marginTopPx * currentZoom}px ${marginRightPx * currentZoom}px ${marginBottomPx * currentZoom}px ${marginLeftPx * currentZoom}px`,
                      }}
                    >
                      {/* 页眉 */}
                      {data.headerHtml && (
                        <div
                          className="mini-sheet-header"
                          style={{
                            height: headerHeightPx * currentZoom,
                            width: printableWidthPx * currentZoom,
                          }}
                        >
                          <div
                            style={{
                              width: sourceWidth,
                              transform: `scale(${scale * currentZoom})`,
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
                          width: printableWidthPx * currentZoom,
                          height: sliceHeightPx * currentZoom,
                          maxHeight: sliceHeightPx * currentZoom,
                        }}
                      >
                        <div
                          className="mini-sheet-content"
                          style={{
                            width: sourceWidth,
                            transform: `scale(${scale * currentZoom}) translateY(-${page.start}px)`,
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
                            height: footerHeightPx * currentZoom,
                            width: printableWidthPx * currentZoom,
                          }}
                        >
                          <div
                            style={{
                              width: sourceWidth,
                              transform: `scale(${scale * currentZoom})`,
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
                            right: marginRightPx * currentZoom,
                            bottom: Math.max(3, (marginBottomPx / 3) * currentZoom),
                            fontSize: Math.max(7, 8 * currentZoom),
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
    </>
  );
}
