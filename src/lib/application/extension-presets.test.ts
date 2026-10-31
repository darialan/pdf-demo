import { extensionPrintRules } from '../../../extension/shared/print-presets';
import { classifyPrintNode } from '../core/rules/print-rules';
test('extension automatically classifies standard flowing content and protected native elements',()=>{
  const rules=extensionPrintRules();
  for(const tag of ['article','p','table'])expect(classifyPrintNode(document.createElement(tag),rules).kind).toBe('container');
  for(const tag of ['tr','img','pre','math','input','textarea','select','button'])expect(classifyPrintNode(document.createElement(tag),rules).kind).toBe('atomic');
  const row=document.createElement('div');row.setAttribute('role','row');expect(classifyPrintNode(row,rules).kind).toBe('atomic');
});
test('formula presets are atomic but explicit page ignore/splittable tags retain priority',()=>{
  const rules=extensionPrintRules();const formula=document.createElement('span');formula.className='katex-display';
  expect(classifyPrintNode(formula,rules).kind).toBe('atomic');
  formula.setAttribute('data-print-splittable','true');expect(classifyPrintNode(formula,rules).kind).toBe('container');
  formula.setAttribute('data-print-ignore','true');expect(classifyPrintNode(formula,rules).kind).toBe('ignore');
});
