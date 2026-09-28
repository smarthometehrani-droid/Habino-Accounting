import { Milestone } from './roadmapEngine';

/**
 * Generates an engineered, production-ready prompt for a coding agent
 * adhering strictly to Habino OS architectural mandates, Persian UX,
 * TypeScript typing, multi-tenancy, and accounting principles.
 */
export function generateEngineeringCodePrompt(milestone: Milestone, options?: {
  taskContext?: string;
  filesToTouch?: string[];
  testRequirements?: string[];
}): string {
  const techStackList = milestone.techStack.join(', ');
  const adrNotice = milestone.adrRef ? `\n- **سند معماری مرتبط (ADR):** ${milestone.adrRef}` : '';

  return `### دستورکار مهندسی و اجرای فنی (Engineering Implementation Prompt)

**عنوان مایلستون:** ${milestone.title}
**شناسه وظیفه:** \`${milestone.id}\`
**فاز نقشه راه:** ${milestone.phaseTitle} (روز ${milestone.day} | چارک: ${milestone.targetQuarter})
**اولویت اجرایی:** ${milestone.priority} | **پیچیدگی فنی:** ${milestone.complexity} | **سطح ریسک:** ${milestone.riskLevel}
**نقش مسئول:** ${milestone.assigneeRole}
**پشته فناوری:** ${techStackList}${adrNotice}

---

### ۱. شرح نیازمندی و منطق فنی (Why & What)
${milestone.description}

**دلیل و منطق فنی:**
${milestone.technicalRationale}

---

### ۲. شاخص پذیرش فنی (Acceptance Criteria & KPI)
\`${milestone.kpiMetric}\`

---

### ۳. الزامات معماری و استانداردهای اجباری کد (Strict Engineering Constraints)
۱. **ایزولاسیون چندمستأجری (Multi-Tenancy & RLS):** کلیه کوئری‌ها، ایندکس‌ها و متادیتاها باید متصل به \`tenant_id\` باشند.
۲. **مدل‌سازی دقیق تایپ‌اسکریپت:** استفاده از اینترفیس‌ها، عدم استفاده از \`any\` یا کست‌های پرخطر، تفکیک تایپ‌ها در فایل‌های ماژولار.
۳. **استاندارد فرم‌ها و JSONB:** ساختارهای درختی با Composite Pattern و ذخیره‌سازی انعطاف‌پذیر با نگاشت مستقیم به UI.
۴. **اصول ۹‌گانه دفتر کل و لجر دوبل:**
   - هیچ سندی بدون طرف‌حساب (مخاطب) معتبر ثبت نشود.
   - ثبت همزمان در دفتر روزنامه و دفتر کل (ACID Transaction).
   - حذف یا ویرایش زنجیره‌ای با حفظ شناسه UUID و جلوگیری از تراکنش‌های یتیم (Orphan Records).
   - حفظ اصل تراز ابدی: \`(Total Incomes - Total Expenses) == Current Balance\`.
۵. **رعایت تجربه کاربری اصناف ایرانی (Persian RTL & CafeBazaar):**
   - سازگاری کامل با تقویم جلالی/شمسی، پشتیبانی از ارز ریال و تومان.
   - بهینه‌سازی برای رندرینگ موبایلی، آفلاین-فرست (PWA/TWA) و پرینترهای حرارتی ESC/POS در صورت لزوم.

---

### ۴. مراحل گام‌به‌گام پیاده‌سازی (Step-by-Step Execution Plan)
${options?.taskContext ? `**زمینه تکمیلی:** ${options.taskContext}\n` : ''}
- **گام ۱:** بازبینی تایپ‌ها و امضاهای توابع در مسیرهای مرتبط.
- **گام ۲:** پیاده‌سازی متدها یا کامپوننت‌های لازم منطبق بر الگوهای Strategy / Composite.
- **گام ۳:** ایجاد هندلرهای رویداد، پایداری در کش محلی / سرور، و اتصال به ارکستراتور سایرافلو.
- **گام ۴:** اجرای تست صحت‌سنجی (Lint & Build) و بررسی عدم بروز رگرسیون در سایر ماژول‌ها.

${options?.filesToTouch && options.filesToTouch.length > 0 ? `\n**فایل‌های هدف:**\n${options.filesToTouch.map(f => `- \`${f}\``).join('\n')}\n` : ''}
لطفاً این وظیفه را به صورت تمیز، بدون ایجاد کدهای تکراری، و با در نظر گرفتن سناریوهای خطا (Graceful Failure) پیاده‌سازی و نهایی کن.`;
}
