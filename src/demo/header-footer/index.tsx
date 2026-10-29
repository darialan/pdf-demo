import { Descriptions, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

export const HEADER_FOOTER_CONTENT_ID = 'print-content4';
export const CUSTOM_HEADER_ID = 'print-header';
export const CUSTOM_FOOTER_ID = 'print-footer';

interface AuditItem {
  key: string;
  code: string;
  module: string;
  checkItem: string;
  standard: string;
  result: '符合' | '轻微偏差' | '需整改';
  score: number;
  weight: string;
}

const auditColumns: ColumnsType<AuditItem> = [
  { title: '编号', dataIndex: 'code', key: 'code', width: 85, align: 'center' },
  { title: '审计科目', dataIndex: 'module', key: 'module', width: 140, render: text => <strong>{text}</strong> },
  { title: '核查要点与检测规范', dataIndex: 'checkItem', key: 'checkItem' },
  { title: '评测标准依据', dataIndex: 'standard', key: 'standard', width: 160 },
  {
    title: '合规评价',
    dataIndex: 'result',
    key: 'result',
    width: 95,
    align: 'center',
    render: r => (
      <Tag color={r === '符合' ? 'success' : r === '轻微偏差' ? 'warning' : 'error'}>
        {r}
      </Tag>
    ),
  },
  { title: '得分', dataIndex: 'score', key: 'score', width: 75, align: 'right' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 75, align: 'right' },
];

const auditData: AuditItem[] = [
  {
    key: '1',
    code: 'AUD-01',
    module: '特权凭据管理',
    checkItem: '生产主机与数据库 Root 权限动态凭据签发与生命周期回收',
    standard: 'GB/T 22239-2019 等保三级',
    result: '符合',
    score: 98,
    weight: '10%',
  },
  {
    key: '2',
    code: 'AUD-02',
    module: '通信传输加密',
    checkItem: '跨数据中心服务间调用全量强制 TLS 1.3 证书双向加密',
    standard: '金融数据安全规范 JR/T 0197',
    result: '符合',
    score: 100,
    weight: '10%',
  },
  {
    key: '3',
    code: 'AUD-03',
    module: '静态数据加密',
    checkItem: '核心交易账本与银行卡敏感信息字段级国密 SM4 存储',
    standard: '密码法与国密测评标准',
    result: '符合',
    score: 96,
    weight: '10%',
  },
  {
    key: '4',
    code: 'AUD-04',
    module: '审计日志合规',
    checkItem: '安全管理员与特权操作行为审计日志异地只读保留不低于 180 天',
    standard: '网络安全法第二十一条',
    result: '符合',
    score: 95,
    weight: '10%',
  },
  {
    key: '5',
    code: 'AUD-05',
    module: '多因子身份鉴别',
    checkItem: '运维堡垒机与云控制台全量启用硬件 FIDO 令牌强制双因子认证',
    standard: 'ISO/IEC 27001:2022',
    result: '符合',
    score: 100,
    weight: '10%',
  },
  {
    key: '6',
    code: 'AUD-06',
    module: 'API 防篡改与限流',
    checkItem: '开放网关交易接口防重放随机数检测与秒级自适应熔断机制',
    standard: 'OWASP API Security Top 10',
    result: '轻微偏差',
    score: 88,
    weight: '8%',
  },
  {
    key: '7',
    code: 'AUD-07',
    module: '容器供应链安全',
    checkItem: '镜像发布流水线无高危 CVE 门禁扫描与代码数字签名防篡改',
    standard: 'CNCF 云原生安全最佳实践',
    result: '符合',
    score: 94,
    weight: '8%',
  },
  {
    key: '8',
    code: 'AUD-08',
    module: '网络微隔离管控',
    checkItem: '生产核心集群按业务域施行东西向流量严格白名单访问策略',
    standard: '零信任安全架构标准 NIST 800-207',
    result: '符合',
    score: 92,
    weight: '8%',
  },
  {
    key: '9',
    code: 'AUD-09',
    module: '容灾演练与备份',
    checkItem: '核心分布式数据库定时快照异地异质备份及月度自动化拉起演练',
    standard: '商业银行信息科技风险管理指引',
    result: '符合',
    score: 95,
    weight: '10%',
  },
  {
    key: '10',
    code: 'AUD-10',
    module: '合规应急响应预案',
    checkItem: '重大安全事件处置响应链条、止血预案与监管通报演练机制',
    standard: '信息安全事件分类分级指南',
    result: '符合',
    score: 96,
    weight: '8%',
  },
  {
    key: '11',
    code: 'AUD-11',
    module: '数据脱敏保护',
    checkItem: '测试与仿真环境全部数据强制静态脱敏，生产调试动态掩码遮蔽',
    standard: '个人信息保护法 (PIPL)',
    result: '轻微偏差',
    score: 86,
    weight: '8%',
  },
];

export function HeaderFooterDemo() {
  return (
    <div style={{ maxWidth: 940, margin: '0 auto', paddingBottom: 36 }}>
      {/* 跨页固定独立页眉（规范公文红头标头） */}
      <div
        id={CUSTOM_HEADER_ID}
        style={{
          boxSizing: 'border-box',
          padding: '12px 24px 8px 24px',
          background: '#ffffff',
          borderBottom: '2px solid #dc2626',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', letterSpacing: 1.5 }}>
            华东数字科技集团有限公司 · 专项审计复核报告
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            发文字号：华数审发〔2026〕第 042 号 │ 密级：商密内部 ★
          </div>
        </div>
      </div>

      {/* 正文区域 */}
      <div
        id={HEADER_FOOTER_CONTENT_ID}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '36px 44px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          color: '#1e293b',
          marginTop: 12,
        }}
      >
        {/* 文档主标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
          <Tag color="red" style={{ marginBottom: 8, fontSize: 12 }}>年度合规专项审查</Tag>
          <Title level={2} style={{ margin: 0, color: '#0f172a', letterSpacing: -0.5 }}>
            2026 年度信息系统与关键基础设施安全合规审计报告
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
            审计期间：2026年01月01日 至 2026年09月30日 │ 复核归档：风险合规与内部审计部
          </Text>
        </div>

        {/* 审计概况描述网格 */}
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 28 }}
          labelStyle={{ width: '130px', background: '#f8fafc', fontWeight: 600, color: '#334155' }}
          contentStyle={{ background: '#ffffff', color: '#1e293b' }}
        >
          <Descriptions.Item label="被审业务线">数字金融事业群核心交易系统</Descriptions.Item>
          <Descriptions.Item label="合规负责人">陈立言（主任审计师）</Descriptions.Item>
          <Descriptions.Item label="综合评估得分">94.8 分（A 级 · 优秀合规）</Descriptions.Item>
          <Descriptions.Item label="审计工作结论">全项指标达标，准予年度备案</Descriptions.Item>
          <Descriptions.Item label="复核决议说明" span={2}>
            本次专项审计未发现 P0/P1 级严重合规阻断性缺陷，两项轻微偏差项已下发整改跟踪函，限期 30 个工作日内完成闭环。
          </Descriptions.Item>
        </Descriptions>

        {/* 审计板块一：审查综述与准则依据 */}
        <section style={{ marginBottom: 28 }}>
          <Title level={4} style={{ color: '#0f172a', marginBottom: 12, borderLeft: '4px solid #dc2626', paddingLeft: 8 }}>
            一、 审计范围与法律准则依据
          </Title>
          <Paragraph style={{ textAlign: 'justify', lineHeight: 1.8, color: '#334155', marginBottom: 12 }}>
            根据国家《网络安全法》、《数据安全法》、《个人信息保护法》及中国人民银行金融科技监管准则，集团内部审计委员会于 2026 年第三季度对数字金融全链路核心清结算、账户中心及风控引擎展开了为期 45 天的现场与非现场穿透式技术审计。审查范围覆盖生产网物理机房、容器化云底座、分布式微服务网关及外联合作机构通信通道。
          </Paragraph>
          <Paragraph style={{ textAlign: 'justify', lineHeight: 1.8, color: '#334155', marginBottom: 0 }}>
            审计小组综合运用静态配置基线核查、生产网络渗透演习、全量访问日志交叉比对以及核心数据库行级加密抽检等手段，确保所有审计取证证据链完整受控、不可抵赖，各项实测数值均已完成被审部门书面签认。
          </Paragraph>
        </section>

        {/* 审计板块二：核心科目明细表 */}
        <section style={{ marginBottom: 28 }}>
          <Title level={4} style={{ color: '#0f172a', marginBottom: 12, borderLeft: '4px solid #dc2626', paddingLeft: 8 }}>
            二、 专项审查科目与实测指标矩阵
          </Title>
          <Table
            rowKey="key"
            columns={auditColumns}
            dataSource={auditData}
            pagination={false}
            bordered
            size="small"
            style={{ marginBottom: 12 }}
          />
          <div style={{ textAlign: 'right', fontSize: 13, color: '#64748b' }}>
            加权综合得分：<strong style={{ color: '#16a34a', fontSize: 15 }}>94.8 分</strong>（满分 100 分）
          </div>
        </section>

        {/* 审计板块三：整改建议与签署 */}
        <section data-pdf-atomic="true">
          <Title level={4} style={{ color: '#0f172a', marginBottom: 12, borderLeft: '4px solid #dc2626', paddingLeft: 8 }}>
            三、 审计复核意见与多方签认
          </Title>
          <div
            style={{
              padding: '20px 24px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              background: '#f8fafc',
            }}
          >
            <Paragraph style={{ color: '#334155', lineHeight: 1.7, marginBottom: 16 }}>
              审计组一致认定被审系统架构完备、防御纵深合理，整体达到国家网络安全等级保护三级及金融行业核心业务系统合规基准。同意本报告作为集团 2026 年度技术治理与合规归档正式结论。
            </Paragraph>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>主审审计师：</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>陈立言 [已核签]</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>被审业务方代表：</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>韩东海 [已确认]</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>风控总监批准：</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>许敬文 [已批准]</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 跨页固定独立页脚 */}
      <div
        id={CUSTOM_FOOTER_ID}
        style={{
          boxSizing: 'border-box',
          padding: '8px 24px 0 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8' }}>
          <div>文档编号：AUDIT-SEC-9921-X │ 本报告由集团审计风控与合规部受控输出，未经许可严禁外传</div>
          <div>防伪识别码：SHA256-e9a8f21c</div>
        </div>
      </div>
    </div>
  );
}
