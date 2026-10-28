// 所有主体、价格与单号均为虚构；金额以分计算。
export const goods = [
  { code: 'PKG-001', name: '冷饮纸杯', spec: '500ml / 1,000只每箱', unit: '箱', ordered: 20, received: 20, rejected: 1, price: 32000, reason: '1箱外包装破损，拒收入库' },
  { code: 'PKG-002', name: '配套杯盖', spec: '90mm / 1,000只每箱', unit: '箱', ordered: 20, received: 19, rejected: 0, price: 12000, reason: '少到1箱，本单关闭余量，不计入结算' },
  { code: 'PKG-003', name: '双杯外带纸袋', spec: '牛皮纸 / 500只每箱', unit: '箱', ordered: 12, received: 12, rejected: 0, price: 18000, reason: '外观与数量验收通过' },
  { code: 'PKG-004', name: '独立包装吸管', spec: '直径12mm / 2,000支每箱', unit: '箱', ordered: 8, received: 8, rejected: 0, price: 15000, reason: '外观与数量验收通过' },
  { code: 'PKG-005', name: '打包封口贴', spec: '500枚每卷 / 20卷每箱', unit: '箱', ordered: 6, received: 6, rejected: 0, price: 9600, reason: '外观与数量验收通过' },
];
export const money = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const businessRows = Array.from({ length: 9 }, (_, batch) => goods.map(row => ({
  ...row, key: `${batch}-${row.code}`, batch: `B202610${String(batch + 1).padStart(2, '0')}`,
  delivery: `DN-202610-${String(batch + 1).padStart(3, '0')}`,
}))).flat();
export const orderedTotal = businessRows.reduce((sum, row) => sum + row.ordered * row.price, 0);
export const acceptedTotal = businessRows.reduce((sum, row) => sum + (row.received - row.rejected) * row.price, 0);
export const deduction = 20000;
export const payable = acceptedTotal - deduction;
