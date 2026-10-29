import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MiniPdfPreview } from './mini-pdf-preview';
import { HtmlPreviewData } from './pdf-preview-modal';

describe('MiniPdfPreview 组件 (带全屏与折叠控制)', () => {
  const mockData: HtmlPreviewData = {
    paperLabel: 'A4',
    pages: [
      { start: 0, end: 500 },
      { start: 500, end: 1000 },
    ],
    geometry: {
      paperWidthPx: 794,
      paperHeightPx: 1123,
      marginTopPx: 38,
      marginRightPx: 38,
      marginBottomPx: 38,
      marginLeftPx: 38,
      printableWidthPx: 718,
      printableHeightPx: 1047,
      headerHeightPx: 0,
      footerHeightPx: 0,
      sourceWidth: 800,
      scale: 0.897,
      slicingMode: false,
    },
    sourceHtml: '<div class="content"><p>测试行数据</p></div>',
    totalMs: 15,
    filename: 'test',
  };

  test('正确渲染小窗头部、页数标记与迷你切片纸张', () => {
    const onClose = jest.fn();
    render(<MiniPdfPreview data={mockData} onClose={onClose} />);

    expect(screen.getByText('📄 纸张预览')).toBeInTheDocument();
    expect(screen.getByText('2 页')).toBeInTheDocument();
    expect(screen.getByText(/P\.1 \/ 2 · A4/)).toBeInTheDocument();
    expect(screen.getByText(/P\.2 \/ 2 · A4/)).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // 关闭按钮
    fireEvent.click(screen.getByTitle('关闭预览小窗'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('支持最小化与展开切换', () => {
    render(<MiniPdfPreview data={mockData} />);

    const toggleBtn = screen.getByTitle('折叠小窗');
    fireEvent.click(toggleBtn);

    // 折叠后 body 隐藏
    expect(screen.queryByText(/P\.1 \/ 2 · A4/)).not.toBeInTheDocument();

    // 再次点击展开
    fireEvent.click(screen.getByTitle('展开小窗'));
    expect(screen.getByText(/P\.1 \/ 2 · A4/)).toBeInTheDocument();
  });

  test('支持一键切换全屏预览与退出全屏 (包含 Escape 快捷键)', () => {
    const { container } = render(<MiniPdfPreview data={mockData} />);

    // 点击全屏按钮 (FullscreenOutlined)
    const fullscreenBtn = screen.getByTitle('全屏预览');
    fireEvent.click(fullscreenBtn);

    // 检查进入全屏状态 class 与切换为退出全屏按钮 (FullscreenExitOutlined)
    expect(container.querySelector('.is-fullscreen')).toBeInTheDocument();
    const exitBtn = screen.getByTitle('退出全屏 (Esc)');
    expect(exitBtn).toBeInTheDocument();

    // 触发 Escape 退出全屏
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.is-fullscreen')).not.toBeInTheDocument();
    expect(screen.getByTitle('全屏预览')).toBeInTheDocument();
  });
});
