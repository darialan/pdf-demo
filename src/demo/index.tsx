import { configurePrint } from '../lib';
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
    scenario: '门店包材采购明细表',
    problem: '长表格连续分页，保护表格行与单元格中的文字',
    contentId: PURCHASE_ORDER_CONTENT_ID,
    children: <PurchaseOrderDemo />,
  },
  {
    key: 'long-article',
    label: '长文章',
    scenario: '散文长文 · 连续段落与文字行',
    problem: '连续文字按行分页，避免从一行文字中间截断',
    contentId: LONG_ARTICLE_CONTENT_ID,
    children: <LongArticleDemo />,
  },
  {
    key: 'complex-mixed',
    label: '复杂图文页面',
    scenario: '计算光学技术文章 · 公式、代码与配图混排',
    problem: '保留原文样式，保护公式、代码块和图片的完整性',
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
