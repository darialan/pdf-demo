import {
  DEFAULT_SETTINGS,
  PAPER_PRESETS,
  resolvePaper,
} from '../../src/lib/core/geometry/paper';
import { PrintSettings } from '../../src/lib/core/types';
export const CHANNEL = 'web-printer-v1';
export type Command =
  | 'status'
  | 'select'
  | 'whole'
  | 'parent'
  | 'exclude'
  | 'undo'
  | 'prepare'
  | 'thumbnail'
  | 'inspect'
  | 'export'
  | 'cancel'
  | 'dispose';
export interface Envelope {
  channel: typeof CHANNEL;
  sessionId: string;
  requestId: string;
  revision: number;
  command: Command;
  payload?: Record<string, unknown>;
}
export interface PrinterState {
  sessionId: string;
  revision: number;
  phase:
    | 'idle'
    | 'selecting'
    | 'preparing'
    | 'ready'
    | 'exporting'
    | 'success'
    | 'error'
    | 'stale';
  summary: string;
  pages: number;
  excluded: number;
  warnings: string[];
  error?: string;
  inspectionError?: string;
  inspecting: boolean;
  progress?: { completed: number; total: number };
  lastExport?: {
    format: string;
    pages: number;
    bytes: number;
    totalMs: number;
  };
  preparedMs?: number;
  // 每次成功 prepare 都更新的单调时间戳，用作预览缓存失效的可靠信号
  // （preparedMs 是耗时测量值，可能恰好两次相同）。
  preparedAt?: number;
}
const commands: Command[] = [
  'status',
  'select',
  'whole',
  'parent',
  'exclude',
  'undo',
  'prepare',
  'thumbnail',
  'inspect',
  'export',
  'cancel',
  'dispose',
];
export function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Envelope;
  return (
    v.channel === CHANNEL &&
    typeof v.sessionId === 'string' &&
    v.sessionId.length <= 100 &&
    typeof v.requestId === 'string' &&
    v.requestId.length <= 100 &&
    Number.isSafeInteger(v.revision) &&
    v.revision >= 0 &&
    commands.includes(v.command) &&
    (v.payload === undefined ||
      (typeof v.payload === 'object' &&
        v.payload !== null &&
        !Array.isArray(v.payload)))
  );
}
export function validateSettings(value: unknown): PrintSettings {
  if (!value || typeof value !== 'object')
    throw new Error('输出设置无效，请恢复默认设置');
  const v = value as PrintSettings;
  if (!Object.prototype.hasOwnProperty.call(PAPER_PRESETS, v.paper))
    throw new Error('请选择有效的页面尺寸');
  if (v.unit !== undefined && v.unit !== 'mm' && v.unit !== 'px')
    throw new Error('尺寸单位无效');
  for (const field of [
    'widthMm',
    'heightMm',
    'marginTopMm',
    'marginRightMm',
    'marginBottomMm',
    'marginLeftMm',
  ] as const) {
    if (
      typeof v[field] !== 'number' ||
      !Number.isFinite(v[field]) ||
      v[field] > 2000
    )
      throw new Error('尺寸必须是有效数值，且不超过 2000 mm');
  }
  for (const field of ['header', 'footer'] as const) {
    const item = v[field];
    if (
      item !== undefined &&
      (!item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        (item.text !== undefined &&
          (typeof item.text !== 'string' || item.text.length > 120)) ||
        (item.enabled !== undefined && typeof item.enabled !== 'boolean') ||
        (item.align !== undefined &&
          !['left', 'center', 'right'].includes(item.align)))
    )
      throw new Error('页眉页脚最多 120 个字符');
  }
  if (
    v.pageNumber !== undefined &&
    (!v.pageNumber ||
      typeof v.pageNumber !== 'object' ||
      Array.isArray(v.pageNumber) ||
      typeof v.pageNumber.enabled !== 'boolean' ||
      (v.pageNumber.position !== undefined &&
        !['bottom-right', 'bottom-center', 'top-right', 'top-center'].includes(
          v.pageNumber.position,
        )) ||
      (v.pageNumber.format !== undefined &&
        !['slash', 'chinese', 'hyphen'].includes(v.pageNumber.format)))
  )
    throw new Error('页码设置无效');
  resolvePaper(v);
  return JSON.parse(JSON.stringify(v));
}
export function defaultSettings(): PrintSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
export function userError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /Cannot access|chrome:\/\/|Missing host|permission|Receiving end|establish connection/i.test(
      message,
    )
  )
    return '无法读取此页面。请回到普通网页，点击插件图标后重试。';
  if (/图片总大小|图片包超过/.test(message)) return message.slice(0, 200);
  if (/图片|image|CORS|taint/i.test(message))
    return '有图片或画布无法读取。请排除相关内容，或等待加载完成后重试。';
  if (
    /frame|shadow|普通网页|重新连接|无法读取|原页面|虚拟|滚动|内容已变化|会话|设置|尺寸|宽高|边距|页码|页眉|字符|像素|取消|超时|超高|整页|区域|保护|上限|高度|页数|failed to fetch/i.test(
      message,
    )
  )
    return message.slice(0, 200);
  return '处理失败，请重新选择区域后重试。';
}
