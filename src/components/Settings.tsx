import React, { useState, useEffect, useRef } from 'react';
import { useAccounting } from '../lib/store';
import { CurrencyType, InvoiceTemplate, InvoiceDesignConfig, SSODisketteConfig } from '../types';
import {
  Settings as SettingsIcon,
  Save,
  Building,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  Percent,
  ShieldCheck,
  Database,
  Key,
  Download,
  Palette,
  FileCheck2,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Code,
  RefreshCw,
  Lock,
  BookOpen,
  FileText,
  Sparkles
} from 'lucide-react';
import { getRemainingDays, TIER_DETAILS } from '../lib/licenseEngine';
import { downloadBackupJson } from '../lib/backupEngine';
import { getStoredSSOConfig, saveStoredSSOConfig } from '../lib/payrollEngine';
import { InvoiceSettingsModal, TEMPLATE_METADATA } from './InvoiceSettingsModal';
import { SecuritySettingsTab } from './settings/SecuritySettingsTab';
import { TutorialsTab } from './settings/TutorialsTab';

export interface SettingsProps {
  onClose?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { settings, updateSettings, setCurrency, license, triggerManualBackup, isSupabaseLive, activeTenant } = useAccounting();

  const isDirtyRef = useRef(false);
  const [name, setName] = useState(settings.name);
  const [legalName, setLegalName] = useState(settings.legalName || '');
  const [phone, setPhone] = useState(settings.phone);
  const [economicCode, setEconomicCode] = useState(settings.economicCode || '');
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurr] = useState<CurrencyType>(settings.currency);
  const [enableVat, setEnableVat] = useState<boolean>(
    settings.defaultInvoiceDesign?.showTaxColumn ?? (settings.defaultTaxRate > 0)
  );
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate || 10);
  const [invoiceNote, setInvoiceNote] = useState(settings.invoiceNote || '');
  const [invoiceTerms, setInvoiceTerms] = useState(settings.invoiceTerms || '');
  const [ssoConfig, setSsoConfig] = useState<SSODisketteConfig>(() => {
    return settings.ssoConfig || getStoredSSOConfig();
  });

  // همگام‌سازی بلادرنگ فیلدهای فرم با تنظیمات پایدار ذخیره‌شده (در صورت عدم تغییر دستی توسط کاربر)
  useEffect(() => {
    if (!isDirtyRef.current) {
      setName(settings.name || 'شرکت هابینو');
      setLegalName(settings.legalName || '');
      setPhone(settings.phone || '');
      setEconomicCode(settings.economicCode || '');
      setAddress(settings.address || '');
      setCurr(settings.currency || 'IRT');
      setEnableVat(settings.defaultInvoiceDesign?.showTaxColumn ?? (settings.defaultTaxRate > 0));
      setDefaultTaxRate(settings.defaultTaxRate || 10);
      setInvoiceNote(settings.invoiceNote || '');
      setInvoiceTerms(settings.invoiceTerms || '');
      if (settings.ssoConfig) {
        setSsoConfig(settings.ssoConfig);
      } else {
        setSsoConfig(getStoredSSOConfig());
      }
    }
  }, [settings]);

  // UI state for Save operations
  const [activeTab, setActiveTab] = useState<'business' | 'invoices' | 'security' | 'tutorials'>('business');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingInvoices, setIsSavingInvoices] = useState(false);
  const [invoiceSaveSuccess, setInvoiceSaveSuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveInvoiceSettingsOnly = async () => {
    setIsSavingInvoices(true);
    try {
      const mergedDesign: InvoiceDesignConfig = {
        ...(settings.defaultInvoiceDesign || currentDesign),
        showTaxColumn: enableVat
      };

      const payload = {
        invoiceNote: invoiceNote.trim(),
        invoiceTerms: invoiceTerms.trim(),
        defaultInvoiceTemplate: currentTemplate,
        defaultTaxRate: enableVat ? (Number(defaultTaxRate) || 10) : 0,
        defaultInvoiceDesign: mergedDesign
      };

      const res = await updateSettings(payload);
      isDirtyRef.current = false;

      // Force guaranteed direct write to local storage caches as secondary resilience
      const tId = activeTenant?.id || 'tenant-main';
      try {
        const existingRaw = localStorage.getItem(`habino_settings_${tId}`) || localStorage.getItem('habino_settings');
        const existingObj = existingRaw ? JSON.parse(existingRaw) : {};
        const combined = { ...existingObj, ...payload, defaultInvoiceDesign: mergedDesign };
        localStorage.setItem(`habino_settings_${tId}`, JSON.stringify(combined));
        if (tId === 'tenant-main') {
          localStorage.setItem('habino_settings', JSON.stringify(combined));
        }
      } catch (_) {}

      setInvoiceSaveSuccess(true);
      setTimeout(() => setInvoiceSaveSuccess(false), 4000);
    } catch (e) {
      console.error('Invoice settings save error:', e);
    } finally {
      setIsSavingInvoices(false);
    }
  };

  const remaining = getRemainingDays(license.expiresAt);
  const tierInfo = TIER_DETAILS[license.tier] || TIER_DETAILS.pro;

  const currentTemplate = settings.defaultInvoiceTemplate || 'professional';
  const currentDesign = settings.defaultInvoiceDesign || {
    primaryColor: '#1e40af',
    fontFamily: 'vazir',
    showLogo: true,
    showStamp: true,
    showSignature: true,
    showWatermark: true,
    showTaxColumn: true,
    showDiscountColumn: true,
    showPreviousBalance: true,
    notesTitle: 'توضیحات:',
    signatureSignerTitle: 'مهر و امضای مجاز صادرکننده'
  };

  const sqlScript = `-- ==============================================================================
-- اسکریپت جامع هابینو حسابداری برای سوپابیس (Supabase Production Schema)
-- استانداردسازی کامل تنظیمات کسب‌وکار، شرایط تسویه، طراحی فاکتور و ماژول‌های حسابداری
-- ==============================================================================

-- ۱. جدول تنظیمات شرکت، هویت سازمانی، شرایط تسویه و طراحی فاکتورها
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL UNIQUE DEFAULT 'tenant-main',
    name VARCHAR(255) NOT NULL DEFAULT 'شرکت هابینو',
    legal_name VARCHAR(255),
    economic_code VARCHAR(50),
    national_id VARCHAR(50),
    registration_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(50),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'IRT',
    tax_rate NUMERIC(5, 2) DEFAULT 10.00,
    default_tax_rate NUMERIC(5, 2) DEFAULT 10.00,
    invoice_note TEXT,
    invoice_terms TEXT,
    default_template VARCHAR(50) DEFAULT 'professional',
    logo_url TEXT,
    stamp_url TEXT,
    signature_url TEXT,
    guild VARCHAR(50) DEFAULT 'services',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- افزودن ستون‌های جدید در صورت وجود نسخه قدیمی‌تر جدول
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS economic_code VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IRT';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS invoice_note TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS invoice_terms TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_template VARCHAR(50) DEFAULT 'professional';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS guild VARCHAR(50) DEFAULT 'services';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- فعال‌سازی دسترسی امن (RLS)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_settings_permissive_access" ON public.company_settings;
CREATE POLICY "company_settings_permissive_access" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);

-- ۲. جدول اسناد دفتر روزنامه و اسناد دوبل حسابداری (Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS public.accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    entry_number VARCHAR(50) NOT NULL,
    date VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved',
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounting_entries_access" ON public.accounting_entries;
CREATE POLICY "accounting_entries_access" ON public.accounting_entries FOR ALL USING (true) WITH CHECK (true);

-- ۳. جدول فاکتورهای رسمی و پیش‌فاکتورها
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    invoice_number VARCHAR(50) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'sale',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    template VARCHAR(50) DEFAULT 'professional',
    date VARCHAR(20) NOT NULL,
    due_date VARCHAR(20),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_discount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(18, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    previous_balance NUMERIC(18, 2) DEFAULT 0,
    total_debt NUMERIC(18, 2) DEFAULT 0,
    notes TEXT,
    terms TEXT,
    design_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS design_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_access" ON public.invoices;
CREATE POLICY "invoices_access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- ایندکس‌های تسریع کوئری و تفکیک مستأجرین
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant ON public.company_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_tenant ON public.accounting_entries(tenant_id);
`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const updatedDesign: InvoiceDesignConfig = {
        ...(settings.defaultInvoiceDesign || currentDesign),
        showTaxColumn: enableVat
      };

      const result = await updateSettings({
        name: name.trim() || 'شرکت هابینو',
        legalName: legalName.trim(),
        phone: phone.trim(),
        economicCode: economicCode.trim(),
        address: address.trim(),
        currency,
        defaultTaxRate: enableVat ? (Number(defaultTaxRate) || 10) : 0,
        defaultInvoiceDesign: updatedDesign,
        invoiceNote: invoiceNote.trim(),
        invoiceTerms: invoiceTerms.trim(),
        ssoConfig: ssoConfig
      });

      saveStoredSSOConfig(ssoConfig);

      setCurrency(currency);
      setSaveStatus('success');
      setSaveMessage(result?.message || 'تنظیمات با موفقیت در پایگاه داده ذخیره شد.');

      // Close the form after confirming save in database as explicitly requested
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          setSaveStatus('idle');
          setIsSaving(false);
        }
      }, 950);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(`خطا در ذخیره‌سازی: ${err.message || 'مشکل ناشناخته'}`);
      setIsSaving(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleQuickBackup = () => {
    const snapshot = triggerManualBackup();
    downloadBackupJson(snapshot);
  };

  return (
    <div className="space-y-6 max-w-4xl relative" id="settings-module">
      {/* Header with Title and Close / SQL buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">تنظیمات کسب‌وکار و فاکتورها</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">مشخصات حقوقی، واحد پولی رسمی، نرخ مالیات، قالب‌ها و ذخیره‌سازی ابری</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Supabase SQL Script Viewer Button */}
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-slate-300"
            title="مشاهده کدهای SQL سوپابیس برای بارگذاری در دیتابیس"
          >
            <Code className="w-3.5 h-3.5 text-blue-600" />
            <span>کدهای SQL سوپابیس</span>
          </button>

          {/* Explicit Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="بستن فرم تنظیمات"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation & Status Banners */}
      {saveStatus === 'success' && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-600 text-white rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">ذخیره‌سازی با موفقیت انجام شد</p>
              <p className="text-xs text-emerald-700 mt-0.5">{saveMessage}</p>
              <p className="text-[11px] text-emerald-600 mt-1">فرم به نشانه تایید ذخیره‌سازی در حال بسته شدن است...</p>
            </div>
          </div>
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">خطا در ذخیره اطلاعات</p>
            <p className="mt-0.5">{saveMessage}</p>
          </div>
        </div>
      )}

      {/* Quick License & Backup summary card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{tierInfo.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {license.tier.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {license.tier === 'enterprise' ? 'بدون محدودیت زمانی (مادام‌العمر)' : `${remaining} روز تا پایان دوره`}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono dir-ltr">{license.licenseKey}</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">وضعیت پایگاه داده ابری</span>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSupabaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isSupabaseLive ? 'متصل به سرور ابری سوپابیس' : 'ذخیره‌ساز محلی (آفلاین / صف امن)'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickBackup}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>پشتیبان‌گیری JSON</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'business'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>مشخصات کسب‌وکار و مالیات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>قالب‌ها و توضیحات فاکتور</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>امنیت و تنظیم کلمه عبور</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tutorials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tutorials'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>مرکز آموزش و پایگاه دانش</span>
        </button>
      </div>

      {activeTab === 'security' && <SecuritySettingsTab />}

      {activeTab === 'tutorials' && <TutorialsTab />}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                تنظیمات جامع قالب‌ها، یادداشت‌ها و طراحی فاکتور
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                شخصی‌سازی ظاهر چاپ، متون پیش‌فرض انتهایی، شماره‌گذاری و ارکان رسمی فاکتورهای فروش و خدمات هابینو
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDesignModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Palette className="w-4 h-4 text-amber-400" />
                <span>استودیوی شخصی‌سازی و پیش‌نمایش زنده</span>
              </button>
            </div>
          </div>

          {/* Quick Invoice Save Feedback */}
          {invoiceSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تنظیمات و متون فاکتور با موفقیت در پایگاه داده و حافظه محلی ذخیره و تثبیت گردید.</span>
            </div>
          )}

          {/* 1. Default Template Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>انتخاب قالب پیش‌فرض فاکتور:</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'professional', name: 'قالب حرفه‌ای (Professional)', desc: 'سربرگ آبی تیره رسمی با جدول استاندارد و کادر حسابداری' },
                { id: 'modern', name: 'قالب مدرن (Modern)', desc: 'طراحی شیک نئومورفیک با سایه‌های نرم و رنگ‌بندی منعطف' },
                { id: 'minimal', name: 'قالب مینیمال (Minimal)', desc: 'بسیار کم‌جوهر، خطوط ساده و بهینه برای پرینت‌های سریع' },
                { id: 'classic', name: 'قالب کلاسیک (Classic)', desc: 'فاکتور سنتی شرکتی با دو خط مشکی و تفکیک سنتی بدهکار/بستانکار' }
              ].map(tmpl => {
                const isSelected = (settings.defaultInvoiceTemplate || 'professional') === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={async () => {
                      await updateSettings({ defaultInvoiceTemplate: tmpl.id as any });
                      setInvoiceSaveSuccess(true);
                      setTimeout(() => setInvoiceSaveSuccess(false), 3000);
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-800">{tmpl.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{tmpl.desc}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 mt-2 block">
                      {isSelected ? 'قالب فعال' : 'انتخاب به عنوان پیش‌فرض'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Default Notes and Terms (The core fix) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>متن یادداشت و شرایط پرداخت پیش‌فرض فاکتورها</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  این متن‌ها به محض ایجاد فاکتور جدید بارگذاری شده و در پایین فاکتورهای چاپی و PDF درج می‌گردند.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveInvoiceSettingsOnly}
                disabled={isSavingInvoices}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isSavingInvoices ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>ذخیره متون فاکتور</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 block text-xs">یادداشت و متن توضیحات پیش‌فرض فاکتور</label>
                  <button
                    type="button"
                    onClick={() => setInvoiceNote('از حسن انتخاب و اعتماد شما سپاسگزاریم. کلیه خدمات و اقلام به تایید رسید.')}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    درج نمونه آماده
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={invoiceNote}
                  onChange={e => {
                    isDirtyRef.current = true;
                    setInvoiceNote(e.target.value);
                  }}
                  placeholder="مثال: از حسن انتخاب و اعتماد شما سپاسگزاریم. کلیه اقلام طبق مشخصات تحویل گردید."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  قابل ویرایش در زمان صدور هر فاکتور به صورت جداگانه.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 block text-xs">شرایط تسویه و مهلت پرداخت</label>
                  <button
                    type="button"
                    onClick={() => {
                      isDirtyRef.current = true;
                      setInvoiceTerms('مهلت تسویه حساب حداکثر ۱۰ روز پس از صدور صورت‌حساب می‌باشد. پرداخت از طریق شماره شبا اعلامی.');
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    درج نمونه آماده
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={invoiceTerms}
                  onChange={e => {
                    isDirtyRef.current = true;
                    setInvoiceTerms(e.target.value);
                  }}
                  placeholder="مثال: مهلت تسویه تا ۷ روز کاری پس از تاریخ صدور می‌باشد. کلیه خدمات مشمول گارانتی می‌باشند."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  شامل شماره حساب، شماره شبا یا قوانین لغو سفارش و عودت کالا.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Invoice Tax and VAT Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">ستون مالیات بر ارزش افزوده در فاکتور:</span>
                <span className="text-[11px] text-slate-400">نمایش یا عدم نمایش ستون ارزش افزوده در اقلام فاکتور</span>
              </div>
              <input
                type="checkbox"
                checked={enableVat}
                onChange={e => setEnableVat(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">درصد مالیات پیش‌فرض:</span>
                <span className="text-[11px] text-slate-400">نرخ رسمی مالیات سال جاری (۱۰ درصد)</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultTaxRate}
                  onChange={e => setDefaultTaxRate(Number(e.target.value))}
                  disabled={!enableVat}
                  className="w-16 p-1.5 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-50"
                />
                <span className="text-xs text-slate-500">٪</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveInvoiceSettingsOnly}
              disabled={isSavingInvoices}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              {isSavingInvoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره نهایی کلیه تنظیمات فاکتور</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      {activeTab === 'business' && (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                نام تجاری شرکت / خدمات
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: شرکت خدمات فنی و مهندسی هابینو"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                نام رسمی و ثبتی (حقوقی)
              </label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="مثال: شرکت توسعه تجارت هابینو با مسئولیت محدود"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                شماره تماس و پشتیبانی
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="مثال: ۰۲۱-۸۸۸۸۸۸۸۸"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs dir-ltr text-right"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-400" />
                کد اقتصادی / شناسه ملی
              </label>
              <input
                type="text"
                value={economicCode}
                onChange={e => setEconomicCode(e.target.value)}
                placeholder="مثال: ۴۱۱۳۴۵۶۷۸۹"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs dir-ltr text-right"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              آدرس دفتر مرکزی و کد پستی
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="تهران، خیابان ولیعصر، برج فناوری..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
            />
          </div>

          {/* Visual Invoice Template Customization Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">طراحی و شخصی‌سازی قالب پیش‌فرض فاکتورها</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  قالب فعلی: <span className="font-semibold text-blue-700">{TEMPLATE_METADATA[currentTemplate]?.name || currentTemplate}</span> | فونت: <span className="font-mono text-slate-700">{currentDesign.fontFamily || 'vazir'}</span> | رنگ برند:
                  <span className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle border border-slate-300" style={{ backgroundColor: currentDesign.primaryColor || '#1e40af' }} />
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDesignModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-semibold text-xs shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-4 h-4 text-blue-600" />
              شخصی‌سازی ظاهر فاکتور
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-400" />
                واحد پولی پیش‌فرض سیستم
              </label>
              <select
                value={currency}
                onChange={e => setCurr(e.target.value as CurrencyType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
              >
                <option value="IRT">تومان (IRT) - واحد متداول کسب‌وکار</option>
                <option value="IRR">ریال (IRR) - استاندارد رسمی دفاتر مالی</option>
                <option value="USD">دلار آمریکا (USD)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">کلیه اسناد و فاکتورهای آتی با این واحد پولی صادر می‌شوند.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-slate-400" />
                  نرخ پیش‌فرض مالیات بر ارزش افزوده (VAT)
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableVat}
                    onChange={e => setEnableVat(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!enableVat}
                  value={enableVat ? defaultTaxRate : 0}
                  onChange={e => setDefaultTaxRate(Number(e.target.value))}
                  placeholder="۱۰"
                  className={`w-full p-2.5 border rounded-xl font-mono text-xs ${
                    enableVat ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">درصد (%)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {enableVat
                  ? 'نرخ مالیات با این درصد به عنوان پیش‌فرض در صدور فاکتورها اعمال می‌گردد.'
                  : 'با غیرفعال‌سازی، مالیات بر ارزش افزوده در فاکتورها محاسبه نمی‌شود.'}
              </p>
            </div>
          </div>

          {/* Invoice Default Notes & Settlement Terms Card */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    تنظیمات پیش‌فرض یادداشت و توضیحات فاکتورها
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    این متن‌ها به طور خودکار در پایان کلیه فاکتورهای فروش و خدمات جدید درج می‌شوند.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {invoiceSaveSuccess && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ذخیره شد
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveInvoiceSettingsOnly}
                  disabled={isSavingInvoices}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {isSavingInvoices ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>ذخیره فوری متون فاکتور</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 block text-xs">یادداشت و متن توضیحات پیش‌فرض فاکتور</label>
                  <button
                    type="button"
                    onClick={() => setInvoiceNote('از خرید و اعتماد شما سپاسگزاریم. کلیه اقلام طبق مشخصات تحویل گردید.')}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    نمونه پیش‌فرض
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={invoiceNote}
                  onChange={e => setInvoiceNote(e.target.value)}
                  placeholder="مثال: از حسن انتخاب و اعتماد شما سپاسگزاریم. کلیه مبالغ به صورت خالص درج شده‌اند."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed resize-y focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 block text-xs">شرایط تسویه و مهلت پرداخت</label>
                  <button
                    type="button"
                    onClick={() => setInvoiceTerms('مهلت تسویه حساب حداکثر ۱۰ روز پس از صدور صورت‌حساب می‌باشد.')}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    نمونه پیش‌فرض
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={invoiceTerms}
                  onChange={e => setInvoiceTerms(e.target.value)}
                  placeholder="مثال: مهلت تسویه تا ۷ روز کاری پس از تاریخ صدور می‌باشد."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed resize-y focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Social Security Insurance (SSO) Config Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-slate-50 border border-emerald-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    تنظیمات بیمه تأمین اجتماعی و نرخ‌های متغیر کارگاه (SSO)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تعیین درصدهای حق بیمه سهم کارگر، کارفرما و بیکاری برای سال‌های مالی و کارگاه‌های مختلف
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSsoConfig({
                      ...ssoConfig,
                      employeeRate: 7,
                      employerRate: 20,
                      unemploymentRate: 3,
                      extraHardLaborRate: 0,
                      isExemptWorkshop5Persons: false
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  پایه (۷٪ + ۲۰٪ + ۳٪)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSsoConfig({
                      ...ssoConfig,
                      employeeRate: 7,
                      employerRate: 20,
                      unemploymentRate: 3,
                      extraHardLaborRate: 4,
                      isExemptWorkshop5Persons: false
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  مشاغل سخت (+۴٪)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSsoConfig({
                      ...ssoConfig,
                      employeeRate: 7,
                      employerRate: 0,
                      unemploymentRate: 3,
                      extraHardLaborRate: 0,
                      isExemptWorkshop5Persons: true
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  معافیت ۵ نفره (۱۰٪)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">کد کارگاه تأمین اجتماعی:</label>
                <input
                  type="text"
                  value={ssoConfig.workshopCode}
                  onChange={e => setSsoConfig({ ...ssoConfig, workshopCode: e.target.value })}
                  placeholder="0184920481"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">ردیف پیمان (در صورت وجود):</label>
                <input
                  type="text"
                  value={ssoConfig.subContractCode}
                  onChange={e => setSsoConfig({ ...ssoConfig, subContractCode: e.target.value })}
                  placeholder="000"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">شعبه تأمین اجتماعی:</label>
                <input
                  type="text"
                  value={ssoConfig.insuranceBranch}
                  onChange={e => setSsoConfig({ ...ssoConfig, insuranceBranch: e.target.value })}
                  placeholder="شعبه ۱۱ تهران"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">نام کارفرما / مدیر:</label>
                <input
                  type="text"
                  value={ssoConfig.employerName}
                  onChange={e => setSsoConfig({ ...ssoConfig, employerName: e.target.value })}
                  placeholder="مهندس حسام طهرانی"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Configurable Percentages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="text-slate-600 font-medium block mb-1">درصد سهم کارگر:</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ssoConfig.employeeRate ?? 7}
                    onChange={e => setSsoConfig({ ...ssoConfig, employeeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-1.5 pr-2 pl-6 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">٪</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض: ۷ درصد (متغیر بر حسب سال/قرارداد)</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="text-slate-600 font-medium block mb-1">درصد سهم کارفرما:</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ssoConfig.employerRate ?? 20}
                    onChange={e => setSsoConfig({ ...ssoConfig, employerRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-1.5 pr-2 pl-6 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">٪</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض: ۲۰ درصد (متغیر بر حسب کارگاه)</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="text-slate-600 font-medium block mb-1">درصد بیمه بیکاری:</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ssoConfig.unemploymentRate ?? 3}
                    onChange={e => setSsoConfig({ ...ssoConfig, unemploymentRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-1.5 pr-2 pl-6 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">٪</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض: ۳ درصد سهم کارفرما</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <label className="text-slate-600 font-medium block mb-1">مشاغل سخت و زیان‌آور:</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ssoConfig.extraHardLaborRate ?? 0}
                    onChange={e => setSsoConfig({ ...ssoConfig, extraHardLaborRate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-1.5 pr-2 pl-6 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">٪</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">معمولاً ۴٪ مازاد سهم کارفرما</span>
              </div>
            </div>

            <div className="p-2.5 bg-white border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950">سرجمع درصد کل بیمه کارگاه:</span>
                <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-300">
                  {(ssoConfig.employeeRate ?? 7) + (ssoConfig.employerRate ?? 20) + (ssoConfig.unemploymentRate ?? 3) + (ssoConfig.extraHardLaborRate ?? 0)}٪
                </span>
                <span className="text-[11px] text-slate-500">
                  ({(ssoConfig.employerRate ?? 20) + (ssoConfig.unemploymentRate ?? 3) + (ssoConfig.extraHardLaborRate ?? 0)}٪ کارفرما + {ssoConfig.employeeRate ?? 7}٪ کارگر)
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ssoConfig.isExemptWorkshop5Persons ?? false}
                  onChange={e => setSsoConfig({ ...ssoConfig, isExemptWorkshop5Persons: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-semibold text-slate-700">معافیت حق بیمه تا ۵ نفر کارگر</span>
              </label>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                انصراف و بستن
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                isSaving 
                  ? 'bg-blue-400 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ذخیره در دیتابیس...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات و بستن فرم</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Supabase SQL Migration Viewer Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">اسکریپت SQL سوپابیس برای جدول تنظیمات (company_settings)</h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                این اسکریپت SQL جدول <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">company_settings</code> را با تمامی فیلدهای مورد نیاز و سیاست‌های دسترسی امن (RLS) در پایگاه داده سوپابیس شما ایجاد و هماهنگ می‌سازد.
              </p>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 dir-ltr leading-5">
                  {sqlScript}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'کپی شد!' : 'کپی اسکریپت'}</span>
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                <strong>نحوه استفاده در سوپابیس:</strong> وارد کنسول Supabase شده، به منوی <strong>SQL Editor</strong> بروید، کد بالا را Paste کرده و دکمه <strong>Run</strong> را بزنید.
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Template Design Modal */}
      {showDesignModal && (
        <InvoiceSettingsModal
          currentTemplate={currentTemplate}
          currentDesign={currentDesign}
          onClose={() => setShowDesignModal(false)}
          onSave={async (tmpl, dsg, note, trms) => {
            const updatePayload: any = {
              defaultInvoiceTemplate: tmpl,
              defaultInvoiceDesign: dsg
            };
            if (note !== undefined) {
              updatePayload.invoiceNote = note;
              setInvoiceNote(note);
            }
            if (trms !== undefined) {
              updatePayload.invoiceTerms = trms;
              setInvoiceTerms(trms);
            }
            await updateSettings(updatePayload);
            setInvoiceSaveSuccess(true);
            setTimeout(() => setInvoiceSaveSuccess(false), 3000);
          }}
        />
      )}
    </div>
  );
};
