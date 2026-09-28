import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Send, 
  ExternalLink, 
  QrCode, 
  ShieldCheck, 
  Globe,
  FileText
} from 'lucide-react';
import { Invoice } from '../types';
import { buildSharingLinks, generateSecureShareToken } from '../lib/signatureService';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';

interface ShareInvoiceModalProps {
  invoice: Invoice;
  settings: any;
  onClose: () => void;
  onOpenPublicView?: (token: string) => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  invoice,
  settings,
  onClose,
  onOpenPublicView
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [shareToken, setShareToken] = useState<string>(() => {
    return invoice.shareToken || generateSecureShareToken();
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync to public cache endpoint on modal open
  useEffect(() => {
    let isMounted = true;
    const syncPublicData = async () => {
      setIsSyncing(true);
      try {
        await fetch('/api/invoices/public/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice,
            settings,
            shareToken
          })
        });
      } catch (err) {
        console.warn('Could not sync public invoice:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    syncPublicData();
    return () => { isMounted = false; };
  }, [invoice, settings, shareToken]);

  const links = buildSharingLinks({
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    grandTotal: invoice.grandTotal,
    currencyLabel: settings.currency === 'USD' ? 'دلار' : settings.currency === 'IRR' ? 'ریال' : 'تومان',
    shareToken
  });

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(links.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenPublicTab = () => {
    if (onOpenPublicView) {
      onOpenPublicView(shareToken);
    } else {
      window.open(links.publicUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Share2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                اشتراک‌گذاری امن پیش‌فاکتور
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  #{invoice.invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                تولید پیوند یکتا و اختصاصی جهت مشاهده و امضای آنلاین مشتری بدون نیاز به لاگین
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Invoice Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500">طرف‌حساب (مشتری):</span>
              <p className="text-sm font-bold text-slate-900">{invoice.clientName || 'نامشخص'}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>تاریخ: {toPersianDigits(invoice.date)}</span>
                <span>•</span>
                <span>اقلام: {toPersianDigits(invoice.items?.length || 0)} مورد</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-500 block">مبلغ کل قابل پرداخت:</span>
              <span className="text-base font-black text-blue-700">
                {formatCurrency(invoice.grandTotal, settings.currency)}
              </span>
              <div className="mt-1">
                {invoice.isSigned ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3" />
                    امضا شده و تایید رسمی
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    در انتظار امضا و تایید
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Secure Link Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                پیوند اختصاصی استعلام و تایید فاکتور:
              </span>
              {isSyncing && (
                <span className="text-[10px] text-blue-600 animate-pulse font-normal">
                  در حال همگام‌سازی ابری...
                </span>
              )}
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-xs text-slate-700">
              <input
                type="text"
                readOnly
                value={links.publicUrl}
                className="w-full bg-transparent border-none focus:outline-hidden text-left dir-ltr truncate text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`p-2 rounded-lg font-sans text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Sharing Channels */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">
              ارسال سریع به شبکه‌های اجتماعی:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp */}
              <a
                href={links.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>ارسال در واتساپ</span>
              </a>

              {/* Telegram */}
              <a
                href={links.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-sky-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ارسال در تلگرام</span>
              </a>
            </div>
          </div>

          {/* Preview Public View Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOpenPublicTab}
              className="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-300 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>مشاهده پیش‌نمایش مشتری (نمای عمومی بدون نیاز به لاگین)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>محافظت‌شده با توکن رمزنگاری ۲۴ بایتی RLS</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
