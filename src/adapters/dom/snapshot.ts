import { waitForResources } from '../resources/resource-loader';

/** Freeze resolved CSS so moving the print root outside Tabs does not change typography or layout. */
export function copyResolvedStyle(source: Element, target: HTMLElement | SVGElement) {
  const computed = window.getComputedStyle(source);
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

/** Owns detached print DOM; callers dispose it on every success/error path. */
export function createPrintSnapshot(width: number) {
  const host = document.createElement('div');
  host.setAttribute('data-pdf-snapshot', 'true');
  host.style.cssText = `position:absolute;left:-100000px;top:0;width:${width}px;pointer-events:none;background:white;`;
  const clone = (source: HTMLElement) => {
    const target = source.cloneNode(true) as HTMLElement;

    // Preserve form and canvas state that cloneNode does not copy.
    const sources = [source, ...Array.from(source.querySelectorAll('*'))];
    const targets = [target, ...Array.from(target.querySelectorAll('*'))];
    sources.forEach((node, i) => {
      const copy = targets[i];
      if (node instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
        copy.value = node.value;
        copy.checked = node.checked;
      }
      if (node instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
        copy.value = node.value;
      }
      if (node instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) {
        copy.selectedIndex = node.selectedIndex;
      }
      if (node instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
        copy.width = node.width;
        copy.height = node.height;
        copy.getContext('2d')?.drawImage(node, 0, 0);
      }
      if (copy instanceof HTMLElement || copy instanceof SVGElement) copyResolvedStyle(node, copy);
      if (copy instanceof HTMLImageElement) {
        copy.loading = 'eager';
        // Fail during preparation when a remote image cannot be used by canvas.
        if (/^https?:/.test(copy.src) && new URL(copy.src).origin !== window.location.origin) {
          copy.crossOrigin = 'anonymous';
        }
      }
    });
    target.style.width = `${width}px`;
    target.style.maxWidth = 'none';
    target.style.boxSizing = 'border-box';
    target.querySelectorAll('[data-pdf-debug], [data-pdf-ignore="true"]').forEach(node => node.remove());
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
