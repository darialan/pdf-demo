import React from 'react';

export const IFRAME_PAGE_CONTENT_ID = 'print-content-iframe';

// 嵌入式 iframe 中渲染的独立纯 HTML 网页文档源码（带独立沙箱样式、隔离 DOM 与防腰斩印章区）
const IFRAME_HTML_SOURCE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Iframe 嵌入式单页报表</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }
    .report-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      max-width: 820px;
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
  <div id="iframe-report-content" class="report-card" data-pdf-atomic="true">
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

/**
 * iframe 嵌入式沙箱网页演示
 * 专为验证跨 Window Realm DOM 穿透导出设计：直接嵌入独立 HTML 沙箱，由外部工作台工具栏统一触发打印与调试。
 */
export function IframePageDemo() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 24 }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <iframe
          id={IFRAME_PAGE_CONTENT_ID}
          srcDoc={IFRAME_HTML_SOURCE}
          title="Iframe Print Demo"
          style={{
            width: '100%',
            height: 600,
            border: 'none',
            display: 'block',
            background: '#f8fafc',
          }}
        />
      </div>
    </div>
  );
}
