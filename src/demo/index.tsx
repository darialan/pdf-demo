import { configurePrint } from '../lib';
import type { PrintSceneItem } from './ui';
import { COMPLEX_MIXED_CONTENT_ID, ComplexMixedDemo } from './complex-mixed';
import { CUSTOM_FOOTER_ID, CUSTOM_HEADER_ID, CustomHeaderFooterDemo, CUSTOM_HEADER_FOOTER_CONTENT_ID } from './custom-header-footer';
import { LONG_ARTICLE_CONTENT_ID, LongArticleDemo } from './long-article';
import { PurchaseOrderDemo, PURCHASE_ORDER_CONTENT_ID } from './purchase-order';

export * from './ui';

// Demo 业务层使用了 Ant Design，在 Demo 业务层统一配置注册 Ant Design 组件库选择器
configurePrint({
  ignore: ['.ant-pagination'],
});

export const DEMO_SCENES: PrintSceneItem[] = [
  {
    key: 'purchase-order',
    label: '长表格',
    contentId: PURCHASE_ORDER_CONTENT_ID,
    children: <PurchaseOrderDemo />,
  },
  {
    key: 'long-article',
    label: '长文章',
    contentId: LONG_ARTICLE_CONTENT_ID,
    children: <LongArticleDemo />,
  },
  {
    key: 'complex-mixed',
    label: '复杂图文页面',
    contentId: COMPLEX_MIXED_CONTENT_ID,
    children: <ComplexMixedDemo />,
  },
  {
    key: 'custom-header-footer',
    label: '自定义页眉页脚',
    contentId: CUSTOM_HEADER_FOOTER_CONTENT_ID,
    headerId: CUSTOM_HEADER_ID,
    footerId: CUSTOM_FOOTER_ID,
    children: <CustomHeaderFooterDemo />,
  },
];
