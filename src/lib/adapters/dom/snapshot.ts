import { freezePositioning, FrozenPosition, normalizeSnapshotPositions, registerFrozenPositions } from './positioning';
import { waitForResources } from '../resources/resource-loader';
import { classifyPrintNode, getPrintRules } from '../../core/rules/print-rules';
import { PrintRule } from '../../core/types';

export type SnapshotNodeTransform = (source: Element, clone: HTMLElement | SVGElement) => void;

/** Freeze resolved CSS so moving the print root outside its original context does not change typography or layout. */
export function copyResolvedStyle(source: Element, target: HTMLElement | SVGElement) {
  const win = source.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  const computed = win?.getComputedStyle ? win.getComputedStyle(source) : null;
  if (!computed) return;

  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    // Computed dimensions can be used values of an originally auto-sized box.
    // Freezing those values changes margin collapsing and table alignment.
    // Retain min/max constraints: unlike used auto dimensions these remain CSS
    // constraints and can come from ancestor-dependent component-library rules.
    if (/^(width|height|block-size|inline-size)$/.test(property)) {
      // Intrinsic media and tables must retain their rendered size when an ancestor
      // selector no longer matches in the detached snapshot. Generic flow boxes
      // keep auto sizing so margin collapse and table alignment remain unchanged.
      if (!/^(IMG|CANVAS|SVG|TABLE|COL|COLGROUP)$/.test(source.tagName.toUpperCase())) continue;
    }
    target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  target.style.animation = 'none';
  target.style.transition = 'none';
}

/**
 * Clone DOM element and freeze resolved CSS so rendering outside its original context
 * (e.g. inside detached print containers or preview widgets, or from an iframe) does not alter typography,
 * inherited line-heights, or layout dimensions.
 */
export function cloneWithResolvedStyles(source: HTMLElement, rules: readonly PrintRule[] = getPrintRules(), excludedElements: readonly Element[] = [], transformNode?: SnapshotNodeTransform): HTMLElement {
  const ownerDoc = typeof document !== 'undefined' ? document : source.ownerDocument;
  const target = (ownerDoc?.importNode ? ownerDoc.importNode(source, true) : source.cloneNode(true)) as HTMLElement;

  const rootRect = source.getBoundingClientRect();
  const anchors: FrozenPosition[] = [];

  // Preserve form and canvas state that cloneNode/importNode does not copy.
  const sources = [source, ...Array.from(source.querySelectorAll('*'))];
  const targets = [target, ...Array.from(target.querySelectorAll('*'))];
  sources.forEach((node, i) => {
    const copy = targets[i];
    if (!copy || copy.nodeType !== 1) return;

    // Exclude before resource decoding and layout, including configured selectors.
    if (node !== source && (excludedElements.includes(node) || /^(SCRIPT|NOSCRIPT)$/.test(node.tagName) || classifyPrintNode(node, rules).kind === 'ignore')) {
      copy.remove();
      return;
    }
    for (const attribute of Array.from(copy.attributes)) {
      if (/^on/i.test(attribute.name) || attribute.name === 'autofocus') copy.removeAttribute(attribute.name);
    }
    const tagName = (node.tagName || '').toLowerCase();
    if (tagName === 'input') {
      const srcInput = node as HTMLInputElement;
      const dstInput = copy as HTMLInputElement;
      dstInput.value = srcInput.value;
      dstInput.checked = srcInput.checked;
    } else if (tagName === 'textarea') {
      (copy as HTMLTextAreaElement).value = (node as HTMLTextAreaElement).value;
    } else if (tagName === 'select') {
      (copy as HTMLSelectElement).selectedIndex = (node as HTMLSelectElement).selectedIndex;
    } else if (tagName === 'canvas') {
      const canvasSource = node as HTMLCanvasElement;
      const canvasCopy = copy as HTMLCanvasElement;
      canvasCopy.width = canvasSource.width;
      canvasCopy.height = canvasSource.height;
      try {
        // Detect taint before html2canvas can silently omit an unreadable canvas.
        canvasSource.toDataURL();
        const context = canvasCopy.getContext('2d');
        if (!context) throw new Error('canvas context unavailable');
        context.drawImage(canvasSource, 0, 0);
      } catch {
        throw new Error('画布内容无法读取，请检查跨域图片或浏览器的画布支持');
      }
    } else if (tagName === 'img') {
      const imgCopy = copy as HTMLImageElement;
      imgCopy.loading = 'eager';
      imgCopy.src = (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src;
      imgCopy.removeAttribute('srcset');
      imgCopy.removeAttribute('sizes');
      // Fail during preparation when a remote image cannot be used by canvas.
      if (/^https?:/.test(imgCopy.src) && typeof window !== 'undefined') {
        try {
          if (new URL(imgCopy.src).origin !== window.location.origin) {
            imgCopy.crossOrigin = 'anonymous';
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }

    if ((copy as any).style) {
      copyResolvedStyle(node, copy as HTMLElement);
      if (node !== source) {
        const anchor = freezePositioning(node, copy as HTMLElement, rootRect);
        if (anchor) anchors.push(anchor);
      }
      transformNode?.(node, copy as HTMLElement | SVGElement);
    }
  });
  target.querySelectorAll('[data-print-debug], [data-print-ignore="true"], [data-pdf-debug], [data-pdf-ignore="true"]').forEach(node => node.remove());

  // Retag a BODY print root as a DIV. html2canvas assumes a <body>/<html> target is the
  // document itself: it takes bounds from the capturing document and ignores the
  // caller's x/y options, so an offscreen snapshot of the whole page (rooted at a body
  // clone placed at left:-100000px) renders instead from (0,0) and exports blank pages.
  const isBodyTarget = /^BODY$/i.test(source.tagName || '');
  if (isBodyTarget) {
    const wrapper = ownerDoc.createElement('div');
    wrapper.style.cssText = (target as HTMLElement).style.cssText;
    while ((target as HTMLElement).firstChild) wrapper.appendChild((target as HTMLElement).firstChild!);
    targets[0] = wrapper;
  }

  // The root's margins position it in the source page (including resolved auto
  // centering margins). A page slice supplies its own origin and paper margins;
  // carrying those external offsets into it shifts/crops the captured document.
  // Descendant margins remain frozen above to preserve the internal layout.
  const result: HTMLElement = (targets[0] as HTMLElement) || (target as HTMLElement);
  result.style.setProperty('margin', '0', 'important');
  result.style.setProperty('position', 'relative', 'important');
  for (const property of ['inset', 'inset-inline', 'inset-block']) result.style.setProperty(property, 'auto', 'important');
  result.style.setProperty('float', 'none', 'important');
  result.style.setProperty('margin-inline', '0', 'important');
  result.style.setProperty('margin-block', '0', 'important');

  // Lock root target width to source element width so rendering outside original flow never shrink-wraps or alters line wrapping
  const sourceWidth = source.getBoundingClientRect().width;
  if (sourceWidth > 0) {
    result.style.setProperty('width', `${sourceWidth}px`, 'important');
    result.style.setProperty('max-width', 'none', 'important');
    result.style.setProperty('box-sizing', 'border-box', 'important');
  }

  registerFrozenPositions(result, anchors);
  return result;
}

/** Owns detached print DOM; callers dispose it on every success/error path. */
export function createPrintSnapshot(width: number, rules: readonly PrintRule[] = getPrintRules(), excludedElements: readonly Element[] = [], transformNode?: SnapshotNodeTransform) {
  const host = document.createElement('div');
  host.setAttribute('data-print-snapshot', 'true');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('inert', '');
  host.style.cssText = `position:absolute;left:-100000px;top:0;width:${width}px;pointer-events:none;background:white;`;
  const clone = (source: HTMLElement) => {
    const target = cloneWithResolvedStyles(source, rules, excludedElements, transformNode);
    target.style.setProperty('width', `${width}px`, 'important');
    target.style.setProperty('max-width', 'none', 'important');
    target.style.setProperty('box-sizing', 'border-box', 'important');
    host.appendChild(target);
    return target;
  };
  return {
    clone,
    mount: () => document.body.appendChild(host),
    ready: async (signal?: AbortSignal) => {
      await waitForResources(host, signal);
      Array.from(host.children).forEach(root => normalizeSnapshotPositions(root as HTMLElement));
    },
    dispose: () => host.remove(),
  };
}

/** A preview is passive: preserve live form/canvas values without executing source handlers. */
export function serializePrintSnapshot(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  let serializedRoot = clone;
  const sources = [root, ...Array.from(root.querySelectorAll('*'))];
  const targets = [clone, ...Array.from(clone.querySelectorAll('*'))];
  sources.forEach((source, index) => {
    const target = targets[index];
    for (const attribute of Array.from(target.attributes)) {
      if (/^on/i.test(attribute.name)) target.removeAttribute(attribute.name);
    }
    if (source instanceof HTMLCanvasElement) {
      const image = document.createElement('img');
      image.src = source.toDataURL('image/png');
      image.style.cssText = (target as HTMLElement).style.cssText;
      image.width = source.width;
      image.height = source.height;
      if (target === clone) serializedRoot = image;
      else target.replaceWith(image);
    } else if (source instanceof HTMLInputElement) {
      target.setAttribute('value', source.type === 'password' ? '' : source.value);
      target.toggleAttribute('checked', source.checked);
    } else if (source instanceof HTMLTextAreaElement) {
      target.textContent = source.value;
    } else if (source instanceof HTMLOptionElement) {
      target.toggleAttribute('selected', source.selected);
    }
    if (target.matches('a, button, input, textarea, select, [tabindex]')) target.setAttribute('tabindex', '-1');
  });
  return serializedRoot.outerHTML;
}

/** Isolate repeated preview IDs while preserving SVG paint servers and label references. */
export function namespacePreviewHtml(html: string, namespace: string): string {
  const ids = new Map<string, string>();
  html.replace(/\sid="([^"]+)"/g, (_match, id: string) => { ids.set(id, `${namespace}-${id}`); return _match; });
  return html.replace(/(\s(?:id|for|href|xlink:href|aria-labelledby|aria-describedby)="|url\(#)([^")]+)("|\))/g,
    (match, start: string, value: string, end: string) => {
      const hash = value.startsWith('#');
      const parts = (hash ? value.slice(1) : value).split(' ').map(id => ids.get(id) || id).join(' ');
      return `${start}${hash ? '#' : ''}${parts}${end}`;
    });
}
