import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { demoAsset } from '../ui/business-page';
export const COMPLEX_MIXED_CONTENT_ID = 'print-content-complex-mixed';

const ARTICLE_TITLE = '用 TorchOptics 逆向设计一条凸 Accelerating Beam 轨迹';
const ARTICLE_DIGEST = '用可微 PyTorch 优化器在一维 phase-only mask 上学习输入相位，让 Gaussian 输入沿指定凸抛物线轨迹传播，并结合 TorchOptics 检查二维传播截面。';

// 保留作者原文的 HTML、公式、代码高亮与排版样式。
export function ComplexMixedDemo() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch(demoAsset('torchoptics-article.html'), { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.text(); })
      .then(html => {
        if (controller.signal.aborted || !bodyRef.current) return;
        bodyRef.current.innerHTML = html;
        // 原文没有标记跨页保护单元，这里统一给图片和代码块加上 data-print-atomic，
        // 避免配图或代码块在分页时被从中间切开。
        bodyRef.current.querySelectorAll('img, pre').forEach(el => el.setAttribute('data-print-atomic', 'true'));
        setStatus('ready');
        window.dispatchEvent(new CustomEvent('print-demo-content-change', { detail: { contentId: COMPLEX_MIXED_CONTENT_ID } }));
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);

  return <article id={COMPLEX_MIXED_CONTENT_ID} className="business-article" data-print-status={status}>
      <header className="article-cover">
        <h1>{ARTICLE_TITLE}</h1>
        <p className="article-meta"><span>计算光学</span><span>·</span><span>Accelerating Beam · 逆向设计</span></p>
        <p className="article-digest">{ARTICLE_DIGEST}</p>
      </header>
      {status === 'error' && <div role="alert" data-print-ignore="true"><p>文章加载失败，请检查网络后重试。</p><Button onClick={() => setAttempt(value => value + 1)}>重试加载</Button></div>}
      {status === 'loading' && <p className="business-muted">正在加载文章内容…</p>}
      {/* bodyRef 的内容由上面的 effect 用 innerHTML 直接写入原文 HTML，
          这个容器不能再交给 React 管理子节点，否则 React 卸载时会找不到被替换掉的子节点而报错。 */}
      <div className="article-body" ref={bodyRef} />
  </article>;
}
