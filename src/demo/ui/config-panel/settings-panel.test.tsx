import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrintSettingsButton } from './settings-panel';
import { DEFAULT_SETTINGS } from '@darialan/web-printer';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

test('输出设置联动：切换纸张尺寸自动载入预设宽高与边距，自定义尺寸默认宽为A4高为200px边距为2px', async () => {
  const handleChange = jest.fn();
  render(<PrintSettingsButton value={DEFAULT_SETTINGS} disabled={false} onChange={handleChange} />);

  // 打开输出设置弹窗
  fireEvent.click(screen.getByRole('button', { name: '输出设置' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // 默认 A4: 宽 210, 高 297, 边距 10，显示纸张方向，无细切片测试
  expect(screen.getByText('方向')).toBeInTheDocument();
  expect(screen.queryByText('细切片测试')).not.toBeInTheDocument();
  const widthInput = screen.getByPlaceholderText('请输入宽度') as HTMLInputElement;
  const heightInput = screen.getByPlaceholderText('请输入高度') as HTMLInputElement;
  expect(widthInput.value).toBe('210');
  expect(heightInput.value).toBe('297');
  expect(widthInput).toBeDisabled();

  // 切换为自定义尺寸
  const select = screen.getByRole('combobox', { name: '输出尺寸' });
  fireEvent.mouseDown(select.closest('.ant-select')?.querySelector('.ant-select-selector') as HTMLElement);
  for (let i = 0; i < 9; i++) fireEvent.keyDown(select, { key: 'ArrowDown', keyCode: 40, which: 40 });
  fireEvent.keyDown(select, { key: 'Enter', keyCode: 13, which: 13 });

  // 自定义尺寸下不显示方向（仅预设尺寸有方向）
  expect(screen.queryByText('方向')).not.toBeInTheDocument();

  // 验证页码设置区域存在
  expect(screen.getByText('页码设置')).toBeInTheDocument();
  expect(screen.getByText('显示页码')).toBeInTheDocument();

  // 自定义尺寸下宽高输入框解禁，宽为 A4 宽 210，高默认为 200px (≈52.92mm)，边距为 2px (≈0.53mm)
  expect(widthInput).not.toBeDisabled();
  expect(heightInput).not.toBeDisabled();
  expect(widthInput.value).toBe('210');
  expect(Number(heightInput.value)).toBeCloseTo(52.92, 1);

  // 切换单位为 px
  const pxRadio = screen.getByLabelText('px');
  fireEvent.click(pxRadio);

  // 单位为 px 时：高为精确 200，边距为精确 2
  expect(heightInput.value).toBe('200');
  expect(Number(widthInput.value)).toBeCloseTo(793.7, 1);

  // 提交并验证
  fireEvent.click(screen.getByRole('button', { name: '应 用' }));
  await waitFor(() => expect(handleChange).toHaveBeenCalled());
  const saved = handleChange.mock.calls[0][0];
  expect(saved.paper).toBe('custom');
  expect(saved.unit).toBe('px');
  expect(saved.pageNumber).toEqual({
    enabled: true,
    position: 'bottom-right',
    format: 'slash',
  });
});

test('社媒预设：选择小红书 3:4 后单位切到 px，宽高与边距按预设填充', async () => {
  const handleChange = jest.fn();
  render(<PrintSettingsButton value={DEFAULT_SETTINGS} disabled={false} onChange={handleChange} />);

  fireEvent.click(screen.getByRole('button', { name: '输出设置' }));

  // 默认是 A4，单位 mm
  expect((screen.getByLabelText('mm') as HTMLInputElement).checked).toBe(true);

  const select = screen.getByRole('combobox', { name: '输出尺寸' });
  fireEvent.mouseDown(select.closest('.ant-select')?.querySelector('.ant-select-selector') as HTMLElement);
  for (let i = 0; i < 4; i++) fireEvent.keyDown(select, { key: 'ArrowDown', keyCode: 40, which: 40 });
  fireEvent.keyDown(select, { key: 'Enter', keyCode: 13, which: 13 });

  // 选中图片预设时单位自动切到 px，避免出现 328.61 mm 这种数字
  expect((screen.getByLabelText('px') as HTMLInputElement).checked).toBe(true);
  const widthInput = screen.getByPlaceholderText('请输入宽度') as HTMLInputElement;
  const heightInput = screen.getByPlaceholderText('请输入高度') as HTMLInputElement;
  expect(widthInput.value).toBe('1242');
  expect(heightInput.value).toBe('1656');
  expect((screen.getByLabelText('上边距（px）') as HTMLInputElement).value).toBe('60');

  // 推导行把"画框 − 边距 = 正文内容区"直接写出来
  expect(screen.getByText(/1122 × 1536 px/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '应 用' }));
  await waitFor(() => expect(handleChange).toHaveBeenCalled());
  const saved = handleChange.mock.calls[0][0];
  expect(saved.paper).toBe('card-3x4');
  expect(saved.unit).toBe('px');
  // 内部仍以 mm 存储：1656px → 438.15mm，60px → 15.875mm
  expect(saved.heightMm).toBeCloseTo(438.15, 2);
  expect(saved.marginTopMm).toBeCloseTo(15.875, 3);
});

test('页码设置：关闭显示页码时隐藏位置与格式选项并保存', async () => {
  const handleChange = jest.fn();
  render(<PrintSettingsButton value={DEFAULT_SETTINGS} disabled={false} onChange={handleChange} />);

  fireEvent.click(screen.getByRole('button', { name: '输出设置' }));
  expect(screen.getByText('页码设置')).toBeInTheDocument();
  expect(screen.getByText('页码位置')).toBeInTheDocument();
  expect(screen.getByText('页码格式')).toBeInTheDocument();

  // 点击关闭显示页码 switch
  const switchBtn = screen.getByRole('switch');
  fireEvent.click(switchBtn);

  // 位置与格式选择器随之隐藏
  expect(screen.queryByText('页码位置')).not.toBeInTheDocument();
  expect(screen.queryByText('页码格式')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '应 用' }));
  await waitFor(() => expect(handleChange).toHaveBeenCalled());
  const saved = handleChange.mock.calls[0][0];
  expect(saved.pageNumber?.enabled).toBe(false);
});
