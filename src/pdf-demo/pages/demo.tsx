import { Space, Table, Tag } from 'antd';
import { PDF_PRINT_IDS } from '../constants';
import './index.css';
import { ColumnsType } from 'antd/es/table';

interface DataType {
  key?: number;
  name: string;
  age: number;
  address: string;
  tags: string[];
}

const columns: ColumnsType<DataType> = [
  {
    title: 'index',
    key: 'index',
    render: (_, __, index) => index as any
  },
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age'
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address'
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green';
          if (tag === 'loser') {
            color = 'volcano';
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </>
    )
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    )
  }
];

const data: DataType[] = [
  {
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer']
  },
  {
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['loser']
  },
  {
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher']
  }
];

// 单页
const Paragraph = () => {
  return (
    <div className="paragraph-container">
      <div id={PDF_PRINT_IDS.content0}>
        段落
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data} />
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam
          molestias placeat, eum atque voluptatem ab accusamus fugiat
          praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae
          aut sapiente labore commodi harum? Lorem ipsum dolor sit amet
          consectetur, adipisicing elit. Alias, exercitationem. Dignissimos
          error quos eligendi aliquid est tenetur vero ipsum nemo quae
          praesentium ducimus fuga sequi eius, distinctio quam suscipit sit.
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
          necessitatibus eveniet numquam facilis rem et blanditiis, dolorum
          voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at
          eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt
          commodi excepturi ipsum voluptates delectus aliquam alias. Libero
          voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit
          amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus
          quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta
          temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam
          molestias placeat, eum atque voluptatem ab accusamus fugiat
          praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae
          aut sapiente labore commodi harum? Lorem ipsum dolor sit amet
          consectetur, adipisicing elit. Alias, exercitationem. Dignissimos
          error quos eligendi aliquid est tenetur vero ipsum nemo quae
          praesentium ducimus fuga sequi eius, distinctio quam suscipit sit.
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
          necessitatibus eveniet numquam facilis rem et blanditiis, dolorum
          voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at
          eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt
          commodi excepturi ipsum voluptates delectus aliquam alias. Libero
          voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit
          amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus
          quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta
          temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam
          molestias placeat, eum atque voluptatem ab accusamus fugiat
          praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae
          aut sapiente labore commodi harum? Lorem ipsum dolor sit amet
          consectetur, adipisicing elit. Alias, exercitationem. Dignissimos
          error quos eligendi aliquid est tenetur vero ipsum nemo quae
          praesentium ducimus fuga sequi eius, distinctio quam suscipit sit.
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
          necessitatibus eveniet numquam facilis rem et blanditiis, dolorum
          voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at
          eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt
          commodi excepturi ipsum voluptates delectus aliquam alias. Libero
          voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit
          amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus
          quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta
          temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam
          molestias placeat, eum atque voluptatem ab accusamus fugiat
          praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae
          aut sapiente labore commodi harum? Lorem ipsum dolor sit amet
          consectetur, adipisicing elit. Alias, exercitationem. Dignissimos
          error quos eligendi aliquid est tenetur vero ipsum nemo quae
          praesentium ducimus fuga sequi eius, distinctio quam suscipit sit.
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
          necessitatibus eveniet numquam facilis rem et blanditiis, dolorum
          voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at
          eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt
          commodi excepturi ipsum voluptates delectus aliquam alias. Libero
          voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit
          amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus
          quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta
          temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ullam
          molestias placeat, eum atque voluptatem ab accusamus fugiat
          praesentium illo quaerat maiores. Quod quisquam reiciendis repudiandae
          aut sapiente labore commodi harum? Lorem ipsum dolor sit amet
          consectetur, adipisicing elit. Alias, exercitationem. Dignissimos
          error quos eligendi aliquid est tenetur vero ipsum nemo quae
          praesentium ducimus fuga sequi eius, distinctio quam suscipit sit.
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
          necessitatibus eveniet numquam facilis rem et blanditiis, dolorum
          voluptatum ad maiores minus facere id sunt quibusdam officiis omnis at
          eligendi est? Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Tenetur, harum. Minus culpa, voluptatum assumenda magni nulla nesciunt
          commodi excepturi ipsum voluptates delectus aliquam alias. Libero
          voluptatum quos tenetur suscipit veritatis. Lorem ipsum dolor sit
          amet, consectetur adipisicing elit. Sit excepturi sequi necessitatibus
          quaerat voluptatem? Ex quaerat in, cupiditate repudiandae ullam dicta
          temporibus molestiae quisquam culpa maiores, dolorem ad nemo amet!
        </p>
      </div>
    </div>
  );
};

// 单页
const PdfDemo1 = () => {
  return (
    <div className="demo1-container">
      <div id={PDF_PRINT_IDS.content1}>
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data} />
      </div>
    </div>
  );
};

// 多页
const PdfDemo2 = () => {
  return (
    <div className="demo1-container">
      <div id={PDF_PRINT_IDS.content2}>
        <div className="border" style={{ height: 5000 }}></div>
      </div>
    </div>
  );
};

// 多页分页截断
const PdfDemo3 = () => {
  const data1 = new Array(10).fill(data).flat().map((row, key) => ({ ...row, key }));
  return (
    <div className="demo1-container">
      <div id={PDF_PRINT_IDS.content3}>
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
      </div>
    </div>
  );
};

// 自定义页面也叫
const PdfDemo4 = () => {
  const data1 = new Array(10).fill(data).flat().map((row, key) => ({ ...row, key }));
  return (
    <div className="demo1-container">
      <div id={PDF_PRINT_IDS.header}>我是页眉</div>
      <div id={PDF_PRINT_IDS.content4}>
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
      </div>
      <div id={PDF_PRINT_IDS.footer}>我是页脚</div>
    </div>
  );
};

// 横向
const PdfDemo5 = () => {
  const data1 = new Array(10).fill(data).flat().map((row, key) => ({ ...row, key }));
  return (
    <div className="demo1-container">
      <div id={PDF_PRINT_IDS.content5}>
        <div>横向横向横向</div>
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
        <Table rowKey={(record) => String(record.key ?? record.name)} columns={columns} dataSource={data1} pagination={false} />
      </div>
    </div>
  );
};

export { Paragraph, PdfDemo1, PdfDemo2, PdfDemo3, PdfDemo4, PdfDemo5 };
