import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { BrandMark, BrandWordmark, Icon } from './icons';
import { ProductPreview } from './product-preview';
import { useTheme } from './theme';
import './site.css';
import './landing-page.css';

const REPO = 'https://github.com/darialan/web-pdf-printer';
const DOCS = `${REPO}#readme`;
const INSTALL_CMD = 'npm install @darialan/web-pdf-printer html2canvas jspdf';

const scenes = [
  { key: 'purchase-order', title: '45 行采购明细表', description: '单独一张长表格，展示整行保护与单元格文字分页。', detail: '第一类：长表格', icon: 'grid' },
  { key: 'long-article', title: '把时间留给步行', description: '连续文字组成的长文章，展示按文字行分页的效果。', detail: '第二类：长文章', icon: 'code' },
  { key: 'complex-mixed', title: '计算光学技术文章', description: '原文样式下的公式、代码与配图混排，跨页保护整块内容。', detail: '第三类：复杂图文页面', icon: 'sliders' },
  { key: 'custom-header-footer', title: '差旅报销单', description: '每页重复的自定义页眉页脚，带动态总页码。', detail: '第四类：自定义页眉页脚', icon: 'file' },
] as const;

const codeExamples = {
  JavaScript: `import { outputPDF } from '@darialan/web-pdf-printer';

const element = document.getElementById('report');

await outputPDF({
  element,
  filename: '采购订单.pdf',
  settings: {
    paper: 'a4',
    marginTopMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 14,
    marginRightMm: 14,
  },
});`,
  React: `import { useRef } from 'react';
import { usePdfPrint } from '@darialan/web-pdf-printer';

export function Report() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { exportPDF, isPrinting, error } = usePdfPrint();

  async function handleExport() {
    if (!reportRef.current) return;
    try {
      await exportPDF({
        element: reportRef.current,
        filename: '采购订单.pdf',
      });
    } catch { /* error 会更新为导出错误 */ }
  }

  return <>
    <button disabled={isPrinting} onClick={handleExport}>
      {isPrinting ? '正在导出…' : '导出 PDF'}
    </button>
    {error && <p role="alert">{error.message}</p>}
    <div ref={reportRef}>{/* 你的报表内容 */}</div>
  </>;
}`,
  Vue: `<script setup>
import { ref } from 'vue';
import { outputPDF } from '@darialan/web-pdf-printer';

const reportRef = ref(null);
const busy = ref(false);
const error = ref('');

async function exportReport() {
  if (!reportRef.value || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await outputPDF({
      element: reportRef.value,
      filename: '采购订单.pdf',
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导出失败';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button :disabled="busy" @click="exportReport">导出 PDF</button>
  <p v-if="error" role="alert">{{ error }}</p>
  <div ref="reportRef"><!-- 你的报表内容 --></div>
</template>`,
};

type CodeTab = keyof typeof codeExamples;
const codeTabs = Object.keys(codeExamples) as CodeTab[];

function CopyButton({ text, label = '复制命令' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setState('idle'); }, [text]);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      timer.current = setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={label}>
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={14} />
      <span role="status">{state === 'copied' ? '已复制' : state === 'error' ? '请手动复制' : '复制'}</span>
    </button>
  );
}

export function LandingPage() {
  const [codeTab, setCodeTab] = useState<CodeTab>('JavaScript');
  const [theme, setTheme] = useTheme();

  function switchCodeTab(event: KeyboardEvent<HTMLButtonElement>, current: CodeTab) {
    const index = codeTabs.indexOf(current);
    const next = event.key === 'ArrowRight' ? codeTabs[(index + 1) % codeTabs.length]
      : event.key === 'ArrowLeft' ? codeTabs[(index + codeTabs.length - 1) % codeTabs.length]
      : event.key === 'Home' ? codeTabs[0]
      : event.key === 'End' ? codeTabs[codeTabs.length - 1] : undefined;
    if (!next) return;
    event.preventDefault();
    setCodeTab(next);
    document.getElementById(`code-tab-${next}`)?.focus();
  }

  return (
    <div className="landing-page site-page">
      <a className="skip-link" href="#main">跳至主要内容</a>
      <nav className="landing-nav" aria-label="全局导航">
        <div className="landing-container nav-wrap">
          <a className="brand" href="#/" aria-label="WebPDF Printer 首页">
            <BrandMark /><BrandWordmark />
          </a>
          <div className="nav-links">
            <a href="#features">分页能力</a>
            <a href="#playground">场景演示</a>
            <a href="#quickstart">接入方式</a>
            <a href="#faq">常见问题</a>
          </div>
          <div className="nav-actions">
            <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={`切换到${theme === 'light' ? '暗色' : '亮色'}主题`}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
            </button>
            <a className="icon-btn" href={REPO} target="_blank" rel="noreferrer" aria-label="查看 GitHub 仓库">
              <Icon name="github" size={18} />
            </a>
            <a href="#/playground" className="btn btn-dark btn-small">打开工作台 <Icon name="arrow" size={14} /></a>
          </div>
        </div>
      </nav>

      <main id="main">
        <header className="hero landing-container">
          <div className="hero-copy">
            <p className="hero-label"><span className="status-dot" />浏览器端的 Web 页面转 PDF 工具</p>
            <h1><span className="hero-title-line">为复杂业务页面，</span><br /><span className="hero-title-line hero-title-accent">做好 PDF 分页。</span></h1>
            <p className="lede">把已有的报表、订单和审批单导出为 PDF。<br className="desktop-break" />按文字行分页，让表格行与签章区域完整换页。</p>
            <div className="cta-row">
              <a href="#/playground" className="btn btn-dark">打开打印工作台 <Icon name="arrow" size={16} /></a>
              <a href="#quickstart" className="btn btn-ghost"><Icon name="code" size={16} />查看接入代码</a>
            </div>
            <p className="hero-note">MIT 开源许可 <span aria-hidden="true">/</span> 在浏览器中完成导出</p>
            <div className="hero-capabilities" aria-label="主要能力">
              <span><Icon name="check" size={14} />文字行防截断</span>
              <span><Icon name="check" size={14} />表格行整体换页</span>
              <span><Icon name="check" size={14} />自定义页眉页脚</span>
            </div>
          </div>
          <figure className="hero-visual">
            <ProductPreview />
            <figcaption>这是可操作的示例。切换文档，再导出一份 PDF。</figcaption>
          </figure>
        </header>

        <div className="compatibility landing-container">
          <span>接入已有的前端页面</span>
          <div className="compatibility-logos" aria-label="接入方式">
            <span>JavaScript</span><span>TypeScript</span><span>React Hook</span><span>Vue</span><span>同源 iframe</span>
          </div>
        </div>

        <section id="features" className="features-section landing-container">
          <div className="section-heading">
            <div><p className="section-label">分页能力</p><h2>照顾换页时的每一个细节。</h2></div>
            <p className="section-description">从屏幕到纸张，处理文字、表格与整块内容的分页关系。</p>
          </div>
          <div className="feature-grid">
            <article className="feature-primary">
              <div className="break-example" aria-hidden="true">
                <div className="break-example-lines"><span /><span /><span /></div>
                <div className="break-boundary"><span>本页结束</span></div>
                <div className="break-protected"><Icon name="check" size={15} /><span>完整的一行，留到下一页</span></div>
                <div className="break-example-lines short"><span /><span /></div>
              </div>
              <h3>换一页，保留完整的一行。</h3>
              <p>测量文字在页面里的实际位置，避开行内切割。表格行放不下时，优先整体移到下一页。</p>
              <a href="#/playground?scene=purchase-order" className="text-link">查看长表格示例 <Icon name="arrow" size={15} /></a>
            </article>
            <div className="feature-list">
              <article><Icon name="grid" size={21} /><div><h3>签字与盖章，一起保留</h3><p>用 <code>data-pdf-atomic</code> 标记签章或图表区域，在页尾放不下时整块换页。</p></div></article>
              <article><Icon name="sliders" size={21} /><div><h3>每一页都有自己的位置</h3><p>设置纸张、方向与页边距，添加重复页眉页脚和动态总页码。</p></div></article>
              <article><Icon name="file" size={21} /><div><h3>长单据按页渲染</h3><p>逐页生成画布，写入 PDF 后释放，减少一次绘制超长图片的内存压力。</p></div></article>
              <article><Icon name="code" size={21} /><div><h3>沿用已有页面的样式</h3><p>导出前复制元素的计算样式，保留现有布局，减少另写打印模板的工作。</p></div></article>
            </div>
          </div>
        </section>

        <section id="playground" className="studio-section landing-container">
          <div className="section-heading">
            <div><p className="section-label">场景演示</p><h2>用一份完整单据，试试分页。</h2></div>
            <p className="section-description">工作台提供四个演示场景。调整输出设置，查看分页标线，再导出 PDF 或分页图片。</p>
          </div>
          <div className="scene-list">
            {scenes.map(scene => (
              <a key={scene.key} className="scene-link" href={`#/playground?scene=${scene.key}`}>
                <span className="scene-icon"><Icon name={scene.icon} size={21} /></span>
                <span className="scene-info"><strong>{scene.title}</strong><span>{scene.description}</span></span>
                <span className="scene-detail">{scene.detail}</span>
                <Icon name="arrow" size={18} />
              </a>
            ))}
            <div className="scene-footnote"><Icon name="sliders" size={15} /><span>A4 / A3 / A5 / Letter / 自定义纸张，支持横向与纵向。</span></div>
          </div>
        </section>

        <section id="quickstart" className="quickstart-section landing-container">
          <div className="quickstart-copy">
            <p className="section-label">接入方式</p>
            <h2>给你的页面，<br />加一个导出按钮。</h2>
            <p className="sub">传入需要导出的 DOM 元素，设置文件名。测量、分页和 PDF 生成由引擎完成。</p>
            <ol className="setup-steps">
              <li><span>1</span><div><strong>安装依赖</strong><p>包含 html2canvas 与 jsPDF。</p></div></li>
              <li><span>2</span><div><strong>传入内容容器</strong><p>保留现有页面，按需标记整块保护区域。</p></div></li>
              <li><span>3</span><div><strong>调用导出，检查结果</strong><p>使用真实业务数据验证分页与资源加载。</p></div></li>
            </ol>
            <a href={DOCS} target="_blank" rel="noreferrer" className="text-link">阅读完整接入文档 <Icon name="external" size={14} /></a>
          </div>
          <div className="quickstart-example">
            <div className="install-bar"><code>{INSTALL_CMD}</code><CopyButton text={INSTALL_CMD} /></div>
            <div className="code-window">
              <div className="code-toolbar">
                <div role="tablist" aria-label="接入示例语言">
                  {codeTabs.map(tab => (
                    <button type="button" key={tab} role="tab" id={`code-tab-${tab}`} aria-selected={codeTab === tab}
                      aria-controls="code-example" tabIndex={codeTab === tab ? 0 : -1} className={codeTab === tab ? 'active' : ''}
                      onClick={() => setCodeTab(tab)} onKeyDown={event => switchCodeTab(event, tab)}>{tab}</button>
                  ))}
                </div>
                <CopyButton text={codeExamples[codeTab]} label="复制代码" />
              </div>
              <pre id="code-example" role="tabpanel" aria-labelledby={`code-tab-${codeTab}`} tabIndex={0}>
                <code>{codeExamples[codeTab].split('\n').map((line, i) => (
                  <span className={`code-line ${line.startsWith('import') ? 'code-import' : ''}`} key={i}>
                    <span className="line-number" aria-hidden="true">{i + 1}</span>{line || ' '}
                  </span>
                ))}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id="faq" className="faq-section landing-container">
          <div><p className="section-label">常见问题</p><h2>接入前，<br />你可能想知道。</h2><p className="sub">关于运行环境和导出结果。</p></div>
          <div className="faq-list">
            <details><summary><span>需要部署 PDF 生成服务吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>导出过程在浏览器内完成，无需单独部署 PDF 生成服务。页面中的图片和字体仍需正常加载；跨域资源需要对应服务器允许 CORS。</p></details>
            <details><summary><span>可以在 Vue、React 或原生 JavaScript 中使用吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>可以。<code>outputPDF</code> 接收 DOM 元素，可在页面渲染后调用。React 项目也可以使用 <code>usePdfPrint</code> 管理导出状态；服务端渲染项目需要在客户端调用。</p></details>
            <details><summary><span>表格行和签章区域如何避免被切开？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>表格行默认优先整体换页，签章等区域可以添加 <code>data-pdf-atomic="true"</code>。整块内容高于一页时，需要调整布局、纸张，或改用允许拆分的标记。</p></details>
            <details><summary><span>支持 iframe 内的文档吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>支持能够访问 DOM 的同源 iframe，包括 <code>srcdoc</code> 文档。将内部元素传给导出方法即可；跨域 iframe 仍受浏览器同源策略限制。</p></details>
            <details><summary><span>导出的 PDF 可以搜索和复制文字吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>当前通过画布渲染页面，再将图像写入 PDF，正文不包含可搜索、可复制的文本层。如果这项能力是必要条件，可以评估浏览器打印或文本型 PDF 方案。</p></details>
          </div>
        </section>

        <section className="closing-section landing-container">
          <div><h2>下一份单据，先试着导出。</h2><p>从最接近你业务的场景开始，看看内容如何落在纸上。</p></div>
          <a href="#/playground" className="btn btn-dark">打开打印工作台 <Icon name="arrow" size={16} /></a>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-container footer-wrap">
          <a className="brand" href="#/" aria-label="WebPDF Printer 首页"><BrandMark /><BrandWordmark /></a>
          <span className="footer-note">MIT 开源许可</span>
          <div className="footer-links"><a href="#quickstart">接入方式</a><a href={DOCS} target="_blank" rel="noreferrer">文档</a><a href={REPO} target="_blank" rel="noreferrer">GitHub <Icon name="external" size={12} /></a></div>
        </div>
      </footer>
    </div>
  );
}
