import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title, Paragraph: AntParagraph, Text } = Typography;

export const PARAGRAPH_CONTENT_ID = 'print-content0';

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

const LOREM_PARAGRAPH =
  'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam molestias placeat, eum atque voluptatem ab accusamus fugiat praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae aut sapiente labore commodi harum? Lorem ipsum dolor sit amet consectetur, adipisicing elit. Alias, exercitationem. Dignissimos error quos eligendi aliquid est tenetur vero ipsum nemo quae praesentium ducimus fuga sequi eius, distinctio quam suscipit sit. Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi necessitatibus eveniet numquam facilis rem et blanditiis, dolorum voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit. Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt commodi excepturi ipsum voluptates delectus aliquam alias. Libero voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!';

export function ParagraphPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div id={PARAGRAPH_CONTENT_ID}>
        段落
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={data} />
        <section style={{ width: '100%', maxWidth: 960, margin: '24px auto' }}>
          <Title level={4}>交接说明 / Handover Notes</Title>
          <AntParagraph style={{ lineHeight: 1.9 }}>
            本批包材按采购订单逐项交接。<Text strong>数量差异须由双方确认</Text>，如遇包装破损，保留对应批次的验收记录。
            <span style={{ fontSize: 18, fontWeight: 500 }}> Keep the batch reference with every delivery.</span>{' '}
            温度记录为 24<Text>°C</Text>，备注编号为 RCV-001<sup>①</sup>。
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i}>
                第 {i + 1} 项补充说明：核对规格与包装后再办理入库。 Verify material specifications and retain the
                inspection evidence for reconciliation.{' '}
              </span>
            ))}
          </AntParagraph>
        </section>
        {Array.from({ length: 5 }, (_, i) => (
          <p key={i}>{LOREM_PARAGRAPH}</p>
        ))}
      </div>
    </div>
  );
}
