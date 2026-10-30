import { IMAGE_PAPER_SIZES, Paper } from '../../../lib';

interface OutputPresetMeta {
  value: Paper;
  group: '纸张' | '社媒图片' | '其他';
  /** 简称，工具栏用 */
  name: string;
  /** 尺寸说明，下拉里用 */
  detail: string;
}

/**
 * 输出尺寸预设的单一来源：工具栏展示与设置面板下拉共用，
 * 避免同一个预设出现两套名字。
 */
export const OUTPUT_PRESETS: OutputPresetMeta[] = [
  { value: 'a4', group: '纸张', name: 'A4', detail: '210×297 mm' },
  { value: 'a3', group: '纸张', name: 'A3', detail: '297×420 mm' },
  { value: 'a5', group: '纸张', name: 'A5', detail: '148×210 mm' },
  { value: 'letter', group: '纸张', name: 'Letter', detail: '216×279 mm' },
  { value: 'card-3x4', group: '社媒图片', name: '小红书 3:4', detail: `${IMAGE_PAPER_SIZES['card-3x4'].widthPx}×${IMAGE_PAPER_SIZES['card-3x4'].heightPx}` },
  { value: 'card-4x5', group: '社媒图片', name: '4:5', detail: `${IMAGE_PAPER_SIZES['card-4x5'].widthPx}×${IMAGE_PAPER_SIZES['card-4x5'].heightPx}` },
  { value: 'square-1x1', group: '社媒图片', name: '1:1', detail: `${IMAGE_PAPER_SIZES['square-1x1'].widthPx}×${IMAGE_PAPER_SIZES['square-1x1'].heightPx}` },
  { value: 'story-9x16', group: '社媒图片', name: '9:16', detail: `${IMAGE_PAPER_SIZES['story-9x16'].widthPx}×${IMAGE_PAPER_SIZES['story-9x16'].heightPx}` },
  { value: 'ecom-750x1000', group: '社媒图片', name: '电商详情', detail: `${IMAGE_PAPER_SIZES['ecom-750x1000'].widthPx}×${IMAGE_PAPER_SIZES['ecom-750x1000'].heightPx}` },
  { value: 'custom', group: '其他', name: '自定义', detail: '手动输入宽高' },
];

/** 工具栏用的简称，未知预设回退为自定义 */
export function getOutputPresetName(paper: Paper): string {
  return OUTPUT_PRESETS.find(preset => preset.value === paper)?.name ?? '自定义';
}

/** 设置面板用的分组下拉选项 */
export const OUTPUT_PRESET_OPTIONS = (['纸张', '社媒图片', '其他'] as const).map(group => ({
  label: group,
  options: OUTPUT_PRESETS.filter(preset => preset.group === group).map(preset => ({
    value: preset.value,
    label: `${preset.name} · ${preset.detail}`,
  })),
}));
