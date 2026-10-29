import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* 浏览器禁用存储时仍可切换主题 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 落地页与打印工作台共用同一份主题状态：写入 localStorage，两个页面切换后保持一致。 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* 主题可仅在当前页面生效 */ }
  }, [theme]);

  return [theme, setTheme];
}
