import type { ReactNode } from 'react';

/**
 * The hero diagram: one long HTML page is measured and split into A4 pages, then exported.
 * It is intentionally wordless — the little text it carries is product vocabulary, not sample copy.
 */
export function ProductPreview() {
  return <div className="page-concept" aria-hidden="true">
    <svg viewBox="0 0 558 456">
      <defs>
        <filter id="wpCardShadow" x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#16241b" floodOpacity=".16" />
        </filter>
        <filter id="wpSourceShadow" x="-40%" y="-30%" width="180%" height="170%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#16241b" floodOpacity=".16" />
        </filter>
        <linearGradient id="wpMedia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6efe8" />
          <stop offset="1" stopColor="#cbded2" />
        </linearGradient>
        <linearGradient id="wpPdf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a7f65" />
          <stop offset="1" stopColor="#28624e" />
        </linearGradient>
        <linearGradient id="wpFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
      </defs>

      <SourceSheet />
      <path d="M190 114h13" stroke="#7e8a81" strokeWidth="1.4" strokeLinecap="round" />
      <path d="m198 109 5 5-5 5" fill="none" stroke="#7e8a81" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

      <OutputPage x={214} y={8} n={1}>
        <rect x="13" y="16" width="23" height="2.4" rx="1.2" fill="#32745d" opacity=".55" />
        <rect x="13" y="23" width="84" height="7" rx="1.5" fill="#33423a" />
        <rect x="13" y="34" width="56" height="7" rx="1.5" fill="#33423a" />
        <rect x="13" y="47" width="30" height="2.2" rx="1.1" fill="#c8d3ca" />
        <TextLines x={13} y={57} widths={[118, 124, 96]} />
        {/* The table runs to the bottom edge: page 2 is the same table, continued. */}
        <DataTable x={13} y={84} w={131} rows={8} />
      </OutputPage>

      <OutputPage x={385} y={8} n={2}>
        <DataTable x={13} y={16} w={131} rows={5} highlight={0} />
        <MediaBlock x={13} y={90} w={131} h={48} />
        <TextLines x={13} y={150} widths={[124, 116, 128, 94]} />
        <g transform="translate(13 180)">
          <rect width="2" height="6" rx="1" fill="#32745d" opacity=".6" />
          <rect x="8" y="1.4" width="86" height="2.2" rx="1.1" fill="#c8d3ca" />
        </g>
      </OutputPage>

      <OutputPage x={214} y={235} n={3}>
        <rect x="13" y="16" width="20" height="2.4" rx="1.2" fill="#32745d" opacity=".55" />
        <rect x="13" y="23" width="70" height="7" rx="1.5" fill="#33423a" />
        <TextLines x={13} y={44} widths={[122, 128, 114, 120, 88]} />
        <g transform="translate(13 86)">
          <rect width="2" height="30" rx="1" fill="#32745d" />
          <rect x="9" y="2" width="106" height="2.4" rx="1.2" fill="#c8d3ca" />
          <rect x="9" y="9" width="96" height="2.4" rx="1.2" fill="#c8d3ca" />
          <rect x="9" y="16" width="72" height="2.4" rx="1.2" fill="#c8d3ca" />
        </g>
        <CodeBlock x={13} y={126} w={131} h={42} />
        <TextLines x={13} y={178} widths={[118, 74]} gap={6} />
      </OutputPage>

      <g transform="translate(385 235)">
        <g className="pdf-card">
          <g filter="url(#wpCardShadow)">
            <rect width="157" height="213" rx="2.5" fill="url(#wpPdf)" />
          </g>
          <rect x=".5" y=".5" width="156" height="212" rx="2.5" fill="none" stroke="#245945" />
          <g transform="translate(15 16)">
            <rect x="7" y="0" width="30" height="40" rx="2" fill="#fff" opacity=".26" />
            <rect x="3.5" y="3.5" width="30" height="40" rx="2" fill="#fff" opacity=".46" />
            <rect width="30" height="40" rx="2" fill="#fff" opacity=".92" />
            <rect x="5" y="9" width="20" height="2.2" rx="1.1" fill="#32745d" opacity=".38" />
            <rect x="5" y="14" width="15" height="2.2" rx="1.1" fill="#32745d" opacity=".38" />
            <rect x="5" y="19" width="18" height="2.2" rx="1.1" fill="#32745d" opacity=".38" />
          </g>
          <text x="143" y="30" textAnchor="end" className="concept-mono" fontSize="6.5" fill="#fff" opacity=".55">A4</text>
          <text x="15" y="173" className="concept-display" fontSize="27" fill="#fff">PDF</text>
          <text x="83" y="172" className="concept-mono" fontSize="10" fill="#fff" opacity=".68">×3</text>
          <path d="M132 158v16m-5.5-5.5 5.5 5.5 5.5-5.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  </div>;
}

function SourceSheet() {
  return <g>
    <g filter="url(#wpSourceShadow)">
      <rect x="8" y="8" width="176" height="440" rx="3" fill="#fff" />
    </g>
    <rect x="8.5" y="8.5" width="175" height="439" rx="3" fill="none" stroke="#dbe3dc" />
    <g transform="translate(8 8)">
      <rect x="14" y="14" width="38" height="16" rx="3" fill="#e8f1eb" />
      <text x="33" y="24.6" textAnchor="middle" className="concept-mono" fontSize="6.5" fill="#32745d" letterSpacing=".12em">HTML</text>
      <rect x="167.5" y="14" width="2.4" height="412" rx="1.2" fill="#eef1ee" />
      <rect x="167.5" y="14" width="2.4" height="118" rx="1.2" fill="#c7d3ca" />
      <g transform="translate(14 40)">
        <rect width="28" height="2.4" rx="1.2" fill="#32745d" opacity=".55" />
        <rect y="9" width="94" height="8" rx="1.5" fill="#33423a" />
        <rect y="21" width="62" height="8" rx="1.5" fill="#33423a" />
        <TextLines y={39} widths={[142, 134, 140, 126, 138, 96]} gap={6.4} />
        <DataTable y={88} w={142} rows={5} />
        <MediaBlock y={174} w={142} h={54} />
        <rect y={242} width="58" height="6" rx="1.5" fill="#33423a" />
        <TextLines y={256} widths={[140, 132, 136, 108]} gap={6.4} />
        <CodeBlock y={286} w={142} h={44} />
        <TextLines y={340} widths={[134, 118, 90]} gap={6.4} />
      </g>
      <rect x="0" y="360" width="176" height="80" fill="url(#wpFade)" />
    </g>
  </g>;
}

function OutputPage({ x, y, n, children }: { x: number; y: number; n: number; children: ReactNode }) {
  return <g transform={`translate(${x} ${y})`}>
    <g filter="url(#wpCardShadow)">
      <rect width="157" height="213" rx="2.5" fill="#fff" />
    </g>
    <rect x=".5" y=".5" width="156" height="212" rx="2.5" fill="none" stroke="#dbe3dc" />
    {children}
    <line x1="13" y1="190" x2="144" y2="190" stroke="#e2e8e2" strokeWidth=".7" />
    <text x="13" y="202" className="concept-mono" fontSize="6.5" fill="#9aa49c">0{n}</text>
    <text x="144" y="202" textAnchor="end" className="concept-mono" fontSize="6.5" fill="#9aa49c">A4</text>
  </g>;
}

function TextLines({ x = 0, y, widths, gap = 6, height = 2.4, fill = '#c8d3ca' }: {
  x?: number; y: number; widths: number[]; gap?: number; height?: number; fill?: string;
}) {
  return <g>{widths.map((width, index) => <rect key={index} x={x} y={y + index * gap} width={width} height={height} rx={height / 2} fill={fill} />)}</g>;
}

function DataTable({ x = 0, y, w, rows, highlight }: { x?: number; y: number; w: number; rows: number; highlight?: number }) {
  const rowHeight = 11;
  const headerHeight = 10;
  const cells = [0.5, 0.27, 0.23];
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={headerHeight} fill="#e5f0e8" />
    {cells.map((fraction, index) => {
      const cellX = index === 0 ? 6 : w * cells.slice(0, index).reduce((a, b) => a + b, 0) + 5;
      return <rect key={index} x={cellX} y="3.5" width={w * fraction - 10} height="2.2" rx="1.1" fill="#a6bbac" />;
    })}
    {[0.5, 0.77].map(fraction => <line key={fraction} x1={w * fraction} y1="0" x2={w * fraction} y2={headerHeight + rows * rowHeight} stroke="#e8ede8" strokeWidth=".6" />)}
    {Array.from({ length: rows }, (_, row) => <g key={row} transform={`translate(0 ${headerHeight + row * rowHeight})`}>
      {row === highlight && <><rect width={w} height={rowHeight} fill="#dcede4" /><rect width="2" height={rowHeight} fill="#32745d" /></>}
      <line x1="0" y1={rowHeight} x2={w} y2={rowHeight} stroke="#e5eae5" strokeWidth=".7" />
      {cells.map((fraction, index) => {
        const cellX = index === 0 ? 6 : w * cells.slice(0, index).reduce((a, b) => a + b, 0) + 5;
        return <rect key={index} x={cellX} y="4" width={w * fraction - 10} height="2" rx="1" fill={index === 0 ? '#a9b8ad' : '#c2cec5'} />;
      })}
    </g>)}
  </g>;
}

function MediaBlock({ x = 0, y, w, h }: { x?: number; y: number; w: number; h: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} rx="2" fill="url(#wpMedia)" />
    <rect x=".5" y=".5" width={w - 1} height={h - 1} rx="2" fill="none" stroke="#c8d8cd" />
    <circle cx={w * 0.73} cy={h * 0.36} r="7.5" fill="#fff" opacity=".55" />
    <path d={`M0 ${h} L${w * 0.36} ${h * 0.52} L${w * 0.58} ${h * 0.78} L${w * 0.78} ${h * 0.6} L${w} ${h}`} fill="#fff" opacity=".38" />
  </g>;
}

function CodeBlock({ x = 0, y, w, h }: { x?: number; y: number; w: number; h: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={h} rx="2" fill="#28332c" />
    <rect x="8" y="9" width={w * 0.46} height="2.2" rx="1.1" fill="#5d7365" />
    <rect x="8" y="15" width={w * 0.32} height="2.2" rx="1.1" fill="#4c6154" />
    <rect x="8" y="21" width={w * 0.54} height="2.2" rx="1.1" fill="#5d7365" />
    <rect x="8" y="27" width={w * 0.24} height="2.2" rx="1.1" fill="#4c6154" />
  </g>;
}
