import { createZipArchive } from './zip';
function bytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.readAsArrayBuffer(blob); });
}
test('ZIP writes valid local records, standard CRC32, ordered central directory and end offsets', async () => {
  const blob = createZipArchive([{ name: 'page-001.png', data: Uint8Array.from('123456789', c => c.charCodeAt(0)) },
    { name: 'page-002.png', data: new Uint8Array([1, 2, 3]) }]);
  const view = new DataView(await bytes(blob));
  expect(view.getUint32(0, true)).toBe(0x04034b50);
  expect(view.getUint32(14, true)).toBe(0xcbf43926);
  const end = view.byteLength - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  expect(view.getUint16(end + 10, true)).toBe(2);
  const central = view.getUint32(end + 16, true);
  expect(view.getUint32(central, true)).toBe(0x02014b50);
  expect(view.getUint32(central + 16, true)).toBe(0xcbf43926);
  expect(view.getUint32(central + 42, true)).toBe(0);
  expect(central + view.getUint32(end + 12, true)).toBe(end);
});
