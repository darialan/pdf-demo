const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  return value >>> 0;
});

/** ZIP STORE: PNG is already compressed. Keeping entries as Blobs avoids copying image buffers. */
export function createZipArchive(entries: { name: string; data: Uint8Array }[]): Blob {
  if (entries.length > 65535) throw new Error('图片页数超出 ZIP 限制');
  const parts: BlobPart[] = [], directory: BlobPart[] = [];
  let offset = 0, directorySize = 0;
  for (const { name, data } of entries) {
    // Output names are generated ASCII page numbers, independent of document titles.
    const filename = Uint8Array.from(name, c => c.charCodeAt(0));
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 255];
    crc = (crc ^ 0xffffffff) >>> 0;
    if (offset + data.length + filename.length + 30 > 0xffffffff) throw new Error('图片包超过 4GB，请分批导出');
    const local = new Uint8Array(30 + filename.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint16(12, 33, true); // 1980-01-01, the first DOS date.
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, filename.length, true); local.set(filename, 30);
    const central = new Uint8Array(46 + filename.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(14, 33, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, filename.length, true); cv.setUint32(42, offset, true); central.set(filename, 46);
    parts.push(local, data); directory.push(central);
    offset += local.length + data.length; directorySize += central.length;
  }
  if (offset + directorySize + 22 > 0xffffffff) throw new Error('图片包超过 4GB，请分批导出');
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: 'application/zip' });
}
