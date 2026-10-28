import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrintSettingsButton } from './settings-panel';
import { DEFAULT_SETTINGS } from '../../core/geometry/paper';

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

test('打印设置联动：切换纸张尺寸自动载入预设宽高与边距，自定义尺寸默认宽为A4高为200px边距为2px', async () => {
  const handleChange = jest.fn();
  render(<PrintSettingsButton value={DEFAULT_SETTINGS} disabled={false} onChange={handleChange} />);

  // 打开打印设置弹窗
  fireEvent.click(screen.getByRole('button', { name: '打印设置' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // 默认 A4: 宽 210, 高 297, 边距 10
  const widthInput = screen.getByPlaceholderText('请输入宽度') as HTMLInputElement;
  const heightInput = screen.getByPlaceholderText('请输入高度') as HTMLInputElement;
  expect(widthInput.value).toBe('210');
  expect(heightInput.value).toBe('297');
  expect(widthInput).toBeDisabled();

  // 切换为自定义尺寸
  const select = screen.getByRole('combobox');
  fireEvent.mouseDown(select);
  const customOption = screen.getByText('自定义尺寸');
  fireEvent.click(customOption);

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
});
