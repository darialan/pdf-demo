import { waitForResources } from '../resources/resource-loader';

/** Freeze resolved CSS so moving the print root outside its original context does not change typography or layout. */
export function copyResolvedStyle(source: Element, target: HTMLElement | SVGElement) {
  const win = source.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  const computed = win?.getComputedStyle ? win.getComputedStyle(source) : null;
  if (!computed) return;

  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    // Computed dimensions can be used values of an originally auto-sized box.
    // Freezing those values changes margin collapsing and table alignment.
    // Retain authored dimensions from cloneNode/CSS, rather than fixing every box.
    if (/^(min-|max-)?(width|height|block-size|inline-size)$/.test(property)) continue;
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
export function cloneWithResolvedStyles(source: HTMLElement): HTMLElement {
  const ownerDoc = typeof document !== 'undefined' ? document : source.ownerDocument;
  const target = (ownerDoc?.importNode ? ownerDoc.importNode(source, true) : source.cloneNode(true)) as HTMLElement;

  // Preserve form and canvas state that cloneNode/importNode does not copy.
  const sources = [source, ...Array.from(source.querySelectorAll('*'))];
  const targets = [target, ...Array.from(target.querySelectorAll('*'))];
  sources.forEach((node, i) => {
    const copy = targets[i];
    if (!copy || copy.nodeType !== 1) return;

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
        canvasCopy.getContext('2d')?.drawImage(canvasSource, 0, 0);
      } catch {
        // Safe fallback for context or tainted canvas
      }
    } else if (tagName === 'img') {
      const imgCopy = copy as HTMLImageElement;
      imgCopy.loading = 'eager';
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
    }
  });
  target.querySelectorAll('[data-pdf-debug], [data-pdf-ignore="true"]').forEach(node => node.remove());

  // Lock root target width to source element width so rendering outside original flow never shrink-wraps or alters line wrapping
  const sourceWidth = source.getBoundingClientRect().width;
  if (sourceWidth > 0) {
    target.style.width = `${sourceWidth}px`;
    target.style.maxWidth = 'none';
    target.style.boxSizing = 'border-box';
  }

  return target;
}

/** Owns detached print DOM; callers dispose it on every success/error path. */
export function createPrintSnapshot(width: number) {
  const host = document.createElement('div');
  host.setAttribute('data-pdf-snapshot', 'true');
  host.style.cssText = `position:absolute;left:-100000px;top:0;width:${width}px;pointer-events:none;background:white;`;
  const clone = (source: HTMLElement) => {
    const target = cloneWithResolvedStyles(source);
    target.style.width = `${width}px`;
    target.style.maxWidth = 'none';
    target.style.boxSizing = 'border-box';
    host.appendChild(target);
    return target;
  };
  return {
    clone,
    mount: () => document.body.appendChild(host),
    ready: (signal?: AbortSignal) => waitForResources(host, signal),
    dispose: () => host.remove(),
  };
}
