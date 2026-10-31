import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { BrandMark, BrandWordmark, Icon, TechnologyMark } from './icons';
import { ProductPreview } from './product-preview';
import { copy, Locale, useLocale } from './locale';
import { useTheme } from './theme';
import './site.css';
import './landing-page.css';

const REPO = 'https://github.com/darialan/web-printer';
const DOCS = `${REPO}#readme`;
const INSTALL_CMD = 'npm install @darialan/web-printer';
const technologies = ['JavaScript', 'TypeScript', 'React', 'Vue', 'HTML'] as const;
const scenes = [
  { key: 'purchase-order', image: 'table', icon: 'grid' },
  { key: 'long-article', image: 'article', icon: 'document' },
  { key: 'complex-mixed', image: 'mixed', icon: 'layers' },
  { key: 'custom-header-footer', image: 'brand', icon: 'file' },
] as const;

const codeExamples = {
  JavaScript: `import { outputDocument } from '@darialan/web-printer';

const element = document.getElementById('report');
if (!element) throw new Error('Report not found');

await outputDocument({
  element,
  filename: 'report',
  format: 'pdf',
  settings: {
    paper: 'a4',
    marginTopMm: 12,
    marginBottomMm: 12,
  },
});`,
  React: `import { useRef, useState } from 'react';
import { outputDocument } from '@darialan/web-printer';

export function Report() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (!reportRef.current || busy) return;
    setBusy(true);
    try {
      await outputDocument({
        element: reportRef.current,
        filename: 'report',
        format: 'png',
      });
    } finally { setBusy(false); }
  }

  return <>
    <button disabled={busy} onClick={handleExport}>Export</button>
    <div ref={reportRef}>{/* Your content */}</div>
  </>;
}`,
  Vue: `<script setup>
import { ref } from 'vue';
import { outputDocument } from '@darialan/web-printer';

const reportRef = ref(null);

async function exportReport() {
  if (!reportRef.value) return;
  await outputDocument({
    element: reportRef.value,
    filename: 'report',
    format: 'pdf',
  });
}
</script>

<template>
  <button @click="exportReport">Export PDF</button>
  <div ref="reportRef"><!-- Your content --></div>
</template>`,
};

type CodeTab = keyof typeof codeExamples;
const codeTabs = Object.keys(codeExamples) as CodeTab[];

function CopyButton({ text, label, locale }: { text: string; label: string; locale: Locale }) {
  const t = copy[locale];
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setState('idle'); }, [text, locale]);
  async function handleCopy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      timer.current = setTimeout(() => setState('idle'), 2000);
    } catch { setState('error'); }
  }
  return <button type="button" className="copy-btn" onClick={handleCopy} aria-label={label}>
    <Icon name={state === 'copied' ? 'check' : 'copy'} size={15} />
    <span role="status">{state === 'copied' ? t.copied : state === 'error' ? t.copyError : t.copy}</span>
  </button>;
}

function InstallCommand({ locale, hero = false }: { locale: Locale; hero?: boolean }) {
  const t = copy[locale];
  return <div className="command-block" data-ui>
    <pre tabIndex={0} aria-label={t.install}><code>{INSTALL_CMD}</code></pre>
    <CopyButton text={INSTALL_CMD} label={hero ? t.copyInstall : t.copyCommand} locale={locale} />
  </div>;
}

export function LandingPage() {
  const [locale, setLocale] = useLocale();
  const t = copy[locale];
  const [codeTab, setCodeTab] = useState<CodeTab>('JavaScript');
  const [theme, setTheme] = useTheme();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    pageRef.current?.querySelectorAll('[data-reveal]').forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

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

  const currentCode = locale === 'zh' ? codeExamples[codeTab].replaceAll('Your content', '你的内容').replaceAll('Export PDF', '导出 PDF').replaceAll('>Export<', '>导出<') : codeExamples[codeTab];

  return <div className="landing-page site-page" ref={pageRef} data-locale={locale}>
    <a className="skip-link" href="#main">{t.skip}</a>
    <nav className="landing-nav" aria-label={t.nav}>
      <div className="landing-container nav-wrap">
        <a className="brand" href="#/" aria-label={t.home}><BrandMark /><BrandWordmark /></a>
        <div className="nav-links">
          <a href="#features">{t.features}</a><a href="#playground">{t.examples}</a><a href="#quickstart">{t.integration}</a><a href="#faq">{t.faq}</a>
        </div>
        <div className="nav-actions">
          <button type="button" className="language-toggle" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')} aria-label={t.language} title={t.language}>
            <span lang={locale === 'zh' ? 'en' : 'zh-CN'}>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? t.dark : t.light}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          </button>
          <a className="icon-btn" href={REPO} target="_blank" rel="noreferrer" aria-label={t.github} title="GitHub"><Icon name="github" size={21} /></a>
        </div>
      </div>
    </nav>

    <main id="main">
      <header className="hero landing-container">
        <div className="hero-copy">
          <h1>{t.headline[0]}<br />{t.headline[1]}</h1>
          <p className="lede">{t.lede}</p>
          <div className="cta-row">
            <a href="#/playground" className="btn btn-dark">{t.try}<Icon name="arrow" size={18} /></a>
            <a href="#quickstart" className="text-link">{t.viewCode}<Icon name="code" size={18} /></a>
          </div>
          <InstallCommand locale={locale} hero />
          <p className="hero-note">{t.note}</p>
        </div>
        <figure className="hero-visual">
          <ProductPreview />
          <figcaption>{t.caption}</figcaption>
        </figure>
      </header>

      <div className="compatibility landing-container" data-reveal>
        <div className="compat-copy"><p className="compat-title">{t.stackTitle}</p><p>{t.stackBody}</p></div>
        <div className="compatibility-logos" aria-label={t.stackLabel}>
          {technologies.map(name => <a className={`compat-item compat-${name}`} href="#quickstart" key={name} onClick={() => setCodeTab(name === 'React' || name === 'Vue' ? name : 'JavaScript')}>
            <span className="compat-mark"><TechnologyMark name={name} size={38} /></span>
            <span className="compat-label">{name}</span>
          </a>)}
        </div>
      </div>

      <section id="features" className="features-section landing-container">
        <div className="section-heading"><h2 data-reveal>{t.featureTitle}</h2><p className="section-description" data-reveal>{t.featureBody}</p></div>
        <div className="rule-list">
          {t.rules.map((rule, index) => <article className="rule-row" key={index} data-reveal>
            <h3>{rule.title}</h3><p>{rule.body}</p>
            <div className={`rule-specimen specimen-${index}`} aria-hidden="true">
              {index === 0 ? <><span className="text-line" /><span className="text-line" /><span className="text-line short" /><span className="page-gap" /><span className="text-line" /><span className="text-line" /></>
                : index === 1 ? <><Icon name="layers" size={30} /><code>{rule.specimen}</code></>
                : <div className="paper-sizes"><span>A4</span><span>1:1</span><span>3:4</span><span>9:16</span></div>}
            </div>
          </article>)}
        </div>
      </section>

      <section id="playground" className="studio-section landing-container">
        <div className="section-heading"><h2 data-reveal>{t.examplesTitle}</h2><p className="section-description" data-reveal>{t.examplesBody}</p></div>
        <div className="scene-list">
          {scenes.map((scene, index) => <a key={scene.key} className="scene-link" href={`#/playground?scene=${scene.key}`} data-reveal>
            <div className="scene-image"><img src={`${process.env.PUBLIC_URL}/landing/${scene.image}.png`} alt={t.scenes[index].type} loading="lazy" width="1440" height="1000" /></div>
            <span className="scene-info"><strong><Icon name={scene.icon} size={22} />{t.scenes[index].title}</strong><span>{t.scenes[index].body}</span></span>
            <span className="scene-detail">{t.openExample}<Icon name="arrow" size={20} /></span>
          </a>)}
        </div>
      </section>

      <section id="quickstart" className="quickstart-section">
        <div className="landing-container quickstart-inner">
          <div className="quickstart-copy">
            <h2 data-reveal>{t.integrateTitle}</h2><p className="sub" data-reveal>{t.integrateBody}</p>
            <ol className="setup-steps">
              {t.steps.map(([title, body], index) => <li key={title} data-reveal><Icon name={index === 0 ? 'code' : index === 1 ? 'dom' : 'file'} size={20} /><div><strong>{title}</strong><p>{body}</p></div></li>)}
            </ol>
            <a href={DOCS} target="_blank" rel="noreferrer" className="text-link" data-reveal>{t.docs}<Icon name="external" size={16} /></a>
          </div>
          <div className="quickstart-example" data-reveal>
            <InstallCommand locale={locale} />
            <div className="code-window" data-ui>
              <div className="code-toolbar">
                <div role="tablist" aria-label={t.codeTabs}>
                  {codeTabs.map(tab => <button type="button" key={tab} role="tab" id={`code-tab-${tab}`} aria-selected={codeTab === tab} aria-controls="code-example" tabIndex={codeTab === tab ? 0 : -1} className={codeTab === tab ? 'active' : ''} onClick={() => setCodeTab(tab)} onKeyDown={event => switchCodeTab(event, tab)}><TechnologyMark name={tab} size={17} />{tab}</button>)}
                </div>
                <CopyButton text={currentCode} label={t.copyCode} locale={locale} />
              </div>
              <pre id="code-example" role="tabpanel" aria-labelledby={`code-tab-${codeTab}`} tabIndex={0}><code>{currentCode.split('\n').map((line, index) => <span className={`code-line ${line.startsWith('import') ? 'code-import' : ''}`} key={index}><span className="line-number" aria-hidden="true">{index + 1}</span>{line || ' '}</span>)}</code></pre>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="faq-section landing-container">
        <div><h2 data-reveal>{t.faqTitle}</h2><p className="sub" data-reveal>{t.faqBody}</p><a className="text-link" href={DOCS} target="_blank" rel="noreferrer" data-reveal>{t.docs}<Icon name="external" size={16} /></a></div>
        <div className="faq-list">{t.questions.map(([question, answer]) => <details key={question} data-reveal><summary><span>{question}</span><span className="faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>
    </main>
    <footer className="landing-footer">
      <div className="landing-container">
        <p className="footer-statement" data-reveal>{t.footerLine}</p>
        <div className="footer-wrap">
          <a className="brand" href="#/" aria-label={t.home}><BrandMark /><BrandWordmark /></a><span className="footer-note">{t.footerNote}</span>
          <div className="footer-links"><a href={DOCS} target="_blank" rel="noreferrer">{t.docs}<Icon name="external" size={15} /></a><a className="icon-btn" href={REPO} target="_blank" rel="noreferrer" aria-label={t.github} title="GitHub"><Icon name="github" size={21} /></a></div>
        </div>
      </div>
    </footer>
  </div>;
}
