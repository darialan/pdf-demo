import { Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export const HEADER_FOOTER_CONTENT_ID = 'print-content4';
export const CUSTOM_HEADER_ID = 'print-header';
export const CUSTOM_FOOTER_ID = 'print-footer';

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

const baseData: RowItem[] = [
  { name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park', tags: ['nice', 'developer'] },
  { name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park', tags: ['loser'] },
  { name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park', tags: ['cool', 'teacher'] },
];

const tableRows = new Array(10)
  .fill(baseData)
  .flat()
  .map((row, key) => ({ ...row, key }));

export function HeaderFooterDemo() {
  return (
    <div style={{ boxSizing: 'border-box' }}>
      <div id={CUSTOM_HEADER_ID}>我是页眉</div>
      <div id={HEADER_FOOTER_CONTENT_ID}>
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={tableRows} pagination={false} />
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={tableRows} pagination={false} />
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={tableRows} pagination={false} />
        <Table rowKey={record => String(record.key ?? record.name)} columns={columns} dataSource={tableRows} pagination={false} />
      </div>
      <div id={CUSTOM_FOOTER_ID}>我是页脚</div>
    </div>
  );
}
