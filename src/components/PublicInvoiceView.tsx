import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Download, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  FileText, 
  AlertCircle, 
  PenTool, 
  Building2, 
  Phone, 
  MapPin, 
  CreditCard,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Invoice, InvoiceSignature } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { PhysicalSignatureCanvas, SignatureDataPayload } from './PhysicalSignatureCanvas';
import { buildSharingLinks } from '../lib/signatureService';

interface PublicInvoiceViewProps {
  token: string;
  onBackToApp?: () => void;
}

export const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({
  token,
  onBackToApp
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<any>({
    name: 'سامانه حسابداری هابینو',
    phone: '',
    address: '',
    currency: 'IRT',
    logoUrl: ''
  });
  const [signature, setSignature] = useState<InvoiceSignature | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Client signature modal state
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState<boolean>(false);
  const [signatureSuccessToast, setSignatureSuccessToast] = useState<string | null>(null);

  // Sharing feedback
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPublicInvoice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invoices/public/${token}`);
        if (!res.ok) {
          throw new Error('فاکتور یا پیش‌فاکتور مورد نظر یافت نشد یا ممکن است منقضی شده باشد.');
        }
        const data = await res.json();
        if (isMounted) {
          setInvoice(data.invoice);
          if (data.settings && Object.keys(data.settings).length > 0) {
            setSettings(data.settings);
          }
          if (data.signature) {
            setSignature(data.signature);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'خطا در دریافت اطلاعات پیش‌فاکتور.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (token) {
      fetchPublicInvoice();
    }
    return () => { isMounted = false; };
  }, [token]);

  const handleClientSign = async (payload: SignatureDataPayload) => {
    setIsSubmittingSignature(true);
    try {
      const res = await fetch(`/api/invoices/public/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: payload.dataUrl,
          signerName: payload.signerName,
          signerRole: payload.signerRole,
          signerNationalId: payload.signerNationalId
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'خطا در ذخیره‌سازی امضای مشتری.');
      }

      const result = await res.json();
      setSignature(result.signatureRecord);
      setInvoice((prev) => prev ? {
        ...prev,
        isSigned: true,
        signatureUrl: result.signatureUrl,
        signedAt: result.signatureRecord?.signedAt,
        status: 'paid'
      } : prev);

      // همگام‌سازی فوری با حافظه محلی و برودکست رویداد امضا برای پنل اصلی نرم‌افزار
      try {
        const sigs = JSON.parse(localStorage.getItem('habino_invoice_signatures') || '{}');
        const sigRec = result.signatureRecord || {
          signatureUrl: result.signatureUrl,
          isSigned: true,
          signedAt: new Date().toISOString()
        };
        if (invoice?.id) sigs[invoice.id] = sigRec;
        if (token) sigs[token] = sigRec;
        localStorage.setItem('habino_invoice_signatures', JSON.stringify(sigs));

        const rawInvs = localStorage.getItem('habino_invoices');
        if (rawInvs) {
          const invList = JSON.parse(rawInvs);
          const updated = invList.map((iv: any) => {
            if (iv.id === invoice?.id || (token && iv.shareToken === token)) {
              return {
                ...iv,
                signatureUrl: result.signatureUrl,
                isSigned: true,
                signedAt: sigRec.signedAt || new Date().toISOString()
              };
            }
            return iv;
          });
          localStorage.setItem('habino_invoices', JSON.stringify(updated));
        }

        window.dispatchEvent(new CustomEvent('habino_invoice_signed', {
          detail: {
            invoiceId: invoice?.id,
            shareToken: token,
            signatureUrl: result.signatureUrl,
            signedAt: sigRec.signedAt
          }
        }));
      } catch (_) {}

      setShowSignModal(false);
      setSignatureSuccessToast('امضا و تاییدیه رسمی پیش‌فاکتور با موفقیت در پایگاه داده ثبت گردید.');
      setTimeout(() => setSignatureSuccessToast(null), 6000);
    } catch (err: any) {
      alert(err.message || 'خطا در ارسال امضا.');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-800">در حال فراخوانی سند رسمی از سامانه...</h3>
          <p className="text-xs text-slate-500">لطفاً چند لحظه شکیبا باشید</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-md w-full space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">سند یافت نشد</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'پیوند استعلام فاکتور نامعتبر است یا توسط صادرکننده باطل گردیده است.'}
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              بازگشت به برنامه اصلی
            </button>
          )}
        </div>
      </div>
    );
  }

  const sharingLinks = buildSharingLinks({
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    grandTotal: invoice.grandTotal,
    currencyLabel: settings.currency === 'USD' ? 'دلار' : settings.currency === 'IRR' ? 'ریال' : 'تومان',
    shareToken: token,
    baseUrl: typeof window !== 'undefined' ? window.location.origin : ''
  });

  const isProforma = invoice.type?.includes('proforma') || invoice.type === 'service';
  const hasSignature = Boolean(invoice.signatureUrl || signature?.signature_url);
  const activeSignatureUrl = invoice.signatureUrl || signature?.signature_url;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 font-sans text-slate-800" dir="rtl">
      {/* Fixed Actions Header (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-5 no-print">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="بازگشت به پنل هابینو"
              >
                <ArrowRight className="w-4 h-4" />
                <span>ورود به سامانه</span>
              </button>
            )}
            <div>
              <span className="text-xs font-bold text-slate-400">سامانه استعلام عمومی اسناد</span>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {isProforma ? 'پیش‌فاکتور رسمی' : 'صورت‌حساب فروش رسمی'} #{invoice.invoiceNumber}
                {hasSignature ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    تایید و امضاشده
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    در انتظار امضا
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Share Buttons */}
            <a
              href={sharingLinks.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              title="ارسال در واتساپ"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <a
              href={sharingLinks.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"
              title="ارسال در تلگرام"
            >
              <Send className="w-4 h-4" />
            </a>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی پیوند'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / دانلود PDF</span>
            </button>

            {/* Sign Proforma Button if not yet signed */}
            {!hasSignature && (
              <button
                type="button"
                onClick={() => setShowSignModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer animate-pulse"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>تایید و امضای آنلاین</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {signatureSuccessToast && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{signatureSuccessToast}</span>
            </div>
            <button onClick={() => setSignatureSuccessToast(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Official Invoice Paper Container */}
      <div 
        id="printable-public-invoice"
        className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-6 sm:p-10 space-y-8"
      >
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b-2 border-slate-900 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl border border-slate-200" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black text-lg">
                  هـ
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {settings.name || 'شرکت ارائه‌دهنده خدمات'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  ارائه‌دهنده خدمات تخصصی، پیمانکاری و فروش کالا
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              {settings.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {toPersianDigits(settings.phone)}
                </span>
              )}
              {settings.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {settings.address}
                </span>
              )}
            </div>
          </div>

          {/* Invoice Document Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5 min-w-[200px] text-right">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500">شماره سند:</span>
              <span className="font-mono text-sm font-black text-blue-900">#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">تاریخ صدور:</span>
              <span className="font-semibold text-slate-800">{toPersianDigits(invoice.date)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">مهلت تسویه:</span>
                <span className="font-semibold text-slate-800">{toPersianDigits(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">نوع سند:</span>
              <span className="font-bold text-slate-900">
                {isProforma ? 'پیش‌فاکتور فروش' : 'فاکتور قطعی فروش'}
              </span>
            </div>
          </div>
        </div>

        {/* Client (Counterparty) Details */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2">
          <span className="text-xs font-black text-slate-400 tracking-wider uppercase block">
            مشخصات خریدار / کارفرما
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">نام طرف‌حساب:</span>
              <span className="font-bold text-slate-900 text-sm">{invoice.clientName || 'نامشخص'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">شماره تماس / پیگیری:</span>
              <span className="font-semibold text-slate-800">{invoice.client_id ? 'مشتری احرازشده' : '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">وضعیت پرداخت:</span>
              <span className="font-bold text-emerald-700">
                {invoice.remainingAmount === 0 ? 'تسویه کامل' : 'در انتظار تسویه'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-3 rounded-r-xl w-12 text-center">ردیف</th>
                <th className="p-3">شرح کالا یا خدمات</th>
                <th className="p-3 text-center w-20">تعداد / مقدار</th>
                <th className="p-3 text-left w-28">مبلغ واحد</th>
                <th className="p-3 text-left w-24">تخفیف</th>
                <th className="p-3 text-left w-24">مالیات</th>
                <th className="p-3 rounded-l-xl text-left w-32">مبلغ کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400">
                      {toPersianDigits(index + 1)}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {item.description}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {toPersianDigits(item.quantity)}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-700">
                      {toPersianDigits(item.unitPrice.toLocaleString('fa-IR'))}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-500">
                      {item.discount > 0 ? toPersianDigits(item.discount.toLocaleString('fa-IR')) : '۰'}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-500">
                      {item.taxRate > 0 ? `${toPersianDigits(item.taxRate)}%` : '۰'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-900">
                      {toPersianDigits(item.total.toLocaleString('fa-IR'))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">
                    هیچ ردیف اقلامی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Calculation Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4">
          {/* Notes and Terms */}
          <div className="space-y-3 flex-1 text-xs">
            {invoice.notes && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">یادداشت‌های فاکتور:</span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1">شرایط تسویه و ضمانت:</span>
                <p className="text-amber-900 leading-relaxed whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
          </div>

          {/* Totals Table */}
          <div className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>جمع جزء (قبل از کسورات):</span>
              <span className="font-mono font-semibold">{formatCurrency(invoice.subtotal, settings.currency)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between items-center text-rose-600 font-medium">
                <span>مجموع تخفیف‌ها:</span>
                <span className="font-mono">-{formatCurrency(invoice.totalDiscount, settings.currency)}</span>
              </div>
            )}
            {invoice.totalTax > 0 && (
              <div className="flex justify-between items-center text-slate-600">
                <span>مالیات و عوارض قانونی:</span>
                <span className="font-mono">+{formatCurrency(invoice.totalTax, settings.currency)}</span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-black text-sm text-blue-900">
              <span>مبلغ نهایی قابل پرداخت:</span>
              <span className="font-mono text-base">{formatCurrency(invoice.grandTotal, settings.currency)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1">
                <span>مبلغ پرداخت شده:</span>
                <span className="font-mono">{formatCurrency(invoice.amountPaid, settings.currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Official Stamp & Physical Signature Verification Section */}
        <div className="pt-6 border-t-2 border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          {/* Client Signature Area */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between min-h-[160px]">
            <div>
              <span className="font-bold text-slate-700 block mb-1">
                امضا و تاییدیه تحویل‌گیرنده / خریدار
              </span>
              <span className="text-[10px] text-slate-400">
                {signature?.signer_role === 'client' ? `تایید شده توسط: ${signature.signer_name || invoice.clientName}` : 'محل امضای فیزیکی یا دیجیتال'}
              </span>
            </div>

            <div className="my-2 flex items-center justify-center">
              {signature?.signer_role === 'client' && signature.signature_url ? (
                <div className="relative inline-block">
                  <img 
                    src={signature.signature_url} 
                    alt="امضای خریدار" 
                    className="max-h-24 max-w-full object-contain mx-auto filter drop-shadow-xs" 
                  />
                  <div className="text-[9px] text-emerald-700 font-mono mt-1 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>تایید الکترونیکی در {toPersianDigits(new Date(signature.signed_at).toLocaleDateString('fa-IR'))}</span>
                  </div>
                </div>
              ) : (
                <div className="border-b border-dashed border-slate-300 w-48 mx-auto py-6 text-slate-400 text-[11px]">
                  {!hasSignature ? (
                    <button
                      type="button"
                      onClick={() => setShowSignModal(true)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold border border-blue-200 transition-colors cursor-pointer no-print"
                    >
                      ثبت امضا روی این سند
                    </button>
                  ) : (
                    <span>امضای مشتری</span>
                  )}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400">
              نام و امضای خریدار / نماینده قانونی
            </div>
          </div>

          {/* Vendor Stamp & Signature Area */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between min-h-[160px]">
            <div>
              <span className="font-bold text-slate-800 block mb-1">
                مهر رسمی و امضای صادرکننده
              </span>
              <span className="text-[10px] text-slate-400">
                {settings.name || 'شرکت هابینو'}
              </span>
            </div>

            <div className="my-2 flex items-center justify-center">
              {activeSignatureUrl && signature?.signer_role !== 'client' ? (
                <div className="relative inline-block">
                  <img 
                    src={activeSignatureUrl} 
                    alt="امضای صادرکننده" 
                    className="max-h-24 max-w-full object-contain mx-auto filter drop-shadow-xs" 
                  />
                  <div className="text-[9px] text-blue-700 font-mono mt-1 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>امضای معتبر رسمی - تایید اصالت</span>
                  </div>
                </div>
              ) : (
                <div className="inline-block px-5 py-3 border-2 border-dashed border-slate-300 rounded-2xl text-[11px] text-slate-400 font-bold">
                  محل درج مهر و امضای مجاز صادرکننده
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400">
              شناسه یکتای سند: {token.substring(0, 16)}...
            </div>
          </div>
        </div>

        {/* Footer Cryptographic Seal */}
        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>گواهی اصالت الکترونیکی هابینو • توکن امن: {token}</span>
          </div>
          <div>
            تولید شده توسط سامانه ابری هابینو حسابداری • استاندارد اعتبارسنجی اسناد تجاری
          </div>
        </div>
      </div>

      {/* Online Signature Canvas Modal */}
      {showSignModal && (
        <PhysicalSignatureCanvas
          invoiceNumber={invoice.invoiceNumber}
          defaultSignerName={invoice.clientName || ''}
          defaultSignerRole="client"
          isSubmitting={isSubmittingSignature}
          title="تایید و امضای آنلاین پیش‌فاکتور توسط خریدار"
          onCancel={() => setShowSignModal(false)}
          onSave={handleClientSign}
        />
      )}
    </div>
  );
};
