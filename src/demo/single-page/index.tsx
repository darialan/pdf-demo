import { Card, Descriptions, Image, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Paragraph, Text } = Typography;
const asset = (name: string) => `${process.env.PUBLIC_URL}/demo-assets/${name}.svg`;

export const SINGLE_PAGE_CONTENT_ID = 'print-content';

interface RowItem {
  key?: number;
  name: string;
  age: number;
  address: string;
  tags: string[];
}

const columns: ColumnsType<RowItem> = [
  { title: 'index', key: 'index', render: (_, __, index) => index },
  { title: 'Name', dataIndex: 'name', key: 'name', render: text => <a href="#demo">{text}</a> },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <>
        {tags.map(tag => (
          <Tag color={tag === 'loser' ? 'volcano' : tag.length > 5 ? 'geekblue' : 'green'} key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a href="#invite">Invite {record.name}</a>
        <a href="#delete">Delete</a>
      </Space>
    ),
  },
];

const data: RowItem[] = [
  { name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park', tags: ['nice', 'developer'] },
  { name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park', tags: ['loser'] },
  { name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park', tags: ['cool', 'teacher'] },
];

const signRoles = ['采购经办', '仓库验收', '采购复核'];

export function SinglePageDemo() {
  return (
    <div style={{ boxSizing: 'border-box' }}>
      <div id={SINGLE_PAGE_CONTENT_ID} style={{ maxWidth: 960, margin: '0 auto' }}>
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={data} />

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

        <section style={{ width: '100%', maxWidth: 960, margin: '24px auto' }}>
          <Title level={4}>交接说明 / Handover Notes</Title>
          <Paragraph style={{ lineHeight: 1.9 }}>
            本批包材按采购订单逐项交接。<Text strong>数量差异须由双方确认</Text>，如遇包装破损，保留对应批次的验收记录。
            <span style={{ fontSize: 18, fontWeight: 500 }}> Keep the batch reference with every delivery.</span>{' '}
            温度记录为 24<Text>°C</Text>，备注编号为 RCV-001<sup>①</sup>。
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i}>
                第 {i + 1} 项补充说明：核对规格与包装后再办理入库。 Verify material specifications and retain the
                inspection evidence for reconciliation.{' '}
              </span>
            ))}
          </Paragraph>
        </section>

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
      </div>
    </div>
  );
}
