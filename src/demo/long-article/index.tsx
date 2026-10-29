import { useEffect, useRef, useState } from 'react';
import { demoAsset } from '../ui/business-page';
export const LONG_ARTICLE_CONTENT_ID = 'print-content-long-article';

const ARTICLE_TITLE = '用 TorchOptics 逆向设计一条凸 Accelerating Beam 轨迹';
const ARTICLE_DIGEST = '用可微 PyTorch 优化器在一维 phase-only mask 上学习输入相位，让 Gaussian 输入沿指定凸抛物线轨迹传播，并结合 TorchOptics 检查二维传播截面。';

// 长文章 Demo：真实的图文教程长文（来自作者本人博客的技术文章原文），
// 大段正文穿插小标题、配图说明、公式与代码块，用于验证“文字行防截断 +
// 图片/代码块整体保护”在长篇真实内容下的分页效果。正文 HTML 直接来自原文导出，
// 不在这里重写，保证样式和代码高亮与原文一致。
export function LongArticleDemo() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(demoAsset('long-article-body.html'))
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then(html => {
        if (cancelled || !bodyRef.current) return;
        bodyRef.current.innerHTML = html;
        // 原文没有标记跨页保护单元，这里统一给图片和代码块加上 data-pdf-atomic，
        // 避免配图或代码块在分页时被从中间切开。
        bodyRef.current.querySelectorAll('img, pre').forEach(el => el.setAttribute('data-pdf-atomic', 'true'));
        setStatus('ready');
        window.dispatchEvent(new Event('pdf-demo-content-change'));
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  return <div className="business-article">
    <article id={LONG_ARTICLE_CONTENT_ID}>
      <header className="article-cover">
        <h1>{ARTICLE_TITLE}</h1>
        <p className="article-meta"><span>计算光学</span><span>·</span><span>Accelerating Beam · 逆向设计</span></p>
        <p className="article-digest">{ARTICLE_DIGEST}</p>
      </header>
      {status === 'error' && <p className="business-note">长文章内容加载失败，请刷新重试。</p>}
      {status === 'loading' && <p className="business-muted">正在加载长文章内容…</p>}
      {/* bodyRef 的内容由上面的 effect 用 innerHTML 直接写入原文 HTML，
          这个容器不能再交给 React 管理子节点，否则 React 卸载时会找不到被替换掉的子节点而报错。 */}
      <div className="article-body" ref={bodyRef} />
    </article>
  </div>;
}
