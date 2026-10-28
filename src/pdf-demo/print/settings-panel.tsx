import { Button, Form, InputNumber, Modal, Radio, Select, Switch } from 'antd';
import { useState } from 'react';
import { convertFields, DEFAULT_SETTINGS, PrintSettings, resolvePaper, UNIT_FIELDS } from './settings';
import './settings-panel.css';

const formatNumber = (value: string | number | undefined, info: { userTyping: boolean; input: string }) => {
  if (info.userTyping) return info.input;
  if (value === undefined || value === '') return '';
  return String(Number(Number(value).toFixed(2)));
};
export function PrintSettingsButton({ value, disabled, onChange }: { value: PrintSettings; disabled: boolean; onChange: (next: PrintSettings) => void }) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PrintSettings>();
  const paper = Form.useWatch('paper', form);
  const unit = Form.useWatch('unit', form) || 'mm';
  const slicing = Form.useWatch('slicingMode', form);
  const numberRules = [{ required: true, type: 'number' as const, message: '请输入有效数值' }];
  const apply = async () => {
    try {
      const draft = await form.validateFields();
      const next = convertFields(draft, draft.unit === 'px' ? 25.4 / 96 : 1);
      resolvePaper(next);
      onChange(next);
      setOpen(false);
    } catch (error) {
      if (error instanceof Error) form.setFields([{ name: 'paper', errors: [error.message] }]);
    }
  };
  const fill = (settings: PrintSettings) => {
    const { widthMm, heightMm } = resolvePaper(settings);
    form.setFieldsValue(convertFields({ ...settings, widthMm, heightMm }, settings.unit === 'px' ? 96 / 25.4 : 1));
  };
  return <>
    <Button disabled={disabled} onClick={() => { fill(value); setOpen(true); }} style={{ marginLeft: 8 }}>打印设置</Button>
    <Modal className="print-settings-dialog" centered width={560} title="打印设置" open={open} onCancel={() => setOpen(false)} onOk={apply} okText="应用" cancelText="取消" forceRender footer={(_, { OkBtn, CancelBtn }) => <><Button onClick={() => { form.resetFields(); fill(DEFAULT_SETTINGS); }}>恢复默认</Button><CancelBtn /><OkBtn /></>}>
      <Form form={form} layout="vertical" initialValues={value} onValuesChange={(changed, values) => {
        if (changed.unit) form.setFieldsValue(convertFields(values, changed.unit === 'px' ? 96 / 25.4 : 25.4 / 96));
        if (changed.paper || (changed.orientation && values.paper !== 'custom')) {
          const { widthMm, heightMm } = resolvePaper({ ...DEFAULT_SETTINGS, paper: values.paper, orientation: values.orientation });
          const factor = values.unit === 'px' ? 96 / 25.4 : 1;
          const defaults = convertFields({ ...DEFAULT_SETTINGS, widthMm, heightMm }, factor);
          const fields = changed.paper ? UNIT_FIELDS : (['widthMm', 'heightMm'] as const);
          form.setFields(fields.map(name => ({ name, value: defaults[name], errors: [] })));
        }
        form.setFields([{ name: 'paper', errors: [] }]);
      }}>
        <div className="print-settings-grid">
        <Form.Item name="unit" label="尺寸单位"><Radio.Group options={[{ value: 'mm', label: 'mm' }, { value: 'px', label: 'px' }]} /></Form.Item>
        <Form.Item name="paper" label="纸张尺寸" rules={[{ required: true }]}><Select options={[{ value: 'a4', label: 'A4' }, { value: 'a3', label: 'A3' }, { value: 'a5', label: 'A5' }, { value: 'letter', label: 'Letter' }, { value: 'custom', label: '自定义尺寸' }]} /></Form.Item>
        </div>
        <div className="print-settings-grid"><Form.Item name="widthMm" label={`页面宽（${unit}）`} rules={numberRules}><InputNumber placeholder="请输入宽度" formatter={formatNumber} step={1} disabled={paper !== 'custom'} /></Form.Item><Form.Item name="heightMm" label={`页面高（${unit}）`} rules={numberRules}><InputNumber placeholder="请输入高度" formatter={formatNumber} step={1} disabled={paper !== 'custom'} /></Form.Item></div>
        <div className="print-settings-grid">
        <Form.Item name="orientation" label="纸张方向"><Radio.Group disabled={paper === 'custom'} options={[{ value: 'portrait', label: '纵向' }, { value: 'landscape', label: '横向' }]} /></Form.Item>
        <Form.Item name="slicingMode" label="细切片测试" valuePropName="checked"><Switch /></Form.Item>
        </div>
        <div className="print-settings-margins">{(['Top', 'Right', 'Bottom', 'Left'] as const).map((side, i) => <Form.Item key={side} name={`margin${side}Mm`} label={`${['上', '右', '下', '左'][i]}边距（${unit}）`} rules={numberRules}><InputNumber formatter={formatNumber} step={1} disabled={slicing} /></Form.Item>)}</div>
        <div className="print-settings-hint">{slicing ? '按高度直接切片，忽略内容完整性、边距和页眉页脚。' : '检查分页和导出共用设置，保留行及签名完整性。'}<br />自定义宽高不自动交换；96 px = 25.4 mm，切换单位自动换算。</div>
      </Form>
    </Modal>
  </>;
}
