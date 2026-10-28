export const MULTI_PAGE_CONTENT_ID = 'print-content2';

export function MultiPageDemo() {
  return (
    <div style={{ boxSizing: 'border-box' }}>
      <div id={MULTI_PAGE_CONTENT_ID}>
        <div style={{ border: '1px solid red', height: 5000 }} />
      </div>
    </div>
  );
}
