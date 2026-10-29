import { Button, Descriptions, Input, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { BusinessHeading, BusinessSection, money } from '../ui/business-page';
export const PURCHASE_ORDER_CONTENT_ID = 'print-content6';
const materials = [
 {code:'PKG-CUP-500',name:'冷饮纸杯',spec:'500ml · 1,000只/箱',price:185},
 {code:'PKG-LID-90',name:'平口杯盖',spec:'90mm · 1,000只/箱',price:92.5},
 {code:'PKG-STR-12',name:'独立包装纸吸管',spec:'12mm · 2,000支/箱',price:68},
 {code:'PKG-BAG-02',name:'双杯牛皮纸袋',spec:'240 × 120 × 280mm · 500只/箱',price:110},
 {code:'PKG-SLV-01',name:'瓦楞隔热杯套',spec:'通用款 · 2,000只/箱',price:45},
];
const stores = ['滨江江陵路店','西湖文三路店','余杭未来科技城店','上城钱江新城店','拱墅大悦城店','萧山金城路店','滨江星光大道店','西湖黄龙店','上城湖滨店'];
export function buildPurchaseRows(count: number) {
 return Array.from({length:count},(_,i)=>{
  const material=materials[i%5]; const ordered=8+(i%7)*2;
  return {...material,key:`po-${i+1}`,store:stores[Math.floor(i/5)%stores.length],ordered,received:i%6===0?0:ordered,status:i%6===0?'待到货':'已收货',delivery:`2026-10-${String(26+Math.floor(i/45)).padStart(2,'0')}`};
 });
}
export const purchaseOrderRows=buildPurchaseRows(45);
export const orderedTotal=purchaseOrderRows.reduce((sum,r)=>sum+Math.round(r.price*r.ordered*100),0)/100;
type Row=typeof purchaseOrderRows[number];
const columns:ColumnsType<Row>=[
 {title:'门店 / 收货点',width:'18%',render:(_,r)=><div>{r.store}<div className="business-muted">计划到货 {r.delivery}</div></div>},
 {title:'物料',width:'25%',render:(_,r)=><div><strong>{r.name}</strong><div className="business-muted">{r.code} · {r.spec}</div></div>},
 {title:'订购 / 箱',dataIndex:'ordered',align:'right',width:'10%'},
 {title:'已收 / 箱',dataIndex:'received',align:'right',width:'10%'},
 {title:'含税单价',align:'right',width:'12%',render:(_,r)=>money(r.price)},
 {title:'含税金额',align:'right',width:'14%',render:(_,r)=>money(r.price*r.ordered)},
 {title:'收货状态',width:'11%',render:(_,r)=><Tag color={r.received===0?'orange':undefined}>{r.status}</Tag>},
];
export function PurchaseOrderDemo(){
 const [count,setCount]=useState(45); const [query,setQuery]=useState(''); const [status,setStatus]=useState('all');
 const rows=buildPurchaseRows(count).filter(r=>(status==='all'||r.status===status)&&`${r.store}${r.name}${r.code}`.toLowerCase().includes(query.toLowerCase().trim()));
 const cents=rows.reduce((s,r)=>s+Math.round(r.ordered*r.price*100),0);
 const quantity=rows.reduce((s,r)=>s+r.ordered,0); const received=rows.reduce((s,r)=>s+r.received,0);
 return <div className="business-page">
  <div id={PURCHASE_ORDER_CONTENT_ID}>
   <div className="business-toolbar" aria-label="采购明细筛选" data-pdf-ignore="true">
    <Input.Search aria-label="搜索门店或物料" placeholder="搜索门店、物料名称或编码" value={query} onChange={e=>setQuery(e.target.value)} allowClear />
    <Select aria-label="收货状态" value={status} onChange={setStatus} options={[{value:'all',label:'全部收货状态'},{value:'待到货',label:'待到货'},{value:'已收货',label:'已收货'}]} />
    <Select aria-label="订单规模" value={count} onChange={setCount} options={[{value:45,label:'9 家门店 · 45 行'},{value:100,label:'区域补货 · 100 行'},{value:200,label:'集中采购 · 200 行'}]} />
    <Button onClick={()=>{setQuery('');setStatus('all');setCount(45);}}>重置</Button>
   </div>
   <BusinessHeading path="供应链管理 / 采购订单 / 订单详情" title="10 月门店包材集中采购" status="部分收货" meta="PO-202610-0142 · 华东区域 · 采购员 许晨 · 下单日期 2026-10-24" />
   <BusinessSection title="订单概况" extra="含税金额 · 人民币 CNY">
    <dl className="business-stats"><div><dt>当前明细金额</dt><dd>{money(cents/100)}</dd></div><div><dt>订购数量</dt><dd>{quantity.toLocaleString()} 箱</dd></div><div><dt>已收货数量</dt><dd>{received.toLocaleString()} 箱</dd></div><div><dt>明细数量</dt><dd>{rows.length} 行</dd></div></dl>
    <Descriptions size="small" column={2}>
     <Descriptions.Item label="供应商">禾川包装（演示供应商）</Descriptions.Item><Descriptions.Item label="采购组织">华东运营中心</Descriptions.Item>
     <Descriptions.Item label="收货方式">按门店清单分送</Descriptions.Item><Descriptions.Item label="结算方式">月结 30 天</Descriptions.Item>
     <Descriptions.Item label="关联申请">PR-202610-0068</Descriptions.Item><Descriptions.Item label="计划到货">2026-10-26 至 2026-10-30</Descriptions.Item>
    </Descriptions>
   </BusinessSection>
   <BusinessSection title="采购明细" extra={`当前筛选：${status==='all'?'全部状态':status}${query?` · ${query}`:''}`}>
    <Table size="small" pagination={false} rowKey="key" dataSource={rows} columns={columns} tableLayout="fixed" locale={{emptyText:'没有匹配的采购明细，请调整筛选条件。'}} />
    <div className="business-total"><span>共 {rows.length} 行 / {quantity} 箱</span><strong>合计 {money(cents/100)}</strong></div>
   </BusinessSection>
   <BusinessSection title="履约约定">
    <h3 style={{fontSize:14}}>交货与包装 / Delivery & Packaging</h3><p className="business-text">按明细中的门店收货点配送，外箱标注采购单号、物料编码与装箱数量。门店验收后在系统登记实收数量，缺货部分保留待收状态。</p>
    <h3 style={{fontSize:14}}>结算说明</h3><p className="business-text">以已收货数量和双方确认的月度对账单结算。破损包材单独登记退货，不计入本次应付金额。</p>
   </BusinessSection>
   <BusinessSection title="操作记录" atomic><ul className="business-timeline"><li><time>10-24 10:30</time><strong>许晨 · 采购员</strong><span>汇总门店补货需求并创建订单。</span></li><li><time>10-24 15:10</time><strong>周宁 · 采购主管</strong><span>预算审核通过，订单已发送供应商。</span></li><li><time>10-26 16:45</time><strong>仓储接口</strong><span>同步首批门店收货记录，未到货明细继续跟进。</span></li></ul></BusinessSection>
  </div>
 </div>;
}
