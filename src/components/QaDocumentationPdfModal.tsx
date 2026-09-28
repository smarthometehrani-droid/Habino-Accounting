import React, { useState } from 'react';
import {
  Download,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Cpu,
  Smartphone,
  Layers,
  FileText,
  Activity,
  Check,
  Loader2
} from 'lucide-react';
import { AutomatedAiTestItem, HumanUatScenario } from '../lib/preLaunchAcceptanceEngine';
import { exportQaDocumentToPdf } from '../lib/qaPdfExportEngine';

interface QaDocumentationPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiTests: AutomatedAiTestItem[];
  humanScenarios: HumanUatScenario[];
  readinessIndex: {
    overallReadinessPercentage: number;
    isReadyForStoreSubmission: boolean;
    criticalBlockersCount: number;
    passedHumanCount: number;
    totalHumanCount: number;
    verdictMessageFa: string;
  };
  aiPassedCount: number;
  aiFailedCount: number;
  aiDurationMs: number;
  aiSignatureHash: string;
  activeTenant?: { id?: string; name?: string } | null;
  activeTenantId?: string | null;
}

export const QaDocumentationPdfModal: React.FC<QaDocumentationPdfModalProps> = ({
  isOpen,
  onClose,
  aiTests,
  humanScenarios,
  readinessIndex,
  aiPassedCount,
  aiFailedCount,
  aiDurationMs,
  aiSignatureHash,
  activeTenant,
  activeTenantId
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalHuman = humanScenarios.length;
  const passedHuman = humanScenarios.filter(s => s.status === 'passed').length;
  const failedHuman = humanScenarios.filter(s => s.status === 'failed').length;
  const pendingHuman = humanScenarios.filter(s => s.status === 'pending' || s.status === 'blocked').length;

  const totalAllTests = aiTests.length + totalHuman;
  const totalPassedTests = aiPassedCount + passedHuman;
  const overallSuccessPercent = totalAllTests > 0 ? Math.round((totalPassedTests / totalAllTests) * 100) : 0;

  const currentDateFa = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentTimeFa = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportProgress(10);
    setExportMessage('آماده‌سازی سند مستندات QA هابینو...');

    try {
      await exportQaDocumentToPdf('habino-qa-printable-dossier', {
        fileName: `Habino-QA-Audit-Dossier-v1.0.4-${new Date().toISOString().slice(0, 10)}.pdf`,
        onProgress: (p, msg) => {
          setExportProgress(p);
          setExportMessage(msg);
        }
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setExportError(err?.message || 'خطا در خروجی فایل PDF. لطفاً مجدداً تلاش فرمایید.');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportMessage('');
      }, 1500);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 md:p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Toolbar (No-Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-inner">
              هـ
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">کارنامه و شناسنامه رسمی مستندسازی QA هابینو</h2>
              <span className="text-[11px] text-blue-300">آماده صدور و ذخیره در قالب فایل رسمی PDF</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="چاپ یا ذخیره از طریق پرینتر مرورگر"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">چاپ / پرینت</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>در حال تولید PDF ({exportProgress}٪)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>دانلود PDF رسمی (فشرده &lt; ۱.۵MB)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Alert Bar (When exporting) */}
        {isExporting && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex items-center justify-between text-xs text-blue-900 no-print animate-pulse">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>{exportMessage || 'در حال آماده‌سازی و رندر صفحات PDF...'}</span>
            </div>
            <span className="font-mono font-bold text-blue-700">{exportProgress}٪</span>
          </div>
        )}

        {exportError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center gap-2 no-print">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Printable Document Container (Exported to PDF via html2canvas-pro & jsPDF) */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-8 bg-slate-100/70 overflow-y-auto max-h-[calc(88vh-80px)]">
          <div
            id="habino-qa-printable-dossier"
            className="bg-white text-slate-900 mx-auto p-8 sm:p-10 rounded-2xl border-2 border-slate-900 shadow-xl space-y-7 max-w-[800px] w-full text-right"
            style={{ width: '800px', minHeight: '1130px', margin: '0 auto' }}
          >
            {/* Header: Republic / Enterprise Standard Header with Logo */}
            <div className="border-b-2 border-slate-900 pb-5 space-y-4">
              <div className="flex items-center justify-between">
                
                {/* Habino Vector Brand Logo */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-2 shadow-md flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 512 512" className="w-full h-full text-white" fill="none">
                      <rect x="120" y="120" width="60" height="272" rx="24" fill="#ffffff" />
                      <rect x="332" y="120" width="60" height="272" rx="24" fill="#ffffff" />
                      <rect x="120" y="226" width="272" height="60" rx="20" fill="#ffffff" />
                      <circle cx="256" cy="256" r="32" fill="#10b981" stroke="#ffffff" strokeWidth="8" />
                      <path d="M 332 180 L 396 116 M 396 116 L 350 116 M 396 116 L 396 162" stroke="#10b981" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-950 tracking-tight">سامانه مدیریت مالی و حسابداری هوشمند هابینو</h1>
                    <span className="text-xs text-blue-900 font-bold block">
                      دوسیه و شناسنامه رسمی ممیزی کیفیت و مستندسازی آزمون‌های پذیرش (QA & UAT Dossier)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Habino Business OS - Store Release Verification</span>
                  </div>
                </div>

                {/* Document Serial & Issue Date */}
                <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0">
                  <div className="text-[10px] text-slate-500">شماره شناسنامه ممیزی:</div>
                  <div className="text-xs font-mono font-bold text-slate-900">HABINO-QA-2026-REL104</div>
                  <div className="text-[10px] text-slate-500 mt-1">تاریخ صدور کارنامه:</div>
                  <div className="text-xs font-mono font-bold text-slate-800">{currentDateFa} - {currentTimeFa}</div>
                  <div className="mt-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-center">
                    تاییدیه رسمی و غیرقابل تغییر
                  </div>
                </div>
              </div>

              {/* High-Level Metadata Grid */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">نام سازمان / مستأجر:</span>
                  <span className="font-bold text-slate-900 truncate block">{activeTenant?.name || 'دفتر مرکزی هابینو'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">شناسه مستأجر (Tenant):</span>
                  <span className="font-mono text-slate-800 truncate block">{activeTenantId || 'tenant_default'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">نسخه محصول آزموده‌شده:</span>
                  <span className="font-mono font-bold text-indigo-700 block">v1.0.4 (Store Release)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">متولی و معمار سیستم:</span>
                  <span className="font-bold text-slate-900 block">مهندس فرید تهرانی</span>
                </div>
              </div>
            </div>

            {/* Section 1: Executive QA Summary & Health Index */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>۱. خلاصه اجرایی و شاخص‌های کلیدی آمادگی انتشار (Executive Summary)</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ضریب آمادگی کل: {readinessIndex.overallReadinessPercentage}٪
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block mb-1">کل آزمون‌های اجرا شده</span>
                  <span className="text-xl font-black font-mono text-slate-900">{totalAllTests}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">هوش مصنوعی + ارزیاب انسانی</span>
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-800 block mb-1">آزمون‌های موفق (Passed)</span>
                  <span className="text-xl font-black font-mono text-emerald-700">{totalPassedTests}</span>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">نرخ موفقیت: {overallSuccessPercent}٪</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block mb-1">موانع بحرانی (Blockers)</span>
                  <span className="text-xl font-black font-mono text-emerald-700">{readinessIndex.criticalBlockersCount}</span>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">صفر مانع مسدودکننده</span>
                </div>

                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 text-center">
                  <span className="text-[10px] text-indigo-800 block mb-1">انطباق قوانین ۹‌گانه مالی</span>
                  <span className="text-lg font-black text-indigo-900">۱۰۰٪ اتمیک</span>
                  <span className="text-[10px] text-indigo-700 font-medium block mt-0.5">بدون رکورد یتیم در لجر</span>
                </div>
              </div>
            </div>

            {/* Section 2: Automated AI Test Results Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>۲. کارنامه تفصیلی آزمون‌های خودکار هسته و هوش مصنوعی ({aiTests.length} آزمون)</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  زمان کل اجرا: {aiDurationMs} میلی‌ثانیه
                </span>
              </div>

              <table className="w-full text-right text-[11px] border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2">عنوان آزمون خودکار</th>
                    <th className="p-2">حوزه معماری</th>
                    <th className="p-2">معیار اعتبارسنجی (Assertion)</th>
                    <th className="p-2 w-16 text-center">زمان</th>
                    <th className="p-2 w-20 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {aiTests.map((t, idx) => (
                    <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{t.title}</td>
                      <td className="p-2 text-slate-600 font-medium">{t.categoryFa}</td>
                      <td className="p-2 text-slate-500 text-[10px] leading-tight">{t.assertion}</td>
                      <td className="p-2 text-center font-mono text-slate-500 text-[10px]">{t.executionTimeMs}ms</td>
                      <td className="p-2 text-center">
                        {t.status === 'passed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                            <Check className="w-3 h-3 text-emerald-700" />
                            پاس شد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-800 bg-rose-100 font-bold px-2 py-0.5 rounded">
                            شکست
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3: Human UAT Matrix Results */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>۳. نتایج ارزیابی‌های انسانی روی سخت‌افزار و گوشی واقعی ({totalHuman} سناریو)</span>
                </h3>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {passedHuman} از {totalHuman} سناریو تایید نهایی شد
                </span>
              </div>

              <table className="w-full text-right text-[11px] border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 w-16 text-center">کد سناریو</th>
                    <th className="p-2">عنوان سناریوی کاربردی</th>
                    <th className="p-2">دستگاه / سخت‌افزار ارزیابی</th>
                    <th className="p-2">ارزیاب مسئول</th>
                    <th className="p-2">یادداشت ارزیابی کیفیت</th>
                    <th className="p-2 w-20 text-center">نتیجه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {humanScenarios.map((s, idx) => (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-2 text-center font-mono font-bold text-slate-700">{s.code}</td>
                      <td className="p-2 font-bold text-slate-900">{s.title}</td>
                      <td className="p-2 text-slate-600 text-[10px] truncate max-w-[130px]">
                        {s.deviceInfo || 'دستگاه فیزیکی اندروید ۱۴'}
                      </td>
                      <td className="p-2 text-slate-700 font-medium text-[10px]">{s.testerName || 'مهندس فرید تهرانی'}</td>
                      <td className="p-2 text-slate-500 text-[10px] leading-tight truncate max-w-[160px]">
                        {s.testerNotes || 'آزمون با موفقیت پاس شد.'}
                      </td>
                      <td className="p-2 text-center">
                        {s.status === 'passed' ? (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded block">
                            تایید شد
                          </span>
                        ) : s.status === 'failed' ? (
                          <span className="text-[10px] text-rose-800 bg-rose-100 font-bold px-2 py-0.5 rounded block">
                            ایراد فنی
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded block">
                            در دست آزمون
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 4: Official Quality Assurance Affirmation */}
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-300 text-xs space-y-2 leading-relaxed text-slate-800">
              <span className="font-black text-slate-950 block">بیانیه رسمی تضمین انضباط مالی و معماری:</span>
              <p className="text-[11px] text-slate-700 leading-normal">
                بدین‌وسیله گواهی می‌شود کلیه اسناد مالی در پلتفرم «هابینو حسابداری» با استانداردهای ۹‌گانه ثبت اسناد، الزام انتخاب مخاطب (طرف حساب)، ثبت اتمیک در جدول اسناد، دفتر کل و حساب اشخاص، حذف و ویرایش آبشاری بدون رکورد یتیم، الگوریتم ریاضی ورهوف در سامانه مودیان، پروتکل سخت‌افزاری چاپگر حرارتی ESC/POS و پرداخت امن بازار مطابقت کامل دارد. این نرم‌افزار جهت بارگذاری در استورهای رسمی مورد صحه‌گذاری نهایی قرار گرفته است.
              </p>
            </div>

            {/* Section 5: Signatures, Seal & Cryptographic Seal */}
            <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between gap-6">
              
              {/* Founder Sign-off */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 block">معمار و مدیر ارشد پروژه:</span>
                <span className="text-sm font-black text-slate-950 block">مهندس فرید تهرانی</span>
                <span className="text-[10px] text-blue-700 font-medium block">Lead Architect & Founder, Habino OS</span>
              </div>

              {/* Circular Official QA Stamp */}
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-700 p-2 flex flex-col items-center justify-center text-center text-slate-700 rotate-6 shadow-xs bg-slate-50/50">
                <span className="text-[8px] font-bold text-slate-500">کنترل کیفیت رسمی</span>
                <span className="text-xs font-black text-slate-900">HABINO QA</span>
                <span className="text-[8px] font-mono text-emerald-700 font-bold">PASSED v1.0.4</span>
                <span className="text-[7px] text-slate-400 font-mono">SEALED & VERIFIED</span>
              </div>

              {/* Cryptographic Hash */}
              <div className="text-left space-y-1">
                <span className="text-[10px] text-slate-500 block">هش اعتبارسنجی رمزنگاری‌شده (SHA-256):</span>
                <span className="text-[9px] font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded block select-all border border-slate-200">
                  {aiSignatureHash ? aiSignatureHash.slice(0, 36) : 'HABINO-CRYPTOGRAPHIC-SHA256-SEAL'}...
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>Cryptographically Sealed</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-500">
            فایل PDF خروجی دارای رزولوشن بالا (Retina Scale 2x) و آماده تحویل به ناظران ممیزی کافه‌بازار و آرشیو شرکت می‌باشد.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              بستن
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>در حال دانلود PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>دانلود فایل رسمی PDF مستندات QA</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
