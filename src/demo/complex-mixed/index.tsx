import { useEffect, useRef, useState } from 'react';
import { demoAsset } from '../ui/business-page';
export const COMPLEX_MIXED_CONTENT_ID = 'print-content-complex-mixed';

const ARTICLE_TITLE = '用 TorchOptics 逆向设计一条凸 Accelerating Beam 轨迹';
const ARTICLE_DIGEST = '用可微 PyTorch 优化器在一维 phase-only mask 上学习输入相位，让 Gaussian 输入沿指定凸抛物线轨迹传播，并结合 TorchOptics 检查二维传播截面。';

// 保留作者原文的 HTML、公式、代码高亮与排版样式。
export function ComplexMixedDemo() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(demoAsset('torchoptics-article.html'))
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

  return <article id={COMPLEX_MIXED_CONTENT_ID} className="business-article">
      <header className="article-cover">
        <h1>{ARTICLE_TITLE}</h1>
        <p className="article-meta"><span>计算光学</span><span>·</span><span>Accelerating Beam · 逆向设计</span></p>
        <p className="article-digest">{ARTICLE_DIGEST}</p>
      </header>
      {status === 'error' && <p className="business-note">文章内容加载失败，请刷新重试。</p>}
      {status === 'loading' && <p className="business-muted">正在加载文章内容…</p>}
      {/* bodyRef 的内容由上面的 effect 用 innerHTML 直接写入原文 HTML，
          这个容器不能再交给 React 管理子节点，否则 React 卸载时会找不到被替换掉的子节点而报错。 */}
      <div className="article-body" ref={bodyRef} />
  </article>;
}
