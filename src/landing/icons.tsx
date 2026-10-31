import { ReactComponent as PageFlowMark } from './brand-mark.svg';

export function Icon({ name, size = 20 }: { name: 'arrow' | 'github' | 'copy' | 'check' | 'file' | 'grid' | 'sliders' | 'code' | 'expand' | 'sun' | 'moon' | 'sparkles' | 'external' | 'layers' | 'dom' | 'document' | 'universal' | 'link' | 'chevron'; size?: number }) {
  const paths = {
    arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
    chevron: <path d="m6 9.5 6 6 6-6" />,
    github: <path d="M9 19c-4.5 1.5-4.5-2.5-6-3m12 6v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.8-1.6 6.8-7.3a5.7 5.7 0 0 0-1.5-4 5.3 5.3 0 0 0-.1-4s-1.2-.4-4.2 1.5a14.4 14.4 0 0 0-7 0C5-.4 3.8 0 3.8 0a5.3 5.3 0 0 0-.1 4 5.7 5.7 0 0 0-1.5 4c0 5.7 3.5 6.9 6.8 7.3A3.5 3.5 0 0 0 8 18v4" transform="translate(1 1) scale(.9)" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    sliders: <><path d="M4 7h16M4 17h16" /><rect x="7" y="4" width="4" height="6" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="14" width="4" height="6" rx="1" fill="currentColor" stroke="none" /></>,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />,
    external: <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3" />,
    layers: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    dom: <path d="M4 6h16M4 12h16M4 18h10M10 6v12" strokeLinecap="round" />,
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></>,
    universal: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 20v4M2 12h4M20 12h4" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-.54-7.54l-1.55-1.55" /><path d="M14 11a5 5 0 0 1-7.54-.54l-3 3a5 5 0 0 1 .54 7.54l-1.55 1.55" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <PageFlowMark focusable="false" />
    </span>
  );
}

export function BrandWordmark() {
  return <span className="brand-wordmark">Web<span className="brand-suffix"> Printer</span></span>;
}

/**
 * Recognizable technology marks, drawn as one monoline family on a 24 grid so a row of them
 * reads as a single optical system rather than five different clip-arts.
 */
export function TechnologyMark({ name, size = 28 }: { name: 'JavaScript' | 'TypeScript' | 'React' | 'Vue' | 'HTML'; size?: number }) {
  const letters = name === 'JavaScript' ? 'JS' : 'TS';
  const badge = name === 'JavaScript' || name === 'TypeScript';
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {badge ? <>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" strokeWidth="1.6" />
      <text x="12" y="16.2" textAnchor="middle" fill="currentColor" stroke="none"
        fontFamily="'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize={name === 'JavaScript' ? 8.9 : 8.4} fontWeight="700" letterSpacing="-.3">{letters}</text>
    </> : name === 'React' ? <g strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="10.1" ry="4.1" />
      <ellipse cx="12" cy="12" rx="10.1" ry="4.1" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10.1" ry="4.1" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </g> : name === 'Vue' ? <>
      <path d="M2.6 4.4 12 21.4 21.4 4.4" strokeWidth="1.6" />
      <path d="M8.5 4.4 12 10.5l3.5-6.1" strokeWidth="1.6" />
    </> : <>
      <path d="M4.2 2.6h15.6l-1.32 17.9L12 22.4l-6.48-1.9z" strokeWidth="1.6" transform="translate(0 -.4)" />
      <text x="12" y="16.3" textAnchor="middle" fill="currentColor" stroke="none"
        fontFamily="'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="8.4" fontWeight="700">5</text>
    </>}
  </svg>;
}
