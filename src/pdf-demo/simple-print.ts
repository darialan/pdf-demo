export const a = () => null;

// import html2canvas from 'html2canvas';

// import jsPDF, { RGBAData } from 'jspdf';

// // 将元素转化为canvas元素
// // 通过 放大 提高清晰度
// // width为内容宽度
// async function toCanvas(element: HTMLElement) {
//   if (!element) return { width: 0, height: 0 };

//   // canvas元素
//   const canvas = await html2canvas(element, {
//     scale: window.devicePixelRatio * 2, // 增加清晰度
//     useCORS: true // 允许跨域
//   });

//   // 获取canvas转化后的宽高
//   const { width: canvasWidth, height: canvasHeight } = canvas;

//   // 转化成图片Data
//   const canvasData = canvas.toDataURL('image/jpeg', 1.0);

//   return { width: canvasWidth, height: canvasHeight, data: canvasData };
// }

// /**
//  * 生成pdf(A4多页pdf截断问题， 包括页眉、页脚 和 上下左右留空的护理)
//  */
// export async function generatePDF({
//   /** pdf内容的dom元素 */
//   element,

//   /** pdf文件名 */
//   filename
// }) {
//   if (!(element instanceof HTMLElement)) {
//     return;
//   }

//   const pdf = new jsPDF();

//   // 一页的高度， 转换宽度为一页元素的宽度
//   const {
//     width: imageWidth,
//     height: imageHeight,
//     data
//   } = await toCanvas(element);

//   // 添加图片
//   function addImage(
//     _x: number,
//     _y: number,
//     pdfInstance: jsPDF,
//     base_data:
//       | string
//       | HTMLImageElement
//       | HTMLCanvasElement
//       | Uint8Array
//       | RGBAData,
//     _width: number,
//     _height: number
//   ) {
//     pdfInstance.addImage(base_data, 'JPEG', _x, _y, _width, _height);
//   }

//   addImage(0, 0, pdf, data!, imageWidth, imageHeight);

//   return pdf.save(filename);
// }
