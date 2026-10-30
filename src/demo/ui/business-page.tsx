import { Card, Tag } from 'antd';
import type { ReactNode } from 'react';
import './business-page.css';

export const demoAsset = (file: string) => `${process.env.PUBLIC_URL}/demo-assets/${file}`;
export const money = (amount: number) => `¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function BusinessHeading({ path, title, status, meta }: { path: string; title: string; status: string; meta: string }) {
  return <header className="business-heading">
    <p className="business-breadcrumb">{path}</p>
    <div className="business-title"><h1>{title}</h1><Tag>{status}</Tag></div>
    <p className="business-meta">{meta}</p>
  </header>;
}
export function BusinessSection({ title, extra, children, atomic = false }: { title: string; extra?: ReactNode; children: ReactNode; atomic?: boolean }) {
  return <Card className="business-section" title={<h2>{title}</h2>} extra={extra} size="small" {...(atomic ? { 'data-print-atomic': 'true' } : {})}>{children}</Card>;
}
