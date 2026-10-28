import { Card, Descriptions, Image, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PDF_PRINT_IDS } from '../constants';
import { businessRows, money, orderedTotal, acceptedTotal, deduction, payable } from './business-data';
import './index.css';

const { Title, Paragraph, Text } = Typography;
type Material = typeof businessRows[number];
type Kind = 'purchase' | 'receipt' | 'settlement';
const config = {
  purchase: { title: '采购订单', id: 'PO-202610-001', content: PDF_PRINT_IDS.content6, date: '2026-10-08' },
  receipt: { title: '收货验收单', id: 'RCV-202610-001', content: PDF_PRINT_IDS.content7, date: '2026-10-13' },
  settlement: { title: '采购结算单', id: 'SET-202610-001', content: PDF_PRINT_IDS.content8, date: '2026-10-16' },
};
const clauses = [
  ['交货与包装 / Delivery & Packaging', '供应商应按采购订单约定分批送货，外箱标明物料编码、生产批次、数量及储存条件。不同批次不得混装；食品接触类包材应随货提供对应批次的合格证明。', 'Each delivery must include the purchase order reference, material code and batch number. Keep the packaging dry and protect it from damage during transportation.'],
  ['验收与差异 / Inspection & Discrepancies', '仓库按实物清点数量并检查包装完整性，发现短缺、破损或规格不符时，应拍照并登记差异。本例每批纸杯拒收一箱、杯盖少到一箱，未入库部分不纳入结算，订单余量经双方确认关闭。', 'Accepted quantity equals received quantity minus rejected quantity. Short deliveries are recorded separately and must not be deducted twice from the settlement amount.'],
  ['对账与付款 / Reconciliation & Payment', '本期结算按合格入库数量乘以约定含税单价计算。双方确认的延迟交货补偿单独列示，不能与拒收货款混为一项。对账确认后按约定账期申请付款，结算单不能作为已经付款的证明。', 'Payment is due within 30 days after reconciliation approval. The beneficiary account must match the approved supplier master record.'],
  ['质量追溯与补充说明 / Quality Traceability', '对于后续使用过程中发现的质量问题，采购应保留批次、入库日期、门店反馈与供应商处理记录。相关补充协议与质量证明作为附件归档；如需变更数量、价格或收款账户，应另行履行审核流程。', 'Retain inspection records and supporting documents for traceability. Any amendment to price, quantity or bank details requires a separately approved record.'],
];
function Signatures({ settlement = false }: { settlement?: boolean }) {
  return <Card size="small" title={settlement ? '双方结算确认' : '审批与签认'} className="business-keep-together" data-pdf-keep-together="true"><div className="business-signatures">{(settlement ? ['结算经办', '财务复核', '供应商确认（签章）'] : ['采购经办', '仓库 / 质检确认', '审核人']).map(label => <div key={label}><Paragraph>{label}：_______________</Paragraph><Paragraph>日期：______ 年 ____ 月 ____ 日</Paragraph></div>)}</div></Card>;
}
function attachment(label: string, note: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><rect x="1" y="1" width="598" height="338" fill="#fafafa" stroke="#bfbfbf"/><text x="30" y="52" font-size="24" font-family="sans-serif">${label}</text><path d="M30 80H570 M30 145H570 M30 210H570 M30 275H570 M200 80V275 M400 80V275" stroke="#bfbfbf" fill="none"/><text x="35" y="120" font-size="17" font-family="sans-serif">${note}</text><text x="35" y="315" font-size="16" font-family="sans-serif">虚构附件 · SAMPLE</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function BusinessDemo({ kind }: { kind: Kind }) {
  const scene = config[kind];
  const columns: ColumnsType<Material> = [
    { title: '序号', width: 52, render: (_, row, index) => index + 1 },
    { title: '物料编码 / 名称', dataIndex: 'name', width: 165, render: (_, row) => <><Text>{row.name}</Text><br /><Text type="secondary">{row.code}</Text></> },
    { title: '规格 / Specification', dataIndex: 'spec', width: 160 },
    { title: '批次', dataIndex: 'batch', width: 110 },
    { title: '单位', dataIndex: 'unit', width: 50 },
    ...(kind === 'receipt' ? [
      { title: '订购', dataIndex: 'ordered', width: 60 }, { title: '实收', dataIndex: 'received', width: 60 },
      { title: '拒收', dataIndex: 'rejected', width: 60 },
      { title: '合格', width: 60, render: (_: unknown, row: Material) => row.received - row.rejected },
      { title: '验收说明', dataIndex: 'reason', width: 250 },
    ] : [
      { title: kind === 'purchase' ? '订购数量' : '合格数量', width: 80, render: (_: unknown, row: Material) => kind === 'purchase' ? row.ordered : row.received - row.rejected },
      { title: '含税单价（元）', width: 110, render: (_: unknown, row: Material) => money(row.price) },
      { title: '含税金额（元）', width: 115, render: (_: unknown, row: Material) => money((kind === 'purchase' ? row.ordered : row.received - row.rejected) * row.price) },
    ]),
  ];
  return <div className="demo1-container business-demo" id={scene.content}>
    <Title level={3}>{scene.title}</Title><Paragraph>茶饮包材采购业务 · 示例单据（虚构数据）</Paragraph>
    <Descriptions bordered size="small" column={2}>
      <Descriptions.Item label="单据编号">{scene.id}</Descriptions.Item><Descriptions.Item label="制单日期">{scene.date}</Descriptions.Item>
      <Descriptions.Item label="供应商">示例纸品供应商 A</Descriptions.Item><Descriptions.Item label="采购组织">示例茶饮采购中心</Descriptions.Item>
      <Descriptions.Item label="收货仓库">华东包材仓（示例）</Descriptions.Item><Descriptions.Item label="币别">人民币 CNY</Descriptions.Item>
      <Descriptions.Item label={kind === 'settlement' ? '结算期间' : '约定到货'}>{kind === 'settlement' ? '2026-10-01 至 2026-10-15' : '2026-10-12'}</Descriptions.Item>
      <Descriptions.Item label="来源单据">{kind === 'purchase' ? '采购申请 PR-202610-001' : config.purchase.id}</Descriptions.Item>
    </Descriptions>
    <Title level={4}>{kind === 'receipt' ? '到货与验收明细' : kind === 'purchase' ? '采购物料明细' : '合格入库结算明细'}</Title>
    <Table bordered size="small" rowKey="key" columns={columns} dataSource={businessRows} pagination={false} tableLayout="fixed" summary={() => kind === 'receipt' ? null : <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={7}>含税金额合计（人民币）</Table.Summary.Cell><Table.Summary.Cell index={7}>{money(kind === 'purchase' ? orderedTotal : acceptedTotal)}</Table.Summary.Cell></Table.Summary.Row>} />
    {kind === 'settlement' && <><Title level={4}>结算金额与调整</Title><Descriptions bordered size="small" column={2}><Descriptions.Item label="订单金额">¥ {money(orderedTotal)}</Descriptions.Item><Descriptions.Item label="未入库金额">¥ {money(orderedTotal - acceptedTotal)}</Descriptions.Item><Descriptions.Item label="合格入库金额">¥ {money(acceptedTotal)}</Descriptions.Item><Descriptions.Item label="延迟交货补偿">− ¥ {money(deduction)}</Descriptions.Item><Descriptions.Item label="本次结算应付" span={2}><Text strong>¥ {money(payable)}</Text></Descriptions.Item></Descriptions><Paragraph>按 9 批合格入库汇总；无预付款。延迟交货补偿为本期一次性扣款，关联 ADJ-202610-001，不重复扣除拒收或少到部分。</Paragraph></>}
    <Title level={4}>{kind === 'receipt' ? '验收记录及异常处理' : '业务备注与约定'}</Title>
    {kind === 'receipt' && <Paragraph>本次覆盖 9 批到货。每批纸杯实收 20 箱、拒收 1 箱、合格入库 19 箱；杯盖订购 20 箱、实收 19 箱，无拒收。破损货物单独退回，不进入库存；少到数量经双方确认不再补货，关闭订单余量。</Paragraph>}
    {clauses.map(([title, chinese, english]) => <section key={title}><Title level={5}>{title}</Title><Paragraph>{chinese} {english}</Paragraph></section>)}
    <Title level={4}>补充约定 / Additional Terms</Title><Paragraph>{Array.from({ length: 8 }, (_, i) => `第${i + 1}项批次记录：本批包材应保持干燥，运输和交接过程中如发生包装破损，需由供应商与仓库共同确认实际数量，保留送货清单及验收证据。 Batch ${i + 1}: Verify the material specification against the purchase order before accepting the delivery; record discrepancies and keep supporting documents for reconciliation.`).join(' ')}</Paragraph>
    <Signatures settlement={kind === 'settlement'} />
    <Title level={4}>附件：送货凭证与质量证明</Title><div className="business-attachments"><Card size="small" title="送货单 DN-202610-001" className="business-keep-together" data-pdf-keep-together="true"><Image preview={false} src={attachment('送货清单 / Delivery Note', '物料 / 批次 / 数量')} alt="送货清单示例" /></Card><Card size="small" title="包材质量证明 QC-202610-001" className="business-keep-together" data-pdf-keep-together="true"><Image preview={false} src={attachment('质量证明 / Quality Record', '批次检验：外观 / 包装 / 规格')} alt="包材质量证明示例" /></Card></div>
  </div>;
}
