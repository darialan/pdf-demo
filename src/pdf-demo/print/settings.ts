import type { Orientation } from './layout';
export type Paper = 'a4' | 'a3' | 'a5' | 'letter' | 'custom';
export interface PrintSettings {
  paper: Paper;
  unit?: 'mm' | 'px';
  slicingMode?: boolean;
  widthMm: number;
  heightMm: number;
  orientation: Orientation;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
}
export const DEFAULT_SETTINGS: PrintSettings = {
  unit: 'mm', slicingMode: false, paper: 'a4', widthMm: 210, heightMm: 297, orientation: 'portrait',
  marginTopMm: 0, marginRightMm: 0, marginBottomMm: 0, marginLeftMm: 0,
};
export const PAPER_SIZES: Record<Exclude<Paper, 'custom'>, [number, number]> = {
  a4: [210, 297], a3: [297, 420], a5: [148, 210], letter: [215.9, 279.4],
};
export function resolvePaper(settings: PrintSettings) {
  const size = settings.paper === 'custom' ? [settings.widthMm, settings.heightMm] : PAPER_SIZES[settings.paper];
  if (!size || size.some(value => !Number.isFinite(value) || value <= 0)) throw new Error('页面宽高必须是大于零的数值');
  if (!['portrait', 'landscape'].includes(settings.orientation)) throw new Error('纸张方向无效');
  const margins = [settings.marginTopMm, settings.marginRightMm, settings.marginBottomMm, settings.marginLeftMm];
  if (margins.some(value => !Number.isFinite(value) || value < 0)) throw new Error('页边距必须为非负数');
  const [short, long] = [...size].sort((a, b) => a - b);
  const [widthMm, heightMm] = settings.paper === 'custom' ? size : settings.orientation === 'portrait' ? [short, long] : [long, short];
  if (!settings.slicingMode && (widthMm - margins[1] - margins[3] <= 0 || heightMm - margins[0] - margins[2] <= 0)) throw new Error('页边距占满了页面，请减小边距或启用细切片测试');
  const pt = 72 / 25.4;
  return { pageWidth: widthMm * pt, pageHeight: heightMm * pt, left: settings.slicingMode ? 0 : margins[3] * pt, right: settings.slicingMode ? 0 : margins[1] * pt, top: settings.slicingMode ? 0 : margins[0] * pt, bottom: settings.slicingMode ? 0 : margins[2] * pt, widthMm, heightMm };
}

export const UNIT_FIELDS = ['widthMm', 'heightMm', 'marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm'] as const;
/** Storage stays in mm; px means CSS pixels at 96 DPI, independent of devicePixelRatio. */
export function convertFields<T extends PrintSettings>(value: T, factor: number): T {
  const next = { ...value };
  UNIT_FIELDS.forEach(field => {
    if (typeof value[field] === 'number') next[field] = value[field] * factor;
  });
  return next;
}
