/** Freeze viewport positioning inside the print document, without touching live DOM. */
export interface FrozenPosition {
  element: HTMLElement | SVGElement;
  left: number;
  top: number;
}
const positions = new WeakMap<HTMLElement, FrozenPosition[]>();

function clearInsets(style: CSSStyleDeclaration) {
  for (const property of [
    'inset',
    'inset-inline',
    'inset-block',
    'top',
    'right',
    'bottom',
    'left',
  ]) {
    style.removeProperty(property);
    style.setProperty(property, 'auto', 'important');
  }
}

export function freezePositioning(
  source: Element,
  copy: HTMLElement | SVGElement,
  rootRect: DOMRect,
): FrozenPosition | undefined {
  const css = source.ownerDocument.defaultView?.getComputedStyle(source);
  if (!css || !['sticky', 'fixed'].includes(css.position)) return;
  clearInsets(copy.style);
  if (css.position === 'sticky') {
    // Sticky already occupies a slot in normal flow. Keep that slot and its
    // containing block, but remove viewport/scroll-driven displacement.
    copy.style.setProperty('position', 'relative', 'important');
    return;
  }
  const rect = source.getBoundingClientRect();
  copy.style.setProperty('position', 'absolute', 'important');
  // A fixed box may derive its auto width from both viewport edges. Preserve
  // the used CSS dimensions, including the original box-sizing and transform.
  if (css.width && css.width !== 'auto')
    copy.style.setProperty('width', css.width, 'important');
  if (css.height && css.height !== 'auto')
    copy.style.setProperty('height', css.height, 'important');
  const anchor = {
    element: copy,
    left: rect.left - rootRect.left,
    top: rect.top - rootRect.top,
  };
  copy.style.setProperty('left', `${anchor.left}px`, 'important');
  copy.style.setProperty('top', `${anchor.top}px`, 'important');
  return anchor;
}

export function registerFrozenPositions(
  root: HTMLElement,
  anchors: FrozenPosition[],
) {
  if (anchors.length) positions.set(root, anchors);
}

/** Must run after mounting/resources. Resolve each containing block in the actual clone.
 * Two unit offsets provide its local coordinate basis, including borders, margins,
 * nested positioned ancestors, CSS zoom and affine transforms. Parents precede children.
 */
export function normalizeSnapshotPositions(root: HTMLElement) {
  for (const { element, left, top } of positions.get(root) || []) {
    if (!root.contains(element)) continue;
    const origin = root.getBoundingClientRect();
    const style = element.style;
    style.setProperty('left', '0px', 'important');
    style.setProperty('top', '0px', 'important');
    const zero = element.getBoundingClientRect();
    style.setProperty('left', '1px', 'important');
    const x = element.getBoundingClientRect();
    style.setProperty('left', '0px', 'important');
    style.setProperty('top', '1px', 'important');
    const y = element.getBoundingClientRect();
    const a = x.left - zero.left,
      b = x.top - zero.top;
    const c = y.left - zero.left,
      d = y.top - zero.top;
    const determinant = a * d - b * c;
    const dx = origin.left + left - zero.left,
      dy = origin.top + top - zero.top;
    const localX =
      Math.abs(determinant) > 1e-8 ? (dx * d - dy * c) / determinant : left;
    const localY =
      Math.abs(determinant) > 1e-8 ? (dy * a - dx * b) / determinant : top;
    style.setProperty('left', `${localX}px`, 'important');
    style.setProperty('top', `${localY}px`, 'important');
  }
}
