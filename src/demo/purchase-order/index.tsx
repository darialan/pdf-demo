import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { money } from '../ui/business-page';
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
export function PurchaseOrderDemo() {
  return <div className="table-demo" id={PURCHASE_ORDER_CONTENT_ID}>
    <Table
      size="small"
      pagination={false}
      rowKey="key"
      dataSource={purchaseOrderRows}
      columns={columns}
      tableLayout="fixed"
    />
  </div>;
}
