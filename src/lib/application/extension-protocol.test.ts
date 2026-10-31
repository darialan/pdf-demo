import {
  CHANNEL,
  defaultSettings,
  isEnvelope,
  validateSettings,
  userError,
} from '../../../extension/shared/protocol';
test('only accepts typed extension envelopes with bounded identifiers and valid revisions', () => {
  const good = {
    channel: CHANNEL,
    sessionId: 'session',
    requestId: 'request',
    revision: 1,
    command: 'prepare',
    payload: {},
  };
  expect(isEnvelope(good)).toBe(true);
  for (const patch of [
    { channel: 'page-script' },
    { command: 'evaluate' },
    { revision: -1 },
    { revision: 0.2 },
    { requestId: 'a'.repeat(101) },
    { payload: [] },
    { sessionId: null },
  ])
    expect(isEnvelope({ ...good, ...patch })).toBe(false);
  expect(isEnvelope(null)).toBe(false);
});
test('settings crossing extension boundaries are deeply copied and reject unsafe dimensions and nested values', () => {
  const original = {
    ...defaultSettings(),
    header: { enabled: true, text: 'Web Printer' },
  };
  const validated = validateSettings(original);
  original.header.text = 'Changed';
  expect(validated.header?.text).toBe('Web Printer');
  for (const patch of [
    { paper: '__proto__' },
    { widthMm: Infinity },
    { heightMm: NaN },
    { marginTopMm: -1 },
    { marginLeftMm: 999 },
    { header: { text: 'x'.repeat(121) } },
    { pageNumber: { enabled: 'true' } },
    { footer: [] },
    { orientation: 'unknown' },
  ])
    expect(() =>
      validateSettings({ ...defaultSettings(), ...patch }),
    ).toThrow();
});
test('untrusted error text is not exposed as a stack or arbitrary page string', () => {
  expect(userError(new Error('secret from remote origin'))).toBe(
    '处理失败，请重新选择区域后重试。',
  );
  expect(userError(new Error('Cannot access contents of url'))).toContain(
    '无法读取',
  );
});
