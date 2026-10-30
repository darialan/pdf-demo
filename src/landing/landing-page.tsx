import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { BrandMark, BrandWordmark, Icon } from './icons';
import { ProductPreview } from './product-preview';
import { useTheme } from './theme';
import './site.css';
import './landing-page.css';

const REPO = 'https://github.com/darialan/web-pdf-printer';
const DOCS = `${REPO}#readme`;
const INSTALL_CMD = 'npm install @darialan/web-pdf-printer';

const scenes = [
  { key: 'purchase-order', title: '45 行采购明细表', description: '单独一张长表格，展示整行保护与单元格文字分页。', detail: '第一类：长表格', icon: 'grid' },
  { key: 'long-article', title: '把时间留给步行', description: '连续文字组成的长文章，展示按文字行分页的效果。', detail: '第二类：长文章', icon: 'code' },
  { key: 'complex-mixed', title: '计算光学技术文章', description: '原文样式下的公式、代码与配图混排，跨页保护整块内容。', detail: '第三类：复杂图文页面', icon: 'sliders' },
  { key: 'custom-header-footer', title: '差旅报销单', description: '每页重复的自定义页眉页脚，带动态总页码。', detail: '第四类：自定义页眉页脚', icon: 'file' },
] as const;

const codeExamples = {
  JavaScript: `import { outputDocument } from '@darialan/web-pdf-printer';

const element = document.getElementById('report');

await outputDocument({
  element,
  filename: 'report',
  format: 'pdf', // 改为 'png'，下载逐页图片 ZIP
  settings: {
    paper: 'a4',
    marginTopMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 14,
    marginRightMm: 14,
  },
});`,
  React: `import { useRef, useState } from 'react';
import { outputDocument } from '@darialan/web-pdf-printer';

export function Report() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    if (!reportRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      await outputDocument({
        element: reportRef.current,
        filename: 'report',
        format: 'png', // PDF 改为 'pdf'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally { setBusy(false); }
  }

  return <>
    <button disabled={busy} onClick={handleExport}>
      {busy ? '正在导出…' : '导出分页图片'}
    </button>
    {error && <p role="alert">{error}</p>}
    <div ref={reportRef}>{/* 你的页面内容 */}</div>
  </>;
}`,
  Vue: `<script setup>
import { ref } from 'vue';
import { outputDocument } from '@darialan/web-pdf-printer';

const reportRef = ref(null);
const busy = ref(false);
const error = ref('');

async function exportReport() {
  if (!reportRef.value || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await outputDocument({
      element: reportRef.value,
      filename: 'report',
      format: 'pdf',
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

function InstallCommand({ copyLabel = '复制命令' }: { copyLabel?: string }) {
  return <div className="command-block">
    <span className="shell-prompt" aria-hidden="true">$</span>
    <pre tabIndex={0} aria-label="npm 安装命令"><code>{INSTALL_CMD}</code></pre>
    <CopyButton text={INSTALL_CMD} label={copyLabel} />
  </div>;
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
            <h1>长网页，<br />分好每一页。</h1>
            <p className="lede">面向已渲染 HTML 的分页库。保留网页现有样式，按文字行与表格行换页；自定义页面尺寸，导出 PDF 或逐页 PNG 图片。</p>
            <div className="cta-row">
              <a href={REPO} className="btn btn-dark" target="_blank" rel="noreferrer"><Icon name="github" size={17} />GitHub Star</a>
              <a href="#/playground" className="text-link">查看分页效果 <Icon name="arrow" size={16} /></a>
            </div>
            <InstallCommand copyLabel="复制安装命令" />
            <p className="hero-note">MIT 开源许可 · 浏览器本地运行 · 框架无关</p>
          </div>
          <figure className="hero-visual">
            <ProductPreview />
            <figcaption>同一份内容，切换尺寸重新分页。这里运行的就是工作台的分页引擎。</figcaption>
          </figure>
        </header>

        <div className="compatibility landing-container">
          <span>传入页面里的 DOM 元素</span>
          <div className="compatibility-logos" aria-label="接入方式">
            <span>JavaScript</span><span>TypeScript</span><span>React</span><span>Vue</span><span>PDF / PNG</span>
          </div>
        </div>

        <section id="features" className="features-section landing-container">
          <div className="section-heading"><h2>换页规则，由内容决定。</h2><p className="section-description">长内容自然延续，需要完整呈现的区域整块换页。</p></div>
          <div className="capability-columns">
            <article><h3>沿用页面样式</h3><p>从已渲染的 HTML 开始，复制计算样式和当前表单值。保留页面原有排版，减少另写一套打印模板的工作。</p></article>
            <article><h3>控制内容怎么换页</h3><p>文字按实际行测量，表格行优先完整换页。图片、公式和代码块可设为整体保护，指定区域可从输出中排除。</p></article>
            <article><h3>同一套分页，两种输出</h3><p>纸张尺寸、图片比例、边距和页眉页脚统一配置。PDF 与逐页 PNG 共用分页逻辑，图片统一打包为 ZIP。</p></article>
          </div>
        </section>

        <section id="playground" className="studio-section landing-container">
          <div className="section-heading">
            <div><h2>四种内容，直接看结果。</h2></div>
            <p className="section-description">用完整内容验证文字、表格和图文混排。每个示例都可以调整尺寸、检查分页并下载结果。</p>
          </div>
          <div className="scene-list">
            {scenes.map(scene => (
              <a key={scene.key} className="scene-link" href={`#/playground?scene=${scene.key}`}>
                <img src={`${process.env.PUBLIC_URL}/landing/${['table', 'article', 'mixed', 'brand'][scenes.indexOf(scene)]}.png`} alt={`${scene.detail.replace(/第.类：/, '')}的实际工作台与分页预览`} loading="lazy" width="1440" height="1000" />
                <span className="scene-info"><strong>{scene.title}</strong><span>{scene.description}</span></span>
                <span className="scene-detail">打开示例</span>
                <Icon name="arrow" size={18} />
              </a>
            ))}
            <div className="scene-footnote"><Icon name="sliders" size={15} /><span>从 A4 到 1:1、3:4、9:16，页面宽高与边距均可配置。</span></div>
          </div>
        </section>

        <section id="quickstart" className="quickstart-section landing-container">
          <div className="quickstart-copy">

            <h2>安装后，传入你的页面。</h2>
            <p className="sub">页面渲染完成后传入 DOM 元素。在同一接口中选择 PDF 或 PNG，按需配置页面尺寸和分页规则。</p>
            <ol className="setup-steps">
              <li><div><strong>安装组件</strong><p>一条命令完成安装，依赖自动处理。</p></div></li>
              <li><div><strong>传入内容容器</strong><p>保留现有页面，按需标记整块保护区域。</p></div></li>
              <li><div><strong>调用导出，检查结果</strong><p>使用真实业务数据验证分页与资源加载。</p></div></li>
            </ol>
            <a href={DOCS} target="_blank" rel="noreferrer" className="text-link">阅读完整接入文档 <Icon name="external" size={14} /></a>
          </div>
          <div className="quickstart-example">
            <InstallCommand />
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
          <div><h2>接入前的几个问题。</h2><p className="sub">输出格式、内容保护和使用范围。</p></div>
          <div className="faq-list">
            <details><summary><span>需要部署生成服务吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>导出过程在浏览器内完成，无需单独部署生成服务。页面中的图片和字体仍需正常加载；跨域资源需要对应服务器允许 CORS。</p></details>
            <details><summary><span>支持哪些前端框架？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>可以。<code>outputDocument</code> 接收 DOM 元素，可在页面渲染后调用。React 项目也可以使用 <code>usePdfPrint</code> 管理导出状态；服务端渲染项目需要在客户端调用。</p></details>
            <details><summary><span>长表格、图片和代码如何换页？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>表格行默认优先整体换页，图片、公式和代码块可以添加 <code>data-pdf-atomic="true"</code>。整块内容高于一页时，需要调整布局、纸张，或改用允许拆分的标记。</p></details>
            <details><summary><span>PDF 和分页图片有什么区别？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>两种格式共享分页与页面尺寸。PDF 将页面装订为一份文件；PNG 为每一页生成一张完整图片，以 ZIP 下载。图片像素尺寸还受截图清晰度和画布预算影响，设置中的 px 用于页面布局。</p></details>
            <details><summary><span>现有网页都能直接使用吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>可以传入能访问的 DOM 元素。图片和字体应加载完成，跨域图片需允许 CORS。复杂 CSS 的还原受画布渲染能力影响，建议先用自己的内容验证；跨域 <code>&lt;iframe&gt;</code>、视频和 Shadow DOM 不属于完整支持范围。</p></details>
            <details><summary><span>能用于商业项目吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>当前 NPM 包采用 MIT 许可，可以用于商业项目；分发时按许可证要求保留版权和许可声明。安装和接入文档中提供完整配置说明。</p></details>
            <details><summary><span>PDF 文字可以搜索、复制吗？</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>当前通过画布渲染页面，再将图像写入 PDF，正文不包含可搜索、可复制的文本层。接入前请确认这一输出形式适合你的使用需求。</p></details>
          </div>
        </section>

        <section className="closing-section landing-container">
          <div><h2>让长内容，完整交付。</h2><p>安装 NPM 包，从现有页面开始接入。</p></div>
          <a href={REPO} className="btn btn-dark" target="_blank" rel="noreferrer"><Icon name="github" size={17} />在 GitHub 上支持项目</a>
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
