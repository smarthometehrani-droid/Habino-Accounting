import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface QaPdfExportOptions {
  fileName?: string;
  title?: string;
  compress?: boolean;
  quality?: number;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * تولید و دانلود فایل PDF رسمی چندصفحه‌ای با کیفیت رتینا (2x) و بهینه‌سازی فشرده‌سازی (زیر ۱.۵ مگابایت)
 */
export async function exportQaDocumentToPdf(
  elementId: string,
  options: QaPdfExportOptions = {}
): Promise<void> {
  const fileName = options.fileName || `Habino-QA-Audit-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  const onProgress = options.onProgress || (() => {});
  const shouldCompress = options.compress !== false;
  // کیفیت بهینه ۰.۸۴ برای کاهش حجم فایل به زیر ۱.۵ مگابایت با حفظ تیزی فونت‌های فارسی
  const imageQuality = options.quality !== undefined ? options.quality : (shouldCompress ? 0.84 : 1.0);
  const imageFormat = shouldCompress ? 'JPEG' : 'PNG';
  const mimeType = shouldCompress ? 'image/jpeg' : 'image/png';

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`المان مستندات با شناسه ${elementId} در صفحه یافت نشد.`);
  }

  onProgress(15, 'در حال محاسبه ساختار گرافیکی و چینش فونت‌ها...');

  // انتظار برای لود شدن کلیه تصاویر در صورت وجود
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  onProgress(35, 'در حال عکس‌برداری کیفیت بالا (Retina Scale)...');

  const fullWidth = element.scrollWidth || element.offsetWidth || 820;
  const fullHeight = element.scrollHeight || element.offsetHeight || 1200;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: fullWidth,
    height: fullHeight,
    windowWidth: fullWidth + 100,
    windowHeight: fullHeight + 200,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      // مخفی‌سازی دکمه‌های کنترلی
      const noPrints = clonedDoc.querySelectorAll('.no-print');
      noPrints.forEach((el: any) => {
        el.style.display = 'none';
      });

      const clonedEl = clonedDoc.getElementById(elementId);
      if (clonedEl) {
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.width = `${fullWidth}px`;
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.overflow = 'visible';
      }
    }
  });

  onProgress(65, 'در حال صفحه‌بندی هوشمند و بهینه‌سازی لایه‌ها (فشرده‌سازی زیر ۱.۵ مگابایت)...');

  // ساخت سند PDF با استاندارد A4 عمودی و فعال‌سازی فشرده‌سازی توکار jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: shouldCompress
  });
  const pdfWidth = 210;
  const pdfHeight = 297;
  const marginX = 8;
  const marginY = 8;
  const printableWidth = pdfWidth - (marginX * 2);
  const printableHeight = pdfHeight - (marginY * 2);

  const totalRenderHeight = (canvas.height * printableWidth) / canvas.width;

  // چنانچه محتوا تک‌صفحه‌ای باشد یا با اندکی تطبیق جا شود
  if (totalRenderHeight <= printableHeight * 1.08) {
    let finalWidth = printableWidth;
    let finalHeight = totalRenderHeight;
    let offsetX = marginX;

    if (totalRenderHeight > printableHeight) {
      const fitScale = printableHeight / totalRenderHeight;
      finalWidth = printableWidth * fitScale;
      finalHeight = printableHeight;
      offsetX = marginX + (printableWidth - finalWidth) / 2;
    }

    const imgData = canvas.toDataURL(mimeType, imageQuality);
    pdf.addImage(imgData, imageFormat, offsetX, marginY, finalWidth, finalHeight, undefined, shouldCompress ? 'FAST' : 'NONE');

    // فوتر رسمی صفحه
    pdf.setFontSize(8);
    pdf.setTextColor(140, 150, 165);
    pdf.text(
      'سامانه مدیریت مالی و حسابداری هوشمند هابینو - سند رسمی ممیزی کیفیت و صحه‌گذاری پیش از انتشار (QA)',
      pdfWidth / 2,
      pdfHeight - 4,
      { align: 'center' }
    );
  } else {
    // محتوای چندصفحه‌ای: برش تمیز و اضافه کردن صفحات
    const pxPerMm = canvas.width / printableWidth;
    const canvasPageHeight = Math.floor(printableHeight * pxPerMm);
    const totalPages = Math.ceil(canvas.height / canvasPageHeight);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      onProgress(
        70 + Math.round(((pageIdx + 1) / totalPages) * 25),
        `در حال فشرده‌سازی و خروجی صفحه ${pageIdx + 1} از ${totalPages}...`
      );

      if (pageIdx > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const sourceY = pageIdx * canvasPageHeight;
      const sliceHeight = Math.min(canvasPageHeight, canvas.height - sourceY);

      // ایجاد بوم اختصاصی برای این صفحه
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const pageImgData = pageCanvas.toDataURL(mimeType, imageQuality);
        const renderSliceHeight = sliceHeight / pxPerMm;

        pdf.addImage(
          pageImgData,
          imageFormat,
          marginX,
          marginY,
          printableWidth,
          renderSliceHeight,
          undefined,
          shouldCompress ? 'FAST' : 'NONE'
        );

        // درج شماره صفحه و واترمارک محرمانه
        pdf.setFontSize(7.5);
        pdf.setTextColor(140, 150, 165);
        pdf.text(
          `هابینو حسابداری | کارنامه رسمی ممیزی QA و صحه‌گذاری پیش از انتشار | صفحه ${pageIdx + 1} از ${totalPages}`,
          pdfWidth / 2,
          pdfHeight - 4,
          { align: 'center' }
        );
      }
    }
  }

  const pdfBlob = pdf.output('blob');
  const sizeMb = (pdfBlob.size / (1024 * 1024)).toFixed(2);
  onProgress(100, `فایل PDF با موفقیت آماده شد (${sizeMb} MB - بهینه‌سازی استاندارد).`);
  pdf.save(fileName);
}
