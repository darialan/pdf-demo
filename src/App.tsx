import { lazy, Suspense, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { LandingPage } from './landing/landing-page';
import { createAntdTheme } from './landing/antd-theme';
import { ThemeProvider } from './landing/theme';
import { trackRoute } from './analytics';
import './App.css';

const WorkbenchPage = lazy(() => import('./demo/workbench-page'));

function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash);
      if (window.location.hash.startsWith('#/')) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    trackRoute(hash);
  }, [hash]);
  return (
    <ThemeProvider>
      <ConfigProvider theme={createAntdTheme()}>
        {hash.startsWith('#/playground') ? (
          <Suspense fallback={<div className="page-loading" role="status">正在打开打印工作台…</div>}>
            <WorkbenchPage />
          </Suspense>
        ) : <LandingPage />}
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
