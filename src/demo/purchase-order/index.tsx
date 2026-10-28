import { Card, Descriptions, Image, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Paragraph, Text } = Typography;
const asset = (name: string) => `${process.env.PUBLIC_URL}/demo-assets/${name}.svg`;

export const PURCHASE_ORDER_CONTENT_ID = 'print-content6';

// 所有主体、价格与单号均为虚构；金额以分计算。
const goods = [
  { code: 'PKG-001', name: '冷饮纸杯', spec: '500ml / 1,000只每箱', unit: '箱', ordered: 20, received: 20, rejected: 1, price: 32000 },
  { code: 'PKG-002', name: '配套杯盖', spec: '90mm / 1,000只每箱', unit: '箱', ordered: 20, received: 19, rejected: 0, price: 12000 },
  { code: 'PKG-003', name: '双杯外带纸袋', spec: '牛皮纸 / 500只每箱', unit: '箱', ordered: 12, received: 12, rejected: 0, price: 18000 },
  { code: 'PKG-004', name: '独立包装吸管', spec: '直径12mm / 2,000支每箱', unit: '箱', ordered: 8, received: 8, rejected: 0, price: 15000 },
  { code: 'PKG-005', name: '打包封口贴', spec: '500枚每卷 / 20卷每箱', unit: '箱', ordered: 6, received: 6, rejected: 0, price: 9600 },
];

const money = (cents: number) =>
  (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const purchaseOrderRows = Array.from({ length: 9 }, (_, batch) =>
  goods.map(row => ({
    ...row,
    key: `${batch}-${row.code}`,
    batch: `B202610${String(batch + 1).padStart(2, '0')}`,
  }))
).flat();

export const orderedTotal = purchaseOrderRows.reduce((sum, row) => sum + row.ordered * row.price, 0);

type MaterialRow = typeof purchaseOrderRows[number];

const clauses = [
  [
    '交货与包装 / Delivery & Packaging',
    '供应商应按采购订单约定分批送货，外箱标明物料编码、生产批次、数量及储存条件。不同批次不得混装；食品接触类包材应随货提供对应批次的合格证明。',
    'Each delivery must include the purchase order reference, material code and batch number. Keep the packaging dry and protect it from damage during transportation.',
  ],
  [
    '验收与差异 / Inspection & Discrepancies',
    '仓库按实物清点数量并检查包装完整性，发现短缺、破损或规格不符时，应拍照并登记差异。本例每批纸杯拒收一箱、杯盖少到一箱，未入库部分不纳入结算，订单余量经双方确认关闭。',
    'Accepted quantity equals received quantity minus rejected quantity. Short deliveries are recorded separately and must not be deducted twice from the settlement amount.',
  ],
  [
    '对账与付款 / Reconciliation & Payment',
    '本期结算按合格入库数量乘以约定含税单价计算。双方确认的延迟交货补偿单独列示，不能与拒收货款混为一项。对账确认后按约定账期申请付款，结算单不能作为已经付款的证明。',
    'Payment is due within 30 days after reconciliation approval. The beneficiary account must match the approved supplier master record.',
  ],
  [
    '质量追溯与补充说明 / Quality Traceability',
    '对于后续使用过程中发现的质量问题，采购应保留批次、入库日期、门店反馈与供应商处理记录。相关补充协议与质量证明作为附件归档；如需变更数量、价格或收款账户，应另行履行审核流程。',
    'Retain inspection records and supporting documents for traceability. Any amendment to price, quantity or bank details requires a separately approved record.',
  ],
];

const signRoles = ['采购经办', '仓库验收', '采购复核'];

function attachmentSvg(label: string, note: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><rect x="1" y="1" width="598" height="338" fill="#fafafa" stroke="#bfbfbf"/><text x="30" y="52" font-size="24" font-family="sans-serif">${label}</text><path d="M30 80H570 M30 145H570 M30 210H570 M30 275H570 M200 80V275 M400 80V275" stroke="#bfbfbf" fill="none"/><text x="35" y="120" font-size="17" font-family="sans-serif">${note}</text><text x="35" y="315" font-size="16" font-family="sans-serif">虚构附件 · SAMPLE</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const columns: ColumnsType<MaterialRow> = [
  { title: '序号', width: 52, render: (_, __, index) => index + 1 },
  {
    title: '物料编码 / 名称',
    dataIndex: 'name',
    width: 165,
    render: (_, row) => (
      <>
        <Text>{row.name}</Text>
        <br />
        <Text type="secondary">{row.code}</Text>
      </>
    ),
  },
  { title: '规格 / Specification', dataIndex: 'spec', width: 160 },
  { title: '批次', dataIndex: 'batch', width: 110 },
  { title: '单位', dataIndex: 'unit', width: 50 },
  { title: '订购数量', dataIndex: 'ordered', width: 80 },
  { title: '含税单价（元）', width: 110, render: (_, row) => money(row.price) },
  { title: '含税金额（元）', width: 115, render: (_, row) => money(row.ordered * row.price) },
];

export function PurchaseOrderDemo() {
  return (
    <div id={PURCHASE_ORDER_CONTENT_ID} style={{ boxSizing: 'border-box', maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      <Title level={3} style={{ textAlign: 'center' }}>
        采购订单
      </Title>
      <Paragraph>茶饮包材采购业务 · 示例单据（虚构数据）</Paragraph>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="单据编号">PO-202610-001</Descriptions.Item>
        <Descriptions.Item label="制单日期">2026-10-08</Descriptions.Item>
        <Descriptions.Item label="供应商">示例纸品供应商 A</Descriptions.Item>
        <Descriptions.Item label="采购组织">示例茶饮采购中心</Descriptions.Item>
        <Descriptions.Item label="收货仓库">华东包材仓（示例）</Descriptions.Item>
        <Descriptions.Item label="币别">人民币 CNY</Descriptions.Item>
        <Descriptions.Item label="约定到货">2026-10-12</Descriptions.Item>
        <Descriptions.Item label="来源单据">采购申请 PR-202610-001</Descriptions.Item>
      </Descriptions>

      <Title level={4}>采购物料明细</Title>
      <Table
        bordered
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={purchaseOrderRows}
        pagination={false}
        tableLayout="fixed"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={7}>
              含税金额合计（人民币）
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7}>{money(orderedTotal)}</Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <Title level={4}>业务备注与约定</Title>
      {clauses.map(([title, chinese, english]) => (
        <section key={title}>
          <Title level={5}>{title}</Title>
          <Paragraph style={{ lineHeight: 1.9 }}>
            {chinese} {english}
          </Paragraph>
        </section>
      ))}

      <Title level={4}>补充约定 / Additional Terms</Title>
      <Paragraph>
        {Array.from(
          { length: 8 },
          (_, i) =>
            `第${i + 1}项批次记录：本批包材应保持干燥，运输和交接过程中如发生包装破损，需由供应商与仓库共同确认实际数量，保留送货清单及验收证据。 Batch ${i + 1}: Verify the material specification against the purchase order before accepting the delivery; record discrepancies and keep supporting documents for reconciliation.`
        ).join(' ')}
      </Paragraph>

      <Card
        style={{ width: '100%', maxWidth: 960, margin: '24px auto' }}
        size="small"
        title="审批与签认"
        data-pdf-keep-together="true"
        data-pdf-label="审批签名与日期"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 12 }}>
          {signRoles.map((role, index) => (
            <div
              key={role}
              style={{
                borderRight: index < signRoles.length - 1 ? '1px solid #e8e8e8' : 0,
                padding: '8px 16px 0 0',
              }}
            >
              <Text strong>{role}</Text>
              <div style={{ margin: '8px 0' }}>
                <Image width={150} height={54} preview={false} src={asset('signature')} alt={`${role}示例签名`} />
              </div>
              <Paragraph style={{ marginBottom: 6 }}>{['示例经办人 A', '示例审核人 B', '示例确认人 C'][index]}</Paragraph>
              <Paragraph style={{ marginBottom: 6 }}>签认日期：2026-10-13</Paragraph>
            </div>
          ))}
        </div>
        <Text type="secondary">签名与日期共同确认本次记录；均为虚构示例。</Text>
      </Card>

      <section style={{ width: '100%', maxWidth: 960, margin: '24px auto' }}>
        <Title level={4}>到货验收附件</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <Card size="small" title="包材外观与包装" data-pdf-keep-together="true" data-pdf-label="包材验收图片及说明">
            <Image preview={false} src={asset('delivery-inspection')} alt="包材到货检查场景插图" />
            <Paragraph style={{ marginTop: 12, marginBottom: 0, color: '#626d65' }}>
              批次 B20261001 · 20 箱。外包装完整，按箱核对物料编码与数量。场景插图，非现场照片。
            </Paragraph>
          </Card>
          <Card size="small" title="验收记录 RCV-202610-001" data-pdf-keep-together="true" data-pdf-label="验收记录及样章">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="检查项目">外观、数量、包装完整性</Descriptions.Item>
              <Descriptions.Item label="验收结论">抽检通过，差异另单登记</Descriptions.Item>
              <Descriptions.Item label="验收日期">2026-10-13</Descriptions.Item>
            </Descriptions>
            <div style={{ margin: '8px 0' }}>
              <Image width={90} preview={false} src={asset('sample-seal')} alt="验收记录虚构样章" />
            </div>
            <Text type="secondary">虚构凭证，仅用于展示图片与记录的组合打印。</Text>
          </Card>
        </div>
      </section>

      <Title level={4}>附件：送货凭证与质量证明</Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card size="small" title="送货单 DN-202610-001" data-pdf-keep-together="true">
          <Image preview={false} src={attachmentSvg('送货清单 / Delivery Note', '物料 / 批次 / 数量')} alt="送货清单示例" />
        </Card>
        <Card size="small" title="包材质量证明 QC-202610-001" data-pdf-keep-together="true">
          <Image
            preview={false}
            src={attachmentSvg('质量证明 / Quality Record', '批次检验：外观 / 包装 / 规格')}
            alt="包材质量证明示例"
          />
        </Card>
      </div>
    </div>
  );
}
