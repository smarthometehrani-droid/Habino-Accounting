import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Users,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  CreditCard,
  Landmark,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Tag,
  Receipt,
  FileCheck,
  ZoomIn,
  ZoomOut,
  Scan,
  CheckCircle
} from 'lucide-react';
import {
  ParsedFinancialDocument,
  SAMPLE_OCR_PRESETS,
  OcrDocumentParserEngine,
  DocumentType,
  OcrBoundingBox,
  saveOcrDocument,
  updateOcrDocumentStatus
} from '../lib/ocrDocumentParser';
import { STANDARD_CHART_OF_ACCOUNTS } from './Ledger';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { TafsiliType } from '../types';

interface DocumentOcrStudioProps {
  onNavigateToLedger?: () => void;
}

export const DocumentOcrStudio: React.FC<DocumentOcrStudioProps> = ({ onNavigateToLedger }) => {
  const {
    clients,
    addClient,
    addAccountingEntry,
    accountingEntries,
    addInvoice,
    addTransaction
  } = useAccounting();

  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_OCR_PRESETS[0].id);
  const [currentDoc, setCurrentDoc] = useState<ParsedFinancialDocument>(SAMPLE_OCR_PRESETS[0]);
  const [customDebitMoein, setCustomDebitMoein] = useState<string>(SAMPLE_OCR_PRESETS[0].mappingSuggestion.debitMoeinCode);
  const [customCreditMoein, setCustomCreditMoein] = useState<string>(SAMPLE_OCR_PRESETS[0].mappingSuggestion.creditMoeinCode);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [injectionSuccess, setInjectionSuccess] = useState<{ docNum: string; message: string } | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [showManualTextModal, setShowManualTextModal] = useState<boolean>(false);

  // Visual Bounding Box & Canvas Controls
  const [viewMode, setViewMode] = useState<'canvas' | 'table'>('canvas');
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);

  // Save current doc to storage on mount or change for Voice Synapse bridge
  useEffect(() => {
    saveOcrDocument(currentDoc);
  }, [currentDoc]);

  // Switch preset
  const handleSelectPreset = (preset: ParsedFinancialDocument) => {
    setSelectedPresetId(preset.id);
    setCurrentDoc(preset);
    setCustomDebitMoein(preset.mappingSuggestion.debitMoeinCode);
    setCustomCreditMoein(preset.mappingSuggestion.creditMoeinCode);
    setInjectionSuccess(null);
    setActiveBoxId(null);
    saveOcrDocument(preset);
  };

  // Handle mock file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setInjectionSuccess(null);

    setTimeout(() => {
      // Create parsed document based on file name and heuristic
      const parsed = OcrDocumentParserEngine.parseRawDocumentText(
        `فاکتور رسمی خرید کالا و خدمات\nشماره: INV-${Math.floor(1000 + Math.random() * 9000)}\nتاریخ: ${new Date().toLocaleDateString('fa-IR')}\nطرف‌حساب: تأمین‌کننده سند ${file.name}\nشناسه ملی: 10109988776\nمبلغ کل: ۳۲,۰۰۰,۰۰۰ تومان`,
        file.name
      );
      setCurrentDoc(parsed);
      setSelectedPresetId('');
      setCustomDebitMoein(parsed.mappingSuggestion.debitMoeinCode);
      setCustomCreditMoein(parsed.mappingSuggestion.creditMoeinCode);
      setIsProcessing(false);
      saveOcrDocument(parsed);
    }, 900);
  };

  // Find or determine existing client in store
  const matchedClient = useMemo(() => {
    const cleanName = currentDoc.counterparty.name.trim().toLowerCase();
    return clients.find(c => 
      c.name.trim().toLowerCase() === cleanName || 
      (c.companyName && c.companyName.trim().toLowerCase() === cleanName) ||
      (currentDoc.counterparty.nationalId && c.nationalCode === currentDoc.counterparty.nationalId)
    );
  }, [clients, currentDoc]);

  // Generate journal entry preview
  const journalPreview = useMemo(() => {
    const fakeClientId = matchedClient ? matchedClient.id : 'temp-client-id';
    return OcrDocumentParserEngine.generateBalancedJournalEntries(
      currentDoc,
      fakeClientId,
      currentDoc.counterparty.name,
      customDebitMoein,
      customCreditMoein
    );
  }, [currentDoc, matchedClient, customDebitMoein, customCreditMoein]);

  // Compute bounding boxes
  const boundingBoxes = useMemo(() => {
    if (currentDoc.boundingBoxes && currentDoc.boundingBoxes.length > 0) {
      return currentDoc.boundingBoxes;
    }
    return OcrDocumentParserEngine.generateBoundingBoxes(currentDoc);
  }, [currentDoc]);

  // Active highlighted box
  const activeBox = useMemo(() => {
    return boundingBoxes.find(b => b.id === activeBoxId) || null;
  }, [boundingBoxes, activeBoxId]);

  // Perform 1-Click Injection into General Ledger
  const handleInjectToLedger = async () => {
    setIsProcessing(true);
    setInjectionSuccess(null);

    try {
      let activeClientId = matchedClient?.id;
      let activeClientName = currentDoc.counterparty.name;

      // ۱. اگر طرف‌حساب وجود ندارد، خودکار در سیستم اشخاص ثبت شود (قانون ۱ و ۵)
      if (!activeClientId) {
        const newClient = await addClient({
          name: currentDoc.counterparty.name,
          companyName: currentDoc.counterparty.companyName,
          phone: currentDoc.counterparty.phone || '09120000000',
          nationalCode: currentDoc.counterparty.nationalId,
          balance: 0,
          type: currentDoc.counterparty.suggestedType
        });
        activeClientId = newClient.id;
        activeClientName = newClient.name;
      }

      // ۲. ایجاد اسناد دوبل متوازن در دفتر روزنامه
      const generated = OcrDocumentParserEngine.generateBalancedJournalEntries(
        currentDoc,
        activeClientId,
        activeClientName,
        customDebitMoein,
        customCreditMoein
      );

      for (const entry of generated.entries) {
        await addAccountingEntry(entry);
      }

      // ۳. ثبت متقارن در ماژول فاکتورها یا تراکنش‌ها برای تداوم سابقه
      if (currentDoc.documentType === 'purchase_invoice' || currentDoc.documentType === 'project_contractor') {
        await addInvoice({
          invoiceNumber: currentDoc.documentNumber,
          clientId: activeClientId,
          clientName: activeClientName,
          type: 'purchase',
          status: 'pending',
          template: 'professional',
          date: currentDoc.date,
          items: currentDoc.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxRate: 10,
            total: item.total
          })),
          subtotal: currentDoc.financials.subtotal,
          totalDiscount: currentDoc.financials.discount,
          totalTax: currentDoc.financials.tax,
          grandTotal: currentDoc.financials.grandTotal,
          amountPaid: 0,
          remainingAmount: currentDoc.financials.grandTotal,
          notes: `سند استخراج‌شده از خط لوله اتوماسیون هوشمند اسناد (OCR هابینو)`
        });
      } else if (currentDoc.documentType === 'bank_pos_slip' || currentDoc.documentType === 'expense_receipt') {
        await addTransaction({
          date: currentDoc.date,
          type: currentDoc.documentType === 'bank_pos_slip' ? 'income' : 'expense',
          category: currentDoc.documentType === 'bank_pos_slip' ? 'فروش پوز بانکی' : 'هزینه عملیاتی اداری',
          amount: currentDoc.financials.grandTotal,
          description: `${currentDoc.documentTitle} [ثبت OCR]`,
          clientId: activeClientId,
          clientName: activeClientName
        });
      }

      // ۴. به‌روزرسانی وضعیت سند در مخزن محلی برای هوش صوتی سیناپس
      updateOcrDocumentStatus(currentDoc.id, 'confirmed');
      setCurrentDoc(prev => ({ ...prev, status: 'confirmed' }));

      setInjectionSuccess({
        docNum: generated.documentNumber,
        message: `سند دوبل شماره ${generated.documentNumber} به مبلغ ${formatCurrency(currentDoc.financials.grandTotal)} تومان با موفقیت در دفتر کل و طرف‌حساب «${activeClientName}» ثبت و تراز شد.`
      });
    } catch (err: unknown) {
      console.error('OCR injection error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Color helper for bounding boxes based on field
  const getBoxStyles = (fieldKey: OcrBoundingBox['fieldKey'], isActive: boolean) => {
    switch (fieldKey) {
      case 'grandTotal':
      case 'subtotal':
        return {
          border: isActive ? 'border-amber-500 bg-amber-500/25 ring-2 ring-amber-400' : 'border-amber-500/80 bg-amber-500/15 hover:bg-amber-500/30',
          badge: 'bg-amber-600 text-white',
          text: 'text-amber-900 font-bold'
        };
      case 'tax':
        return {
          border: isActive ? 'border-rose-500 bg-rose-500/25 ring-2 ring-rose-400' : 'border-rose-500/80 bg-rose-500/15 hover:bg-rose-500/30',
          badge: 'bg-rose-600 text-white',
          text: 'text-rose-900 font-bold'
        };
      case 'counterpartyName':
      case 'nationalId':
        return {
          border: isActive ? 'border-emerald-500 bg-emerald-500/25 ring-2 ring-emerald-400' : 'border-emerald-500/80 bg-emerald-500/15 hover:bg-emerald-500/30',
          badge: 'bg-emerald-600 text-white',
          text: 'text-emerald-900 font-bold'
        };
      case 'documentNumber':
      case 'date':
        return {
          border: isActive ? 'border-blue-600 bg-blue-600/25 ring-2 ring-blue-400' : 'border-blue-500/80 bg-blue-500/15 hover:bg-blue-500/30',
          badge: 'bg-blue-600 text-white',
          text: 'text-blue-900 font-bold'
        };
      default:
        return {
          border: isActive ? 'border-purple-600 bg-purple-600/25 ring-2 ring-purple-400' : 'border-slate-400/80 bg-slate-400/10 hover:bg-slate-400/20',
          badge: 'bg-slate-700 text-white',
          text: 'text-slate-900'
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-l from-indigo-900 via-blue-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  پلتفرم اتوماسیون اسناد و صورتحساب‌های مالی (OCR Pipeline)
                </h2>
                <p className="text-xs text-blue-200/80">
                  اتصال هوش بینایی ماشین اسناد به سرفصل‌های ۳ سطحی دفتر کل و تفصیلی شناور هابینو
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>فاز ۶ رودمپ استراتژیک هابینو</span>
            </span>
            {onNavigateToLedger && (
              <button
                onClick={onNavigateToLedger}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>مشاهده دفاتر کل و روزنامه</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {injectionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">{injectionSuccess.message}</p>
              <p className="text-xs text-emerald-700">
                سند دوبل بر اساس قوانین ۹‌گانه دفتر کل با تراز متقارن به ثبت رسید.
              </p>
            </div>
          </div>
          {onNavigateToLedger && (
            <button
              onClick={onNavigateToLedger}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              مشاهده در دفتر روزنامه
            </button>
          )}
        </div>
      )}

      {/* Preset Selector Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-700 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <span>انتخاب سناریوی پیش‌فرض برای تست فوری خط لوله OCR:</span>
          </label>
          <span className="text-[11px] text-slate-500">
            یا تصویر/PDF فاکتور واقعی خود را در بخش زیر آپلود فرمایید
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_OCR_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {preset.documentType === 'purchase_invoice' && 'فاکتور خرید'}
                      {preset.documentType === 'expense_receipt' && 'قبض هزینه'}
                      {preset.documentType === 'bank_pos_slip' && 'رسید پوز/بانک'}
                      {preset.documentType === 'project_contractor' && 'پیمانکار پروژه'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                      دقت {toPersianDigits(preset.confidenceScore)}٪
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mb-1">
                    {preset.documentTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500">{preset.counterparty.name}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">{preset.date}</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(preset.financials.grandTotal)} ت
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Zone & Document Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Upload and Document Metadata (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Upload Dropzone */}
          <div
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all bg-white ${
              dragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
            }`}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => {
              e.preventDefault();
              setDragActive(false);
            }}
          >
            <input
              type="file"
              id="ocr-file-input"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="ocr-file-input" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                بارگذاری تصویر یا فایل PDF فاکتور / صورتحساب
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                پشتیبانی از انواع فاکتورهای رسمی سامانه مودیان، رسید پوز، فیش‌های واریزی و صورت‌وضعیت‌ها
              </p>
              <div className="pt-2">
                <span className="inline-block px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-colors">
                  انتخاب فایل از دستگاه
                </span>
              </div>
            </label>
          </div>

          {/* View Mode Switcher & Canvas Controls */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('canvas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'canvas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>بوم کادربندی ارقام (Bounding Boxes)</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>جدول متنی داده‌ها</span>
              </button>
            </div>

            {viewMode === 'canvas' && (
              <div className="flex items-center gap-2">
                {/* Bounding Boxes Toggle */}
                <button
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    showBoundingBoxes
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                  title="نمایش یا عدم نمایش کادرهای هوش مصنوعی"
                >
                  <Scan className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showBoundingBoxes ? 'کادرها فعال' : 'کادرها مخفی'}</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-slate-700">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
                    className="p-1 hover:bg-white rounded transition-colors cursor-pointer"
                    title="کوچک‌نمایی"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono px-1 font-bold">{zoomLevel}٪</span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(130, prev + 15))}
                    className="p-1 hover:bg-white rounded transition-colors cursor-pointer"
                    title="بزرگ‌نمایی"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VISUAL CANVASES OR DATA TABLE */}
          {viewMode === 'canvas' ? (
            <div className="p-4 sm:p-6 bg-slate-100/70 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 overflow-hidden">
              {/* Active Box Info Floating Toast */}
              {activeBox && (
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>فیلد شناسایی‌شده: <strong>{activeBox.label}</strong></span>
                    <span className="text-slate-300 font-mono">[{activeBox.value}]</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    دقت استخراج: {toPersianDigits(activeBox.confidence)}٪
                  </span>
                </div>
              )}

              {/* The Realistic Persian Invoice Canvas with Relative Coordinates */}
              <div
                className="relative bg-white rounded-2xl border border-slate-300 p-6 shadow-md transition-transform duration-200 origin-top overflow-hidden select-none"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  minHeight: '480px'
                }}
              >
                {/* Authentic Iranian Official Invoice Header */}
                <div className="pb-4 border-b-2 border-slate-800 flex items-start justify-between">
                  <div className="space-y-1 text-right">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      {currentDoc.documentTitle}
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      سامانه یکپارچه مودیان و پایانه‌های فروشگاهی کشور
                    </p>
                  </div>
                  <div className="text-left space-y-0.5 text-xs font-mono">
                    <div className="text-slate-700">
                      شماره: <strong className="text-blue-900">{currentDoc.documentNumber}</strong>
                    </div>
                    <div className="text-slate-600">
                      تاریخ: <span>{currentDoc.date}</span>
                    </div>
                  </div>
                </div>

                {/* Seller & Counterparty Grid */}
                <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 text-xs">
                  <div className="space-y-1 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/50">
                    <div className="text-[10px] text-slate-500 font-bold">مشخصات فروشنده / صادرکننده:</div>
                    <div className="font-bold text-slate-800">{currentDoc.counterparty.name}</div>
                    {currentDoc.counterparty.nationalId && (
                      <div className="text-[10px] text-slate-600 font-mono">
                        شناسه ملی: {currentDoc.counterparty.nationalId}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/50">
                    <div className="text-[10px] text-slate-500 font-bold">مشخصات خریدار / کارفرما:</div>
                    <div className="font-bold text-slate-800">شرکت هابینو حسابداری (مستأجر سیستم)</div>
                    <div className="text-[10px] text-slate-600 font-mono">کد اقتصادی: 41158933221</div>
                  </div>
                </div>

                {/* Line Items Table on Invoice */}
                <div className="py-3">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-300 text-[10px]">
                        <th className="p-2 w-8 text-center">ردیف</th>
                        <th className="p-2">شرح کالا یا خدمات</th>
                        <th className="p-2 text-center w-14">تعداد</th>
                        <th className="p-2 text-left w-24">مبلغ واحد (ت)</th>
                        <th className="p-2 text-left w-28">مبلغ کل (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {currentDoc.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-medium">{item.description}</td>
                          <td className="p-2 text-center font-mono">{toPersianDigits(item.quantity)}</td>
                          <td className="p-2 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2 text-left font-bold font-mono">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Footer Totals */}
                <div className="pt-3 border-t-2 border-slate-800 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>جمع اقلام:</span>
                      <span className="font-mono">{formatCurrency(currentDoc.financials.subtotal)} ت</span>
                    </div>
                    {currentDoc.financials.tax > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>مالیات ارزش افزوده (۱۰٪):</span>
                        <span className="font-mono">{formatCurrency(currentDoc.financials.tax)} ت</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-300 text-sm">
                      <span>مبلغ کل قابل پرداخت:</span>
                      <span className="font-mono text-blue-900">{formatCurrency(currentDoc.financials.grandTotal)} تومان</span>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC BOUNDING BOXES OVERLAY */}
                {showBoundingBoxes && boundingBoxes.map(box => {
                  const isActive = activeBoxId === box.id;
                  const styles = getBoxStyles(box.fieldKey, isActive);

                  return (
                    <div
                      key={box.id}
                      onClick={() => setActiveBoxId(box.id)}
                      onMouseEnter={() => setActiveBoxId(box.id)}
                      className={`absolute border-2 rounded-lg transition-all cursor-pointer pointer-events-auto group ${styles.border}`}
                      style={{
                        top: `${box.y}%`,
                        left: `${box.x}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                        zIndex: isActive ? 30 : 10
                      }}
                      title={`${box.label}: ${box.value} (دقت: ${box.confidence}%)`}
                    >
                      {/* Floating Micro-Badge */}
                      <span
                        className={`absolute -top-3.5 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans tracking-tight shadow-xs whitespace-nowrap transition-opacity ${
                          isActive ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-100'
                        } ${styles.badge}`}
                      >
                        {box.label} ({toPersianDigits(box.confidence)}٪)
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bounding Box Legend Bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 flex-wrap gap-2 border-t border-slate-200">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-slate-700">راهنمای کادرها:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                    <span>شناسه و تاریخ سند</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span>طرف‌حساب و کدملی</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span>مبالغ نهایی فاکتور</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                    <span>ارزش افزوده (۱۰٪)</span>
                  </span>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {boundingBoxes.length} کادر هوش مصنوعی فعال
                </span>
              </div>
            </div>
          ) : (
            /* Traditional Data Breakdown Card */
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{currentDoc.documentTitle}</h3>
                    <p className="text-[11px] text-slate-500">
                      شماره سند: <span className="font-mono font-bold text-slate-700">{currentDoc.documentNumber}</span> | تاریخ: {currentDoc.date}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                  هوش تطبیق: {toPersianDigits(currentDoc.confidenceScore)}٪
                </span>
              </div>

              {/* Counterparty Block */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-slate-800">طرف‌حساب شناسایی‌شده:</span>
                    <span className="font-bold text-blue-700">{currentDoc.counterparty.name}</span>
                  </div>
                  {matchedClient ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>موجود در دفتر اشخاص</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      مخاطب جدید (ایجاد خودکار)
                    </span>
                  )}
                </div>
                {currentDoc.counterparty.nationalId && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-4">
                    <span>شناسه / کد ملی: <strong className="font-mono">{currentDoc.counterparty.nationalId}</strong></span>
                    {currentDoc.counterparty.phone && (
                      <span>تلفن: <strong className="font-mono">{currentDoc.counterparty.phone}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* Line Items Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">اقلام استخراج‌شده فاکتور:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold">
                      <tr>
                        <th className="p-2.5 rounded-r-xl">شرح کالا / خدمات</th>
                        <th className="p-2.5 text-center">تعداد</th>
                        <th className="p-2.5 text-left">فی (تومان)</th>
                        <th className="p-2.5 text-left rounded-l-xl">مبلغ کل (تومان)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {currentDoc.items.map(item => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-medium">{item.description}</td>
                          <td className="p-2.5 text-center font-mono">{toPersianDigits(item.quantity)}</td>
                          <td className="p-2.5 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2.5 text-left font-bold font-mono">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financials Totals */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="text-slate-600 space-x-reverse space-x-3">
                  <span>جمع اقلام: <strong>{formatCurrency(currentDoc.financials.subtotal)}</strong></span>
                  {currentDoc.financials.tax > 0 && (
                    <span>ارزش افزوده (۱۰٪): <strong>{formatCurrency(currentDoc.financials.tax)}</strong></span>
                  )}
                </div>
                <div className="text-sm font-black text-slate-900 bg-slate-100 px-4 py-1.5 rounded-xl">
                  مبلغ نهایی سند: {formatCurrency(currentDoc.financials.grandTotal)} تومان
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Accounting Moein & Floating Tafsili Mapper (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    نقشه‌برداری به سرفصل‌های دفتر کل و تفصیلی
                  </h3>
                  <p className="text-[11px] text-slate-500">کدینگ استاندارد ۳ سطحی و تطابق تفصیلی شناور</p>
                </div>
              </div>

              {currentDoc.status === 'confirmed' ? (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>تایید دفاتر شده</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold">
                  در انتظار تایید
                </span>
              )}
            </div>

            {/* Recommendation Explanation */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>تحلیل هوشمند ماهیت سند:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {currentDoc.mappingSuggestion.explanation}
              </p>
            </div>

            {/* Debit Moein Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                کد معین بدهکار (Debit Moein):
              </label>
              <select
                value={customDebitMoein}
                onChange={e => setCustomDebitMoein(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
              >
                {STANDARD_CHART_OF_ACCOUNTS.map(acc => (
                  <option key={`deb-${acc.code}`} value={acc.code}>
                    {acc.code} - {acc.title} ({acc.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Moein Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                کد معین بستانکار (Credit Moein):
              </label>
              <select
                value={customCreditMoein}
                onChange={e => setCustomCreditMoein(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
              >
                {STANDARD_CHART_OF_ACCOUNTS.map(acc => (
                  <option key={`crd-${acc.code}`} value={acc.code}>
                    {acc.code} - {acc.title} ({acc.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Floating Tafsili Badge */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">تفصیلی شناور (Floating Tafsili):</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                  {currentDoc.mappingSuggestion.tafsiliType === 'supplier' && 'تأمین‌کننده / بستانکار'}
                  {currentDoc.mappingSuggestion.tafsiliType === 'client' && 'مشتری / بدهکار'}
                  {currentDoc.mappingSuggestion.tafsiliType === 'cost_center' && 'پیمانکار / مرکز هزینه پروژه'}
                  {currentDoc.mappingSuggestion.tafsiliType === 'other' && 'سایر اشخاص و موجر'}
                  {currentDoc.mappingSuggestion.tafsiliType === 'partner' && 'شریک یا سهامدار'}
                  {currentDoc.mappingSuggestion.tafsiliType === 'personnel' && 'پرسنل و کارمند'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">
                {currentDoc.counterparty.name}
              </p>
              {currentDoc.projectTag && (
                <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1 pt-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>برچسب پروژه: {currentDoc.projectTag}</span>
                </div>
              )}
            </div>

            {/* Double-Entry Journal Preview */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span>پیش‌نمایش سند دوبل:</span>
                <span className="text-emerald-400 font-bold">تراز متقارن (تفاضل = ۰)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-emerald-300">
                  <span>بدهکار ({customDebitMoein}):</span>
                  <span>{formatCurrency(currentDoc.financials.grandTotal)} ت</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>بستانکار ({customCreditMoein}):</span>
                  <span>{formatCurrency(currentDoc.financials.grandTotal)} ت</span>
                </div>
              </div>
            </div>

            {/* Voice Synapse Synergy Notice */}
            <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                این سند در خط لوله هوش صوتی سیناپس آماده است. با فرمان صوتی به دستیار سایرافلو نیز می‌توانید آن را بررسی و تایید کنید.
              </span>
            </div>

            {/* Injection Trigger Button */}
            <button
              onClick={handleInjectToLedger}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 text-amber-300" />
              )}
              <span>
                {isProcessing
                  ? 'در حال اعتبارسنجی و ثبت در دفاتر...'
                  : 'تزریق مستقیم به دفتر کل و ثبت سند دوبل'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
