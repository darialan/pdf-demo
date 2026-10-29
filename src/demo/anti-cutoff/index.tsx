import { Card, Descriptions, Image, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';

const { Title, Paragraph, Text } = Typography;
const asset = (name: string) => `${process.env.PUBLIC_URL}/demo-assets/${name}.svg`;

export const ANTI_CUTOFF_CONTENT_ID = 'print-content-anti-cutoff';

interface DeliverableItem {
  key: string;
  code: string;
  name: string;
  milestone: string;
  spec: string;
  status: string;
  amount: string;
}

const deliverableColumns: ColumnsType<DeliverableItem> = [
  { title: '编号', dataIndex: 'code', key: 'code', width: 90 },
  { title: '交付物与模块名称', dataIndex: 'name', key: 'name', width: 220, render: text => <strong>{text}</strong> },
  { title: '交付阶段', dataIndex: 'milestone', key: 'milestone', width: 110, render: m => <Tag color="blue">{m}</Tag> },
  { title: '技术规格与验收标准', dataIndex: 'spec', key: 'spec' },
  {
    title: '验收结果',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    align: 'center',
    render: s => <Tag color={s === '通过' ? 'green' : 'orange'}>{s}</Tag>,
  },
  { title: '核算金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
];

const deliverableData: DeliverableItem[] = [
  {
    key: '1',
    code: 'DEL-01',
    name: '分布式服务治理引擎',
    milestone: 'M1 架构就绪',
    spec: '支持 gRPC/HTTP 双协议，百万级 QPS 下路由耗时 < 1.2ms',
    status: '通过',
    amount: '¥ 120,000',
  },
  {
    key: '2',
    code: 'DEL-02',
    name: '服务网格 Sidecar 链路',
    milestone: 'M1 架构就绪',
    spec: '无侵入透明流量劫持，内存占用 < 32MB，吞吐衰减 < 3%',
    status: '通过',
    amount: '¥ 95,000',
  },
  {
    key: '3',
    code: 'DEL-03',
    name: '动态分布式配置中心',
    milestone: 'M2 核心交付',
    spec: '多环境毫秒级推送，版本一键回滚与灰度发布机制',
    status: '通过',
    amount: '¥ 80,000',
  },
  {
    key: '4',
    code: 'DEL-04',
    name: '全链路监控与 Trace 追踪',
    milestone: 'M2 核心交付',
    spec: 'OpenTelemetry 标准规范，链路采样率 100% 无丢包',
    status: '通过',
    amount: '¥ 110,000',
  },
  {
    key: '5',
    code: 'DEL-05',
    name: '弹性多活容灾控制面',
    milestone: 'M3 演练验收',
    spec: '跨机房异地主备切换 RTO < 30s，数据丢失 RPO = 0',
    status: '通过',
    amount: '¥ 150,000',
  },
  {
    key: '6',
    code: 'DEL-06',
    name: '混沌工程自动化测试集',
    milestone: 'M3 演练验收',
    spec: '覆盖网络丢包、磁盘爆满、节点断电等 32 种故障注入场景',
    status: '通过',
    amount: '¥ 65,000',
  },
  {
    key: '7',
    code: 'DEL-07',
    name: '安全访问控制与网关认证',
    milestone: 'M3 演练验收',
    spec: 'mTLS 双向认证，JWT 令牌秒级校验与防重放攻击能力',
    status: '通过',
    amount: '¥ 75,000',
  },
  {
    key: '8',
    code: 'DEL-08',
    name: '压测报告与性能调优白皮书',
    milestone: 'M4 结项归档',
    spec: '包含万核计算集群基准调优参数及压测火焰图全量分析',
    status: '通过',
    amount: '¥ 45,000',
  },
  {
    key: '9',
    code: 'DEL-09',
    name: '生产环境发布流水线集成',
    milestone: 'M4 结项归档',
    spec: 'GitOps 驱动的蓝绿/金丝雀自动化发布流水线',
    status: '通过',
    amount: '¥ 55,000',
  },
  {
    key: '10',
    code: 'DEL-10',
    name: '7x24 小时核心链路 SLA 质保',
    milestone: 'M4 结项归档',
    spec: '专家级在线驻场支持与突发 P0/P1 事件 15 分钟内响应机制',
    status: '通过',
    amount: '¥ 60,000',
  },
];

const signRoles = [
  { role: '委托业务方代表 (甲方)', name: '张明亮', dept: '企业数字化事业群', note: '项目验收合格，同意结项结算' },
  { role: '承接工程负责人 (乙方)', name: '李建国', dept: '基础架构研发中心', note: '交付物与文档全量归档' },
  { role: '独立质量监督监理方', name: '王振邦', dept: '数字工程监理实验室', note: '各项技术指标抽测达标' },
];

/**
 * 防截断全景演示场景 (Anti-Cutoff Panorama)
 * 核心验证：
 * 1. 【文字行防腰斩】：大段条款文本流在跨页换页线处整行避让，绝不从字腰横切
 * 2. 【表格行防腰斩】：Ant Design Table 数据行在换页线处整行推移至下一页
 * 3. 【图片与卡片防腰斩】：架构插图与指标卡片整块推移，保证图文完整
 * 4. 【签章区防分离】：底部多方审批盖章栏整块保护，印章不切半、不悬空
 */
export function AntiCutoffDemo() {
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 36 }}>
      <div
        id={ANTI_CUTOFF_CONTENT_ID}
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '40px 48px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          color: '#1f2937',
        }}
      >
        {/* 文档抬头 */}
        <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Tag color="geekblue" style={{ marginBottom: 6 }}>重点工程交付与验收结案</Tag>
              <Title level={2} style={{ margin: 0, color: '#111827', letterSpacing: -0.5 }}>
                云原生微服务平台研发交付验收报告
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                项目内部代码：PRJ-2026-CLOUD-9981 │ 归档密级：商密内部 (Internal)
              </Text>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              <div>单据编号: DL-2026-ARCH-8821</div>
              <div>验收日期: 2026年10月29日</div>
              <div>版本代号: Release-v3.2.0-GA</div>
            </div>
          </div>
        </div>

        {/* 基础信息四元网格 */}
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 28 }}
          labelStyle={{ width: '140px', background: '#f8fafc', fontWeight: 600, color: '#334155' }}
          contentStyle={{ background: '#ffffff', color: '#1e293b' }}
        >
          <Descriptions.Item label="委托单位（甲方）">华东数字供应链核心事业群</Descriptions.Item>
          <Descriptions.Item label="承接单位（乙方）">基础架构平台第二研发团队</Descriptions.Item>
          <Descriptions.Item label="项目周期">2026-03-01 至 2026-10-25</Descriptions.Item>
          <Descriptions.Item label="结算总额">¥ 850,000 (含税)</Descriptions.Item>
          <Descriptions.Item label="总体验收结论" span={2}>
            <Tag color="success">综合评审达标 · 同意结项</Tag>
            <span style={{ fontSize: 12, color: '#475569', marginLeft: 6 }}>
              各项性能指标满足技术协议约定，准予结案并进入生产质保期。
            </span>
          </Descriptions.Item>
        </Descriptions>

        {/* 核心板块 1：工程范围与规范 */}
        <section style={{ marginBottom: 28 }}>
          <Title level={4} style={{ color: '#1f2937', marginBottom: 12, borderLeft: '4px solid #3b82f6', paddingLeft: 8 }}>
            一、 交付范围与技术规范约定
          </Title>
          <Paragraph style={{ textAlign: 'justify', lineHeight: 1.8, color: '#374151', marginBottom: 14 }}>
            本交付项目基于云原生容器生态体系，为全集团供应链核心交易链路打造高可用、弹性可伸缩的微服务底层底座。研发内容涵盖动态服务发现路由、跨机房双活调度引擎、无侵入服务网格链路以及实时可观测性指标采集分析平台。双方技术团队在项目执行期间严格遵循敏捷迭代研发流程，累计完成 4 次阶段性架构评审与 12 轮线上压测演练，确保底层通信协议与链路治理满足生产级高可用要求。
          </Paragraph>
          <Paragraph style={{ textAlign: 'justify', lineHeight: 1.8, color: '#374151', marginBottom: 14 }}>
            根据技术服务主协议约定，乙方交付的所有工程源代码均须通过 SonarQube 代码质量静态扫描门禁，单元测试行覆盖率不得低于 85%，核心通信调度代码分支覆盖率不得低于 90%。所有外购及开源第三方中间件依赖均经过严谨的开源安全合规审查（SCA 漏洞检测与 SPDX 许可证校验），未引入任何 GPL-3.0 等高传染性强开源许可限制，具备完全自主可控的技术知识产权。
          </Paragraph>
          <Paragraph style={{ textAlign: 'justify', lineHeight: 1.8, color: '#374151', marginBottom: 0 }}>
            在交付物维保与 SLA 承诺方面，系统自本结案报告签署确认之日起正式进入为期 12 个月的免费技术质保期。质保期间乙方承诺提供 7x24 小时紧急故障响应支持，对于生产级别 P0 严重事故须在 15 分钟内完成故障响应并成立联合应急排查组，1 小时内提供临时止血方案，确保集团核心交易链路的系统可用性 SLA 达到 99.995% 以上。
          </Paragraph>
        </section>

        {/* 核心板块 2：数据表格明细 */}
        <section style={{ marginBottom: 32 }}>
          <Title level={4} style={{ color: '#1f2937', marginBottom: 12, borderLeft: '4px solid #3b82f6', paddingLeft: 8 }}>
            二、 交付成果清单与验收明细
          </Title>
          <Table
            rowKey="key"
            columns={deliverableColumns}
            dataSource={deliverableData}
            pagination={false}
            bordered
            size="small"
            style={{ marginBottom: 12 }}
          />
          <div style={{ textAlign: 'right', fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
            交付物结算总计：<span style={{ color: '#2563eb', fontSize: 16 }}>¥ 850,000</span>
          </div>
        </section>

        {/* 核心板块 3：图文卡片与架构拓扑 */}
        <section style={{ marginBottom: 32 }}>
          <Title level={4} style={{ color: '#1f2937', marginBottom: 12, borderLeft: '4px solid #3b82f6', paddingLeft: 8 }}>
            三、 部署架构拓扑与指标实测
          </Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            <Card
              size="small"
              title="生产环境多活部署拓扑图"
              data-pdf-atomic="true"
              style={{ border: '1px solid #e5e7eb', background: '#fafafa' }}
            >
              <div style={{ textAlign: 'center', padding: '10px 0', background: '#ffffff', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                <Image preview={false} src={asset('delivery-inspection')} alt="系统部署拓扑" style={{ maxHeight: 180 }} />
              </div>
              <Paragraph style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                拓扑说明：双机房异地三中心互联，所有网关与服务节点支持秒级容灾隔离，保证链路通信无单点瓶颈。
              </Paragraph>
            </Card>

            <Card
              size="small"
              title="压测基准与实测 SLA 指标"
              data-pdf-atomic="true"
              style={{ border: '1px solid #e5e7eb', background: '#fafafa' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="峰值吞吐量">1,250,000 QPS (实测通过)</Descriptions.Item>
                <Descriptions.Item label="P99 调用延迟">1.18 毫秒 (优于约定指标 2ms)</Descriptions.Item>
                <Descriptions.Item label="异地容灾 RTO">&lt; 18 秒 (优于约定指标 30s)</Descriptions.Item>
                <Descriptions.Item label="数据一致性 RPO">0 丢失 (基于 Raft 强一致复制)</Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>国家级质量评测实验室认证</Text>
                <Image width={72} preview={false} src={asset('sample-seal')} alt="实测达标印章" />
              </div>
            </Card>
          </div>
        </section>

        {/* 核心板块 4：多方盖章与签字审批栏 */}
        <section data-pdf-atomic="true">
          <Title level={4} style={{ color: '#1f2937', marginBottom: 12, borderLeft: '4px solid #3b82f6', paddingLeft: 8 }}>
            四、 联合验收签署与审批归档
          </Title>
          <div
            style={{
              padding: '20px 24px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#f9fafb',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {signRoles.map((item, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{item.role}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 8px 0' }}>{item.dept}</div>
                  <div
                    style={{
                      height: 56,
                      borderBottom: '1px solid #9ca3af',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      paddingBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>[签字确认]</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6 }}>{item.note}</div>

                  {idx === 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: 18,
                        width: 78,
                        height: 78,
                        border: '2px solid #ef4444',
                        borderRadius: '50%',
                        color: '#ef4444',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        transform: 'rotate(-15deg)',
                        opacity: 0.85,
                        pointerEvents: 'none',
                        lineHeight: 1.2,
                        textAlign: 'center',
                      }}
                    >
                      <div>基础架构部</div>
                      <div style={{ fontSize: 12, margin: '1px 0' }}>★</div>
                      <div>交付专用章</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #d1d5db', fontSize: 11, color: '#9ca3af' }}>
              * 本结案单由工程平台自动生成防伪哈希校验，各方签署完毕即归档为具备正式合同效力的法律结案凭证。
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
