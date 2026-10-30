import {
  DEFAULT_SETTINGS,
  getPresetDimensions,
  getPresetUnit,
  MM_PER_PX,
  PrintSettings,
  PX_PER_MM,
  resolvePaper,
  UNIT_FIELDS,
} from '../../../lib';
import { Button, Form, InputNumber, Modal, Radio, Select, Switch } from 'antd';
import { useState } from 'react';
import { OUTPUT_PRESET_OPTIONS } from './output-presets';
import './settings-panel.css';

const formatDisplayNumber = (val: number | string | undefined) => {
  if (val === undefined || val === '') return '';
  const num = Number(val);
  return Number.isFinite(num) ? String(Number(num.toFixed(2))) : String(val);
};

export function PrintSettingsButton({
  value,
  disabled,
  onChange,
}: {
  value: PrintSettings;
  disabled: boolean;
  onChange: (next: PrintSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PrintSettings>();
  const paper = Form.useWatch('paper', form);
  const unit = Form.useWatch('unit', form) || 'mm';

  const numberRules = [{ required: true, type: 'number' as const, message: '请输入有效数值' }];

  const fill = (settings: PrintSettings) => {
    const activeUnit = settings.unit || 'mm';
    const factor = activeUnit === 'px' ? PX_PER_MM : 1;
    const precision = activeUnit === 'px' ? 1 : 2;

    const pageNumber = settings.pageNumber || {
      enabled: true,
      position: 'bottom-right',
      format: 'slash',
    };

    const displayValues: PrintSettings = {
      ...settings,
      unit: activeUnit,
      widthMm: Number((settings.widthMm * factor).toFixed(precision)),
      heightMm: Number((settings.heightMm * factor).toFixed(precision)),
      marginTopMm: Number((settings.marginTopMm * factor).toFixed(precision)),
      marginRightMm: Number((settings.marginRightMm * factor).toFixed(precision)),
      marginBottomMm: Number((settings.marginBottomMm * factor).toFixed(precision)),
      marginLeftMm: Number((settings.marginLeftMm * factor).toFixed(precision)),
      pageNumber,
    };
    form.setFieldsValue(displayValues);
  };

  const apply = async () => {
    try {
      const draft = await form.validateFields();
      const activeUnit = draft.unit || 'mm';
      const factor = activeUnit === 'px' ? MM_PER_PX : 1;

      // 转换为系统底层统一存储的毫米 (mm) 单位
      const canonical: PrintSettings = {
        ...draft,
        orientation: draft.orientation || value.orientation || 'portrait',
        unit: activeUnit,
        widthMm: Number((draft.widthMm * factor).toFixed(4)),
        heightMm: Number((draft.heightMm * factor).toFixed(4)),
        marginTopMm: Number((draft.marginTopMm * factor).toFixed(4)),
        marginRightMm: Number((draft.marginRightMm * factor).toFixed(4)),
        marginBottomMm: Number((draft.marginBottomMm * factor).toFixed(4)),
        marginLeftMm: Number((draft.marginLeftMm * factor).toFixed(4)),
        header: value.header,
        footer: value.footer,
        pageNumber: {
          enabled: draft.pageNumber?.enabled ?? true,
          position: draft.pageNumber?.position || 'bottom-right',
          format: draft.pageNumber?.format || 'slash',
        },
      };

      resolvePaper(canonical);
      onChange(canonical);
      setOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        form.setFields([{ name: 'paper', errors: [error.message] }]);
      }
    }
  };

  const handleValuesChange = (changed: Partial<PrintSettings>, allValues: PrintSettings) => {
    const currentUnit = allValues.unit || 'mm';

    // 1. 尺寸单位切换 (mm <-> px)：无损换算所有数值并保留对应精度
    if (changed.unit) {
      const toUnit = changed.unit;
      const factor = toUnit === 'px' ? PX_PER_MM : MM_PER_PX;
      const precision = toUnit === 'px' ? 1 : 2;

      const updated: Partial<PrintSettings> = {};
      UNIT_FIELDS.forEach(field => {
        const val = allValues[field];
        if (typeof val === 'number') updated[field] = Number((val * factor).toFixed(precision));
      });
      form.setFieldsValue(updated);
      return;
    }

    // 2. 输出尺寸切换：加载预设的宽高与边距，并跟随预设切换单位（纸张 mm / 社媒图片 px）
    if (changed.paper) {
      const nextUnit = changed.paper === 'custom' ? currentUnit : getPresetUnit(changed.paper);
      const preset = getPresetDimensions(changed.paper, allValues.orientation, nextUnit);
      form.setFieldsValue({
        unit: nextUnit,
        widthMm: preset.width,
        heightMm: preset.height,
        marginTopMm: preset.marginTop,
        marginRightMm: preset.marginRight,
        marginBottomMm: preset.marginBottom,
        marginLeftMm: preset.marginLeft,
      });
      return;
    }

    // 3. 纸张方向切换：标准纸张自动调换宽高，自定义尺寸不自动调换
    if (changed.orientation && allValues.paper !== 'custom') {
      const preset = getPresetDimensions(allValues.paper, changed.orientation, currentUnit);
      form.setFieldsValue({
        widthMm: preset.width,
        heightMm: preset.height,
      });
    }
  };

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          fill(value);
          setOpen(true);
        }}
      >
        输出设置
      </Button>
      <Modal
        className="print-settings-dialog"
        centered
        width={560}
        title="输出设置"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={apply}
        okText="应用"
        cancelText="取消"
        forceRender
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <Button
              onClick={() => {
                form.resetFields();
                fill(DEFAULT_SETTINGS);
              }}
            >
              恢复默认
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        <Form
          form={form}
          preserve={true}
          layout="vertical"
          initialValues={value}
          onValuesChange={handleValuesChange}
        >
          <div className="print-settings-grid">
            <Form.Item name="unit" label="尺寸单位">
              <Radio.Group options={[{ value: 'mm', label: 'mm' }, { value: 'px', label: 'px' }]} />
            </Form.Item>
            <Form.Item name="paper" label="输出尺寸" className="print-settings-span" rules={[{ required: true }]}>
              {/* 不锁定为触发器宽度：弹窗缩放动画首帧宽度会被误测，锁定会让下拉变成窄条 */}
              <Select options={OUTPUT_PRESET_OPTIONS} dropdownMatchSelectWidth={false} />
            </Form.Item>
          </div>
          <div className="print-settings-grid">
            <Form.Item name="widthMm" label={`宽度（${unit}）`} rules={numberRules}>
              <InputNumber
                min={1}
                step={1}
                formatter={formatDisplayNumber}
                placeholder="请输入宽度"
                disabled={paper !== 'custom'}
              />
            </Form.Item>
            <Form.Item name="heightMm" label={`高度（${unit}）`} rules={numberRules}>
              <InputNumber
                min={1}
                step={1}
                formatter={formatDisplayNumber}
                placeholder="请输入高度"
                disabled={paper !== 'custom'}
              />
            </Form.Item>
          </div>
          {paper !== 'custom' && (
            <div className="print-settings-grid">
              <Form.Item name="orientation" label="方向">
                <Radio.Group
                  options={[
                    { value: 'portrait', label: '纵向' },
                    { value: 'landscape', label: '横向' },
                  ]}
                />
              </Form.Item>
            </div>
          )}
          <div className="print-settings-margins">
            {(['Top', 'Right', 'Bottom', 'Left'] as const).map((side, i) => (
              <Form.Item
                key={side}
                name={`margin${side}Mm`}
                label={`${['上', '右', '下', '左'][i]}边距（${unit}）`}
                rules={numberRules}
              >
                <InputNumber
                  min={0}
                  step={1}
                  formatter={formatDisplayNumber}
                />
              </Form.Item>
            ))}
          </div>
          {/* 把推导结果直接写出来：画框 − 边距 = 正文内容区，用户不用自己算 */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldsValue }) => {
              const v = getFieldsValue(['widthMm', 'heightMm', 'marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm']);
              const show = (n: unknown) => (typeof n === 'number' ? Number(n.toFixed(1)) : NaN);
              const contentWidth = show(v.widthMm) - show(v.marginLeftMm) - show(v.marginRightMm);
              const contentHeight = show(v.heightMm) - show(v.marginTopMm) - show(v.marginBottomMm);
              if (!(contentWidth > 0) || !(contentHeight > 0)) return null;
              return (
                <p className="print-settings-derived">
                  正文内容区 <strong>{Number(contentWidth.toFixed(1))} × {Number(contentHeight.toFixed(1))} {unit}</strong>
                  ，按每页这个高度分页
                </p>
              );
            }}
          </Form.Item>

          <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0 12px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>
            页码设置
          </div>
          <div className="print-settings-grid">
            <Form.Item name={['pageNumber', 'enabled']} label="显示页码" valuePropName="checked">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.pageNumber?.enabled !== curr.pageNumber?.enabled}
            >
              {({ getFieldValue }) => {
                const enabled = getFieldValue(['pageNumber', 'enabled']) ?? true;
                if (!enabled) return null;
                return (
                  <Form.Item name={['pageNumber', 'position']} label="页码位置">
                    <Select
                      options={[
                        { value: 'bottom-right', label: '底部靠右' },
                        { value: 'bottom-center', label: '底部居中' },
                        { value: 'top-right', label: '顶部靠右' },
                        { value: 'top-center', label: '顶部居中' },
                      ]}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </div>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.pageNumber?.enabled !== curr.pageNumber?.enabled}
          >
            {({ getFieldValue }) => {
              const enabled = getFieldValue(['pageNumber', 'enabled']) ?? true;
              if (!enabled) return null;
              return (
                <div className="print-settings-grid">
                  <Form.Item name={['pageNumber', 'format']} label="页码格式">
                    <Select
                      options={[
                        { value: 'slash', label: '1 / 5 (数字斜杠)' },
                        { value: 'chinese', label: '第 1 页 / 共 5 页 (中文标准)' },
                        { value: 'hyphen', label: '- 1 - (中划线简洁)' },
                      ]}
                    />
                  </Form.Item>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
