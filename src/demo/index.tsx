import { configurePrint } from '@darialan/web-pdf-printer';
import type { PrintSceneItem } from './ui';
import { ANTI_CUTOFF_CONTENT_ID, AntiCutoffDemo } from './anti-cutoff';
import { CUSTOM_FOOTER_ID, CUSTOM_HEADER_ID, HeaderFooterDemo, HEADER_FOOTER_CONTENT_ID } from './header-footer';
import { IFRAME_PAGE_CONTENT_ID, IframePageDemo } from './iframe-page';
import { LOW_CODE_CONTENT_ID, LOW_CODE_FOOTER_ID, LOW_CODE_HEADER_ID, LowCodePage } from './low-code';
import { PurchaseOrderDemo, PURCHASE_ORDER_CONTENT_ID } from './purchase-order';

export * from './ui';

// Demo 业务层使用了 Ant Design，在 Demo 业务层统一配置注册 Ant Design 组件库选择器
configurePrint({
  atomic: ['.ant-table-row'],
  ignore: ['.ant-pagination'],
});

export const DEMO_SCENES: PrintSceneItem[] = [
  {
    key: 'anti-cutoff',
    label: '防截断全景',
    scenario: '工程交付验收报告 · 规范多页单据',
    problem: '保护文字行、表格与签章不被跨页物理切断',
    contentId: ANTI_CUTOFF_CONTENT_ID,
    children: <AntiCutoffDemo />,
  },
  {
    key: 'header-footer',
    label: '自定义页眉页脚',
    scenario: '企业红头公文 · 专项合规审计报告',
    problem: '每页固定重复独立公文标头与页脚，动态注入精准页码',
    contentId: HEADER_FOOTER_CONTENT_ID,
    headerId: CUSTOM_HEADER_ID,
    footerId: CUSTOM_FOOTER_ID,
    children: <HeaderFooterDemo />,
  },
  {
    key: 'purchase-order',
    label: '采购订单',
    scenario: 'ERP 采购结算单 · 45 行多批次明细',
    problem: '长表格连续跨页排版，末页电子签章区防分离',
    contentId: PURCHASE_ORDER_CONTENT_ID,
    children: <PurchaseOrderDemo />,
  },
  {
    key: 'lowcode',
    label: '低代码',
    scenario: '可视化搭建物料画布与动态表单',
    problem: '物料高度变动时实时预测分页与跨页标线辅助调优',
    contentId: LOW_CODE_CONTENT_ID,
    headerId: LOW_CODE_HEADER_ID,
    footerId: LOW_CODE_FOOTER_ID,
    children: <LowCodePage />,
  },
  {
    key: 'iframe',
    label: 'iframe 嵌入',
    scenario: '微前端独立子应用与第三方沙箱报表',
    problem: '跨 Realm 穿透提取并全量深度冻结内部独立计算样式',
    contentId: IFRAME_PAGE_CONTENT_ID,
    children: <IframePageDemo />,
  },
];
