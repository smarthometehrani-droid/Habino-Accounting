import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../lib/store';
import { InvoiceTemplate, InvoiceDesignConfig, Invoice } from '../types';
import { InvoicePreview } from './InvoicePreview';
import {
  Palette,
  Check,
  Type,
  FileCheck2,
  Sliders,
  Save,
  RotateCcw,
  Eye,
  Settings,
  Sparkles,
  Layers,
  ChevronRight,
  Maximize2,
  Loader2,
  X
} from 'lucide-react';

export const TEMPLATE_METADATA: Record<InvoiceTemplate, {
  name: string;
  enName: string;
  tagline: string;
  previewBg: string;
  accent: string;
  recommendedFor: string;
  previewSnippet: string;
}> = {
  professional: {
    name: 'حرفه‌ای شرکتی (Professional)',
    enName: 'Professional',
    tagline: 'ساختار رسمی دو ستونه با جداول و سربرگ معتبر اداری',
    previewBg: 'bg-blue-50 border-blue-200',
    accent: '#1d4ed8',
    recommendedFor: 'شرکت‌های مهندسی، پیمانکاری و طرف‌های قرارداد دولتی',
    previewSnippet: 'جدول کامل ارزش افزوده و تخفیف + بارکد + دو ستون خریدار/فروشنده'
  },
  modern: {
    name: 'مدرن نوین (Modern Clean)',
    enName: 'Modern',
    tagline: 'طراحی مینیمال و شیک با نوار هدر گرادینت و تایپوگرافی برجسته',
    previewBg: 'bg-indigo-50 border-indigo-200',
    accent: '#4f46e5',
    recommendedFor: 'استارتاپ‌ها، فریلنسرها و ارائه‌دهندگان خدمات دیجیتال',
    previewSnippet: 'هدر رنگی با گوشه‌های نرم + کارت‌های مینیمال + جدول خطی'
  },
  minimal: {
    name: 'مینیمال سریع (Minimal Simple)',
    enName: 'Minimal',
    tagline: 'ساده، بدون کادربندی‌های سنگین و فوق‌العاده خوانا برای مصرف کم‌جوهر',
    previewBg: 'bg-slate-50 border-slate-200',
    accent: '#0f172a',
    recommendedFor: 'کسب‌وکارهای آسانگیر، ارائه‌دهندگان خدمات روزمره و چاپ فوری',
    previewSnippet: 'ساختار فوق‌العاده سبک، مصرف بهینه جوهر پرینتر و فونت عددی خوانا'
  },
  classic: {
    name: 'کلاسیک بازار (Classic Commerce)',
    enName: 'Classic',
    tagline: 'فاکتور سنتی بازار با کادربندی دوبل و تفکیک واضح بدهکار/بستانکار',
    previewBg: 'bg-amber-50 border-amber-200',
    accent: '#b45309',
    recommendedFor: 'بازرگانی، عمده‌فروشی، توزیع و فروشگاه‌های فیزیکی',
    previewSnippet: 'خطوط مشبک سنتی تجاری + سربرگ تشریفاتی + فرمت استاندارد فاکتور فروشگاهی'
  }
};

export const COLOR_PALETTES = [
  { id: 'blue', label: 'آبی سرمه‌ای سازمانی', hex: '#1e40af' },
  { id: 'emerald', label: 'سبز زمردی مالی', hex: '#047857' },
  { id: 'indigo', label: 'نیلی مدرن فناوری', hex: '#4338ca' },
  { id: 'slate', label: 'زغالی گرافیت مونوکروم', hex: '#0f172a' },
  { id: 'rose', label: 'یاقوتی تشریفاتی', hex: '#be123c' },
  { id: 'amber', label: 'طلایی کهربایی کلاسیک', hex: '#b45309' },
  { id: 'violet', label: 'بنفش رویال سلطنتی', hex: '#6d28d9' }
];

export const FONT_OPTIONS: Array<{ id: 'vazir' | 'iranyekan' | 'serif' | 'mono'; label: string; desc: string }> = [
  { id: 'vazir', label: 'وزیرمتن (Vazirmatn)', desc: 'قلم استاندارد، خوانا و بدون زائده برای مانیتور و کاغذ' },
  { id: 'iranyekan', label: 'یکان شرکتی (Modern Sans)', desc: 'قلم مدرن مناسب برندهای معاصر و طراحی‌های مینیمال' },
  { id: 'serif', label: 'نسخ رسمی (Formal Serif)', desc: 'رسمی و اداری، مناسب اسناد سنتی و حقوقی' },
  { id: 'mono', label: 'فنی مونو (Monospace)', desc: 'قلم عددی دقیق برای کدهای کالا و محاسبات مهندسی' }
];

interface InvoiceSettingsModalProps {
  onClose: () => void;
  currentTemplate?: InvoiceTemplate;
  currentDesign?: InvoiceDesignConfig;
  sourceInvoice?: Invoice | null;
  onSave?: (template: InvoiceTemplate, design: InvoiceDesignConfig, invoiceNote?: string, invoiceTerms?: string) => Promise<void> | void;
  title?: string;
}

export const InvoiceSettingsModal: React.FC<InvoiceSettingsModalProps> = ({
  onClose,
  currentTemplate,
  currentDesign,
  sourceInvoice,
  onSave,
  title = 'شخصی‌سازی و تنظیمات قالب فاکتور'
}) => {
  const { settings, updateSettings, clients } = useAccounting();
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  // Active view tab in modal: 'settings' or 'preview'
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(
    currentTemplate || settings.defaultInvoiceTemplate || 'professional'
  );

  const [invoiceNote, setInvoiceNote] = useState<string>(settings.invoiceNote || '');
  const [invoiceTerms, setInvoiceTerms] = useState<string>(settings.invoiceTerms || '');

  const [design, setDesign] = useState<InvoiceDesignConfig>({
    primaryColor: currentDesign?.primaryColor || settings.defaultInvoiceDesign?.primaryColor || '#1e40af',
    fontFamily: currentDesign?.fontFamily || settings.defaultInvoiceDesign?.fontFamily || 'vazir',
    showLogo: currentDesign?.showLogo ?? settings.defaultInvoiceDesign?.showLogo ?? true,
    showStamp: currentDesign?.showStamp ?? settings.defaultInvoiceDesign?.showStamp ?? true,
    showSignature: currentDesign?.showSignature ?? settings.defaultInvoiceDesign?.showSignature ?? true,
    showWatermark: currentDesign?.showWatermark ?? settings.defaultInvoiceDesign?.showWatermark ?? true,
    showTaxColumn: currentDesign?.showTaxColumn ?? settings.defaultInvoiceDesign?.showTaxColumn ?? true,
    showDiscountColumn: currentDesign?.showDiscountColumn ?? settings.defaultInvoiceDesign?.showDiscountColumn ?? true,
    showPreviousBalance: currentDesign?.showPreviousBalance ?? settings.defaultInvoiceDesign?.showPreviousBalance ?? true,
    headerTitle: currentDesign?.headerTitle || settings.defaultInvoiceDesign?.headerTitle || '',
    notesTitle: String(currentDesign?.notesTitle || settings.defaultInvoiceDesign?.notesTitle || 'توضیحات:').replace(/و\s*شرایط\s*تسویه/g, '').trim() || 'توضیحات:',
    signatureSignerTitle: currentDesign?.signatureSignerTitle || settings.defaultInvoiceDesign?.signatureSignerTitle || 'مهر و امضای مجاز صادرکننده'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Generate a live mock invoice reflecting the selected template and design
  const sampleInvoiceForPreview: Invoice = useMemo(() => {
    if (sourceInvoice) {
      return {
        ...sourceInvoice,
        template: selectedTemplate,
        designConfig: design
      };
    }

    const firstClient = clients[0];
    const hasTax = design.showTaxColumn ?? true;
    const taxRate = hasTax ? (settings.defaultTaxRate || 10) : 0;

    const item1Qty = 1;
    const item1Price = 28000000;
    const item1Disc = 1000000;
    const item1Base = (item1Qty * item1Price) - item1Disc;
    const item1Tax = item1Base * (taxRate / 100);
    const item1Total = item1Base + item1Tax;

    const item2Qty = 2;
    const item2Price = 4500000;
    const item2Disc = 0;
    const item2Base = (item2Qty * item2Price) - item2Disc;
    const item2Tax = item2Base * (taxRate / 100);
    const item2Total = item2Base + item2Tax;

    const subtotal = (item1Qty * item1Price) + (item2Qty * item2Price);
    const totalDiscount = item1Disc + item2Disc;
    const totalTax = item1Tax + item2Tax;
    const grandTotal = (subtotal - totalDiscount) + totalTax;

    return {
      id: 'mock-preview-inv',
      invoiceNumber: '1042',
      clientId: firstClient?.id || 'c1',
      clientName: firstClient?.name || 'مهندس فرید تهرانی',
      type: 'sale',
      status: 'paid',
      template: selectedTemplate,
      designConfig: design,
      date: new Date().toLocaleDateString('fa-IR'),
      dueDate: '۱۴۰۳/۰۷/۱۵',
      items: [
        {
          id: 'item-demo-1',
          itemId: 'i1',
          description: 'پیاده‌سازی ماژول مدیریت اسناد و فاکتورهای رسمی هابینو',
          quantity: item1Qty,
          unitPrice: item1Price,
          discount: item1Disc,
          taxRate,
          total: item1Total
        },
        {
          id: 'item-demo-2',
          itemId: 'i2',
          description: 'پشتیبانی فنی و استقرار نسخه سرور اختصاصی',
          quantity: item2Qty,
          unitPrice: item2Price,
          discount: item2Disc,
          taxRate,
          total: item2Total
        }
      ],
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      amountPaid: grandTotal,
      remainingAmount: 0,
      previousBalance: 5000000,
      totalDebt: 5000000,
      notes: invoiceNote.trim() || settings.invoiceNote || 'این فاکتور جهت پیش‌نمایش قالب صادر گردیده و طراحی انتخابی شما را نشان می‌دهد.',
      terms: invoiceTerms.trim() || settings.invoiceTerms || 'کلیه خدمات تا ۱۲ ماه پس از استقرار مشمول گارانتی و پشتیبانی کامل می‌باشند.'
    };
  }, [selectedTemplate, design, clients, settings.defaultTaxRate, invoiceNote, invoiceTerms, settings.invoiceNote, settings.invoiceTerms]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (onSave) {
        await onSave(selectedTemplate, design, invoiceNote.trim(), invoiceTerms.trim());
      } else {
        await updateSettings({
          defaultInvoiceTemplate: selectedTemplate,
          defaultInvoiceDesign: design,
          invoiceNote: invoiceNote.trim(),
          invoiceTerms: invoiceTerms.trim()
        });
      }

      setSavedSuccess(true);
      onClose();
    } catch (err: any) {
      console.error('[InvoiceSettingsModal] Save error:', err);
      setSaveError(err?.message || 'خطا در اعمال و ذخیره تنظیمات قالب فاکتور. لطفاً مجدداً امتحان کنید.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSelectedTemplate('professional');
    setDesign({
      primaryColor: '#1e40af',
      fontFamily: 'vazir',
      showLogo: true,
      showStamp: true,
      showSignature: true,
      showWatermark: true,
      showTaxColumn: true,
      showDiscountColumn: true,
      headerTitle: '',
      notesTitle: 'توضیحات:',
      signatureSignerTitle: 'مهر و امضای مجاز صادرکننده'
    });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[200] flex items-center justify-center p-3 sm:p-4"
      id="habino-invoice-settings-modal"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (Date.now() - mountTimeRef.current < 300) return;
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl w-full max-h-[94vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col transition-all duration-200 relative z-10 ${
          activeTab === 'preview' ? 'max-w-5xl' : 'max-w-4xl'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">
                انتخاب قالب، رنگ سازمانی، قلم و مشاهده پیش‌نمایش فوری سند
              </p>
            </div>
          </div>

          {/* Tab Switcher: Settings vs Live Preview */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>تنظیمات قالب</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش زنده فاکتور</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              title="بستن و بازگشت به فاکتور"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            تنظیمات قالب با موفقیت ذخیره و در فاکتورها اعمال گردید.
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'settings' ? (
            <>
              {/* 1. Template Choice Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    انتخاب یکی از ۴ قالب استاندارد هابینو:
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    مشاهده زنده این قالب
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(Object.keys(TEMPLATE_METADATA) as InvoiceTemplate[]).map(tmplKey => {
                    const meta = TEMPLATE_METADATA[tmplKey];
                    const isSelected = selectedTemplate === tmplKey;
                    return (
                      <div
                        key={tmplKey}
                        onClick={() => setSelectedTemplate(tmplKey)}
                        className={`p-4 rounded-2xl border-2 text-right cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{meta.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{meta.tagline}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Schematic Visual Badge */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium truncate max-w-[200px]">
                            {meta.previewSnippet}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[9px]">
                            {meta.enName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Palette */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  رنگ برجسته سازمانی (Brand Accent Color):
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {COLOR_PALETTES.map(col => {
                    const isSelected = design.primaryColor?.toLowerCase() === col.hex.toLowerCase();
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setDesign(prev => ({ ...prev, primaryColor: col.hex }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-block border border-black/10"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span>{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Typography */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-blue-600" />
                  قلم و تایپوگرافی متن فاکتور:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FONT_OPTIONS.map(font => (
                    <label
                      key={font.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                        design.fontFamily === font.id
                          ? 'border-blue-600 bg-blue-50/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fontFamily"
                        checked={design.fontFamily === font.id}
                        onChange={() => setDesign(prev => ({ ...prev, fontFamily: font.id }))}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">{font.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{font.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Display Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  اجزای نمایشی و اعتباری فاکتور:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showLogo}
                      onChange={e => setDesign(prev => ({ ...prev, showLogo: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">نمایش لوگوی شرکت</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showStamp}
                      onChange={e => setDesign(prev => ({ ...prev, showStamp: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">نمایش کادر مهر</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showSignature}
                      onChange={e => setDesign(prev => ({ ...prev, showSignature: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">نمایش امضای مجاز</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showWatermark}
                      onChange={e => setDesign(prev => ({ ...prev, showWatermark: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">واترمارک وضعیت تسویه</span>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showTaxColumn}
                      onChange={e => setDesign(prev => ({ ...prev, showTaxColumn: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-700 block text-xs">محاسبه و ستون مالیات ارزش افزوده</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">با برداشتن تیک، مالیات در فاکتورها محاسبه نمی‌گردد</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                    <input
                      type="checkbox"
                      checked={design.showDiscountColumn}
                      onChange={e => setDesign(prev => ({ ...prev, showDiscountColumn: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-700 block text-xs">ستون و اعمال تخفیف اقلام</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">نمایش و محاسبه تخفیف در فاکتور</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 col-span-2 sm:col-span-3">
                    <input
                      type="checkbox"
                      checked={design.showPreviousBalance}
                      onChange={e => setDesign(prev => ({ ...prev, showPreviousBalance: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-700 block text-xs">قید مانده از قبل و جمع کل بدهی طرف‌حساب</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">محاسبه و درج تراز پیشین مشتری و محاسبه جمع کل مانده بدهی نهایی در فاکتور چاپی</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. Custom Titles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">عنوان سربرگ اختصاصی (اختیاری):</label>
                  <input
                    type="text"
                    placeholder="مثال: صورت‌حساب جامع خدمات فنی و مهندسی"
                    value={design.headerTitle || ''}
                    onChange={e => setDesign(prev => ({ ...prev, headerTitle: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">عنوان بخش توضیحات فاکتور:</label>
                  <input
                    type="text"
                    placeholder="توضیحات:"
                    value={design.notesTitle || 'توضیحات:'}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/و\s*شرایط\s*تسویه/g, '').trim();
                      setDesign(prev => ({ ...prev, notesTitle: cleaned || 'توضیحات:' }));
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">عنوان بخش امضا / تاییدیه:</label>
                  <input
                    type="text"
                    placeholder="مثال: مهر و امضای مدیر پروژه / مسئول مالی"
                    value={design.signatureSignerTitle || ''}
                    onChange={e => setDesign(prev => ({ ...prev, signatureSignerTitle: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* 6. Default Invoice Notes & Settlement Terms */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    <span>متن توضیحات و شرایط پرداخت پیش‌فرض فاکتور:</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    این متون به صورت خودکار در انتهای تمام فاکتورهای جدید درج می‌شوند.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">متن یادداشت و توضیحات فاکتور:</label>
                      <button
                        type="button"
                        onClick={() => setInvoiceNote('با تشکر از حسن انتخاب و اعتماد شما. کلیه اقلام طبق مشخصات تحویل گردید.')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        درج متن پیش‌فرض
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={invoiceNote}
                      onChange={e => setInvoiceNote(e.target.value)}
                      placeholder="متن یادداشت و توضیحات پایین فاکتور..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed resize-y focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">شرایط پرداخت و تسویه حساب:</label>
                      <button
                        type="button"
                        onClick={() => setInvoiceTerms('مهلت تسویه حساب حداکثر ۱۰ روز پس از صدور صورت‌حساب می‌باشد.')}
                        className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        درج متن پیش‌فرض
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={invoiceTerms}
                      onChange={e => setInvoiceTerms(e.target.value)}
                      placeholder="شرایط تسویه، شماره شبا یا قوانین فاکتور..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed resize-y focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Live Preview Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">پیش‌نمایش زنده قالب انتخاب شده:</span>
                  <span className="font-semibold bg-white px-2 py-0.5 rounded-md text-blue-700 border border-blue-200">
                    {TEMPLATE_METADATA[selectedTemplate]?.name || 'قالب انتخابی'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">رنگ سازمانی:</span>
                  <span
                    className="w-4 h-4 rounded-full inline-block border border-black/10"
                    style={{ backgroundColor: design.primaryColor }}
                  />
                </div>
              </div>

              {/* Render Full Invoice Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-100 p-2 sm:p-4">
                <div className="max-w-4xl mx-auto bg-white shadow-md rounded-xl overflow-hidden">
                  <InvoicePreview
                    invoice={sampleInvoiceForPreview}
                    onClose={() => setActiveTab('settings')}
                    isInline={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-slate-800 text-xs rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی پیش‌فرض</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {saveError && (
              <span className="text-xs text-rose-600 font-semibold px-2">{saveError}</span>
            )}

            {activeTab === 'settings' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>مشاهده پیش‌نمایش</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span>ویرایش تنظیمات</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              انصراف و بازگشت
            </button>

            <button
              type="button"
              id="save-invoice-customization-btn"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>در حال ذخیره‌سازی...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>با موفقیت ذخیره شد</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ذخیره و اعمال تنظیمات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // انتقال مودال تنظیمات به صورت پرتال روی document.body با z-[90] تا همواره بالای پیش‌نمایش فاکتور (z-50) قرار گیرد
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
