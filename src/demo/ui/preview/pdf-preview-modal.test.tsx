import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HtmlPreviewData, PdfPreviewModal } from './pdf-preview-modal';

describe('PdfPreviewModal 组件 (HTML 虚拟纸张即时预览)', () => {
  const mockPreviewData: HtmlPreviewData = {
    paperLabel: 'A4 · 210 × 297 mm',
    pages: [
      { start: 0, end: 500 },
      { start: 500, end: 1000 },
    ],
    geometry: {
      paperWidthPx: 793.7,
      paperHeightPx: 1122.5,
      marginTopPx: 37.8,
      marginRightPx: 37.8,
      marginBottomPx: 37.8,
      marginLeftPx: 37.8,
      printableWidthPx: 718.1,
      printableHeightPx: 1046.9,
      headerHeightPx: 0,
      footerHeightPx: 0,
      sourceWidth: 800,
      scale: 0.897,
      pageNumber: { enabled: true, position: 'bottom-right', format: 'slash' },
    },
    sourceHtml: '<div class="test-content"><h1>采购单测试</h1><p>商品明细说明</p></div>',
    totalMs: 18.5,
    filename: 'test-order',
  };

  test('当 loading 为 true 时展示排版计算中指示', () => {
    render(
      <PdfPreviewModal
        open={true}
        loading={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('📄 打印效果预览 (HTML 虚拟纸张)')).toBeInTheDocument();
    expect(screen.getByText('正在计算物理纸张排版与切片视窗…')).toBeInTheDocument();
  });

  test('展示 HTML 虚拟物理纸张、切片视窗、缩放控制与操作按钮', () => {
    const onExport = jest.fn();
    const onRefresh = jest.fn();
    const onClose = jest.fn();

    render(
      <PdfPreviewModal
        open={true}
        loading={false}
        previewData={mockPreviewData}
        onClose={onClose}
        onExport={onExport}
        onRefresh={onRefresh}
      />
    );

    // 检查规格与页数 Tags
    expect(screen.getByText('A4 · 210 × 297 mm')).toBeInTheDocument();
    expect(screen.getByText('共 2 页')).toBeInTheDocument();
    expect(screen.getByText('即时渲染: 19ms')).toBeInTheDocument();

    // 检查两页 HTML 纸张切片徽章
    expect(screen.getByText(/第 1 页 \/ 共 2 页/)).toBeInTheDocument();
    expect(screen.getByText(/第 2 页 \/ 共 2 页/)).toBeInTheDocument();

    // 检查页码
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // 缩放控制测试 (默认 85%)
    expect(screen.getByText('85%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('＋'));
    expect(screen.getByText('95%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('－'));
    expect(screen.getByText('85%')).toBeInTheDocument();

    // 触发操作按钮
    fireEvent.click(screen.getByText('🔄 重新排版'));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('⬇️ 导出真实 PDF'));
    expect(onExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('✕ 关闭'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
