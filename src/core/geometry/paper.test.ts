import {
  convertFields,
  DEFAULT_SETTINGS,
  getPresetDimensions,
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

test('allows sub-millimeter pages in slice mode and preserves custom width/height order', () => {
  const result = resolvePaper({
    ...DEFAULT_SETTINGS,
    paper: 'custom',
    widthMm: (800 * 25.4) / 96,
    heightMm: (2 * 25.4) / 96,
    slicingMode: true,
  });
  expect(result.pageHeight).toBeCloseTo(1.5);
  expect(result.pageWidth).toBeCloseTo(600);
  expect(result.top + result.bottom).toBe(0);
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
