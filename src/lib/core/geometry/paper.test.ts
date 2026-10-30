import {
  convertFields,
  DEFAULT_SETTINGS,
  getPresetDimensions,
  getPresetUnit,
  isImagePaper,
  PAPER_PRESETS,
  resolvePaper,
} from './paper';
import { paginate } from '../pagination/paginator';

test('supports preset and custom paper dimensions in mm', () => {
  const a4 = resolvePaper(DEFAULT_SETTINGS);
  expect(a4.pageWidth).toBeCloseTo(595.28, 2);
  expect(resolvePaper({ ...DEFAULT_SETTINGS, paper: 'a3', orientation: 'landscape' }).widthMm).toBe(420);
  expect(resolvePaper({ ...DEFAULT_SETTINGS, paper: 'custom', widthMm: 80, heightMm: 200 }).heightMm).toBe(200);
});

test('paper height and margins affect the same capacity used by pagination', () => {
  const capacity = (heightMm: number, marginBottomMm: number) => {
    const p = resolvePaper({ ...DEFAULT_SETTINGS, paper: 'custom', heightMm, marginBottomMm });
    return p.pageHeight - p.top - p.bottom - 14;
  };
  expect(paginate(2000, capacity(200, 10), []).length).toBeGreaterThan(paginate(2000, capacity(400, 10), []).length);
  expect(capacity(200, 30)).toBeLessThan(capacity(200, 10));
});

test('invalid custom dimensions and margins are rejected before rendering', () => {
  expect(() => resolvePaper({ ...DEFAULT_SETTINGS, paper: 'custom', widthMm: NaN })).toThrow('宽高');
  expect(() => resolvePaper({ ...DEFAULT_SETTINGS, marginTopMm: -1 })).toThrow('页边距');
  expect(() => resolvePaper({ ...DEFAULT_SETTINGS, marginLeftMm: 210 })).toThrow('占满');
});

test('preserves custom width/height order', () => {
  const result = resolvePaper({
    ...DEFAULT_SETTINGS,
    paper: 'custom',
    widthMm: 100,
    heightMm: 150,
  });
  expect(result.widthMm).toBe(100);
  expect(result.heightMm).toBe(150);
});

test('unit switching round-trips without changing the physical page', () => {
  const pixels = convertFields(DEFAULT_SETTINGS, 96 / 25.4);
  expect(pixels.widthMm).toBeCloseTo(793.700787);
  expect(convertFields(pixels, 25.4 / 96).widthMm).toBeCloseTo(210);
});

test('paper presets provide fixed dimensions and margins according to orientation and unit', () => {
  // A4 纵向与横向
  const a4Portrait = getPresetDimensions('a4', 'portrait', 'mm');
  expect(a4Portrait).toEqual({
    width: 210,
    height: 297,
    marginTop: 10,
    marginRight: 10,
    marginBottom: 10,
    marginLeft: 10,
  });

  const a4Landscape = getPresetDimensions('a4', 'landscape', 'mm');
  expect(a4Landscape.width).toBe(297);
  expect(a4Landscape.height).toBe(210);

  // A3 预设
  const a3 = getPresetDimensions('a3', 'portrait', 'mm');
  expect(a3.width).toBe(297);
  expect(a3.height).toBe(420);

  // 自定义尺寸默认值联动规则：宽为 A4 宽，高为 200px，边距为 2px
  const customPx = getPresetDimensions('custom', 'portrait', 'px');
  expect(customPx.width).toBeCloseTo(793.7, 1);
  expect(customPx.height).toBe(200);
  expect(customPx.marginTop).toBe(2);
  expect(customPx.marginRight).toBe(2);
  expect(customPx.marginBottom).toBe(2);
  expect(customPx.marginLeft).toBe(2);

  const customMm = getPresetDimensions('custom', 'portrait', 'mm');
  expect(customMm.width).toBe(210);
  expect(customMm.height).toBeCloseTo(52.92, 2);
  expect(customMm.marginTop).toBeCloseTo(0.53, 2);
});

test('image presets report their natural unit and exact pixel dimensions', () => {
  // 纸张预设用 mm，社媒图片预设用 px；选中预设时单位自动跟随，不出现 328.61 mm 这类数字
  expect(getPresetUnit('a4')).toBe('mm');
  expect(getPresetUnit('card-3x4')).toBe('px');
  expect(isImagePaper('story-9x16')).toBe(true);
  expect(isImagePaper('a4')).toBe(false);

  // 小红书 3:4 是 1242×1656，边距按画框宽度取 60px
  expect(getPresetDimensions('card-3x4', 'portrait', 'px')).toEqual({
    width: 1242,
    height: 1656,
    marginTop: 60,
    marginRight: 60,
    marginBottom: 60,
    marginLeft: 60,
  });

  // 电商详情图不留内边距，购物页里的图片本身就是满幅
  expect(getPresetDimensions('ecom-750x1000', 'portrait', 'px').marginTop).toBe(0);

  // 图片预设同样支持旋转
  const landscape = getPresetDimensions('card-3x4', 'landscape', 'px');
  expect(landscape.width).toBe(1656);
  expect(landscape.height).toBe(1242);
});

test('image preset keeps its physical size when the unit switches to mm', () => {
  // 面板允许用户把单位切到 mm，此时尺寸应按 96 DPI 折算，而不是回退到 A4
  const mm = getPresetDimensions('card-3x4', 'portrait', 'mm');
  expect(mm.width).toBeCloseTo(328.6125, 4);
  expect(mm.height).toBeCloseTo(438.15, 2);

  const resolved = resolvePaper({
    ...DEFAULT_SETTINGS,
    paper: 'card-3x4',
    widthMm: mm.width,
    heightMm: mm.height,
    marginTopMm: mm.marginTop,
    marginRightMm: mm.marginRight,
    marginBottomMm: mm.marginBottom,
    marginLeftMm: mm.marginLeft,
  });
  // resolvePaper 对预设使用标准尺寸，保证导出比例精确
  expect(resolved.widthMm).toBeCloseTo(328.6125, 4);
  expect(resolved.heightMm).toBeCloseTo(438.15, 2);
  expect(resolved.pageWidth / resolved.pageHeight).toBeCloseTo(3 / 4, 4);
});
