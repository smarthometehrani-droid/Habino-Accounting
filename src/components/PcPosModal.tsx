import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  RotateCw,
  X,
  Building2,
  Check,
  ShieldCheck,
  Zap,
  Smartphone,
  Server
} from 'lucide-react';
import {
  PosTerminalConfig,
  PosPaymentRequest,
  PosPaymentReceipt,
  PosStatusUpdate,
  getStoredPosTerminals,
  getActivePosTerminal,
  executePcPosPayment
} from '../lib/pcPosEngine';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { CurrencyType } from '../types';

interface PcPosModalProps {
  amount: number;
  currency: CurrencyType;
  invoiceId?: string;
  invoiceNumber?: string;
  clientName?: string;
  onClose: () => void;
  onPaymentComplete: (receipt: PosPaymentReceipt) => void;
}

export const PcPosModal: React.FC<PcPosModalProps> = ({
  amount,
  currency,
  invoiceId,
  invoiceNumber,
  clientName,
  onClose,
  onPaymentComplete
}) => {
  const [terminals] = useState<PosTerminalConfig[]>(() => getStoredPosTerminals());
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminalConfig>(() => getActivePosTerminal());
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState<PosStatusUpdate>({
    status: 'idle',
    message: 'آماده ارسال مبلغ به کارتخوان',
    stepPercent: 0
  });
  const [receipt, setReceipt] = useState<PosPaymentReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-start payment on open
  useEffect(() => {
    handleStartTransaction();
  }, []);

  const handleStartTransaction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setReceipt(null);

    try {
      const request: PosPaymentRequest = {
        amount,
        currency,
        invoiceId,
        invoiceNumber,
        clientName,
        terminalConfig: selectedTerminal
      };

      const result = await executePcPosPayment(request, (update) => {
        setStatusUpdate(update);
      });

      setReceipt(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با دستگاه پوز');
      setStatusUpdate({
        status: 'network_error',
        message: 'خطا در برقراری ارتباط با سوییچ پایانه',
        stepPercent: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleFinalize = () => {
    if (receipt) {
      onPaymentComplete(receipt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <CreditCard className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm">اتصال پایانه فروشگاهی PC-POS</h3>
              <p className="text-[11px] text-blue-100/80">
                {invoiceNumber ? `فاکتور شماره ${toPersianDigits(invoiceNumber)}` : 'تسویه مستقیم فاکتور'}
                {clientName ? ` • مشتری: ${clientName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          
          {/* Amount Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 block mb-1">مبلغ قابل پرداخت توسط خریدار:</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCurrency(amount, currency)}
            </div>
          </div>

          {/* Terminal Selection */}
          {!receipt && (
            <div className="flex items-center justify-between text-xs bg-blue-50/60 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">پایانه انتخابی:</span>
              </div>
              <select
                disabled={isProcessing}
                value={selectedTerminal.id}
                onChange={(e) => {
                  const t = terminals.find(x => x.id === e.target.value);
                  if (t) setSelectedTerminal(t);
                }}
                className="bg-white border border-blue-200 text-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                {terminals.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ipAddress})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Progress Stage */}
          {!receipt && !errorMsg && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                  {statusUpdate.message}
                </span>
                <span className="font-mono text-blue-600">{toPersianDigits(statusUpdate.stepPercent)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${statusUpdate.stepPercent}%` }}
                ></div>
              </div>

              {statusUpdate.details && (
                <p className="text-[11px] text-slate-500 text-center animate-pulse">
                  {statusUpdate.details}
                </p>
              )}
            </div>
          )}

          {/* Success Receipt State */}
          {receipt && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3 print:border-none print:p-0">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>رسید تراکنش موفق شاپرک</span>
              </div>

              <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-2 text-xs divide-y divide-slate-100 font-mono">
                <div className="flex justify-between py-1 font-sans">
                  <span className="text-slate-500">پذیرنده / پایانه:</span>
                  <span className="font-bold text-slate-800">{receipt.merchantName} ({toPersianDigits(receipt.terminalId)})</span>
                </div>
                <div className="flex justify-between py-1 font-sans">
                  <span className="text-slate-500">بانک صادرکننده:</span>
                  <span className="font-bold text-blue-700">{receipt.issuerBankName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-sans">شماره کارت:</span>
                  <span className="font-bold text-slate-900 dir-ltr">{receipt.maskedPan}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-sans">شماره پیگیری (Trace):</span>
                  <span className="font-bold text-emerald-700">{toPersianDigits(receipt.traceNumber)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-sans">شماره مرجع (RRN):</span>
                  <span className="font-bold text-slate-800">{toPersianDigits(receipt.rrn)}</span>
                </div>
                <div className="flex justify-between py-1 font-sans">
                  <span className="text-slate-500">تاریخ و زمان:</span>
                  <span className="text-slate-700">{toPersianDigits(receipt.shamsiDateTime)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تراکنش تایید شد و مبلغ مستقیماً به حساب بانکی شما منظور گردید.</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="border border-rose-200 bg-rose-50/70 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>تراکنش ناموفق بود</span>
              </div>
              <p className="text-rose-600">{errorMsg}</p>
              <button
                onClick={handleStartTransaction}
                className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 text-xs transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                تلاش مجدد
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>

          {receipt ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                چاپ فیش کارتخوان
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                تایید و تسویه نهایی فاکتور
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleStartTransaction}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                isProcessing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>در حال ارتباط با پوز...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>ارسال مجدد به پوز</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
