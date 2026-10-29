import {
  DownloadOutlined,
  FileTextOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { outputPDF, usePdfPrint } from '@darialan/web-pdf-printer';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  message,
  Progress,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';

const { Title, Text } = Typography;

export const SINGLE_PAGE_CONTENT_ID = 'print-content-single-page';

// 嵌入式 iframe 中渲染的独立纯 HTML 网页文档源码（带独立样式与隔离 DOM）
const IFRAME_HTML_SOURCE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Iframe 嵌入式单页报表</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }
    .report-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 22px;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #dbeafe;
      color: #1d4ed8;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .meta-item label { font-size: 11px; color: #64748b; display: block; margin-bottom: 4px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #334155; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    .total-row {
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
    }
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 32px;
      padding: 20px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      background: #fafafa;
    }
    .sign-box { height: 70px; border-bottom: 1px solid #94a3b8; margin-top: 8px; position: relative; }
    .stamp {
      position: absolute;
      right: 20px;
      top: -10px;
      width: 80px;
      height: 80px;
      border: 2px solid #ef4444;
      border-radius: 50%;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      transform: rotate(-15deg);
      opacity: 0.85;
      text-align: center;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div id="iframe-report-content" class="report-card">
    <div class="header">
      <div>
        <span class="badge">沙箱隔离页面</span>
        <h1 style="margin-top: 8px;">云端服务交付验收结项单</h1>
      </div>
      <div style="text-align: right; font-size: 12px; color: #64748b;">
        <div>单据编号: DL-2026-X88</div>
        <div>签发日期: 2026-10-29</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><label>委托业务方</label><span>华东数字供应链事业群</span></div>
      <div class="meta-item"><label>承接工程组</label><span>基础架构研发二组</span></div>
      <div class="meta-item"><label>服务周期</label><span>2026-Q1 ~ 2026-Q3</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>交付物名称</th>
          <th>服务阶段</th>
          <th>计费标准</th>
          <th style="text-align: right;">结算金额</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>高可用分布式文件存储集群搭建</td>
          <td>第一阶段 (上线交付)</td>
          <td>固定人月 (6人月)</td>
          <td style="text-align: right;">¥ 180,000</td>
        </tr>
        <tr>
          <td>跨机房主备容灾与数据迁移保障</td>
          <td>第二阶段 (演练验收)</td>
          <td>技术服务费</td>
          <td style="text-align: right;">¥ 95,000</td>
        </tr>
        <tr>
          <td>7x24 小时核心链路 SLA 运维响应</td>
          <td>第三阶段 (质保服务)</td>
          <td>季度支持包</td>
          <td style="text-align: right;">¥ 45,000</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">总计应付 (含税):</td>
          <td style="text-align: right; color: #2563eb; font-size: 15px;">¥ 320,000</td>
        </tr>
      </tbody>
    </table>

    <div class="signature-area" data-pdf-atomic="true">
      <div>
        <div style="font-weight: 600; font-size: 13px; color: #334155;">甲方项目验收人签章：</div>
        <div class="sign-box">
          <div style="position: absolute; bottom: 4px; left: 0; font-size: 12px; color: #94a3b8;">张明亮 / 签字确认无误</div>
        </div>
      </div>
      <div>
        <div style="font-weight: 600; font-size: 13px; color: #334155;">乙方项目交付负责人签章：</div>
        <div class="sign-box">
          <div style="position: absolute; bottom: 4px; left: 0; font-size: 12px; color: #94a3b8;">李建国 / 验收合格</div>
          <div class="stamp">验收合格<br>交付专用</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export function SinglePageIframeDemo() {
  const [activeMode, setActiveMode] = useState<'single-page' | 'iframe'>('single-page');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 使用 React Hook 控制导出状态
  const { isPrinting, progress, exportPDF } = usePdfPrint();

  // 从 iframe 内部提取 DOM 节点并调用核心库导出
  const handleExportIframe = async () => {
    const iframe = iframeRef.current;
    if (!iframe) {
      message.error('iframe 尚未挂载');
      return;
    }
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      message.error('无法读取 iframe 文档，请确保为同源或使用 srcdoc');
      return;
    }

    const printTarget = doc.getElementById('iframe-report-content') || doc.body;
    try {
      await exportPDF({
        element: printTarget as HTMLElement,
        filename: 'iframe-沙箱验收结项单.pdf',
        settings: {
          paper: 'a4',
          orientation: 'portrait',
          marginTopMm: 12,
          marginBottomMm: 12,
          marginLeftMm: 12,
          marginRightMm: 12,
        },
      });
      message.success('已成功从 iframe 内部完成 PDF 导出！');
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`);
    }
  };

  // 直接导出当前页面的标准 HTML 单页
  const handleExportSinglePage = async () => {
    const el = document.getElementById(SINGLE_PAGE_CONTENT_ID);
    if (!el) {
      message.error('未找到单页目标容器');
      return;
    }
    try {
      await outputPDF({
        element: el,
        filename: '企业员工录用与入职审批单.pdf',
        settings: {
          paper: 'a4',
          orientation: 'portrait',
          marginTopMm: 10,
          marginBottomMm: 10,
          marginLeftMm: 10,
          marginRightMm: 10,
        },
      });
      message.success('标准单页 PDF 导出完成！');
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* 模式切换卡片 */}
      <Card style={{ marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <span style={{ fontWeight: 600, fontSize: 15 }}>演示场景切换：</span>
              <Radio.Group
                value={activeMode}
                onChange={e => setActiveMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="single-page">
                  <FileTextOutlined style={{ marginRight: 6 }} />
                  标准 HTML 单页 (Single Page)
                </Radio.Button>
                <Radio.Button value="iframe">
                  <GlobalOutlined style={{ marginRight: 6 }} />
                  iframe 独立沙箱网页嵌入打印
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col>
            {activeMode === 'single-page' ? (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportSinglePage}
              >
                导出独立单页 PDF
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={isPrinting}
                onClick={handleExportIframe}
              >
                {isPrinting ? `正在导出 (${progress.percent}%)...` : '从 iframe 内部直接导出 PDF'}
              </Button>
            )}
          </Col>
        </Row>

        {isPrinting && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={progress.percent}
              format={() => `${progress.completed} / ${progress.total} 页`}
              status="active"
            />
          </div>
        )}
      </Card>

      {/* 模式 1：标准独立 HTML 单页 */}
      {activeMode === 'single-page' && (
        <div>
          <Alert
            message="单页打印特性说明"
            description="本示例演示标准 HTML 单页。打印引擎会自动根据 A4 纸张计算出精准的单页容量，不会产生多余的第 2 页空白页，右下角严格标示『1 / 1』，且签字盖章区带有 data-pdf-atomic='true' 声明保护。"
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />

          {/* 待打印单页容器 */}
          <div
            id={SINGLE_PAGE_CONTENT_ID}
            style={{
              background: '#ffffff',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              padding: '36px 48px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              position: 'relative',
            }}
          >
            {/* 水印 */}
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '25%',
                fontSize: 56,
                fontWeight: 900,
                color: 'rgba(200, 200, 200, 0.15)',
                transform: 'rotate(-25deg)',
                pointerEvents: 'none',
                userSelect: 'none',
                letterSpacing: 4,
              }}
            >
              INTERNAL USE ONLY
            </div>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Tag color="blue" style={{ marginBottom: 8 }}>人力资源与合规部</Tag>
              <Title level={2} style={{ margin: 0, color: '#1f1f1f', letterSpacing: 1 }}>
                员工录用审批与入职结案表
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                归档编号：HR-2026-OF-0921 │ 编制日期：2026-10-29
              </Text>
            </div>

            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="候选人姓名">张晓鹏</Descriptions.Item>
              <Descriptions.Item label="应聘岗位">高级前端架构师 (P7)</Descriptions.Item>
              <Descriptions.Item label="录用部门">基础技术平台部 / Web 核心组</Descriptions.Item>
              <Descriptions.Item label="职级薪级">T7-2 / 年薪制</Descriptions.Item>
              <Descriptions.Item label="拟入职日期">2026-11-15</Descriptions.Item>
              <Descriptions.Item label="办公地点">上海张江研发中心 A 座 12F</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 20, marginBottom: 12 }}>
              薪酬结构与福利预案
            </Title>
            <Table
              size="small"
              pagination={false}
              bordered
              dataSource={[
                { key: '1', item: '基础月薪 (Base)', amount: '¥ 38,000 / 月', note: '每月 10 日发放' },
                { key: '2', item: '年度绩效奖金 (Bonus)', amount: '3~6 个月', note: '根据年度综合考核等级浮动' },
                { key: '3', item: '限制性股票期权 (RSU)', amount: '20,000 股', note: '分 4 年匀速归属 (25%/年)' },
                { key: '4', item: '综合补贴', amount: '¥ 2,500 / 月', note: '含餐补、交通与通讯津贴' },
              ]}
              columns={[
                { title: '项目', dataIndex: 'item', key: 'item', width: 200 },
                { title: '标准 / 金额', dataIndex: 'amount', key: 'amount', width: 180 },
                { title: '说明与归属条件', dataIndex: 'note', key: 'note' },
              ]}
              style={{ marginBottom: 24 }}
            />

            {/* 签字审核区域 - 严格标记不可分割 */}
            <div
              data-pdf-atomic="true"
              style={{
                marginTop: 24,
                padding: '16px 20px',
                border: '1px solid #e8e8e8',
                background: '#fafafa',
                borderRadius: 4,
              }}
            >
              <Row gutter={32}>
                <Col span={8}>
                  <Text strong>用人部门主管审批：</Text>
                  <div style={{ height: 48, borderBottom: '1px solid #bfbfbf', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '48px' }}>
                      陈维民 / 同意录用
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <Text strong>HR 负责人审批：</Text>
                  <div style={{ height: 48, borderBottom: '1px solid #bfbfbf', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '48px' }}>
                      王雅芳 / 背景调查通过
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <Text strong>财务总监确认：</Text>
                  <div style={{ height: 48, borderBottom: '1px solid #bfbfbf', marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '48px' }}>
                      赵国强 / 薪酬预算核准
                    </Text>
                  </div>
                </Col>
              </Row>
              <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
                * 本单据由 HR 系统自动生成，签字核准后即具有公司人事审批效力。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模式 2：iframe 沙箱隔离网页嵌入打印 */}
      {activeMode === 'iframe' && (
        <div>
          <Alert
            message="iframe 跨沙箱打印技术解析"
            description={
              <div>
                <p style={{ margin: 0 }}>
                  在许多中后台业务场景中，打印模板常以 <code>&lt;iframe&gt;</code> 形式嵌入（如第三方报表微前端、隔离样式的发票 HTML、远程合同预览）。
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  <strong>核心接入方式：</strong>由于 <code>@darialan/web-pdf-printer</code> 是纯 DOM 引擎，只需通过 <code>iframe.contentDocument.getElementById(...)</code> 获取目标节点并直接传入 <code>outputPDF(&#123; element &#125;)</code>，即可实现完美打印！
                </p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
          />

          {/* 核心代码参考卡片 */}
          <Card
            size="small"
            title={<Space><InfoCircleOutlined style={{ color: '#1890ff' }} />开发者调用示例</Space>}
            style={{ marginBottom: 20, background: '#f8fafc' }}
          >
            <pre style={{ margin: 0, fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
{`// 1. 获取同源 iframe 的内部文档对象
const iframe = document.getElementById('my-report-iframe') as HTMLIFrameElement;
const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

// 2. 获取 iframe 内待打印的目标 DOM 容器
const targetElement = iframeDoc.getElementById('iframe-report-content') || iframeDoc.body;

// 3. 一键交由 @darialan/web-pdf-printer 进行测量、样式冻结与 PDF 导出
await outputPDF({
  element: targetElement,
  filename: 'iframe-report.pdf',
  settings: { paper: 'a4', orientation: 'portrait' }
});`}
            </pre>
          </Card>

          {/* 真实嵌入的 iframe 容器 */}
          <div style={{ background: '#fff', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tag color="cyan">iframe 隔离视图</Tag>
                <Text type="secondary" style={{ fontSize: 13 }}>下方为一个完全独立的 HTML 页面，CSS 作用域与外部宿主完全隔离</Text>
              </Space>
              <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={handleExportIframe}>
                导出此 iframe 为 PDF
              </Button>
            </div>

            <iframe
              ref={iframeRef}
              srcDoc={IFRAME_HTML_SOURCE}
              title="Iframe Print Demo"
              style={{
                width: '100%',
                height: 520,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                background: '#f8fafc',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
