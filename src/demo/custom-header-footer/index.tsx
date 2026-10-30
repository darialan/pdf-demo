import { Descriptions, Form, Image, Input, Table } from 'antd';
import { useState } from 'react';
import { BusinessHeading, BusinessSection, demoAsset, money } from '../ui/business-page';
export const CUSTOM_HEADER_FOOTER_CONTENT_ID = 'print-content-custom-header-footer';
export const CUSTOM_HEADER_ID = 'print-header-custom';
export const CUSTOM_FOOTER_ID = 'print-footer-custom';
const expenses = [
 { key: 'hotel', date: '2026-10-22', category: '住宿费', detail: '杭州客户现场实施 · 2 晚 × 480 元', amount: 960, attachment: '酒店住宿票据.jpg' },
 { key: 'taxi', date: '2026-10-23', category: '市内交通', detail: '客户园区至杭州东站', amount: 86, attachment: '出租车票据.jpg' },
];
const total = expenses.reduce((sum, row) => sum + row.amount, 0);
// 自定义页眉页脚 Demo：验证每页重复的自定义页眉/页脚与动态页码，
// 业务正文复用费用报销单据，重点在页眉页脚本身，而不是正文内容的复杂度。
export function CustomHeaderFooterDemo() {
 const [note, setNote] = useState('客户现场联调已完成。住宿按公司差旅标准报销，原始票据见附件。');
 return <div className="business-page">
  <div id={CUSTOM_HEADER_ID} className="brand-print-header">
   <div className="brand-print-header-brand">
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1f6feb" /><path d="M9 21.5V10.5H15.2C17.6 10.5 19 11.8 19 13.9C19 16 17.6 17.3 15.2 17.3H11.6V21.5H9Z" fill="#fff" /><path d="M20.4 21.5V10.5H23V21.5H20.4Z" fill="#fff" /></svg>
    <span>禾晟集团 · 财务共享中心</span>
   </div>
   <span className="brand-print-header-doc">差旅报销单 · BX-202610-0086 · 内部文件</span>
  </div>
  <div id={CUSTOM_HEADER_FOOTER_CONTENT_ID}>
   <BusinessHeading path="财务共享 / 费用管理 / 报销详情" title="杭州客户实施差旅报销" status="已审批 · 待付款" meta="BX-202610-0086 · 申请人 林晓 · 产品交付部 · 提交于 2026-10-24 09:42" />
   <BusinessSection title="申请信息" extra="费用归属：客户交付项目">
    <Form layout="vertical">
     <div className="business-grid">
      <Form.Item label="报销人"><Input value="林晓 / 产品交付部" readOnly /></Form.Item>
      <Form.Item label="成本中心"><Input value="CC-DELIVERY / 项目交付" readOnly /></Form.Item>
      <Form.Item label="出差时间"><Input value="2026-10-21 至 2026-10-23" readOnly /></Form.Item>
      <Form.Item label="关联项目"><Input value="杭州客户系统上线 · PJ-2026-028" readOnly /></Form.Item>
     </div>
     <Form.Item label="报销说明（可编辑）" style={{ marginBottom: 0 }}><Input.TextArea aria-label="报销说明" value={note} onChange={e => setNote(e.target.value)} rows={2} /></Form.Item>
    </Form>
   </BusinessSection>
   <BusinessSection title="费用明细" extra="人民币 CNY">
    <Table size="small" pagination={false} dataSource={expenses} columns={[
     { title: '发生日期', dataIndex: 'date', width: '16%' }, { title: '费用类型', dataIndex: 'category', width: '14%' },
     { title: '用途说明', dataIndex: 'detail' }, { title: '票据附件', dataIndex: 'attachment', width: '22%' },
     { title: '报销金额', align: 'right', width: '16%', render: (_, r) => money(r.amount) },
    ]} />
    <div className="business-total"><span>申请金额 <strong>{money(total)}</strong></span><span>核准金额 <strong>{money(total)}</strong></span></div>
   </BusinessSection>
   <BusinessSection title="票据附件" extra="点击图片查看原图 · 2 张">
    <figure className="business-attachment" data-print-atomic="true">
     <Image src={demoAsset('expense-receipts.png')} alt="酒店与出租车票据示例照片" />
     <figcaption>酒店住宿票据.jpg / 出租车票据.jpg<small>林晓上传 · 2026-10-24 09:38 · 模拟票据照片，仅供演示</small></figcaption>
    </figure>
   </BusinessSection>
   <BusinessSection title="审批记录" atomic>
    <ul className="business-timeline">
     <li><time>10-24 09:42</time><strong>林晓 · 提交</strong><span>提交差旅报销申请，附票据 2 张。</span></li>
     <li><time>10-24 11:05</time><strong>周宁 · 直属主管</strong><span>同意，费用归属杭州交付项目。</span></li>
     <li><time>10-25 14:20</time><strong>陈佳 · 财务复核</strong><span>金额核对一致，纳入本周付款批次。</span></li>
    </ul>
    <Descriptions size="small" column={2} style={{ marginTop: 16 }}><Descriptions.Item label="付款计划">2026-10-30</Descriptions.Item><Descriptions.Item label="收款账户">员工工资卡 · 尾号 2086</Descriptions.Item></Descriptions>
   </BusinessSection>
  </div>
  <div id={CUSTOM_FOOTER_ID} className="brand-print-footer">
   <span>禾晟集团有限公司 · 本单据为内部报销归档副本，未加盖财务章不作对外结算凭证</span>
  </div>
 </div>;
}
