import { theme as antdTheme, type ThemeConfig } from 'antd';
import { ACCENT } from './theme';

/**
 * AntD 组件与站点共用品牌绿：只替换主色，不套用暗色算法。
 * 可打印内容与界面同在一棵 DOM 树上，套暗色算法会把纸面内容一起反色。
 */
export function createAntdTheme(): ThemeConfig {
  return {
    token: {
      colorPrimary: ACCENT.light,
      colorLink: ACCENT.light,
      colorInfo: ACCENT.light,
      borderRadius: 6,
      fontFamily: "'Avenir Next', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    components: {
      Button: { controlHeight: 36, fontWeight: 500 },
      Modal: { titleFontSize: 16 },
    },
  };
}

export { antdTheme };
