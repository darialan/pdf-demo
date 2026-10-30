import { Orientation, Paper, PrintSettings } from '../types';
export type { Orientation, Paper, PrintSettings } from '../types';

export const PT_PER_MM = 72 / 25.4;
export const MM_PER_PX = 25.4 / 96;
export const PX_PER_MM = 96 / 25.4;

const pxToMm = (px: number) => Number((px * MM_PER_PX).toFixed(4));

/** 社媒 / 图片画框：以像素定义，边距按画框宽度的内边距给默认值 */
export const IMAGE_PAPER_SIZES = {
  'card-3x4': { widthPx: 1242, heightPx: 1656, marginPx: 60 },
  'square-1x1': { widthPx: 1080, heightPx: 1080, marginPx: 54 },
  'card-4x5': { widthPx: 1080, heightPx: 1350, marginPx: 54 },
  'story-9x16': { widthPx: 1080, heightPx: 1920, marginPx: 54 },
  'ecom-750x1000': { widthPx: 750, heightPx: 1000, marginPx: 0 },
} as const;

export type ImagePaper = keyof typeof IMAGE_PAPER_SIZES;

export const IMAGE_PAPERS = Object.keys(IMAGE_PAPER_SIZES) as ImagePaper[];

export function isImagePaper(paper: Paper): paper is ImagePaper {
  return paper in IMAGE_PAPER_SIZES;
}

/** 预设自带的自然单位：纸张用 mm，社媒图片用 px，选中时自动切换，避免出现 328.61 mm 这种数字 */
export function getPresetUnit(paper: Paper): 'mm' | 'px' {
  return isImagePaper(paper) ? 'px' : 'mm';
}

export const PAPER_SIZES: Record<Exclude<Paper, 'custom'>, [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  a5: [148, 210],
  letter: [215.9, 279.4],
  ...Object.fromEntries(
    Object.entries(IMAGE_PAPER_SIZES).map(([key, preset]) => [
      key,
      [pxToMm(preset.widthPx), pxToMm(preset.heightPx)],
    ])
  ) as Record<ImagePaper, [number, number]>,
};


export interface PaperPreset {
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
}

/**
 * 各纸张预设标准（基准存储单位：mm）：
 * - A4、A3、A5、Letter 具有固定的标准物理宽高与统一默认页边距（10mm）
 * - 自定义尺寸（custom）：
 *   - 宽默认为 A4 纸宽度：210 mm (96 DPI 下对应 793.7 px)
 *   - 高度默认为 200 px (对应 200 * 25.4 / 96 ≈ 52.92 mm)
 *   - 上下左右边距默认为 2 px (对应 2 * 25.4 / 96 ≈ 0.53 mm)
 */
export const PAPER_PRESETS: Record<Paper, PaperPreset> = {
  a4: {
    widthMm: 210,
    heightMm: 297,
    marginTopMm: 10,
    marginRightMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
  },
  a3: {
    widthMm: 297,
    heightMm: 420,
    marginTopMm: 10,
    marginRightMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
  },
  a5: {
    widthMm: 148,
    heightMm: 210,
    marginTopMm: 10,
    marginRightMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
  },
  letter: {
    widthMm: 215.9,
    heightMm: 279.4,
    marginTopMm: 10,
    marginRightMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
  },
  custom: {
    widthMm: 210,
    heightMm: Number((200 * MM_PER_PX).toFixed(2)),
    marginTopMm: Number((2 * MM_PER_PX).toFixed(2)),
    marginRightMm: Number((2 * MM_PER_PX).toFixed(2)),
    marginBottomMm: Number((2 * MM_PER_PX).toFixed(2)),
    marginLeftMm: Number((2 * MM_PER_PX).toFixed(2)),
  },
  ...Object.fromEntries(
    Object.entries(IMAGE_PAPER_SIZES).map(([key, preset]) => [
      key,
      {
        widthMm: pxToMm(preset.widthPx),
        heightMm: pxToMm(preset.heightPx),
        marginTopMm: pxToMm(preset.marginPx),
        marginRightMm: pxToMm(preset.marginPx),
        marginBottomMm: pxToMm(preset.marginPx),
        marginLeftMm: pxToMm(preset.marginPx),
      },
    ])
  ) as Record<ImagePaper, PaperPreset>,
};

export const DEFAULT_SETTINGS: PrintSettings = {
  unit: 'mm',
  paper: 'a4',
  widthMm: 210,
  heightMm: 297,
  orientation: 'portrait',
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
  pageNumber: {
    enabled: true,
    position: 'bottom-right',
    format: 'slash',
  },
};

/**
 * 根据纸张类型、纸张方向以及目标单位获取联动标准数值
 */
export function getPresetDimensions(
  paper: Paper,
  orientation: Orientation = 'portrait',
  unit: 'mm' | 'px' = 'mm'
): {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
} {
  const preset = PAPER_PRESETS[paper] || PAPER_PRESETS.a4;
  let widthMm: number;
  let heightMm: number;

  if (paper === 'custom') {
    widthMm = preset.widthMm;
    heightMm = preset.heightMm;
  } else {
    const [short, long] = PAPER_SIZES[paper];
    widthMm = orientation === 'landscape' ? long : short;
    heightMm = orientation === 'landscape' ? short : long;
  }

  const { marginTopMm, marginRightMm, marginBottomMm, marginLeftMm } = preset;

  if (unit === 'px') {
    if (paper === 'custom') {
      return {
        width: Number((widthMm * PX_PER_MM).toFixed(1)),
        height: 200,
        marginTop: 2,
        marginRight: 2,
        marginBottom: 2,
        marginLeft: 2,
      };
    }
    return {
      width: Number((widthMm * PX_PER_MM).toFixed(1)),
      height: Number((heightMm * PX_PER_MM).toFixed(1)),
      marginTop: Number((marginTopMm * PX_PER_MM).toFixed(1)),
      marginRight: Number((marginRightMm * PX_PER_MM).toFixed(1)),
      marginBottom: Number((marginBottomMm * PX_PER_MM).toFixed(1)),
      marginLeft: Number((marginLeftMm * PX_PER_MM).toFixed(1)),
    };
  }

  return {
    width: widthMm,
    height: heightMm,
    marginTop: marginTopMm,
    marginRight: marginRightMm,
    marginBottom: marginBottomMm,
    marginLeft: marginLeftMm,
  };
}

export function mmToPt(mm: number) {
  return mm * PT_PER_MM;
}

export function resolvePaper(settings: PrintSettings) {
  const size = settings.paper === 'custom' ? [settings.widthMm, settings.heightMm] : PAPER_SIZES[settings.paper];
  if (!size || size.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error('页面宽高必须是大于零的数值');
  }
  if (!['portrait', 'landscape'].includes(settings.orientation)) {
    throw new Error('纸张方向无效');
  }
  const margins = [settings.marginTopMm, settings.marginRightMm, settings.marginBottomMm, settings.marginLeftMm];
  if (margins.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('页边距必须为非负数');
  }
  const [short, long] = [...size].sort((a, b) => a - b);
  const [widthMm, heightMm] =
    settings.paper === 'custom' ? size : settings.orientation === 'portrait' ? [short, long] : [long, short];
  if (widthMm - margins[1] - margins[3] <= 0 || heightMm - margins[0] - margins[2] <= 0) {
    throw new Error('页边距占满了页面，请减小边距');
  }
  return {
    pageWidth: mmToPt(widthMm),
    pageHeight: mmToPt(heightMm),
    left: mmToPt(margins[3]),
    right: mmToPt(margins[1]),
    top: mmToPt(margins[0]),
    bottom: mmToPt(margins[2]),
    widthMm,
    heightMm,
  };
}

export type ResolvedPaper = ReturnType<typeof resolvePaper>;

export const UNIT_FIELDS = ['widthMm', 'heightMm', 'marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm'] as const;

/** Storage stays in mm; px means CSS pixels at 96 DPI, independent of devicePixelRatio. */
export function convertFields<T extends PrintSettings>(value: T, factor: number): T {
  const next = { ...value };
  UNIT_FIELDS.forEach(field => {
    if (typeof value[field] === 'number') next[field] = value[field] * factor;
  });
  return next;
}
