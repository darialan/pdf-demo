import { ResolvedPaper } from './paper';
import { PageNumberConfig } from '../types';

export interface PageGeometry {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  ratio: number;
  headerHeight: number;
  footerHeight: number;
  bodyTop: number;
  left: number;
  headerY: number;
  footerY: number;
  pageNumberY: number;
  capacity: number;
}

/** Paper units (pt) and DOM units (CSS px) meet only at this boundary. */
export function calculateGeometry(
  paper: ResolvedPaper,
  width: number,
  headerPx: number | undefined,
  footerPx: number | undefined,
  pageNumber: boolean | PageNumberConfig = true
): PageGeometry {
  const { pageWidth, pageHeight } = paper;
  if (!Number.isFinite(width) || width <= 0 || [headerPx, footerPx].some(value => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    throw new Error('打印区域或页眉页脚尺寸无效');
  }
  const hasPageNumber = typeof pageNumber === 'boolean' ? pageNumber : pageNumber.enabled;
  const numberAtTop = typeof pageNumber === 'object' && pageNumber.position?.startsWith('top');
  const topReserve = hasPageNumber && numberAtTop ? 14 : 0;
  const bottomReserve = hasPageNumber && !numberAtTop ? 14 : 0;
  const contentWidth = pageWidth - paper.left - paper.right;
  const ratio = contentWidth / width;
  const headerHeight = (headerPx || 0) * ratio;
  const footerHeight = (footerPx || 0) * ratio;
  const bodyTop = paper.top + headerHeight + (headerPx !== undefined ? 6 : 0) + topReserve;
  const footerY = pageHeight - paper.bottom - bottomReserve - footerHeight;
  const capacity = (footerY - (footerPx !== undefined ? 6 : 0) - bodyTop) / ratio;
  if (capacity <= 0) throw new Error('页眉页脚过高，没有剩余正文空间');
  return {
    pageWidth,
    pageHeight,
    contentWidth,
    ratio,
    headerHeight,
    footerHeight,
    bodyTop,
    left: paper.left,
    headerY: paper.top,
    footerY,
    pageNumberY: numberAtTop ? bodyTop - 5 : pageHeight - Math.max(6, paper.bottom / 2),
    capacity,
  };
}
