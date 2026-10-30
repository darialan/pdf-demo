import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { Button, Spin } from 'antd';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { namespacePreviewHtml } from '../../../lib';
import { HtmlPreviewData } from './print-preview-modal';
import './mini-print-preview.css';

export interface MiniPrintPreviewProps {
  data: HtmlPreviewData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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
    if (initiallyVisible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        setVisible(entries.some(entry => entry.isIntersecting));
      },
      { root: node.closest('.mini-preview-body'), rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [initiallyVisible]);

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
  const id = useId().replace(/:/g, '');
  const sourceHtml = useMemo(() => namespacePreviewHtml(data.sourceHtml, `mini-${id}-body`), [data.sourceHtml, id]);
  const headerHtml = useMemo(() => namespacePreviewHtml(data.headerHtml || '', `mini-${id}-header`), [data.headerHtml, id]);
  const footerHtml = useMemo(() => namespacePreviewHtml(data.footerHtml || '', `mini-${id}-footer`), [data.footerHtml, id]);
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
              position: 'absolute', top: marginTopPx * currentZoom,
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
              dangerouslySetInnerHTML={{ __html: headerHtml }}
            />
          </div>
        )}

        {/* 正文切片视窗：只有卷入可视区域附近才挂载整篇内容，避免每页都重复渲染一次完整文档 */}
        <div
          className="mini-sheet-viewport"
          style={{
            width: printableWidthPx * currentZoom,
            position: 'absolute', top: bodyTopPx * currentZoom,
            height: sliceHeightPx * currentZoom,
            maxHeight: sliceHeightPx * currentZoom,
          }}
        >
          {visible ? (
            <div
              className="mini-sheet-content"
              ref={node => node?.setAttribute('inert', '')}
              style={{
                width: sourceWidth,
                transform: `scale(${scale * currentZoom}) translateY(-${page.start}px)`,
                transformOrigin: 'top left',
              }}
              dangerouslySetInnerHTML={{ __html: sourceHtml }}
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
              position: 'absolute', top: footerTopPx * currentZoom,
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
              dangerouslySetInnerHTML={{ __html: footerHtml }}
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
              top: (pageNumberYPx - 12) * currentZoom,
              fontSize: 12 * currentZoom,
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

export function MiniPrintPreview({ data, loading = false, error, onRetry, onClose }: MiniPrintPreviewProps) {
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const widget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.activeElement as HTMLElement | null;
    widget.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const controls = Array.from(widget.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') || []);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === 'Escape') {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previous?.focus(); };
  }, [fullscreen]);

  if (!data && !loading && !error) return null;

  const paperWidthPx = data?.geometry.paperWidthPx || 794;

  // 迷你模式下固定等比微缩至 232px；全屏模式下按视窗宽度自适应放大至舒适阅读尺寸
  const baseFullscreenWidth = Math.min(860, Math.max(200, viewportWidth - 96), viewportWidth < 700 ? viewportWidth - 80 : viewportWidth * 0.65);

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
          className="mini-print-preview-backdrop"
          onClick={() => setFullscreen(false)}
        />
      )}

      <div
        ref={widget}
        role={fullscreen ? 'dialog' : 'region'}
        aria-modal={fullscreen || undefined}
        aria-label="纸张预览"
        aria-busy={loading}
        className={`mini-print-preview-widget ${fullscreen ? 'is-fullscreen' : ''}`}
        style={{
          width: fullscreen ? 'auto' : minimized ? '200px' : '272px',
        }}
      >
        <div
          className="mini-preview-header"
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
              aria-label={minimized ? '展开小窗' : '折叠小窗'}
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
              aria-label={fullscreen ? '退出全屏 (Esc)' : '全屏预览'}
              title={fullscreen ? '退出全屏 (Esc)' : '全屏预览'}
              onClick={handleToggleFullscreen}
            >
              {fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>

            {/* 3. 关闭按钮 */}
            {onClose && (
              <button
                className="mini-preview-icon-btn"
                aria-label="关闭预览小窗"
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
            {error && <PreviewFailure error={error} onRetry={onRetry} />}
            {loading && (
              <div className="mini-preview-loading" role="status">
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

function PreviewFailure({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return <div role="alert" style={{ color: '#f8fafc', padding: 12 }}>
    <p>纸张预览失败：{error}</p>
    {onRetry && <Button size="small" onClick={onRetry}>重试预览</Button>}
  </div>;
}

/** Preview rendering errors must not unmount the source annotations. */
export class MiniPreviewBoundary extends React.Component<{
  children: React.ReactNode;
  onRetry: () => void;
  onClose: () => void;
}, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || String(error) };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="mini-print-preview-widget">
      <div className="mini-preview-header">
        <span className="mini-preview-title-wrap">📄 纸张预览</span>
        <button className="mini-preview-icon-btn" aria-label="关闭预览小窗" onClick={this.props.onClose}>×</button>
      </div>
      <PreviewFailure error={this.state.error} onRetry={this.props.onRetry} />
    </div>;
  }
}
