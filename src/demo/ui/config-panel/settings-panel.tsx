import {
  DEFAULT_SETTINGS,
  getPresetDimensions,
  MM_PER_PX,
  PrintSettings,
  PX_PER_MM,
  resolvePaper,
  UNIT_FIELDS,
} from '@darialan/web-pdf-printer';
import { Button, Form, InputNumber, Modal, Radio, Select } from 'antd';
import { useState } from 'react';
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

    const displayValues: PrintSettings = {
      ...settings,
      unit: activeUnit,
      widthMm: Number((settings.widthMm * factor).toFixed(precision)),
      heightMm: Number((settings.heightMm * factor).toFixed(precision)),
      marginTopMm: Number((settings.marginTopMm * factor).toFixed(precision)),
      marginRightMm: Number((settings.marginRightMm * factor).toFixed(precision)),
      marginBottomMm: Number((settings.marginBottomMm * factor).toFixed(precision)),
      marginLeftMm: Number((settings.marginLeftMm * factor).toFixed(precision)),
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

      // 如果当前是自定义尺寸且刚好是默认值，保持整型标准 200 与 2
      if (allValues.paper === 'custom' && toUnit === 'px') {
        const isDefaultHeight = Math.abs(allValues.heightMm - Number((200 * MM_PER_PX).toFixed(2))) < 0.1;
        const isDefaultMargin = Math.abs(allValues.marginTopMm - Number((2 * MM_PER_PX).toFixed(2))) < 0.05;
        form.setFieldsValue({
          widthMm: Number((allValues.widthMm * factor).toFixed(1)),
          heightMm: isDefaultHeight ? 200 : Number((allValues.heightMm * factor).toFixed(1)),
          marginTopMm: isDefaultMargin ? 2 : Number((allValues.marginTopMm * factor).toFixed(1)),
          marginRightMm: isDefaultMargin ? 2 : Number((allValues.marginRightMm * factor).toFixed(1)),
          marginBottomMm: isDefaultMargin ? 2 : Number((allValues.marginBottomMm * factor).toFixed(1)),
          marginLeftMm: isDefaultMargin ? 2 : Number((allValues.marginLeftMm * factor).toFixed(1)),
        });
      } else {
        const updated: Partial<PrintSettings> = {};
        UNIT_FIELDS.forEach(field => {
          const val = allValues[field];
          if (typeof val === 'number') {
            updated[field] = Number((val * factor).toFixed(precision));
          }
        });
        form.setFieldsValue(updated);
      }
      return;
    }

    // 2. 纸张尺寸切换：加载对应预设的标准宽高与边距
    if (changed.paper) {
      const preset = getPresetDimensions(changed.paper, allValues.orientation, currentUnit);
      form.setFieldsValue({
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
        style={{ marginLeft: 8 }}
      >
        打印设置
      </Button>
      <Modal
        className="print-settings-dialog"
        centered
        width={560}
        title="打印设置"
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
            <Form.Item name="paper" label="纸张尺寸" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'a4', label: 'A4' },
                  { value: 'a3', label: 'A3' },
                  { value: 'a5', label: 'A5' },
                  { value: 'letter', label: 'Letter' },
                  { value: 'custom', label: '自定义尺寸' },
                ]}
              />
            </Form.Item>
          </div>
          <div className="print-settings-grid">
            <Form.Item name="widthMm" label={`页面宽（${unit}）`} rules={numberRules}>
              <InputNumber
                min={1}
                step={1}
                formatter={formatDisplayNumber}
                placeholder="请输入宽度"
                disabled={paper !== 'custom'}
              />
            </Form.Item>
            <Form.Item name="heightMm" label={`页面高（${unit}）`} rules={numberRules}>
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
              <Form.Item name="orientation" label="纸张方向">
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
        </Form>
      </Modal>
    </>
  );
}
