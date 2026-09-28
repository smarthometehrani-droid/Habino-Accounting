import React, { useState, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import {
  BazaarGuildType,
  BAZAAR_INDUSTRY_PRESETS,
  BazaarOnboardingEngine
} from '../lib/bazaarOnboardingEngine';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { SiraFlowAudio } from '../lib/soundFx';
import {
  Wrench,
  ShoppingBag,
  Factory,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Printer,
  Receipt,
  QrCode,
  ShieldCheck,
  X,
  RotateCcw,
  FileText,
  Check,
  Store,
  Layers,
  Bot,
  Zap,
  Tag,
  AlertCircle
} from 'lucide-react';

interface BazaarOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated?: (invoiceId: string) => void;
  onOpenModule?: (moduleId: string) => void;
}

export const BazaarOnboardingModal: React.FC<BazaarOnboardingModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  onOpenModule
}) => {
  const {
    activeTenantId,
    clients,
    inventory,
    addClient,
    addInventoryItem,
    addInvoice,
    settings,
    updateSettings
  } = useAccounting();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedGuild, setSelectedGuild] = useState<BazaarGuildType>('retail');
  const [isInjectingCatalog, setIsInjectingCatalog] = useState(false);
  const [injectedCount, setInjectedCount] = useState(0);
  const [injectedClientId, setInjectedClientId] = useState<string | null>(null);

  // Step 3: First Invoice form state
  const [invoiceClientId, setInvoiceClientId] = useState<string>('');
  const [invoiceItemCode, setInvoiceItemCode] = useState<string>('');
  const [invoiceItemQty, setInvoiceItemQty] = useState<number>(1);
  const [invoiceItemDiscount, setInvoiceItemDiscount] = useState<number>(0);
  const [invoiceItemPrice, setInvoiceItemPrice] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('اولین فاکتور راه‌اندازی سریع در کافه‌بازار');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [createdInvoiceResult, setCreatedInvoiceResult] = useState<any | null>(null);

  const currentPreset = useMemo(() => {
    return BAZAAR_INDUSTRY_PRESETS[selectedGuild];
  }, [selectedGuild]);

  if (!isOpen) return null;

  // Handle injecting the chosen industry presets into the live store
  const handleInjectCatalog = async () => {
    setIsInjectingCatalog(true);
    setInvoiceError(null);

    try {
      // 1. Create or ensure default client
      let targetClientId = '';
      const existingClient = clients.find(c => c.name === currentPreset.defaultClient.name);
      if (existingClient) {
        targetClientId = existingClient.id;
      } else {
        const newClient = await addClient({
          ...currentPreset.defaultClient,
          tenantId: activeTenantId || 'tenant-habino-primary'
        });
        targetClientId = newClient.id;
      }
      setInjectedClientId(targetClientId);
      setInvoiceClientId(targetClientId);

      // 2. Inject preset items into inventory
      let itemsAdded = 0;
      for (const item of currentPreset.suggestedItems) {
        const alreadyExists = inventory.some(inv => inv.code === item.code || inv.barcode === item.barcode);
        if (!alreadyExists) {
          await addInventoryItem({
            ...item,
            tenantId: activeTenantId || 'tenant-habino-primary'
          });
          itemsAdded++;
        }
      }

      setInjectedCount(itemsAdded);

      // 3. Select first item for quick invoice
      if (currentPreset.suggestedItems.length > 0) {
        const first = currentPreset.suggestedItems[0];
        setInvoiceItemCode(first.code);
        setInvoiceItemPrice(first.sellPrice);
      }

      // Update company settings category if appropriate
      if (settings) {
        updateSettings({
          guild: selectedGuild,
          guildType: selectedGuild === 'services' ? 'service' : selectedGuild === 'retail' ? 'trading' : 'manufacturing'
        });
      }

      SiraFlowAudio.playResponseChime();
      setStep(3);
    } catch (err: any) {
      setInvoiceError(err?.message || 'خطا در بارگذاری سرفصل‌ها و اقلام صنف.');
    } finally {
      setIsInjectingCatalog(false);
    }
  };

  // Live price updater when selected item changes
  const handleItemSelectChange = (code: string) => {
    setInvoiceItemCode(code);
    const foundPreset = currentPreset.suggestedItems.find(i => i.code === code);
    if (foundPreset) {
      setInvoiceItemPrice(foundPreset.sellPrice);
    } else {
      const foundInStore = inventory.find(i => i.code === code);
      if (foundInStore) {
        setInvoiceItemPrice(foundInStore.sellPrice);
      }
    }
  };

  // Step 3 Calculations
  const calculatedSubtotal = useMemo(() => {
    return Math.max(0, invoiceItemPrice * invoiceItemQty);
  }, [invoiceItemPrice, invoiceItemQty]);

  const calculatedTax = useMemo(() => {
    // 10% standard Iranian VAT
    const net = Math.max(0, calculatedSubtotal - invoiceItemDiscount);
    return Math.round(net * 0.1);
  }, [calculatedSubtotal, invoiceItemDiscount]);

  const calculatedGrandTotal = useMemo(() => {
    const net = Math.max(0, calculatedSubtotal - invoiceItemDiscount);
    return net + calculatedTax;
  }, [calculatedSubtotal, invoiceItemDiscount, calculatedTax]);

  // Handle Step 3: Fast-Track First Invoice Submission (Atomic Transaction)
  const handleCreateFirstInvoice = async () => {
    setInvoiceError(null);

    // Rule 1: Mandatory client validation
    if (!invoiceClientId || invoiceClientId.trim() === '') {
      setInvoiceError('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      return;
    }

    if (!invoiceItemCode) {
      setInvoiceError('لطفاً حداقل یک قلم کالا یا خدمات را برای فاکتور انتخاب کنید.');
      return;
    }

    if (calculatedGrandTotal <= 0) {
      setInvoiceError('مبلغ سند نامعتبر است.');
      return;
    }

    setIsSubmittingInvoice(true);

    try {
      const selectedItemObj =
        inventory.find(i => i.code === invoiceItemCode) ||
        currentPreset.suggestedItems.find(i => i.code === invoiceItemCode);

      const targetClient = clients.find(c => c.id === invoiceClientId);

      const todayJalali = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()).replace(/\//g, '/');

      const invoiceItem = {
        id: `item-${Date.now()}-1`,
        itemId: selectedItemObj?.code || 'GEN-01',
        code: selectedItemObj?.code || 'GEN-01',
        description: selectedItemObj?.name || 'کالای فروشگاهی / خدمات تخصصی',
        quantity: Number(invoiceItemQty) || 1,
        unitPrice: Number(invoiceItemPrice) || 0,
        discount: Number(invoiceItemDiscount) || 0,
        taxRate: 10,
        total: calculatedGrandTotal
      };

      const newInv = await addInvoice({
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: invoiceClientId,
        client_id: invoiceClientId,
        clientName: targetClient?.name || currentPreset.defaultClient.name,
        type: 'sale',
        status: 'paid',
        template: 'professional',
        date: todayJalali,
        items: [invoiceItem],
        subtotal: calculatedSubtotal,
        totalDiscount: invoiceItemDiscount,
        totalTax: calculatedTax,
        grandTotal: calculatedGrandTotal,
        amountPaid: calculatedGrandTotal,
        remainingAmount: 0,
        notes: invoiceNotes,
        tenantId: activeTenantId || 'tenant-habino-primary'
      });

      setCreatedInvoiceResult(newInv);
      BazaarOnboardingEngine.markCompleted(newInv.id);
      SiraFlowAudio.playResponseChime();
      onInvoiceCreated?.(newInv.id);
      setStep(4);
    } catch (err: any) {
      setInvoiceError(err?.message || 'خطا در ثبت اتمیک فاکتور. لطفاً داده‌ها را بررسی فرمایید.');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleFinishTour = () => {
    BazaarOnboardingEngine.markCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-sm select-text" dir="rtl">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white p-5 md:p-6 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-white">
                  تور هوشمند راه‌اندازی سریع اصناف بازار
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold uppercase tracking-wider">
                  Fast-Track Q3
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تنظیم خودکار سرفصل‌های دوبل، تزریق کاتالوگ صنف و صدور اولین فاکتور در کمتر از ۳ دقیقه
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 max-w-2xl mx-auto">
            
            {/* Step 1 Indicator */}
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                step > 1 ? 'bg-emerald-600 text-white' : step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {step > 1 ? <Check className="w-3.5 h-3.5" /> : '۱'}
              </div>
              <span className="hidden sm:inline">انتخاب صنف</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 2 Indicator */}
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                step > 2 ? 'bg-emerald-600 text-white' : step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {step > 2 ? <Check className="w-3.5 h-3.5" /> : '۲'}
              </div>
              <span className="hidden sm:inline">بارگذاری سرفصل‌ها</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 3 Indicator */}
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                step > 3 ? 'bg-emerald-600 text-white' : step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {step > 3 ? <Check className="w-3.5 h-3.5" /> : '۳'}
              </div>
              <span className="hidden sm:inline">صدور اولین فاکتور</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step > 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 4 Indicator */}
            <div className={`flex items-center gap-2 ${step === 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                ۴
              </div>
              <span className="hidden sm:inline">آغاز کار و بازار</span>
            </div>

          </div>
        </div>

        {/* MODAL BODY (STEP VIEWS) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ============================================================== */}
          {/* STEP 1: GUILD SELECTION (صنف و نوع کسب‌وکار) */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  گام نخست: شخصی‌سازی سیستم حسابداری
                </span>
                <h3 className="text-lg md:text-xl font-black text-slate-900">
                  صنف یا حوزه فعالیت کسب‌وکار خود را انتخاب نمایید
                </h3>
                <p className="text-xs text-slate-500">
                  بر اساس صنف انتخابی، کدینگ استاندارد ۳ سطحی (گروه، کل، معین)، بهای تمام‌شده و اقلام پیشنهادی به صورت خودکار بارگذاری می‌گردد.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. SERVICES */}
                <div
                  onClick={() => setSelectedGuild('services')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedGuild === 'services'
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                        <Wrench className="w-6 h-6" />
                      </span>
                      {selectedGuild === 'services' && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">
                        خدماتی و پیمانکاری
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        دفاتر فنی مهندسی، IT، نصب، تعمیرات و پروژه‌های نظارتی
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>کدینگ درآمد خدمات (۶۱) و بهای تمام‌شده (۷۱)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>ثبت صورت‌وضعیت ساعتی و پروژه‌محور</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>مدیریت پیش‌دریافت و تسویه چک‌های کارفرما</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-xl text-center">
                    ۴ ردیف خدمات پیشنهادی
                  </span>
                </div>

                {/* 2. RETAIL */}
                <div
                  onClick={() => setSelectedGuild('retail')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedGuild === 'retail'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                        <ShoppingBag className="w-6 h-6" />
                      </span>
                      {selectedGuild === 'retail' && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">
                        فروشگاهی و بازرگانی
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        کالای برق، قطعات یدکی، سوپرمارکت، پوشاک و ابزار بازار
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>کدینگ موجودی انبار (۱۴) و فروش کالا (۶۰)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>بارکدخوان دوربین و چاپ فیش حرارتی ۸۰/۵۸mm</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>کنترل حداقل موجودی و سود لحظه‌ای هر کالا</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl text-center">
                    ۴ قلم کالای پرفروش با بارکد EAN-13
                  </span>
                </div>

                {/* 3. MANUFACTURING */}
                <div
                  onClick={() => setSelectedGuild('manufacturing')}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedGuild === 'manufacturing'
                      ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="p-3 rounded-2xl bg-purple-100 text-purple-700">
                        <Factory className="w-6 h-6" />
                      </span>
                      {selectedGuild === 'manufacturing' && (
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">
                        تولیدی و کارگاهی
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        تراشکاری، MDF و دکوراسیون، قالب‌سازی، فلزی و قطعه‌سازی
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>انبار مواد اولیه و محصولات در جریان ساخت</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>محاسبه بهای تمام‌شده و دستمزد مستقیم ساخت</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>مدیریت چک‌های صیادی خرید متریال</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-xl text-center">
                    ۴ ردیف سفارش ساخت و متریال نمونه
                  </span>
                </div>

              </div>

              {/* Guild Highlights preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <Store className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      پیکربندی هوشمند: {currentPreset.titleFa}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      طرف‌حساب پیش‌فرض: {currentPreset.defaultClient.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>ادامه و مشاهده کاتالوگ پیشنهادی</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: CATALOG & COA PREVIEW & INJECTION */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      گام دوم: بررسی و تزریق کاتالوگ صنف
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      [{currentPreset.titleFa}]
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
                    اقلام، سرفصل‌های دفتر کل و طرف‌حساب پیشنهادی صنف
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغییر صنف</span>
                </button>
              </div>

              {/* Preset Items List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>اقلام و کدهای پیشنهادی برای تزریق به انبار شما (۴ مورد):</span>
                </span>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {currentPreset.suggestedItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {item.code}
                          </span>
                          <span className="text-xs md:text-sm font-bold text-slate-900">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0 justify-between sm:justify-end">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">قیمت فروش</span>
                          <span className="font-bold font-mono text-slate-800">
                            {formatCurrency(item.sellPrice)}
                          </span>
                        </div>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono">
                          {item.stock} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COA Accounts preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>سرفصل‌های ۳ سطحی فعال‌شده در دفتر کل:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {currentPreset.primaryAccounts.map((acc, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>معین: {acc.moeinCode}</span>
                        <span>کل: {acc.kolCode}</span>
                      </div>
                      <span className="font-bold text-slate-800 block truncate">
                        {acc.moeinTitle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Injection Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700">طرف‌حساب نمونه: </span>
                  <span>{currentPreset.defaultClient.name} ({currentPreset.defaultClient.phone})</span>
                </div>

                <button
                  type="button"
                  disabled={isInjectingCatalog}
                  onClick={handleInjectCatalog}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isInjectingCatalog ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>در حال تزریق اقلام و آماده‌سازی...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>تأیید و بارگذاری خودکار اقلام صنف (گام بعد)</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: GUIDED FIRST INVOICE ISSUANCE (<3 MIN KPI) */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      گام سوم: آموزش تعاملی صدور اولین فاکتور
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-mono font-bold">
                      KPI &lt; 3 Min
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 mt-1">
                    صدور اولین فاکتور رسمی هابینو برای ثبت در دفاتر مالی
                  </h3>
                </div>

                <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 self-start sm:self-center">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اقلام صنف با موفقیت بارگذاری شد</span>
                </div>
              </div>

              {invoiceError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{invoiceError}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                
                {/* 1. Client selection (Mandatory Rule 1) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>انتخاب طرف‌حساب / کارفرما</span>
                    <span className="text-rose-500 font-bold">*</span>
                    <span className="text-[10px] text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                      اصل ۱: مخاطب اجباری
                    </span>
                  </label>
                  <select
                    value={invoiceClientId}
                    onChange={e => setInvoiceClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- لطفاً مشتری را انتخاب کنید --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.phone}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block">
                    طرف‌حساب ثبت‌شده از کاتالوگ صنف به صورت خودکار انتخاب گردیده است.
                  </span>
                </div>

                {/* 2. Item selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    انتخاب قلم کالا یا خدمات تزریق‌شده:
                  </label>
                  <select
                    value={invoiceItemCode}
                    onChange={e => handleItemSelectChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- انتخاب قلم فاکتور --</option>
                    {currentPreset.suggestedItems.map(item => (
                      <option key={item.code} value={item.code}>
                        {item.name} - {formatCurrency(item.sellPrice)}
                      </option>
                    ))}
                    {inventory
                      .filter(inv => !currentPreset.suggestedItems.some(p => p.code === inv.code))
                      .map(inv => (
                        <option key={inv.code} value={inv.code}>
                          {inv.name} - {formatCurrency(inv.sellPrice)}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block">
                    می‌توانید هر یک از ۴ قلم پیشنهادی را برای صدور تست برگزینید.
                  </span>
                </div>

                {/* 3. Quantity & Unit Price */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">تعداد / مقدار:</label>
                  <input
                    type="number"
                    min="1"
                    value={invoiceItemQty}
                    onChange={e => setInvoiceItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">قیمت واحد (ریال):</label>
                  <input
                    type="number"
                    value={invoiceItemPrice}
                    onChange={e => setInvoiceItemPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 4. Discount & Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">تخفیف (ریال):</label>
                  <input
                    type="number"
                    value={invoiceItemDiscount}
                    onChange={e => setInvoiceItemDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">توضیحات پای فاکتور:</label>
                  <input
                    type="text"
                    value={invoiceNotes}
                    onChange={e => setInvoiceNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              {/* Live Invoice Financial Summary Card */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="grid grid-cols-3 gap-6 text-center md:text-right w-full md:w-auto">
                  <div>
                    <span className="text-[10px] text-slate-400 block">جمع جزء فاکتور</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-slate-200">
                      {formatCurrency(calculatedSubtotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">مالیات بر ارزش افزوده (۱۰٪)</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-amber-300">
                      {formatCurrency(calculatedTax)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block">مبلغ نهایی قابل پرداخت</span>
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
                      {formatCurrency(calculatedGrandTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingInvoice || !invoiceClientId}
                  onClick={handleCreateFirstInvoice}
                  className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingInvoice ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>در حال ثبت اتمیک در دفتر کل...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>ثبت و صدور نهایی اولین فاکتور رسمی هابینو</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: CELEBRATION & BAZAAR SHORTCUTS */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  هدف مایلستون m-baz-08 محقق شد
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-900">
                  تبریک! راه‌اندازی سریع اولیه در کمتر از ۳ دقیقه تکمیل گردید
                </h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  اولین فاکتور شما به صورت اتمیک در دفتر کل ثبت شد، کاردکس انبار به‌روزرسانی گردید و تراز مالی صنف شما همگام‌سازی شد.
                </p>
              </div>

              {/* Created invoice receipt card */}
              {createdInvoiceResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 max-w-md mx-auto text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>شماره سند فاکتور:</span>
                    <span className="font-mono font-bold text-blue-600">{createdInvoiceResult.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>طرف‌حساب:</span>
                    <span className="font-bold text-slate-800">{createdInvoiceResult.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>مبلغ تسویه‌شده:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(createdInvoiceResult.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Bazaar Tools Showcase */}
              <div className="pt-4 border-t border-slate-100 space-y-3 text-right">
                <span className="text-xs font-bold text-slate-800 block text-center">
                  ابزارهای تخصصی هابینو برای اصناف بازار را امتحان کنید:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Tool 1: Thermal Print */}
                  <div
                    onClick={() => {
                      onClose();
                      onOpenModule?.('invoices');
                    }}
                    className="p-3.5 bg-purple-50 hover:bg-purple-100/70 border border-purple-200 rounded-2xl cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-purple-200 text-purple-800">
                        <Printer className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-xs text-purple-900">چاپ فیش حرارتی</span>
                    </div>
                    <p className="text-[10px] text-purple-700">
                      چاپ فوری فیش ۸۰mm و ۵۸mm برای مشتری بازار
                    </p>
                  </div>

                  {/* Tool 2: Sayad Check Scanner */}
                  <div
                    onClick={() => {
                      onClose();
                      onOpenModule?.('checks');
                    }}
                    className="p-3.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded-2xl cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-200 text-amber-900">
                        <QrCode className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-xs text-amber-950">اسکنر چک صیادی</span>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      اسکن بارکد QR و استخراج خودکار ۱۶ رقم صیاد
                    </p>
                  </div>

                  {/* Tool 3: Taxpayer */}
                  <div
                    onClick={() => {
                      onClose();
                      onOpenModule?.('invoices');
                    }}
                    className="p-3.5 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 rounded-2xl cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-200 text-blue-900">
                        <Receipt className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-xs text-blue-950">سامانه مودیان</span>
                    </div>
                    <p className="text-[10px] text-blue-800">
                      تولید شناسه مالیاتی ۲۲ رقمی با چکسام ورهوف
                    </p>
                  </div>

                  {/* Tool 4: Synapse Voice */}
                  <div
                    onClick={() => {
                      onClose();
                      onOpenModule?.('synapse');
                    }}
                    className="p-3.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-200 text-emerald-900">
                        <Bot className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-xs text-emerald-950">هوش صوتی سیناپس</span>
                    </div>
                    <p className="text-[10px] text-emerald-800">
                      دستیار صوتی بلادرنگ مدیر مالی ارشد هابینو
                    </p>
                  </div>

                </div>
              </div>

              {/* Finish Button */}
              <div className="pt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleFinishTour}
                  className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>ورود به میزکار هابینو و شروع کار</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
