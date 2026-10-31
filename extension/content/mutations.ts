/** Renderer-owned nodes and transient measurement probes are not source edits. */
export const INTERNAL_SELECTOR =
  '[data-print-snapshot],[data-print-debug],[data-web-printer-ui],iframe.html2canvas-container';
export function isInternalNode(node: Node): boolean {
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return Boolean(element?.closest(INTERNAL_SELECTOR));
}
export function sourceBaseline(root: Node): WeakSet<Node> {
  const baseline = new WeakSet<Node>();
  const pending: Node[] = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (isInternalNode(node)) continue;
    baseline.add(node);
    for (let i = node.childNodes.length - 1; i >= 0; i--) pending.push(node.childNodes[i]);
  }
  return baseline;
}
export function hasContentChanges(
  records: MutationRecord[],
  baseline: WeakSet<Node>,
): boolean {
  const added = new Set(
    records.flatMap((record) => Array.from(record.addedNodes)),
  );
  const transient = new Set(
    records
      .flatMap((record) => Array.from(record.removedNodes))
      .filter(
        (node) => added.has(node) && !baseline.has(node) && !node.isConnected,
      ),
  );
  const isTransient = (node: Node) => {
    for (let current: Node | null = node; current; current = current.parentNode)
      if (transient.has(current)) return true;
    return false;
  };
  return records.some((record) => {
    if (isInternalNode(record.target) || isTransient(record.target))
      return false;
    if (record.type !== 'childList') return true;
    return [
      ...Array.from(record.addedNodes),
      ...Array.from(record.removedNodes),
    ].some((node) => !isInternalNode(node) && !isTransient(node));
  });
}
