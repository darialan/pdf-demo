import { measureDocument } from '../adapters/dom/measurement';
import { createPrintSnapshot } from '../adapters/dom/snapshot';
import { waitForResources } from '../adapters/resources/resource-loader';
import { calculateGeometry, PageGeometry } from '../core/geometry/page-geometry';
import { DEFAULT_SETTINGS, resolvePaper } from '../core/geometry/paper';
import { paginate } from '../core/pagination/paginator';
import { buildPrintRules, getPrintRules } from '../core/rules/print-rules';
import {
  DeclarativeHeaderFooterConfig,
  MeasurementStats,
  Orientation,
  PageSlice,
  PrintRule,
  PrintRuleConfig,
  PrintSettings,
} from '../core/types';
import { checkCancelled } from './cancellation';

export type { Orientation } from '../core/types';

export function createDeclarativeElement(
  config: DeclarativeHeaderFooterConfig,
  type: 'header' | 'footer',
  width: number
): HTMLElement {
  const el = document.createElement('div');
  el.className = `print-declarative-${type}`;
  el.style.width = `${width}px`;
  el.style.boxSizing = 'border-box';
  el.style.padding = type === 'header' ? '8px 0 6px 0' : '6px 0 8px 0';
  el.style.textAlign = config.align || 'center';
  el.style.fontSize = type === 'header' ? '12px' : '11px';
  el.style.color = type === 'header' ? '#334155' : '#64748b';
  el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  el.style.lineHeight = '1.4';
  if (config.showDivider) {
    if (type === 'header') {
      el.style.borderBottom = '1px solid #cbd5e1';
    } else {
      el.style.borderTop = '1px solid #cbd5e1';
    }
  }
  el.textContent = config.text || '';
  return el;
}

export interface PaginationPipelineOptions {
  root: HTMLElement;
  capacity: number;
  maxPages: number;
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
export function planDocument({ root, capacity, maxPages, rules, ruleConfig }: PaginationPipelineOptions) {
  const started = performance.now();
  const resolvedRules = rules || (ruleConfig ? buildPrintRules(ruleConfig) : getPrintRules());
  const measurement = measureDocument(root, capacity, resolvedRules);
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

/**
 * Safely verify whether a node is a printable DOM element,
 * including elements from an iframe or different window realm.
 */
export function isPrintableElement(node: unknown): node is HTMLElement {
  if (!node || typeof node !== 'object') return false;
  const el = node as any;
  if (el.nodeType !== 1) return false;
  const win = el.ownerDocument?.defaultView;
  const isElement =
    (win && typeof win.HTMLElement === 'function' && el instanceof win.HTMLElement) ||
    (typeof HTMLElement !== 'undefined' && el instanceof HTMLElement) ||
    (typeof el.getBoundingClientRect === 'function' && typeof el.cloneNode === 'function');
  if (!isElement) return false;
  return Boolean(el.isConnected ?? el.ownerDocument?.contains?.(el));
}

/** If an iframe element is passed, automatically resolve its inner document body or main report content */
export function resolvePrintElement(target: unknown): HTMLElement | null {
  if (!isPrintableElement(target)) return null;
  if (target.tagName?.toLowerCase() === 'iframe') {
    const iframe = target as HTMLIFrameElement;
    let doc: Document | null | undefined;
    try {
      doc = iframe.contentDocument || iframe.contentWindow?.document;
    } catch {
      throw new Error('无法读取跨域 iframe，请在嵌入系统内接入打印工具或使用其导出接口');
    }
    if (!doc?.body || doc.readyState === 'loading' || (doc.URL === 'about:blank' && Boolean(iframe.getAttribute('src')))) {
      throw new Error('iframe 内容尚未就绪，请等待加载完成后重试');
    }
    const content = (doc.getElementById('iframe-report-content') as HTMLElement) || doc.body;
    if (!isPrintableElement(content) || (!content.childElementCount && !content.textContent?.trim())) {
      throw new Error('iframe 中没有可打印的业务内容');
    }
    return content;
  }
  return target;
}

/** Pipeline orchestration: snapshot & resource readiness → page geometry → pagination planning. */
export async function prepareLayout(options: LayoutOptions): Promise<PreparedLayout> {
  const { header, footer, signal, orientation = 'portrait' } = options;
  const maxPages = options.maxPages ?? 100;

  const printElement = resolvePrintElement(options.element);
  if (!printElement) {
    throw new Error('找不到有效的打印区域');
  }
  if (!['portrait', 'landscape'].includes(orientation)) {
    throw new Error('纸张方向必须为 portrait 或 landscape');
  }
  const paper = resolvePaper({ ...DEFAULT_SETTINGS, orientation, ...(options.settings || {}) });
  if (activeRoots.has(printElement)) {
    throw new Error('该区域正在导出，请勿重复提交');
  }
  let width = printElement.getBoundingClientRect().width;
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('打印区域宽度为零，请先显示内容');
  }
  checkCancelled(signal);
  activeRoots.add(printElement);
  const rules = options.rules || (options.ruleConfig ? buildPrintRules(options.ruleConfig) : getPrintRules());
  let snapshot: ReturnType<typeof createPrintSnapshot> | undefined;
  const cleanup = () => {
    snapshot?.dispose();
    activeRoots.delete(printElement);
  };
  try {
    // Readiness must precede style freezing: otherwise an image still loading
    // can have its temporary 0px height frozen permanently into the snapshot.
    await waitForResources(printElement, signal, rules);
    width = printElement.getBoundingClientRect().width;
    if (!Number.isFinite(width) || width <= 0) throw new Error('打印区域宽度为零，请先显示内容');
    snapshot = createPrintSnapshot(width, rules);
    const root = snapshot.clone(printElement);

    let headerClone: HTMLElement | undefined;
    if (header && isPrintableElement(header)) {
      headerClone = snapshot.clone(header);
    } else if (options.settings?.header?.enabled && options.settings.header.text) {
      const declHeader = createDeclarativeElement(options.settings.header, 'header', width);
      headerClone = snapshot.clone(declHeader);
    }

    let footerClone: HTMLElement | undefined;
    if (footer && isPrintableElement(footer)) {
      footerClone = snapshot.clone(footer);
    } else if (options.settings?.footer?.enabled && options.settings.footer.text) {
      const declFooter = createDeclarativeElement(options.settings.footer, 'footer', width);
      footerClone = snapshot.clone(declFooter);
    }

    snapshot.mount();
    await snapshot.ready(signal);

    checkCancelled(signal);
    const pageNumber = options.settings?.pageNumber ?? true;
    const geometry = calculateGeometry(
      paper,
      width,
      headerClone?.getBoundingClientRect().height,
      footerClone?.getBoundingClientRect().height,
      pageNumber
    );
    const { pages, stats, timing } = planDocument({
      root,
      capacity: geometry.capacity,
      maxPages,
      rules,
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
