import { buildPrintRules } from '../../src/lib/core/rules/print-rules';
import { PrintRule } from '../../src/lib/core/types';

/** Native HTML rules first; formula-library fallbacks never override explicit page tags. */
export function extensionPrintRules(): PrintRule[] {
  return [
    ...buildPrintRules({
      ignore: [
        '[data-web-printer-ui]',
        '[data-print-snapshot]',
        '[data-print-debug]',
        'iframe.html2canvas-container',
      ],
    }),
    {
      selector: '.katex-display, .katex, mjx-container, [role="math"]',
      result: { kind: 'atomic', label: '公式', overflow: 'error' },
    },
  ];
}
