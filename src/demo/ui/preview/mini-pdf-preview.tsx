import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { HtmlPreviewData } from './pdf-preview-modal';
import './mini-pdf-preview.css';

export interface MiniPdfPreviewProps {
  data: HtmlPreviewData | null;
  loading?: boolean;
  onClose?: () => void;
}

/**
 * Rendering every page's full dangerouslySetInnerHTML(sourceHtml) eagerly makes the browser parse
 * and lay out the entire document N times (once per page), which is the dominant cost for long
 * documents with many pages. Mounting each page's heavy content lazily — only once it has
 * scrolled near the visible area — keeps the initial open fast (only the first couple of pages
 * render immediately) while scrolling further down renders the rest just-in-time.
 */
function useLazyMount(initiallyVisible: boolean) {
  const [visible, setVisible] = useState(initiallyVisible);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: node.closest('.mini-preview-body'), rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

interface MiniPreviewPageProps {
  index: number;
  page: { start: number; end: number };
  data: HtmlPreviewData;
  currentZoom: number;
  fullscreen: boolean;
  eager: boolean;
}

function MiniPreviewPage({ index, page, data, currentZoom, fullscreen, eager }: MiniPreviewPageProps) {
  const { ref, visible } = useLazyMount(eager);
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
    pageNumber,
  } = data.geometry;

  const sliceHeightPx = (page.end - page.start) * scale;
  const sheetWidth = paperWidthPx * currentZoom;
  const sheetHeight = paperHeightPx * currentZoom;

  return (
    <div ref={ref} className="mini-sheet-container">
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
        {data.headerHtml && visible && (
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

        {/* 正文切片视窗：只有卷入可视区域附近才挂载整篇内容，避免每页都重复渲染一次完整文档 */}
        <div
          className="mini-sheet-viewport"
          style={{
            width: printableWidthPx * currentZoom,
            height: sliceHeightPx * currentZoom,
            maxHeight: sliceHeightPx * currentZoom,
          }}
        >
          {visible ? (
            <div
              className="mini-sheet-content"
              style={{
                width: sourceWidth,
                transform: `scale(${scale * currentZoom}) translateY(-${page.start}px)`,
                transformOrigin: 'top left',
              }}
              dangerouslySetInnerHTML={{ __html: data.sourceHtml }}
            />
          ) : (
            <div className="mini-sheet-placeholder" />
          )}
        </div>

        {/* 页脚 */}
        {data.footerHtml && visible && (
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
        {pageNumber?.enabled !== false && (
          <div
            className="mini-sheet-page-num"
            style={{
              ...(pageNumber?.position === 'bottom-center' || pageNumber?.position === 'top-center'
                ? { left: '50%', transform: 'translateX(-50%)' }
                : { right: marginRightPx * currentZoom }),
              bottom: Math.max(3, (marginBottomPx / 3) * currentZoom),
              fontSize: Math.max(7, 8 * currentZoom),
            }}
          >
            {pageNumber?.format === 'chinese'
              ? `第 ${index + 1} 页 / 共 ${data.pages.length} 页`
              : pageNumber?.format === 'hyphen'
              ? `- ${index + 1} -`
              : `${index + 1} / ${data.pages.length}`}
          </div>
        )}
      </div>
    </div>
  );
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
              data.pages.map((page, index) => (
                <MiniPreviewPage
                  key={index}
                  index={index}
                  page={page}
                  data={data}
                  currentZoom={currentZoom}
                  fullscreen={fullscreen}
                  eager={index < 2}
                />
              ))}
          </div>
        )}
      </div>
    </>
  );
}
