import { configurePrint } from '@darialan/web-pdf-printer';
import type { PrintSceneItem } from './ui';
import { CUSTOM_FOOTER_ID, CUSTOM_HEADER_ID, HeaderFooterDemo, HEADER_FOOTER_CONTENT_ID } from './header-footer';
import { LOW_CODE_CONTENT_ID, LOW_CODE_FOOTER_ID, LOW_CODE_HEADER_ID, LowCodePage } from './low-code';
import { PageBreakDemo, PAGE_BREAK_CONTENT_ID } from './page-break';
import { ParagraphPage, PARAGRAPH_CONTENT_ID } from './paragraph';
import { PurchaseOrderDemo, PURCHASE_ORDER_CONTENT_ID } from './purchase-order';
import { SINGLE_PAGE_CONTENT_ID, SinglePageIframeDemo } from './single-page';

export * from './ui';

// Demo 业务层使用了 Ant Design，在 Demo 业务层统一配置注册 Ant Design 组件库选择器
configurePrint({
  atomic: ['.ant-table-row'],
  ignore: ['.ant-pagination'],
});

export const DEMO_SCENES: PrintSceneItem[] = [
  { key: '0', label: '段落', contentId: PARAGRAPH_CONTENT_ID, children: <ParagraphPage /> },
  {
    key: 'single-page',
    label: '单页与 iframe 嵌入',
    contentId: SINGLE_PAGE_CONTENT_ID,
    children: <SinglePageIframeDemo />,
  },
  { key: '3', label: '多页分页截断', contentId: PAGE_BREAK_CONTENT_ID, children: <PageBreakDemo /> },
  {
    key: '4',
    label: '自定义页眉页脚',
    contentId: HEADER_FOOTER_CONTENT_ID,
    headerId: CUSTOM_HEADER_ID,
    footerId: CUSTOM_FOOTER_ID,
    children: <HeaderFooterDemo />,
  },
  { key: '6', label: '采购订单', contentId: PURCHASE_ORDER_CONTENT_ID, children: <PurchaseOrderDemo /> },
  {
    key: 'lowcode',
    label: '低代码',
    contentId: LOW_CODE_CONTENT_ID,
    headerId: LOW_CODE_HEADER_ID,
    footerId: LOW_CODE_FOOTER_ID,
    children: <LowCodePage />,
  },
];
