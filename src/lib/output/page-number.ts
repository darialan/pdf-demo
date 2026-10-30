export function formatPageNumber(pageIndex: number, totalPages: number, format?: 'slash' | 'chinese' | 'hyphen') {
  const current = pageIndex + 1;
  switch (format) {
    case 'chinese':
      return `第 ${current} 页 / 共 ${totalPages} 页`;
    case 'hyphen':
      return `- ${current} -`;
    case 'slash':
    default:
      return `${current} / ${totalPages}`;
  }
}
