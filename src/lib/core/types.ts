/** Geometry and rule types shared by pure core algorithms and external adapters. */
export interface Interval {
  top: number;
  bottom: number;
}

export interface PageSlice {
  start: number;
  end: number;
}

export type Orientation = 'portrait' | 'landscape';

export type Paper =
  | 'a4'
  | 'a3'
  | 'a5'
  | 'letter'
  // 社媒 / 图片画框（像素定义）
  | 'card-3x4'
  | 'square-1x1'
  | 'card-4x5'
  | 'story-9x16'
  | 'ecom-750x1000'
  | 'custom';

/** 声明式页眉/页脚基础配置（开发者代码配置） */
export interface DeclarativeHeaderFooterConfig {
  enabled?: boolean;
  text?: string;
  align?: 'left' | 'center' | 'right';
  showDivider?: boolean;
}

/** 独立页码系统配置（可由设置面板 UI 控制，亦可代码配置） */
export interface PageNumberConfig {
  enabled: boolean;
  position?: 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center';
  format?: 'slash' | 'chinese' | 'hyphen';
}

export interface PrintSettings {
  paper: Paper;
  unit?: 'mm' | 'px';
  widthMm: number;
  heightMm: number;
  orientation: Orientation;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  header?: DeclarativeHeaderFooterConfig;
  footer?: DeclarativeHeaderFooterConfig;
  pageNumber?: PageNumberConfig;
}

export type ElementRule =
  | { kind: 'ignore' }
  | { kind: 'container' }
  | { kind: 'text' }
  | { kind: 'atomic'; label: string; overflow: 'split' | 'error' };

export interface PrintRule {
  selector: string;
  result: ElementRule;
}

export interface PrintRuleConfig {
  /** 不可分割的选择器列表（最小原子化单元，严禁中间切断，当前页放不下则整块推入下一页） */
  atomic?: string[];
  /** 可分割的选择器列表（流式文本、段落容器，允许被物理分页线切断） */
  splittable?: string[];
  /** 不打印的选择器列表（排除在打印渲染之外的交互控件，如分页器、操作按钮） */
  ignore?: string[];

  // 兼容性别名
  keepTogether?: string[];
  keepOrSplit?: string[];
  forceSplit?: string[];

  /** 自定义高级规则列表（前置优先匹配） */
  customRules?: PrintRule[];
}

export interface MeasurementStats {
  visitedNodes: number;
  atomicElements: number;
  textNodes: number;
  textFragments: number;
}

export interface DocumentMeasurement {
  height: number;
  ranges: Interval[];
  stats?: MeasurementStats;
}
