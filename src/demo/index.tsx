import { configurePrint } from '@darialan/web-pdf-printer';
import type { PrintSceneItem } from './ui';
import { COMPLEX_MIXED_CONTENT_ID, ComplexMixedDemo } from './complex-mixed';
import { CUSTOM_FOOTER_ID, CUSTOM_HEADER_ID, CustomHeaderFooterDemo, CUSTOM_HEADER_FOOTER_CONTENT_ID } from './custom-header-footer';
import { LONG_ARTICLE_CONTENT_ID, LongArticleDemo } from './long-article';
import { PurchaseOrderDemo, PURCHASE_ORDER_CONTENT_ID } from './purchase-order';

export * from './ui';

// Demo 业务层使用了 Ant Design，在 Demo 业务层统一配置注册 Ant Design 组件库选择器
configurePrint({
  atomic: ['.ant-table-row'],
  ignore: ['.ant-pagination'],
});

export const DEMO_SCENES: PrintSceneItem[] = [
  {
    key: 'purchase-order',
    label: '长表格',
    scenario: '采购订单详情 · 门店补货与收货跟踪',
    problem: '筛选后的长表格连续导出，保留整行及合计',
    contentId: PURCHASE_ORDER_CONTENT_ID,
    children: <PurchaseOrderDemo />,
  },
  {
    key: 'long-article',
    label: '长文章',
    scenario: '计算光学技术长文 · 公式推导、代码块与配图混排',
    problem: '长篇正文的文字行防截断，公式图与代码块整体保护，支持切图分享',
    contentId: LONG_ARTICLE_CONTENT_ID,
    children: <LongArticleDemo />,
  },
  {
    key: 'complex-mixed',
    label: '复杂图文页面',
    scenario: '售后工单详情 · 表单信息、现场照片、处理记录与检查表混排',
    problem: '表单、图片、长段落与表格同时出现时的分页与整体保护',
    contentId: COMPLEX_MIXED_CONTENT_ID,
    children: <ComplexMixedDemo />,
  },
  {
    key: 'custom-header-footer',
    label: '自定义页眉页脚',
    scenario: '差旅报销单 · 每页重复的自定义页眉与页脚',
    problem: '自定义页眉页脚内容，跨页重复展示并自动计算页码',
    contentId: CUSTOM_HEADER_FOOTER_CONTENT_ID,
    headerId: CUSTOM_HEADER_ID,
    footerId: CUSTOM_FOOTER_ID,
    children: <CustomHeaderFooterDemo />,
  },
];
