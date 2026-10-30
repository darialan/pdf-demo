import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

/**
 * 品牌强调色。站点 CSS 变量与 AntD 主题共用同一个来源，
 * 避免界面里同时出现品牌绿和 AntD 默认蓝两种主色。
 */
export const ACCENT = {
  light: '#32745d',
  dark: '#9fcbb3',
} as const;

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* 浏览器禁用存储时仍可切换主题 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = createContext<[Theme, (next: Theme) => void]>(['light', () => {}]);

/** 主题状态提升到应用根部：落地页、打印工作台与 AntD 组件读取同一份值。 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('theme', mode); } catch { /* 主题可仅在当前页面生效 */ }
  }, [mode]);

  const value = useMemo<[Theme, (next: Theme) => void]>(() => [mode, setMode], [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 落地页与打印工作台共用同一份主题状态：写入 localStorage，两个页面切换后保持一致。 */
export function useTheme(): [Theme, (next: Theme) => void] {
  return useContext(ThemeContext);
}
