import { lazy, Suspense } from 'react';
import { BrandMark, BrandWordmark, Icon } from '../landing/icons';
import { useTheme } from '../landing/theme';
import '../landing/site.css';
import '../landing/workbench-page.css';

const InteractiveWorkbench = lazy(() => import('../landing/interactive-workbench'));
const REPO = 'https://github.com/darialan/web-pdf-printer';

export default function WorkbenchPage() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="workbench-page site-page">
      <a className="skip-link" href="#main">跳至主要内容</a>
      <header className="workbench-topbar">
        <div className="workbench-topbar-inner">
          <a className="brand" href="#/" aria-label="Web Printer 首页">
            <BrandMark /><BrandWordmark />
          </a>
          <span className="workbench-topbar-title">打印工作台</span>
          <div className="workbench-topbar-actions">
            <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={`切换到${theme === 'light' ? '暗色' : '亮色'}主题`}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
            </button>
            <a className="icon-btn" href={REPO} target="_blank" rel="noreferrer" aria-label="查看 GitHub 仓库">
              <Icon name="github" size={18} />
            </a>
            <a href="#/" className="btn btn-ghost btn-small">返回首页</a>
          </div>
        </div>
      </header>
      <main className="workbench-main" id="main">
        <Suspense fallback={<div className="workbench-loading" role="status">正在加载场景与打印工具…</div>}>
          <InteractiveWorkbench />
        </Suspense>
      </main>
    </div>
  );
}
