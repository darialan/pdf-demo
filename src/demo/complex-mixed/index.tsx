import { Descriptions, Image, Table, Tag } from 'antd';
import { BusinessHeading, BusinessSection, demoAsset } from '../ui/business-page';
export const COMPLEX_MIXED_CONTENT_ID = 'print-content-complex-mixed';
const checks = [
 { key: 1, item: '供电及接线', result: '电源插头接触不良，轻触后设备断电', status: '已处理' },
 { key: 2, item: '端口连通性', result: '8 个端口逐一测试，链路协商正常', status: '通过' },
 { key: 3, item: '连续运行', result: '更换电源后持续运行 2 小时，未再次掉线', status: '通过' },
 { key: 4, item: '现场恢复', result: '恢复收银终端与打印机连接，门店确认可用', status: '已确认' },
];
const events = [
 ['10-25 08:42', '门店报障', '早班开店后收银终端多次提示网络断开。重启收银机后短暂恢复，约十分钟后再次掉线；同一交换机上的小票打印机也出现连接失败。门店上传设备现场照片，申请到店检查。'],
 ['10-25 09:15', '远程排查', '服务台核对上联路由器工作正常，故障集中在门店前台交换机。请门店保留接线状态，记录掉线时设备指示灯变化，安排工程师携带备用电源到场。'],
 ['10-25 11:20', '到店处理', '现场发现电源插头松动，轻触供电线时设备重新启动。更换匹配的备用电源并固定走线后，逐一恢复终端接入。原电源带回维修点检测，避免继续在门店使用。'],
 ['10-25 14:10', '回访确认', '处理后两小时内，收银终端及打印机均未再次掉线。店长确认午高峰业务正常，工单进入待客户确认状态；如再次出现相同现象，沿用本工单继续跟进。'],
];
// 复杂图文页面 Demo：表单信息、现场照片、长段落、表格与多栏卡片混排在一页，
// 验证图片/段落/表格三类内容同时存在时的分页与整体保护效果（不含自定义页眉页脚，该能力单独成一个 Demo）。
export function ComplexMixedDemo() {
 return <div className="business-page" id={COMPLEX_MIXED_CONTENT_ID}>
  <BusinessHeading path="客户服务 / 售后工单 / 工单详情" title="滨江江陵路店 · 前台网络间歇掉线" status="已处理 · 待客户确认" meta="WO-202610-0328 · 现场服务 · 优先级：高 · 负责人 赵明" />
  <BusinessSection title="服务信息">
   <Descriptions size="small" column={2}>
    <Descriptions.Item label="客户门店">滨江江陵路店</Descriptions.Item><Descriptions.Item label="报障时间">2026-10-25 08:42</Descriptions.Item>
    <Descriptions.Item label="设备资产">8 口千兆交换机 · NET-0086</Descriptions.Item><Descriptions.Item label="服务方式">上门维修</Descriptions.Item>
    <Descriptions.Item label="报障人">刘悦 · 店长</Descriptions.Item><Descriptions.Item label="到店时间">2026-10-25 11:20</Descriptions.Item>
   </Descriptions>
  </BusinessSection>
  <BusinessSection title="现场附件" extra="点击查看原图">
   <div className="business-grid">
    <figure className="business-attachment" data-pdf-atomic="true"><Image src={demoAsset('service-device.png')} alt="交换机供电接口现场示例照片" /><figcaption>前台交换机供电接口.jpg<small>门店上传 · 10-25 08:45 · 模拟现场照片</small></figcaption></figure>
    <div><h3 style={{ marginTop: 0, fontSize: 14 }}>门店补充说明</h3><p className="business-text">掉线时设备电源灯熄灭，其他区域 Wi-Fi 正常。交换机安装在收银台下方，近期清理柜台时移动过供电线。</p><p className="business-note">附件与故障描述随工单归档，供工程师复盘及门店交接使用。</p><Tag>现场附件 1 张</Tag><Tag>服务记录 4 条</Tag></div>
   </div>
  </BusinessSection>
  <BusinessSection title="排查与处理记录" extra="按时间顺序">
   {events.map(([time, title, text]) => <article key={time} style={{ marginBottom: 20 }}><h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{title} <span className="business-muted">2026-{time}</span></h3><p className="business-text">{text}</p></article>)}
  </BusinessSection>
  <BusinessSection title="维修后检查项"><Table pagination={false} size="small" rowKey="key" dataSource={checks} columns={[{ title: '检查项目', dataIndex: 'item', width: '22%' }, { title: '检查结果', dataIndex: 'result' }, { title: '状态', dataIndex: 'status', width: '18%' }]} /></BusinessSection>
 </div>;
}
