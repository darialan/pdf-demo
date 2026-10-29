export type VisitAction = 'descend' | 'skip';

/** Depth-first DOM traversal. An explicit stack avoids JS call-stack limits. */
export function walkPrintTree(root: Node, visit: (node: Node) => VisitAction) {
  const pending: Node[] = [];
  const pushChildren = (node: Node) => {
    for (let i = node.childNodes.length - 1; i >= 0; i--) pending.push(node.childNodes[i]);
  };
  pushChildren(root);
  while (pending.length) {
    const node = pending.pop()!;
    if (visit(node) === 'descend') pushChildren(node);
  }
}
