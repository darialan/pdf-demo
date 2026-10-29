import {
  calculateGeometry,
  clearPageBreaks,
  DEFAULT_SETTINGS,
  outputPDF,
  paginate,
  PDF_PRINT_ATTRIBUTES,
  PDF_PRINT_CLASSES,
  resolvePaper,
  usePdfPrint,
  visualizePageBreaks,
} from './index';

describe('Web PDF Printer Lib Entry Point', () => {
  it('exports core pagination and geometry functions', () => {
    expect(typeof paginate).toBe('function');
    expect(typeof calculateGeometry).toBe('function');
    expect(typeof resolvePaper).toBe('function');
    expect(DEFAULT_SETTINGS.paper).toBe('a4');
  });

  it('exports attributes and class standards', () => {
    expect(PDF_PRINT_ATTRIBUTES.ATOMIC).toContain('data-pdf-atomic');
    expect(PDF_PRINT_ATTRIBUTES.SPLITTABLE).toContain('data-pdf-splittable');
    expect(PDF_PRINT_ATTRIBUTES.IGNORE).toContain('data-pdf-ignore');
    expect(PDF_PRINT_CLASSES.ATOMIC).toBe('pdf-atomic');
  });

  it('exports application export service and visual debugger', () => {
    expect(typeof outputPDF).toBe('function');
    expect(typeof visualizePageBreaks).toBe('function');
    expect(typeof clearPageBreaks).toBe('function');
    expect(typeof usePdfPrint).toBe('function');
  });

  it('calculates page slices correctly with paginate', () => {
    // 300px total height, 100px capacity, protected range at [80, 110]
    // The break should retreat from 100 to 80.
    const slices = paginate(300, 100, [{ top: 80, bottom: 110 }]);
    expect(slices.length).toBeGreaterThan(1);
    expect(slices[0].end).toBe(80);
    expect(slices[1].start).toBe(80);
  });
});
