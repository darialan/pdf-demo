import { measureDocument, readRootHeight } from '../adapters/dom/measurement';
import { createPrintSnapshot } from '../adapters/dom/snapshot';
import { calculateGeometry, PageGeometry } from '../core/geometry/page-geometry';
import { DEFAULT_SETTINGS, resolvePaper } from '../core/geometry/paper';
import { paginate } from '../core/pagination/paginator';
import { buildPrintRules, getPrintRules } from '../core/rules/print-rules';
import { MeasurementStats, Orientation, PageSlice, PrintRule, PrintRuleConfig, PrintSettings } from '../core/types';
import { checkCancelled } from './cancellation';

export type { Orientation } from '../core/types';

export interface PaginationPipelineOptions {
  root: HTMLElement;
  capacity: number;
  maxPages: number;
  slicingMode?: boolean;
  rules?: readonly PrintRule[];
  ruleConfig?: PrintRuleConfig;
}

export interface LayoutOptions {
  element: HTMLElement | null;
  header?: HTMLElement | null;
  footer?: HTMLElement | null;
  orientation?: Orientation;
  settings?: Partial<PrintSettings>;
  signal?: AbortSignal;
  maxPages?: number;
  rules?: readonly PrintRule[];
  ruleConfig?: PrintRuleConfig;
}

export interface PreparedLayout extends PageGeometry {
  root: HTMLElement;
  header?: HTMLElement;
  footer?: HTMLElement;
  width: number;
  pages: PageSlice[];
  stats?: MeasurementStats;
  timing: {
    measurementMs: number;
    paginationMs: number;
  };
  cleanup: () => void;
}

const activeRoots = new WeakSet<HTMLElement>();

/** DOM measurement adapter → measured intervals → pure core paginator. */
export function planDocument({ root, capacity, maxPages, slicingMode, rules, ruleConfig }: PaginationPipelineOptions) {
  const started = performance.now();
  const height = readRootHeight(root);
  const resolvedRules = rules || (ruleConfig ? buildPrintRules(ruleConfig) : getPrintRules());
  const measurement = slicingMode
    ? { height, ranges: [], stats: undefined }
    : measureDocument(root, capacity, resolvedRules);
  const measured = performance.now();
  const pages = paginate(measurement.height, capacity, measurement.ranges, maxPages);
  return {
    pages,
    stats: measurement.stats,
    timing: {
      measurementMs: measured - started,
      paginationMs: performance.now() - measured,
    },
  };
}

/** Pipeline orchestration: snapshot & resource readiness → page geometry → pagination planning. */
export async function prepareLayout(options: LayoutOptions): Promise<PreparedLayout> {
  const { element, header, footer, signal, orientation = 'portrait' } = options;
  const slicingMode = options.settings?.slicingMode;
  const maxPages = options.maxPages ?? (slicingMode ? Number.MAX_SAFE_INTEGER : 100);
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    throw new Error('找不到有效的打印区域');
  }
  if (!['portrait', 'landscape'].includes(orientation)) {
    throw new Error('纸张方向必须为 portrait 或 landscape');
  }
  const paper = resolvePaper({ ...DEFAULT_SETTINGS, orientation, ...(options.settings || {}) });
  if (activeRoots.has(element)) {
    throw new Error('该区域正在导出，请勿重复提交');
  }
  const width = element.getBoundingClientRect().width;
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('打印区域宽度为零，请先显示内容');
  }
  checkCancelled(signal);
  activeRoots.add(element);
  const snapshot = createPrintSnapshot(width);
  const cleanup = () => {
    snapshot.dispose();
    activeRoots.delete(element);
  };
  try {
    const root = snapshot.clone(element);
    const headerClone = header && !slicingMode ? snapshot.clone(header) : undefined;
    const footerClone = footer && !slicingMode ? snapshot.clone(footer) : undefined;
    snapshot.mount();
    await snapshot.ready(signal);
    const geometry = calculateGeometry(
      paper,
      width,
      headerClone?.getBoundingClientRect().height,
      footerClone?.getBoundingClientRect().height,
      slicingMode
    );
    const { pages, stats, timing } = planDocument({
      root,
      capacity: geometry.capacity,
      maxPages,
      slicingMode,
      rules: options.rules,
      ruleConfig: options.ruleConfig,
    });
    return {
      ...geometry,
      root,
      header: headerClone,
      footer: footerClone,
      width,
      pages,
      stats,
      timing,
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
