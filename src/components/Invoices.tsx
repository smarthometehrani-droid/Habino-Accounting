import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../lib/store';
import { Invoice, InvoiceItem, InvoiceTemplate, InvoiceType, InvoiceDesignConfig, Client } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { calculateTotal, calculateSubtotal, calculateTotalTax, calculateTotalDiscount } from '../lib/calculations';
import { playScanBeep, playErrorBeep } from '../lib/barcodeEngine';
import {
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  FileCheck,
  Search,
  Sliders,
  Edit,
  Printer,
  Sparkles,
  Package,
  ScanLine,
  Camera,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Cloud,
  RefreshCw,
  UploadCloud,
  Check,
  AlertTriangle,
  Loader2,
  UserPlus,
  Building2,
  User,
  X,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Save,
  FileClock,
  RotateCcw,
  History,
  PenTool,
  Share2,
  ShieldCheck
} from 'lucide-react';
import { exportInvoicesListToCsv, exportSingleInvoiceToCsv } from '../lib/exportUtils';
import { InvoicePreview } from './InvoicePreview';
import { InvoiceSettingsModal } from './InvoiceSettingsModal';
import { SearchableClientSelect } from './SearchableClientSelect';
import { QuickBarcodeScannerModal } from './QuickBarcodeScannerModal';
import { PcPosModal } from './PcPosModal';
import { PosPaymentReceipt } from '../lib/pcPosEngine';
import { GuildStrategyResolver } from '../lib/guildFormStrategy';
import { DynamicGuildFormSection } from './DynamicGuildFormSection';
import { HabinoAccountingKernel } from '../lib/accountingKernel';
import { HabinoDistributedLockManager } from '../lib/distributedLockEngine';
import { HabinoJsonbSchemaValidator } from '../lib/jsonbSchemaValidator';
import { PhysicalSignatureCanvas } from './PhysicalSignatureCanvas';
import { ShareInvoiceModal } from './ShareInvoiceModal';
import { uploadAndRecordSignature } from '../lib/signatureService';
import { habinoErrorLogger } from '../lib/errorLogger';

/**
 * گیت امنیتی و اعتبارسنجی جامع حضور، هویت و سلامت فیلد client_id
 * انطباق ۱۰۰٪ با قوانین ۹‌گانه ثبت اسناد مالی (اصول ۱، ۵ و ۸) و ایزولاسیون مستأجرین (RLS)
 */
export function validateInvoiceClientId(
  rawClientId: unknown,
  availableClients: Client[] = [],
  options?: {
    tenantId?: string;
    isProforma?: boolean;
    allowInactive?: boolean;
  }
): {
  isValid: boolean;
  clientId?: string;
  client?: Client;
  errorFa?: string;
  errorCode?: 'MISSING_CLIENT' | 'INVALID_FORMAT' | 'INJECTION_DETECTED' | 'CLIENT_NOT_FOUND' | 'CLIENT_INACTIVE' | 'TENANT_MISMATCH';
} {
  // ۱. بررسی حضور فیلد (Presence Validation) - مطابق اصل ۱ و ۸ منشور هابینو
  if (rawClientId === null || rawClientId === undefined) {
    return {
      isValid: false,
      errorCode: 'MISSING_CLIENT',
      errorFa: 'ثبت سند بدون مخاطب مجاز نیست.'
    };
  }

  const clientIdStr = typeof rawClientId === 'string' ? rawClientId.trim() : String(rawClientId).trim();

  if (!clientIdStr) {
    return {
      isValid: false,
      errorCode: 'MISSING_CLIENT',
      errorFa: 'ثبت سند بدون مخاطب مجاز نیست.'
    };
  }

  // جلوگیری از مقادیر تهی متنی یا ساختگی
  const forbiddenLiterals = ['null', 'undefined', 'nan', '[object object]', '0', 'none', 'false', '""', "''"];
  if (forbiddenLiterals.includes(clientIdStr.toLowerCase())) {
    return {
      isValid: false,
      errorCode: 'MISSING_CLIENT',
      errorFa: 'ثبت سند بدون مخاطب مجاز نیست.'
    };
  }

  // ۲. بررسی کاراکترهای مخرب و تزریق (Sanitization Guard)
  if (/[<>'";\\`]/.test(clientIdStr) || /\s/.test(clientIdStr)) {
    return {
      isValid: false,
      errorCode: 'INJECTION_DETECTED',
      errorFa: 'شناسه مخاطب (client_id) حاوی کاراکترهای غیرمجاز است.'
    };
  }

  // ۲. بررسی صحت فرمت (Format Validation)
  // فرمت فیلد client_id در دیتابیس هابینو باید یا UUID استاندارد یا شناسه امن الفبانومریک با طول ۲ تا ۱۲۸ کاراکتر باشد
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  const standardIdentifierRegex = /^[a-zA-Z0-9_\-.:]{2,128}$/;

  if (!uuidRegex.test(clientIdStr) && !standardIdentifierRegex.test(clientIdStr)) {
    return {
      isValid: false,
      errorCode: 'INVALID_FORMAT',
      errorFa: 'فرمت شناسه طرف‌حساب (client_id) نامعتبر است.'
    };
  }

  // ۳. بررسی ارجاعی و وضعیت فعال بودن مخاطب - مطابق اصل ۵ منشور هابینو
  if (availableClients && availableClients.length > 0) {
    const matchedClient = availableClients.find(c => c.id === clientIdStr);
    if (!matchedClient) {
      return {
        isValid: false,
        errorCode: 'CLIENT_NOT_FOUND',
        errorFa: 'طرف‌حساب مورد نظر در فهرست اشخاص سامانه یافت نشد یا حذف گردیده است.'
      };
    }

    // بررسی ایزولاسیون مستأجر (Multi-Tenant Isolation Guard)
    if (options?.tenantId && matchedClient.tenantId && matchedClient.tenantId !== 'tenant-main') {
      if (options.tenantId !== 'all' && matchedClient.tenantId !== options.tenantId) {
        return {
          isValid: false,
          errorCode: 'TENANT_MISMATCH',
          errorFa: 'مخاطب انتخاب‌شده متعلق به این سازمان/مستأجر نیست.'
        };
      }
    }

    // بررسی اصل ۵ منشور هابینو: اگر مخاطب حذف شده یا غیرفعال باشد → ثبت سند ممنوع
    const isInactive = (matchedClient as any).isActive === false ||
                       matchedClient.is_deleted === true ||
                       (matchedClient as any).status === 'inactive' ||
                       matchedClient.metadata?.isActive === false;

    if (isInactive && !options?.allowInactive) {
      return {
        isValid: false,
        errorCode: 'CLIENT_INACTIVE',
        errorFa: 'طرف‌حساب انتخاب‌شده غیرفعال یا حذف شده است و امکان صدور سند برای آن وجود ندارد.'
      };
    }

    return {
      isValid: true,
      clientId: clientIdStr,
      client: matchedClient
    };
  }

  return {
    isValid: true,
    clientId: clientIdStr
  };
}

export const INVOICE_TYPE_METADATA: Record<InvoiceType, {
  label: string;
  badge: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  partyLabel: string;
  direction: 'income' | 'expense' | 'neutral';
  description: string;
}> = {
  sale: {
    label: 'فاکتور فروش',
    badge: 'فروش',
    badgeBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    partyLabel: 'خریدار / مشتری',
    direction: 'income',
    description: 'فروش قطعی کالا یا ارائه خدمات مهندسی به مشتری'
  },
  purchase: {
    label: 'فاکتور خرید',
    badge: 'خرید',
    badgeBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    partyLabel: 'تأمین‌کننده / فروشنده',
    direction: 'expense',
    description: 'خرید تجهیزات، ملزومات یا برون‌سپاری خدمات از تأمین‌کننده'
  },
  proforma_sale: {
    label: 'پیش‌فاکتور فروش',
    badge: 'پیش‌فاکتور فروش',
    badgeBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    partyLabel: 'مشتری بالقوه / خریدار',
    direction: 'neutral',
    description: 'اعلام رسمی قیمت، پیش‌نویس استعلام و شرایط خدمات به مشتری'
  },
  proforma_purchase: {
    label: 'پیش‌فاکتور خرید',
    badge: 'پیش‌فاکتور خرید',
    badgeBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    partyLabel: 'تأمین‌کننده طرف استعلام',
    direction: 'neutral',
    description: 'پیش‌نویس استعلام قیمت و تاییدیه پیش‌خرید از فروشنده'
  },
  sale_return: {
    label: 'برگشت از فروش',
    badge: 'برگشت از فروش',
    badgeBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    partyLabel: 'مشتری مرجوع‌کننده',
    direction: 'expense',
    description: 'صورت‌حساب مرجوعی کالا/لغو خدمات توسط مشتری و تعدیل بستانکاری'
  },
  purchase_return: {
    label: 'برگشت از خرید',
    badge: 'برگشت از خرید',
    badgeBg: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    partyLabel: 'تأمین‌کننده طرف‌حساب',
    direction: 'income',
    description: 'مرجوع نمودن کالا یا بازپس‌گیری وجوه پرداختی از تأمین‌کننده'
  },
  proforma: {
    label: 'پیش‌فاکتور عمومی',
    badge: 'پیش‌فاکتور',
    badgeBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    partyLabel: 'خریدار / مشتری',
    direction: 'neutral',
    description: 'پیش‌فاکتور عمومی'
  },
  service: {
    label: 'فاکتور خدمات',
    badge: 'خدمات',
    badgeBg: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    partyLabel: 'کارفرما',
    direction: 'income',
    description: 'فاکتور خدمات تخصصی'
  }
};

export const Invoices: React.FC = () => {
  const {
    invoices,
    clients,
    inventory,
    bankAccounts,
    accountingEntries,
    settings,
    activeTenant,
    addInvoice,
    deleteInvoice,
    updateInvoice,
    addClient,
    updateClient,
    addTransaction,
    updateSettings,
    syncFromSupabase,
    pushToSupabase,
    isSupabaseLive
  } = useAccounting();

  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSyncCloud = async () => {
    setSyncingCloud(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncFromSupabase();
      if (res.success) {
        setSyncStatusMsg({
          text: `همگام‌سازی فاکتورها با سوپابیس با موفقیت انجام شد (${toPersianDigits(invoices.length)} فاکتور در سیستم)`,
          isError: false
        });
      } else {
        setSyncStatusMsg({ text: res.message || 'خطا در دریافت فاکتورها از سوپابیس', isError: true });
      }
    } catch (e: any) {
      setSyncStatusMsg({ text: e.message || 'خطا در ارتباط با سرور سوپابیس', isError: true });
    } finally {
      setSyncingCloud(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  const handlePushCloud = async () => {
    setSyncingCloud(true);
    setSyncStatusMsg(null);
    try {
      const res = await pushToSupabase();
      if (res.success) {
        setSyncStatusMsg({
          text: `ارسال فاکتورها و اسناد به سوپابیس با موفقیت انجام شد (${toPersianDigits(invoices.length)} فاکتور ذخیره شد)`,
          isError: false
        });
      } else {
        setSyncStatusMsg({ text: res.message || 'خطا در ارسال اطلاعات به سوپابیس', isError: true });
      }
    } catch (e: any) {
      setSyncStatusMsg({ text: e.message || 'خطا در ارسال به سوپابیس', isError: true });
    } finally {
      setSyncingCloud(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  // Modals state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [customizingInvoice, setCustomizingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [pcPosInvoice, setPcPosInvoice] = useState<Invoice | null>(null);
  const [signingInvoice, setSigningInvoice] = useState<Invoice | null>(null);
  const [sharingInvoice, setSharingInvoice] = useState<Invoice | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [unauthorizedDeleteInvoice, setUnauthorizedDeleteInvoice] = useState<Invoice | null>(null);

  // One-Click Return Wizard State (ویزارد ۱-کلیکه برگشت و ابطال برای کلیه انواع فاکتور)
  const [returnWizardInvoice, setReturnWizardInvoice] = useState<Invoice | null>(null);
  const [returnReason, setReturnReason] = useState<string>('انصراف مشتری و مرجوعی کامل کالا/خدمات');
  const [customReturnNote, setCustomReturnNote] = useState<string>('');
  const [isProcessingReturn, setIsProcessingReturn] = useState<boolean>(false);

  // Filters
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'sale' | 'purchase' | 'proforma_sale' | 'proforma_purchase' | 'returns'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sale');
  const isProformaType = 
    invoiceType === 'proforma_sale' || 
    invoiceType === 'proforma_purchase' || 
    invoiceType === 'proforma' ||
    (editingInvoice ? (editingInvoice.type === 'proforma_sale' || editingInvoice.type === 'proforma_purchase' || editingInvoice.type === 'proforma') : false);
  const [clientId, setClientId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => `${1000 + invoices.length + 1}`);
  const [date, setDate] = useState<string>(() => new Date().toLocaleDateString('fa-IR'));
  const [dueDate, setDueDate] = useState<string>('');
  const [template, setTemplate] = useState<InvoiceTemplate>(settings.defaultInvoiceTemplate || 'professional');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: settings.defaultTaxRate || 10, total: 0 }
  ]);
  const [applyTax, setApplyTax] = useState<boolean>(
    settings.defaultInvoiceDesign?.showTaxColumn ?? (settings.defaultTaxRate > 0)
  );
  const [notes, setNotes] = useState<string>(settings.invoiceNote || '');
  const [terms, setTerms] = useState<string>(settings.invoiceTerms || '');
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // مانده حساب قبلی و شخصی‌سازی تراز پیشین طرف‌حساب
  const [customPreviousBalance, setCustomPreviousBalance] = useState<number | null>(null);

  // مودال افزودن سریع طرف‌حساب به همراه مانده اول دوره
  const [showQuickClientModal, setShowQuickClientModal] = useState<boolean>(false);
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientPhone, setQuickClientPhone] = useState<string>('');
  const [quickClientType, setQuickClientType] = useState<'individual' | 'corporate'>('individual');
  const [quickClientBalanceType, setQuickClientBalanceType] = useState<'zero' | 'debtor' | 'creditor'>('zero');
  const [quickClientBalance, setQuickClientBalance] = useState<number>(0);
  const [isSavingQuickClient, setIsSavingQuickClient] = useState<boolean>(false);

  // Distributed Lock Concurrency Protection
  const [lockedByOtherUser, setLockedByOtherUser] = useState<string | null>(null);
  const [isLockAcquired, setIsLockAcquired] = useState<boolean>(false);

  // Guild Strategy & Composite Dynamic Form Builder
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const [guildStrategyKey, setGuildStrategyKey] = useState<string>('auto');
  const effectiveGuild = settings.guild || activeTenant?.metadata?.guildCategory || activeTenant?.guildType;
  const guildStrategy = useMemo(() => {
    return GuildStrategyResolver.resolve(guildStrategyKey === 'auto' ? effectiveGuild : guildStrategyKey);
  }, [effectiveGuild, guildStrategyKey]);

  // ==========================================
  // Auto-Save Draft Engine (ذخیره‌سازی موقت فاکتورهای نیمه‌کاره در LocalStorage)
  // ==========================================
  const draftStorageKey = useMemo(() => {
    const tId = activeTenant?.id || 'default_tenant';
    return `habino_invoice_draft_${tId}`;
  }, [activeTenant?.id]);

  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<{
    invoiceType: InvoiceType;
    clientId: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    template: InvoiceTemplate;
    items: InvoiceItem[];
    applyTax: boolean;
    notes: string;
    terms: string;
    amountPaid: number;
    customPreviousBalance: number | null;
    savedAt: number;
  } | null>(null);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  const checkExistingDraft = () => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) {
        setHasDraft(false);
        setDraftSavedTime(null);
        setDraftData(null);
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        setHasDraft(true);
        setDraftData(parsed);
        const timeStr = new Date(parsed.savedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setDraftSavedTime(timeStr);
        return parsed;
      }
    } catch (e) {
      console.error('[DraftEngine] Error reading draft from localStorage:', e);
    }
    setHasDraft(false);
    setDraftSavedTime(null);
    setDraftData(null);
    return null;
  };

  useEffect(() => {
    checkExistingDraft();
  }, [draftStorageKey]);

  // ذخیره‌سازی خودکار پیوسته در Local Storage با Debounce (فقط زمان ساخت فاکتور جدید)
  useEffect(() => {
    if (!showModal || editingInvoice !== null) return;

    // بررسی اینکه آیا اطلاعات اولیه معناداری توسط کاربر تایپ یا انتخاب شده است
    const hasMeaningfulContent =
      Boolean(clientId) ||
      (items.length > 0 && items.some(it => (it.description && it.description.trim() !== '') || (Number(it.unitPrice) || 0) > 0)) ||
      (notes && notes !== (settings.invoiceNote || '')) ||
      (terms && terms !== (settings.invoiceTerms || '')) ||
      amountPaid > 0;

    if (!hasMeaningfulContent) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          invoiceType,
          clientId,
          invoiceNumber,
          date,
          dueDate,
          template,
          items,
          applyTax,
          notes,
          terms,
          amountPaid,
          customPreviousBalance,
          savedAt: Date.now()
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setHasDraft(true);
        setDraftData(payload);
        const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutoSaveTime(timeStr);
        setDraftSavedTime(timeStr);
      } catch (e) {
        console.error('[DraftEngine] Failed to auto-save invoice draft:', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    showModal,
    editingInvoice,
    invoiceType,
    clientId,
    invoiceNumber,
    date,
    dueDate,
    template,
    items,
    applyTax,
    notes,
    terms,
    amountPaid,
    customPreviousBalance,
    settings.invoiceNote,
    settings.invoiceTerms,
    draftStorageKey
  ]);

  // رویداد beforeunload برای تضمین ذخیره فوری در حافظه محلی در صورت فشردن ناگهانی F5 یا رفرش
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (showModal && editingInvoice === null) {
        const hasMeaningfulContent =
          Boolean(clientId) ||
          (items.length > 0 && items.some(it => (it.description && it.description.trim() !== '') || (Number(it.unitPrice) || 0) > 0));

        if (hasMeaningfulContent) {
          try {
            const payload = {
              invoiceType,
              clientId,
              invoiceNumber,
              date,
              dueDate,
              template,
              items,
              applyTax,
              notes,
              terms,
              amountPaid,
              customPreviousBalance,
              savedAt: Date.now()
            };
            localStorage.setItem(draftStorageKey, JSON.stringify(payload));
          } catch (e) {
            console.error('[DraftEngine] Error on beforeunload auto-save:', e);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    showModal,
    editingInvoice,
    invoiceType,
    clientId,
    invoiceNumber,
    date,
    dueDate,
    template,
    items,
    applyTax,
    notes,
    terms,
    amountPaid,
    customPreviousBalance,
    draftStorageKey
  ]);

  // بستن سریع فرم صدور/ویرایش با کلید Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        closeInvoiceModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const restoreDraft = (customData?: any) => {
    const target = customData || draftData || checkExistingDraft();
    if (!target) return;

    setEditingInvoice(null);
    setInvoiceType(target.invoiceType || 'sale');
    setClientId(target.clientId || '');
    setCustomPreviousBalance(target.customPreviousBalance ?? null);
    if (target.invoiceNumber) setInvoiceNumber(target.invoiceNumber);
    if (target.date) setDate(target.date);
    setDueDate(target.dueDate || '');
    setTemplate(target.template || settings.defaultInvoiceTemplate || 'professional');
    if (Array.isArray(target.items) && target.items.length > 0) {
      setItems(target.items);
    }
    setApplyTax(target.applyTax ?? (settings.defaultTaxRate > 0));
    setNotes(target.notes ?? (settings.invoiceNote || ''));
    setTerms(target.terms ?? (settings.invoiceTerms || ''));
    setAmountPaid(target.amountPaid || 0);

    setShowModal(true);
    setActionFeedback({
      text: 'پیش‌نویس فاکتور نیمه‌کاره با موفقیت بازیابی شد.',
      isError: false
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const discardDraft = (showConfirm = true) => {
    if (showConfirm) {
      const ok = window.confirm('آیا از پاک کردن پیش‌نویس فاکتور نیمه‌کاره اطمینان دارید؟ اطلاعات تایپ‌شده قبلی حذف خواهد شد.');
      if (!ok) return;
    }
    try {
      localStorage.removeItem(draftStorageKey);
      setHasDraft(false);
      setDraftSavedTime(null);
      setDraftData(null);
      setLastAutoSaveTime(null);
      setActionFeedback({
        text: 'پیش‌نویس موقت فاکتور با موفقیت حذف گردید.',
        isError: false
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error('[DraftEngine] Error removing draft:', e);
    }
  };

  const handleToggleApplyTax = (enable: boolean) => {
    setApplyTax(enable);
    setItems(prevItems =>
      prevItems.map(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const taxRate = enable ? (Number(item.taxRate) || (settings.defaultTaxRate || 10)) : 0;
        const base = Math.max(0, (qty * price) - disc);
        const total = base + (base * (taxRate / 100));
        return {
          ...item,
          taxRate,
          total
        };
      })
    );
  };

  const handleItemMetadataChange = (index: number, newMeta: Record<string, any>) => {
    const currentItem = items[index];
    const derivedUpdates = guildStrategy.calculateDerivedRow(newMeta, currentItem);

    const updatedItem: InvoiceItem = {
      ...currentItem,
      ...derivedUpdates,
      metadata: newMeta
    };

    const qty = Number(updatedItem.quantity) || 1;
    const price = Number(updatedItem.unitPrice) || 0;
    const disc = Number(updatedItem.discount) || 0;
    const tax = applyTax ? (Number(updatedItem.taxRate) || 0) : 0;
    updatedItem.taxRate = tax;
    const base = Math.max(0, (qty * price) - disc);
    updatedItem.total = Math.max(0, base + (base * (tax / 100)));

    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  // Barcode Intake in Invoice
  const [barcodeInputValue, setBarcodeInputValue] = useState<string>('');
  const [showInvoiceCameraScanner, setShowInvoiceCameraScanner] = useState<boolean>(false);
  const [invoiceBarcodeFeedback, setInvoiceBarcodeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Type filtering
      if (activeTypeTab === 'sale' && inv.type !== 'sale' && inv.type !== 'service') return false;
      if (activeTypeTab === 'purchase' && inv.type !== 'purchase') return false;
      if (activeTypeTab === 'proforma_sale' && inv.type !== 'proforma_sale' && inv.type !== 'proforma') return false;
      if (activeTypeTab === 'proforma_purchase' && inv.type !== 'proforma_purchase') return false;
      if (activeTypeTab === 'returns' && inv.type !== 'sale_return' && inv.type !== 'purchase_return') return false;

      // Search query across invoice number, client name, and items/goods description
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const numMatch = inv.invoiceNumber.toLowerCase().includes(query);
        const nameMatch = (inv.clientName || '').toLowerCase().includes(query);
        const itemMatch = (inv.items || []).some(item => (item.description || '').toLowerCase().includes(query));
        if (!numMatch && !nameMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [invoices, activeTypeTab, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalSales = invoices
      .filter(i => (i.type === 'sale' || i.type === 'service') && i.status !== 'cancelled')
      .reduce((s, i) => s + i.grandTotal, 0);

    const totalPurchases = invoices
      .filter(i => i.type === 'purchase' && i.status !== 'cancelled')
      .reduce((s, i) => s + i.grandTotal, 0);

    const activeProformas = invoices
      .filter(i => i.type === 'proforma_sale' || i.type === 'proforma_purchase' || i.type === 'proforma')
      .length;

    const totalReturns = invoices
      .filter(i => (i.type === 'sale_return' || i.type === 'purchase_return') && i.status !== 'cancelled')
      .reduce((s, i) => s + i.grandTotal, 0);

    return { totalSales, totalPurchases, activeProformas, totalReturns };
  }, [invoices]);

  const openCreateModal = () => {
    const defaultVatActive = settings.defaultInvoiceDesign?.showTaxColumn ?? (settings.defaultTaxRate > 0);
    setApplyTax(defaultVatActive);
    const initialTaxRate = defaultVatActive ? (settings.defaultTaxRate || 10) : 0;

    setEditingInvoice(null);
    setExpandedRowIndex(null);
    setInvoiceType('sale');
    setClientId('');
    setCustomPreviousBalance(null);
    setInvoiceNumber(`${1000 + invoices.length + 1}`);
    setDate(new Date().toLocaleDateString('fa-IR'));
    setDueDate('');
    setTemplate(settings.defaultInvoiceTemplate || 'professional');
    setItems([{ id: `${Date.now()}`, description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: initialTaxRate, total: 0 }]);
    setNotes(settings.invoiceNote || '');
    setTerms(settings.invoiceTerms || '');
    setAmountPaid(0);
    setShowModal(true);
  };

  const closeInvoiceModal = async () => {
    if (editingInvoice && isLockAcquired) {
      const tId = editingInvoice.tenantId || activeTenant?.id || 'tenant-main';
      await HabinoDistributedLockManager.releaseLock(tId, 'invoice', editingInvoice.id);
    }
    setIsLockAcquired(false);
    setLockedByOtherUser(null);
    setShowModal(false);
    setEditingInvoice(null);
  };

  const openEditModal = async (inv: Invoice) => {
    const tId = inv.tenantId || activeTenant?.id || 'tenant-main';
    const uId = activeTenant?.id || 'current-user';
    const uName = settings.name || 'مدیر مالی';

    // درخواست قفل توزیع‌شده برای جلوگیری از Race Condition همزمانی
    const lockResult = await HabinoDistributedLockManager.acquireLock({
      tenantId: tId,
      resourceType: 'invoice',
      resourceId: inv.id,
      userId: uId,
      userName: uName
    });

    if (!lockResult.acquired && lockResult.conflictUser) {
      const occupant = lockResult.conflictUser;
      const proceed = window.confirm(
        `هشدار همزمانی: این فاکتور در حال حاضر توسط «${occupant}» در تب یا سیستمی دیگر در حال ویرایش است.\n\nآیا مایلید به صورت ناظر یا بازنویسی فرم را باز نمایید؟ (جهت حفظ یکپارچگی داده‌ها توصیه می‌شود صبر کنید)`
      );
      if (!proceed) return;
      setLockedByOtherUser(occupant);
      setIsLockAcquired(false);
    } else {
      setLockedByOtherUser(null);
      setIsLockAcquired(true);
    }

    const invoiceHasTax = inv.designConfig?.showTaxColumn ?? (inv.totalTax > 0 || inv.items.some(it => (it.taxRate || 0) > 0));
    setApplyTax(invoiceHasTax);

    setEditingInvoice(inv);
    setExpandedRowIndex(null);
    setInvoiceType(inv.type);
    setClientId(inv.clientId);
    setCustomPreviousBalance(inv.previousBalance !== undefined ? inv.previousBalance : null);
    setInvoiceNumber(inv.invoiceNumber);
    setDate(inv.date);
    setDueDate(inv.dueDate || '');
    setTemplate(inv.template);
    setItems(inv.items.map(it => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unitPrice) || 0;
      const disc = Number(it.discount) || 0;
      const taxRate = invoiceHasTax ? (Number(it.taxRate) || (settings.defaultTaxRate || 10)) : 0;
      const base = Math.max(0, (qty * price) - disc);
      const total = base + (base * (taxRate / 100));
      return {
        ...it,
        discount: disc,
        taxRate,
        total
      };
    }));
    setNotes(inv.notes || settings.invoiceNote || '');
    setTerms(inv.terms || settings.invoiceTerms || '');
    setAmountPaid(inv.amountPaid || 0);
    setShowModal(true);
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const found = clients.find(c => c.id === newClientId);
    if (found) {
      setCustomPreviousBalance(found.balance || 0);
    } else {
      setCustomPreviousBalance(null);
    }
  };

  const handleTriggerQuickAdd = (suggestedName?: string) => {
    setQuickClientName(suggestedName || '');
    setQuickClientPhone('');
    setQuickClientType('individual');
    setQuickClientBalanceType('zero');
    setQuickClientBalance(0);
    setShowQuickClientModal(true);
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim()) return;
    setIsSavingQuickClient(true);
    try {
      const finalBal = quickClientBalanceType === 'debtor'
        ? Math.abs(Number(quickClientBalance) || 0)
        : quickClientBalanceType === 'creditor'
        ? -Math.abs(Number(quickClientBalance) || 0)
        : 0;

      const newClient = await addClient({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
        type: quickClientType,
        balance: finalBal
      });

      if (newClient && newClient.id) {
        setClientId(newClient.id);
        setCustomPreviousBalance(finalBal);
      }
      setShowQuickClientModal(false);
      setQuickClientName('');
      setQuickClientPhone('');
      setQuickClientBalance(0);
      setQuickClientBalanceType('zero');
    } catch (err: any) {
      alert(err?.message || 'خطا در ثبت طرف‌حساب جدید');
    } finally {
      setIsSavingQuickClient(false);
    }
  };

  const handleAddItem = () => {
    const currentTaxRate = applyTax ? (settings.defaultTaxRate || 10) : 0;
    setItems([
      ...items,
      { id: `${Date.now()}`, description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: currentTaxRate, total: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const isPurchaseContext = invoiceType === 'purchase' || invoiceType === 'proforma_purchase' || invoiceType === 'purchase_return';

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'itemId') {
      const selectedGood = inventory.find(i => i.id === value);
      if (selectedGood) {
        newItems[index].description = selectedGood.name;
        newItems[index].unitPrice = isPurchaseContext ? selectedGood.buyPrice : selectedGood.sellPrice;
      }
    }

    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].unitPrice) || 0;
    const disc = Number(newItems[index].discount) || 0;
    const tax = applyTax ? (Number(newItems[index].taxRate) || 0) : 0;
    newItems[index].taxRate = tax;
    const base = Math.max(0, (qty * price) - disc);
    newItems[index].total = base + (base * (tax / 100));

    setItems(newItems);
  };

  const handleScanBarcodeToInvoice = (scannedBarcode: string) => {
    const clean = scannedBarcode.trim();
    if (!clean) return;

    // Search inventory by barcode or code
    const good = inventory.find(i => {
      const b = (i.barcode || '').trim().toLowerCase();
      const c = (i.code || '').trim().toLowerCase();
      const q = clean.toLowerCase();
      return b === q || c === q;
    });

    if (good) {
      playScanBeep();
      setItems(prevItems => {
        const existingIndex = prevItems.findIndex(it => it.itemId === good.id || (it.description && it.description === good.name));

        if (existingIndex >= 0) {
          const updated = [...prevItems];
          const currentQty = Number(updated[existingIndex].quantity) || 0;
          const newQty = currentQty + 1;
          const unitPrice = Number(updated[existingIndex].unitPrice) || (isPurchaseContext ? good.buyPrice : good.sellPrice);
          const disc = Number(updated[existingIndex].discount) || 0;
          const tax = applyTax ? (Number(updated[existingIndex].taxRate) || (settings.defaultTaxRate || 10)) : 0;
          const base = Math.max(0, (newQty * unitPrice) - disc);
          const total = base + (base * (tax / 100));

          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            unitPrice,
            taxRate: tax,
            total
          };

          setInvoiceBarcodeFeedback({
            type: 'success',
            text: `تعداد کالای «${good.name}» در فاکتور به ${toPersianDigits(newQty)} افزایش یافت.`
          });
          return updated;
        } else {
          // If the only row is empty, replace it
          const isOnlyFirstEmpty = prevItems.length === 1 && !prevItems[0].description && (prevItems[0].unitPrice === 0 || !prevItems[0].unitPrice);
          const price = isPurchaseContext ? good.buyPrice : good.sellPrice;
          const tax = applyTax ? (settings.defaultTaxRate || 10) : 0;
          const base = (1 * price);
          const total = base + (base * (tax / 100));

          const newItem: InvoiceItem = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            itemId: good.id,
            description: good.name,
            quantity: 1,
            unitPrice: price,
            discount: 0,
            taxRate: tax,
            total
          };

          setInvoiceBarcodeFeedback({
            type: 'success',
            text: `کالای «${good.name}» به اقلام فاکتور اضافه گردید.`
          });

          if (isOnlyFirstEmpty) {
            return [newItem];
          } else {
            return [...prevItems, newItem];
          }
        }
      });
    } else {
      playErrorBeep();
      setInvoiceBarcodeFeedback({
        type: 'error',
        text: `بارکد «${clean}» در انبار کالا یافت نشد. می‌توانید ردیف را به صورت دستی ثبت کنید.`
      });
    }

    setTimeout(() => setInvoiceBarcodeFeedback(null), 3500);
    setBarcodeInputValue('');
  };

  // Hardware barcode scanner listener while modal is open
  useEffect(() => {
    if (!showModal) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'invoice-barcode-scan-input') {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const captured = buffer.trim();
          buffer = '';
          handleScanBarcodeToInvoice(captured);
        } else {
          buffer = '';
        }
        return;
      }

      if (interval > 150 && buffer.length > 0) {
        buffer = '';
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, inventory, isPurchaseContext, settings]);

  const handleConvertProformaToFinal = async (proforma: Invoice) => {
    // گیت امنیتی کامپوننت فاکتور: اعتبارسنجی حضور و صحت فرمت field client_id قبل از تبدیل و ثبت قطعی
    const clientValidation = validateInvoiceClientId(proforma.clientId || proforma.client_id, clients, {
      tenantId: activeTenant?.id
    });
    if (!clientValidation.isValid || !clientValidation.clientId) {
      alert(`تبدیل پیش‌فاکتور به سند قطعی امکان‌پذیر نیست: ${clientValidation.errorFa || 'ثبت سند بدون مخاطب مجاز نیست.'}`);
      return;
    }

    const isPurchaseProforma = proforma.type === 'proforma_purchase';
    const targetType: InvoiceType = isPurchaseProforma ? 'purchase' : 'sale';
    const targetTitle = isPurchaseProforma ? 'فاکتور قطعی خرید' : 'فاکتور قطعی فروش';

    await updateInvoice(proforma.id, {
      type: targetType,
      clientId: clientValidation.clientId,
      client_id: clientValidation.clientId,
      status: proforma.amountPaid >= proforma.grandTotal ? 'paid' : 'pending',
      notes: `${proforma.notes || ''} [تبدیل‌شده از پیش‌فاکتور شماره ${proforma.invoiceNumber}]`
    });

    alert(`پیش‌فاکتور شماره #${proforma.invoiceNumber} با موفقیت به «${targetTitle}» تبدیل شد.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanClientId = '';
    let selectedClient: Client | undefined = undefined;

    if (isProformaType) {
      // برای پیش‌فاکتور (سند خنثی برآورد قیمت): عدم وابستگی به قوانین سخت‌گیرانه دفتر کل
      if (clientId && String(clientId).trim() !== '') {
        const clientValidation = validateInvoiceClientId(clientId, clients, {
          tenantId: activeTenant?.id,
          isProforma: true
        });
        if (clientValidation.isValid && clientValidation.clientId) {
          cleanClientId = clientValidation.clientId;
          selectedClient = clientValidation.client || clients.find(c => c.id === cleanClientId);
        } else {
          cleanClientId = String(clientId).trim();
          selectedClient = clients.find(c => c.id === cleanClientId);
        }
      }
      if (!cleanClientId) {
        cleanClientId = 'client-inquiry-neutral';
      }
      if (!selectedClient) {
        selectedClient = {
          id: cleanClientId,
          name: editingInvoice?.clientName || 'مشتری متقاضی (استعلام پیش‌فاکتور)',
          balance: 0,
          type: 'individual'
        };
      }
    } else {
      // گیت امنیتی کامپوننت فاکتورهای رسمی و قطعی: اعتبارسنجی حضور، صحت فرمت و سلامت مخاطب
      const clientValidation = validateInvoiceClientId(clientId, clients, {
        tenantId: activeTenant?.id
      });
      if (!clientValidation.isValid || !clientValidation.clientId || !clientValidation.client) {
        alert(clientValidation.errorFa || 'ثبت سند بدون مخاطب مجاز نیست.');
        return;
      }
      cleanClientId = clientValidation.clientId;
      selectedClient = clientValidation.client;
    }

    const subtotal = calculateSubtotal(items);
    const totalDiscount = calculateTotalDiscount(items);
    const totalTax = applyTax ? calculateTotalTax(items) : 0;
    const grandTotal = (subtotal - totalDiscount) + totalTax;
    const paid = isProformaType ? 0 : (Number(amountPaid) || 0);
    const remainingAmount = isProformaType ? grandTotal : Math.max(0, grandTotal - paid);

    // بررسی سقف اعتبار طرف‌حساب در فاکتورهای فروش و خدمات (پیش‌فاکتور شامل این بررسی نمی‌شود)
    if (!isProformaType && selectedClient && (invoiceType === 'sale' || invoiceType === 'service') && remainingAmount > 0) {
      const creditCheck = HabinoAccountingKernel.validateCreditLimit(selectedClient, remainingAmount);
      if (creditCheck.isBlocked) {
        alert(creditCheck.messageFa);
        return;
      } else if (creditCheck.isExceeded) {
        const proceed = window.confirm(`${creditCheck.messageFa}\n\nآیا با تایید مدیر مالی مایل به ثبت نهایی این سند هستید؟`);
        if (!proceed) return;
      }
    }

    const currentDesignConfig: InvoiceDesignConfig = {
      ...(editingInvoice?.designConfig || settings.defaultInvoiceDesign),
      showTaxColumn: applyTax,
      showDiscountColumn: true,
      showPreviousBalance: editingInvoice?.designConfig?.showPreviousBalance ?? settings.defaultInvoiceDesign?.showPreviousBalance ?? true
    };

    // محاسبه تراز قبلی و جمع کل بدهی جهت ثبت شفاف در فاکتور
    const currentClientBalance = selectedClient?.balance || 0;
    const prevBalance = customPreviousBalance !== null
      ? customPreviousBalance
      : (editingInvoice
          ? (editingInvoice.previousBalance ?? (currentClientBalance - (editingInvoice.remainingAmount || 0)))
          : currentClientBalance);

    let balanceDelta = 0;
    if (invoiceType === 'sale' || invoiceType === 'service') {
      balanceDelta = remainingAmount;
    } else if (invoiceType === 'purchase') {
      balanceDelta = -remainingAmount;
    } else if (invoiceType === 'sale_return') {
      balanceDelta = -remainingAmount;
    } else if (invoiceType === 'purchase_return') {
      balanceDelta = remainingAmount;
    }
    const computedTotalDebt = prevBalance + balanceDelta;

    // اعتبارسنجی و پالایش اقلام بر اساس اسکیمای JSONB
    const itemsValidation = HabinoJsonbSchemaValidator.validateInvoiceItems(items);
    if (!itemsValidation.isValid) {
      alert(`خطای اسکیمای اقلام فاکتور:\n${itemsValidation.errors.join('\n')}`);
      return;
    }
    const validItems = itemsValidation.sanitizedItems;

    try {
      if (editingInvoice) {
        // Update existing invoice atomically
        await updateInvoice(editingInvoice.id, {
          invoiceNumber,
          clientId: cleanClientId,
          client_id: cleanClientId,
          clientName: selectedClient.name,
          type: invoiceType,
          status: isProformaType ? 'pending' : (paid >= grandTotal ? 'paid' : 'pending'),
          template,
          date,
          dueDate,
          items: validItems,
          subtotal,
          totalDiscount,
          totalTax,
          grandTotal,
          amountPaid: paid,
          remainingAmount,
          previousBalance: prevBalance,
          totalDebt: computedTotalDebt,
          notes,
          terms,
          designConfig: currentDesignConfig
        });
        setActionFeedback({
          text: isProformaType 
            ? `پیش‌فاکتور #${toPersianDigits(invoiceNumber)} با موفقیت به‌روزرسانی و ذخیره گردید.`
            : `سند #${toPersianDigits(invoiceNumber)} با موفقیت در دفتر کل و وضعیت اشخاص به‌روزرسانی شد.`,
          isError: false
        });
      } else {
        // Create new invoice atomically with rollback protection
        await addInvoice({
          invoiceNumber,
          clientId: cleanClientId,
          client_id: cleanClientId,
          clientName: selectedClient.name,
          type: invoiceType,
          status: isProformaType ? 'pending' : (paid >= grandTotal ? 'paid' : 'pending'),
          template,
          date,
          dueDate,
          items: validItems,
          subtotal,
          totalDiscount,
          totalTax,
          grandTotal,
          amountPaid: paid,
          remainingAmount,
          previousBalance: prevBalance,
          totalDebt: computedTotalDebt,
          notes,
          terms,
          designConfig: currentDesignConfig
        });

        // پاک‌سازی خودکار پیش‌نویس موقت فاکتور پس از ثبت نهایی موفقیت‌آمیز
        try {
          localStorage.removeItem(draftStorageKey);
          setHasDraft(false);
          setDraftSavedTime(null);
          setDraftData(null);
          setLastAutoSaveTime(null);
        } catch (e) {
          console.error('[DraftEngine] Error clearing draft on successful submit:', e);
        }

        setActionFeedback({
          text: isProformaType 
            ? `پیش‌فاکتور #${toPersianDigits(invoiceNumber)} با موفقیت به عنوان سند برآورد قیمت ذخیره گردید.`
            : `سند #${toPersianDigits(invoiceNumber)} با موفقیت به صورت اتمیک ثبت و به دفتر کل الصاق شد.`,
          isError: false
        });
      }

      await closeInvoiceModal();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    const isProforma = invoiceToDelete.type === 'proforma' || invoiceToDelete.type === 'proforma_sale' || invoiceToDelete.type === 'proforma_purchase';
    if (!isProforma) {
      alert('طبق قوانین و استانداردهای حسابداری و مالیاتی، حذف فاکتورهای رسمی و قطعی ثبت‌شده در دفاتر مجاز نمی‌باشد.\nجهت اصلاح یا ابطال، از صدور فاکتور برگشت از فروش/خرید یا سند اصلاحی استفاده فرمایید.');
      setInvoiceToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      const docNum = invoiceToDelete.invoiceNumber;
      await deleteInvoice(invoiceToDelete.id);
      setActionFeedback({
        text: `سند شماره #${toPersianDigits(docNum)} با موفقیت حذف شد و تمام آثار مالی آن (مانده طرف‌حساب، موجودی انبار و دفتر کل) اصلاح گردید.`,
        isError: false
      });
      setInvoiceToDelete(null);
      if (editingInvoice && editingInvoice.id === invoiceToDelete.id) {
        setShowModal(false);
        setEditingInvoice(null);
      }
      if (previewInvoice && previewInvoice.id === invoiceToDelete.id) {
        setPreviewInvoice(null);
      }
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      setActionFeedback({
        text: err?.message || 'حذف سند ناموفق بود. هیچ تغییری اعمال نشد.',
        isError: true
      });
      setTimeout(() => setActionFeedback(null), 6000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintDirect = (inv: Invoice) => {
    setPreviewInvoice(inv);
    document.body.classList.add('habino-print-active');
    document.body.classList.add('is-printing-invoice');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('is-printing-invoice');
        document.body.classList.remove('habino-print-active');
      }, 1200);
    }, 350);
  };

  const handlePcPosSettlement = async (receipt: PosPaymentReceipt) => {
    if (!pcPosInvoice) return;
    try {
      const inv = pcPosInvoice;
      const paymentAmount = receipt.amount;
      const currentPaid = inv.amountPaid || 0;
      const grandTotal = inv.grandTotal || 0;
      const newPaid = currentPaid + paymentAmount;
      const isFull = newPaid >= grandTotal;

      const targetBank = bankAccounts[0];
      const targetBankName = targetBank?.bankName || 'کارتخوان بانکی';

      // 1. ثبت تراکنش دریافت در حساب بانکی
      await addTransaction({
        date: new Date().toLocaleDateString('fa-IR'),
        amount: paymentAmount,
        type: 'income',
        category: 'فروش و خدمات',
        description: `تسویه با کارتخوان PC-POS (پایانه: ${receipt.terminalId} • پیگیری: ${receipt.traceNumber} • کارت: ${receipt.maskedPan}) برای فاکتور شماره #${inv.invoiceNumber}`,
        toAccount: targetBankName,
        clientId: inv.clientId,
        clientName: inv.clientName || 'مشتری',
        relatedInvoiceId: inv.id
      });

      // 2. بروزرسانی وضعیت فاکتور
      await updateInvoice(inv.id, {
        amountPaid: newPaid,
        remainingAmount: Math.max(0, grandTotal - newPaid),
        status: isFull ? 'paid' : 'pending',
        notes: inv.notes 
          ? `${inv.notes}\n[تسویه با کارتخوان PC-POS: کد پیگیری ${receipt.traceNumber} - مبلغ: ${formatCurrency(paymentAmount, settings.currency)}]`
          : `[تسویه با کارتخوان PC-POS: کد پیگیری ${receipt.traceNumber} - مبلغ: ${formatCurrency(paymentAmount, settings.currency)}]`
      });

      // 3. تعدیل مانده طرف‌حساب
      const client = clients.find(c => c.id === inv.clientId);
      if (client) {
        await updateClient(client.id, {
          balance: (client.balance || 0) - paymentAmount
        });
      }

      setPcPosInvoice(null);
      setActionFeedback({
        text: `تسویه موفق با کارتخوان PC-POS انجام شد. سند دریافت بانکی به مبلغ ${formatCurrency(paymentAmount, settings.currency)} و شماره پیگیری ${toPersianDigits(receipt.traceNumber)} با موفقیت ثبت گردید.`,
        isError: false
      });
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error settling invoice with PC-POS:', err);
      setActionFeedback({
        text: 'خطا در ثبت سند تسویه پوز در سیستم حسابداری',
        isError: true
      });
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  // ویزارد ۱-کلیکه صدور فاکتور برگشت (ابطال قانونی طبق استاندارد حسابداری)
  const handleOpenReturnWizard = (inv: Invoice) => {
    if (inv.type === 'sale_return' || inv.type === 'purchase_return') {
      alert('این سند خود یک فاکتور مرجوعی است و امکان صدور برگشت مجدد برای آن وجود ندارد.');
      return;
    }
    if (inv.type === 'proforma' || inv.type === 'proforma_sale' || inv.type === 'proforma_purchase') {
      const confirmCancel = window.confirm(`این سند یک پیش‌فاکتور استعلامی است. آیا مایلید وضعیت آن را به «لغوشده (Cancelled)» تغییر دهید؟`);
      if (confirmCancel) {
        updateInvoice(inv.id, { status: 'cancelled' });
        habinoErrorLogger.logCustom(
          'info',
          `لغو پیش‌فاکتور استعلامی شماره #${inv.invoiceNumber} (مشتری: ${inv.clientName || 'نامشخص'})`,
          'AuditTrail:ProformaCancelled',
          { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber }
        );
        setActionFeedback({
          text: `پیش‌فاکتور شماره #${toPersianDigits(inv.invoiceNumber)} با موفقیت لغو و بایگانی گردید.`,
          isError: false
        });
        setTimeout(() => setActionFeedback(null), 4000);
      }
      return;
    }
    setReturnWizardInvoice(inv);
    setReturnReason('انصراف مشتری و مرجوعی کامل کالا/خدمات');
    setCustomReturnNote('');
  };

  const handleConfirmReturnInvoice = async () => {
    if (!returnWizardInvoice) return;
    setIsProcessingReturn(true);
    try {
      const src = returnWizardInvoice;
      const targetType: InvoiceType = (src.type === 'purchase') ? 'purchase_return' : 'sale_return';
      const targetTypeName = (targetType === 'purchase_return') ? 'فاکتور برگشت از خرید' : 'فاکتور برگشت از فروش';
      const returnInvNumber = `RET-${src.invoiceNumber}`;
      const reasonText = customReturnNote.trim() ? `${returnReason} - ${customReturnNote.trim()}` : returnReason;

      // کلون کردن اقلام فاکتور با شناسه‌های جدید
      const clonedItems: InvoiceItem[] = (src.items || []).map(it => ({
        ...it,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      }));

      const newReturnDoc = await addInvoice({
        invoiceNumber: returnInvNumber,
        clientId: src.clientId || (src as any).client_id,
        client_id: src.clientId || (src as any).client_id,
        clientName: src.clientName,
        type: targetType,
        status: 'paid', // سند برگشت به عنوان تسویه شده در دفاتر
        template: src.template,
        date: new Date().toLocaleDateString('fa-IR'),
        dueDate: src.dueDate || '',
        items: clonedItems,
        subtotal: src.subtotal,
        totalDiscount: src.totalDiscount,
        totalTax: src.totalTax,
        grandTotal: src.grandTotal,
        amountPaid: src.grandTotal,
        remainingAmount: 0,
        notes: `[سند برگشت خودکار از فاکتور قطعی شماره #${src.invoiceNumber} | علت قانونی: ${reasonText}]`,
        terms: src.terms || '',
        projectId: src.projectId,
        metadata: {
          ...src.metadata,
          isReturnDocument: true,
          originalInvoiceId: src.id,
          originalInvoiceNumber: src.invoiceNumber,
          reversalReason: reasonText,
          reversalTimestamp: new Date().toISOString()
        }
      });

      // ثبت لاگ حسابرسی رسمی (Audit Trail)
      habinoErrorLogger.logCustom(
        'info',
        `صدور رسمی ${targetTypeName} شماره #${returnInvNumber} در عطف به سند #${src.invoiceNumber} (مخاطب: ${src.clientName} - مبلغ: ${formatCurrency(src.grandTotal, settings.currency)})`,
        'AuditTrail:InvoiceReversal',
        {
          originalInvoiceId: src.id,
          returnInvoiceId: newReturnDoc?.id,
          reason: reasonText,
          timestamp: new Date().toISOString()
        }
      );

      // علامت‌گذاری فاکتور اصلی به عنوان عطف برگشت‌خورده
      await updateInvoice(src.id, {
        notes: `${src.notes ? src.notes + ' ' : ''}[مرجوع‌شده توسط سند شماره #${returnInvNumber}]`
      });

      setReturnWizardInvoice(null);
      setActionFeedback({
        text: `${targetTypeName} شماره #${toPersianDigits(returnInvNumber)} با موفقیت صادر و کلیه آثار آن در دفتر کل، تراز مالی طرف‌حساب و انبار کالا اعمال گردید.`,
        isError: false
      });
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error generating return invoice:', err);
      alert(`خطا در صدور سند برگشت: ${err?.message || 'عملیات با شکست مواجه شد.'}`);
    } finally {
      setIsProcessingReturn(false);
    }
  };

  return (
    <div className="space-y-6" id="invoices-module">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800" id="invoices-title">
              مدیریت فاکتورها، پیش‌فاکتورها و مرجوعی‌ها
            </h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isSupabaseLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <Cloud className="w-3 h-3" />
              {isSupabaseLive ? 'متصل به سوپابیس' : 'حالت ذخیره امن'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            امکان ویرایش آسانگیر، همگام‌سازی ابری با دیتابیس، ۴ قالب استاندارد، و چاپ بدون نقص A4
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Supabase Sync Button */}
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={syncingCloud}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="بروزرسانی و دریافت کلیه فاکتورها از پایگاه‌داده ابری سوپابیس"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncingCloud ? 'animate-spin' : ''}`} />
            <span>{syncingCloud ? 'در حال همگام‌سازی...' : 'همگام‌سازی ابری'}</span>
          </button>

          {/* Supabase Push Button */}
          <button
            type="button"
            onClick={handlePushCloud}
            disabled={syncingCloud}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="ارسال فاکتورهای محلی و همگام‌سازی قطعی با سرور سوپابیس"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>ارسال به ابری</span>
          </button>

          {/* Excel / CSV Report Export Button */}
          <button
            type="button"
            onClick={() => exportInvoicesListToCsv(filteredInvoices, settings)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="خروجی فایل اکسل / CSV لیست اسناد و فاکتورها"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی اکسل ({filteredInvoices.length})</span>
          </button>

          {/* Template & Design Customization Button */}
          <button
            type="button"
            onClick={() => {
              setCustomizingInvoice(null);
              setShowSettingsModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="تنظیم قالب پیش‌فرض، رنگ‌های سازمانی، فونت و اجزای چاپی"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>طراحی و قالب‌ها</span>
          </button>

          {/* New Invoice Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            id="create-invoice-btn"
          >
            <Plus className="w-4 h-4" />
            صدور سند / فاکتور جدید
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
          syncStatusMsg.isError 
            ? 'bg-rose-50 border-rose-200 text-rose-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {syncStatusMsg.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
          actionFeedback.isError 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Draft Notification Banner */}
      {hasDraft && draftSavedTime && !showModal && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-blue-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <FileClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-amber-950">فاکتور نیمه‌کاره در حافظه محلی ذخیره شده است</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 font-mono">
                  ساعت ذخیره: {draftSavedTime}
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 mt-0.5">
                اطلاعات اقلام و طرف‌حساب فاکتور قبلی شما برای جلوگیری از حذف هنگام رفرش مرورگر در حافظه محلی حفظ گردیده است.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => restoreDraft()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ادامه تکمیل و صدور فاکتور</span>
            </button>
            <button
              type="button"
              onClick={() => discardDraft(true)}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              حذف پیش‌نویس
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">مجموع فروش و درآمد</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">{formatCurrency(stats.totalSales, settings.currency)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">فاکتورهای قطعی خدمات و کالا</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">مجموع فاکتورهای خرید</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">{formatCurrency(stats.totalPurchases, settings.currency)}</p>
          <span className="text-[11px] text-blue-600 font-medium">هزینه‌ها و تجهیزات تأمین‌شده</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">پیش‌فاکتورهای باز</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">{stats.activeProformas} سند</p>
          <span className="text-[11px] text-indigo-600 font-medium">در انتظار تایید و تبدیل به قطعی</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">مرجوعی‌ها و استرداد</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">{formatCurrency(stats.totalReturns, settings.currency)}</p>
          <span className="text-[11px] text-rose-600 font-medium">برگشت از فروش یا برگشت از خرید</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTypeTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه اسناد ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTypeTab('sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'sale'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            فروش و خدمات
          </button>
          <button
            onClick={() => setActiveTypeTab('purchase')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'purchase'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            فاکتور خرید
          </button>
          <button
            onClick={() => setActiveTypeTab('proforma_sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'proforma_sale'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            پیش‌فاکتور فروش
          </button>
          <button
            onClick={() => setActiveTypeTab('proforma_purchase')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'proforma_purchase'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            پیش‌فاکتور خرید
          </button>
          <button
            onClick={() => setActiveTypeTab('returns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTypeTab === 'returns'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            مرجوعی‌ها (برگشت خرید/فروش)
          </button>
        </div>

        {/* Search across invoice number, client name, and items */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی سریع شماره فاکتور، طرف‌حساب، یا نام کالا و خدمات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                <th className="p-4">شماره سند</th>
                <th className="p-4">نوع سند</th>
                <th className="p-4">طرف‌حساب (مشتری / تأمین‌کننده)</th>
                <th className="p-4">قالب سند</th>
                <th className="p-4">تاریخ صدور</th>
                <th className="p-4">مبلغ کل</th>
                <th className="p-4">وضعیت تسویه</th>
                <th className="p-4 text-center">عملیات سند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    موردی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const typeMeta = INVOICE_TYPE_METADATA[inv.type] || INVOICE_TYPE_METADATA.sale;
                  const isProformaItem = inv.type === 'proforma_sale' || inv.type === 'proforma_purchase' || inv.type === 'proforma';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        #{inv.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeMeta.badgeBg} ${typeMeta.textColor} ${typeMeta.borderColor}`}>
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        <div>{inv.clientName}</div>
                        <span className="text-[10px] text-slate-400">{typeMeta.partyLabel}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
                          {inv.template || 'professional'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">{toPersianDigits(inv.date)}</td>
                      <td className="p-4 font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal, settings.currency)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {isProformaItem ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Clock className="w-3 h-3" />
                              پیش‌نویس استعلام
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              inv.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {inv.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {inv.status === 'pending' && <Clock className="w-3 h-3" />}
                              {inv.status === 'paid' ? 'تسویه کامل' : 'در انتظار پرداخت'}
                            </span>
                          )}

                          {(inv.isSigned || inv.signatureUrl) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit" title="امضای فیزیکی و تایید رسمی ثبت شده است">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              امضاشده
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Print Button */}
                          <button
                            onClick={() => handlePrintDirect(inv)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="چاپ مستقیم فاکتور (A4 Print)"
                          >
                            <Printer className="w-4 h-4 text-emerald-600" />
                          </button>

                          {/* Preview Button */}
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="مشاهده پیش‌نمایش چاپ"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>

                          {/* Excel / CSV Export Button */}
                          <button
                            type="button"
                            onClick={() => exportSingleInvoiceToCsv(inv, settings, accountingEntries.filter(e => e.referenceId === inv.id))}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="خروجی فایل اکسل / CSV این سند"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          </button>

                          {/* Quick Physical Signature Button */}
                          <button
                            type="button"
                            onClick={() => setSigningInvoice(inv)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              inv.isSigned || inv.signatureUrl
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={inv.isSigned ? 'امضاشده (مشاهده یا ویرایش امضا)' : 'امضای فیزیکی و تایید رسمی سند'}
                          >
                            {inv.isSigned || inv.signatureUrl ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <PenTool className="w-4 h-4 text-indigo-600" />
                            )}
                          </button>

                          {/* Quick Public Share Button */}
                          <button
                            type="button"
                            onClick={() => setSharingInvoice(inv)}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="اشتراک‌گذاری امن لینک اختصاصی در واتساپ و تلگرام"
                          >
                            <Share2 className="w-4 h-4 text-sky-600" />
                          </button>

                          {/* Edit Button (Asangir Accounting Edit) */}
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="ویرایش اطلاعات فاکتور (حسابداری آسانگیر)"
                          >
                            <Edit className="w-4 h-4 text-amber-600" />
                          </button>

                          {/* Individual Customizer */}
                          <button
                            onClick={() => {
                              setCustomizingInvoice(inv);
                              setShowSettingsModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="تغییر قالب و رنگ این فاکتور"
                          >
                            <Sliders className="w-4 h-4 text-indigo-600" />
                          </button>

                          {/* PC-POS Quick Pay */}
                          {inv.status !== 'paid' && (inv.grandTotal || 0) > (inv.amountPaid || 0) && (
                            <button
                              type="button"
                              onClick={() => setPcPosInvoice(inv)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="تسویه آنی با کارتخوان بانکی (PC-POS)"
                            >
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            </button>
                          )}

                          {/* Proforma Convert */}
                          {isProformaItem && (
                            <button
                              onClick={() => handleConvertProformaToFinal(inv)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="تبدیل به فاکتور فروش قطعی"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span className="text-[11px]">تبدیل</span>
                            </button>
                          )}

                          {/* One-Click Return Action for official invoices */}
                          {!isProformaItem && inv.type !== 'sale_return' && inv.type !== 'purchase_return' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReturnWizard(inv)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="صدور آنی فاکتور برگشت (ابطال قانونی طبق استاندارد)"
                            >
                              <RotateCcw className="w-4 h-4 text-amber-600" />
                            </button>
                          )}

                          {/* Delete */}
                          {isProformaItem ? (
                            <button
                              type="button"
                              onClick={() => setInvoiceToDelete(inv)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف پیش‌فاکتور (سند خنثی برآورد قیمت)"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                habinoErrorLogger.logCustom(
                                  'warn',
                                  `تلاش مسدودشده برای حذف فاکتور قطعی شماره #${inv.invoiceNumber} (طرف‌حساب: ${inv.clientName || 'بدون نام'}) طبق ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم`,
                                  'AuditTrail:DeleteAttemptBlocked',
                                  { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, grandTotal: inv.grandTotal }
                                );
                                setUnauthorizedDeleteInvoice(inv);
                              }}
                              className="p-1.5 text-slate-300 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف فاکتور قطعی غیرمجاز است (کلیک جهت مشاهده استناد قانونی)"
                            >
                              <Trash2 className="w-4 h-4 text-slate-300 hover:text-amber-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-6 shadow-2xl border border-slate-100 relative">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 pb-4 border-b flex items-center justify-between -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-4 sm:-mt-6 pt-4 sm:pt-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingInvoice ? `ویرایش فاکتور شماره #${editingInvoice.invoiceNumber}` : 'صدور سند و فاکتور مالی'}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-slate-500">
                    {editingInvoice ? 'اصلاح مقادیر، اقلام، قالب یا مبالغ پرداختی' : 'انتخاب نوع فاکتور، طرف‌حساب، قالب چاپی و درج اقلام رسمی'}
                  </p>
                  <span className="text-[11px] bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    الگوی صنف: {guildStrategy.guildTitle}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeInvoiceModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                title="بستن فرم و انصراف (Esc)"
              >
                <X className="w-4 h-4" />
                <span>بستن فرم</span>
              </button>
            </div>

            {/* Distributed Lock Banner */}
            {editingInvoice && (
              <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
                lockedByOtherUser
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    lockedByOtherUser ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className="font-bold">
                    {lockedByOtherUser
                      ? `هشدار همزمانی: این سند توسط «${lockedByOtherUser}» در تب/دستگاه دیگر در حال بازبینی است.`
                      : 'قفل توزیع‌شده فعال: این سند در انحصار امن این نشست است و ضربان قلب فعال می‌باشد.'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 font-mono font-bold">
                  TTL: 45s Auto-Heartbeat
                </span>
              </div>
            )}

            {/* Auto-Save & Draft Bar for New Invoices */}
            {!editingInvoice && (
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Cloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">ذخیره خودکار پیش‌نویس در حافظه مرورگر فعال است</span>
                    {lastAutoSaveTime && (
                      <span className="text-[10px] text-emerald-600 font-mono mr-2">
                        (آخرین ذخیره: {lastAutoSaveTime})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasDraft && draftSavedTime && (
                    <button
                      type="button"
                      onClick={() => restoreDraft()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="بازیابی مقادیر ذخیره‌شده از جلسه قبل"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-600" />
                      <span>بازیابی پیش‌نویس ({draftSavedTime})</span>
                    </button>
                  )}
                  {hasDraft && (
                    <button
                      type="button"
                      onClick={() => discardDraft(true)}
                      className="text-[11px] text-slate-400 hover:text-rose-600 px-2 py-1 cursor-pointer transition-colors"
                      title="پاک کردن داده‌های پیش‌نویس ذخیره‌شده در مرورگر"
                    >
                      پاک‌سازی حافظه
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selector (6 choices) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">نوع سند / فاکتور *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'sale' as InvoiceType, title: 'فاکتور فروش', desc: 'فروش خدمات و کالا', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800' },
                    { type: 'purchase' as InvoiceType, title: 'فاکتور خرید', desc: 'خرید از تأمین‌کننده', color: 'border-blue-500 bg-blue-50/50 text-blue-800' },
                    { type: 'proforma_sale' as InvoiceType, title: 'پیش‌فاکتور فروش', desc: 'برآورد و استعلام مشتری', color: 'border-indigo-500 bg-indigo-50/50 text-indigo-800' },
                    { type: 'proforma_purchase' as InvoiceType, title: 'پیش‌فاکتور خرید', desc: 'استعلام از فروشنده', color: 'border-purple-500 bg-purple-50/50 text-purple-800' },
                    { type: 'sale_return' as InvoiceType, title: 'برگشت از فروش', desc: 'مرجوعی توسط مشتری', color: 'border-rose-500 bg-rose-50/50 text-rose-800' },
                    { type: 'purchase_return' as InvoiceType, title: 'برگشت از خرید', desc: 'استرداد به فروشنده', color: 'border-amber-500 bg-amber-50/50 text-amber-800' },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setInvoiceType(item.type)}
                      className={`p-3 text-right rounded-xl border-2 transition-all cursor-pointer ${
                        invoiceType === item.type
                          ? `${item.color} font-bold shadow-xs`
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Guild Strategy & Dynamic Composite Form Selector */}
              <div className="p-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">الگوی Strategy صنف:</span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                        {guildStrategy.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {guildStrategy.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">صنف ردیف‌ها:</label>
                  <select
                    value={guildStrategyKey}
                    onChange={e => setGuildStrategyKey(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="auto">تشخیص خودکار (بر اساس مستأجر فعال)</option>
                    <option value="installation_construction">نصاب‌ها و ابنیه (متراژ، ضریب سختی و پرت)</option>
                    <option value="consumables_food_health">مواد مصرفی، بهداشتی و دارویی (انقضا و بچ)</option>
                    <option value="gold_jewelry">طلا و جواهر (وزن، عیار، اجرت و سود)</option>
                    <option value="it_digital">فناوری اطلاعات و شبکه (سریال قطعه و SLA)</option>
                    <option value="automotive_parts">قطعات خودرو و تعمیرگاه (کد فنی و گارانتی)</option>
                    <option value="general_standard">خدمات و مهندسی استاندارد</option>
                  </select>
                </div>
              </div>

              {/* Main Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-end gap-1.5">
                    <div className="flex-1">
                      <SearchableClientSelect
                        clients={clients}
                        value={clientId}
                        onChange={handleClientChange}
                        onQuickAddClient={handleTriggerQuickAdd}
                        label={INVOICE_TYPE_METADATA[invoiceType].partyLabel}
                        placeholder={isProformaType ? "انتخاب طرف‌حساب (اختیاری در پیش‌فاکتور)..." : "جستجو و انتخاب طرف‌حساب..."}
                        required={!isProformaType}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerQuickAdd()}
                      className="p-2.5 mb-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      title="تعریف طرف‌حساب جدید با ثبت سند افتتاحیه در دفتر کل"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">+ جدید</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">شماره سند / فاکتور</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">قالب چاپ فاکتور</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomizingInvoice(null);
                        setShowSettingsModal(true);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                      title="تنظیمات و شخصی‌سازی قالب، رنگ و فونت فاکتور"
                    >
                      <Sliders className="w-3 h-3 text-blue-600" />
                      <span>شخصی‌سازی ظاهر</span>
                    </button>
                  </div>
                  <select
                    value={template}
                    onChange={e => setTemplate(e.target.value as InvoiceTemplate)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium"
                  >
                    <option value="professional">حرفه‌ای رسمی (Professional)</option>
                    <option value="modern">مدرن نوین (Modern Clean)</option>
                    <option value="minimal">مینیمال ساده (Minimal Simple)</option>
                    <option value="classic">کلاسیک سنتی بازار (Classic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ صدور</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ سررسید تسویه</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="مثال: ۱۴۰۳/۰۶/۳۰"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">ردیف‌های کالا و خدمات فاکتور</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={applyTax}
                        onChange={e => handleToggleApplyTax(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>محاسبه مالیات ارزش افزوده ({toPersianDigits(settings.defaultTaxRate || 10)}٪)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      + افزودن سطر جدید
                    </button>
                  </div>
                </div>

                {/* Items Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100/70 rounded-lg">
                  <div className="col-span-4">شرح کالا یا خدمات</div>
                  <div className="col-span-1 text-center">تعداد</div>
                  <div className="col-span-2 text-center">قیمت واحد ({settings.currency === 'IRR' ? 'ریال' : settings.currency === 'USD' ? '$' : 'تومان'})</div>
                  <div className="col-span-2 text-center text-rose-700 font-bold">تخفیف ({settings.currency === 'IRR' ? 'ریال' : settings.currency === 'USD' ? '$' : 'تومان'})</div>
                  <div className="col-span-1 text-center">مالیات</div>
                  <div className="col-span-2 text-left font-semibold">مبلغ کل</div>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Description + Inventory selector: 4 cols */}
                      <div className="col-span-12 md:col-span-4 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="شرح کالا یا خدمات..."
                            value={item.description}
                            onChange={e => handleItemChange(idx, 'description', e.target.value)}
                            required
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          {inventory.length > 0 && (
                            <select
                              value={item.itemId || ''}
                              onChange={e => handleItemChange(idx, 'itemId', e.target.value)}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 max-w-[110px] truncate"
                              title="انتخاب سریع از لیست کالا و خدمات انبار"
                            >
                              <option value="">انتخاب از انبار...</option>
                              {inventory.map(invItem => (
                                <option key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.code})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Quantity: 1 col */}
                      <div className="col-span-4 md:col-span-1">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          placeholder="تعداد"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono"
                          title="تعداد یا مقدار"
                        />
                      </div>

                      {/* Unit Price: 2 cols */}
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          placeholder="قیمت واحد"
                          value={item.unitPrice || ''}
                          onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          title="قیمت واحد"
                        />
                      </div>

                      {/* Discount: 2 cols */}
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="۰"
                          value={item.discount || ''}
                          onChange={e => handleItemChange(idx, 'discount', Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-rose-700 font-semibold focus:border-rose-400 focus:ring-1 focus:ring-rose-200"
                          title="مبلغ تخفیف این ردیف"
                        />
                      </div>

                      {/* Tax: 1 col */}
                      <div className="col-span-4 md:col-span-1 text-center">
                        {applyTax ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="٪"
                            value={item.taxRate ?? (settings.defaultTaxRate || 10)}
                            onChange={e => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-mono text-center text-blue-700 font-semibold"
                            title="درصد مالیات این ردیف"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono py-2 block bg-slate-100/60 rounded-lg" title="مالیات غیرفعال است">
                            ۰٪
                          </span>
                        )}
                      </div>

                      {/* Row Total & Delete: 2 cols */}
                      <div className="col-span-8 md:col-span-2 flex items-center justify-between gap-1">
                        <div className="font-bold text-xs text-slate-800 text-left truncate font-mono">
                          {formatCurrency(item.total, settings.currency)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="حذف این سطر"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Guild Strategy Expandable Toggle Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setExpandedRowIndex(expandedRowIndex === idx ? null : idx)}
                        className={`text-[11px] flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          item.metadata && Object.keys(item.metadata).length > 0
                            ? 'bg-blue-100/90 text-blue-800 border border-blue-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>فیلدهای صنف ({guildStrategy.badge})</span>
                        {expandedRowIndex === idx ? (
                          <ChevronUp className="w-3 h-3 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        )}
                      </button>

                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <span>متادیتا صنف:</span>
                          <span className="font-bold text-blue-700">
                            {Object.entries(item.metadata)
                              .filter(([_, v]) => v !== '' && v !== undefined)
                              .map(([k, v]) => `${k}: ${v}`)
                              .slice(0, 2)
                              .join(' | ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expandable Composite Form Section for this item */}
                    {expandedRowIndex === idx && (
                      <div className="mt-2 pt-2 border-t border-blue-100">
                        <DynamicGuildFormSection
                          strategy={guildStrategy}
                          compositeGroup={guildStrategy.buildItemFormComposite()}
                          values={item.metadata || {}}
                          onChange={(newMeta) => handleItemMetadataChange(idx, newMeta)}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payments & Financial Notes Section */}
              <div className="space-y-3 pt-2">
                {!(invoiceType === 'proforma_sale' || invoiceType === 'proforma_purchase' || invoiceType === 'proforma') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {invoiceType === 'purchase' ? 'مبلغ پرداختی نقدی (پیش‌پرداخت/تسویه)' : 'مبلغ پرداختی خریدار / بیعانه نقدی'}
                    </label>
                    <div className="relative max-w-sm">
                      <input
                        type="number"
                        value={amountPaid || ''}
                        onChange={e => setAmountPaid(Number(e.target.value))}
                        placeholder="۰"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400">
                        {settings.currency === 'IRR' ? 'ریال' : 'تومان'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* توضیحات اختصاصی همین فاکتور / پیش‌فاکتور */}
                  {(() => {
                    const isProforma = invoiceType === 'proforma' || invoiceType === 'proforma_sale' || invoiceType === 'proforma_purchase';
                    return (
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            {isProforma ? 'توضیحات اختصاصی این پیش‌فاکتور' : 'توضیحات اختصاصی این فاکتور'}
                          </label>
                          <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            مختص همین سند
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder={isProforma ? 'توضیحات فنی، مشخصات و نکات ویژه این پیش‌فاکتور...' : 'نکات فنی، خدمات اضافه، مشخصات تحویل یا توضیحات این فاکتور...'}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                        />
                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                          <span>در پیش‌نمایش چاپی در کادر توضیحات نمایش داده می‌شود.</span>
                          {settings.invoiceNote && settings.invoiceNote.trim() && (
                            <button
                              type="button"
                              onClick={() => setNotes(prev => prev ? `${prev}\n${settings.invoiceNote}` : settings.invoiceNote || '')}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                            >
                              افزودن پیام عمومی کسب‌وکار
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* شرایط تسویه حساب و قوانین عمومی */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        شرایط تسویه حساب، مهلت و قوانین پرداخت
                      </label>
                      <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        قوانین و تسویه
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={terms}
                      onChange={e => setTerms(e.target.value)}
                      placeholder={settings.invoiceTerms || 'مهلت تسویه، نحوه پرداخت، شماره شبا یا قوانین مربوطه...'}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed resize-y focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-hidden"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                      <span>برگرفته از تنظیمات هابینو (قابل تغییر برای این سند).</span>
                      {settings.invoiceTerms && terms !== settings.invoiceTerms && (
                        <button
                          type="button"
                          onClick={() => setTerms(settings.invoiceTerms || '')}
                          className="text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                        >
                          بازیابی متن پیش‌فرض تنظیمات
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Invoice Financial Summary Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block mb-1 text-[11px]">جمع کل ناخالص</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatCurrency(calculateSubtotal(items), settings.currency)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-rose-600 block mb-1 text-[11px] font-semibold">تخفیف کل فاکتور</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {calculateTotalDiscount(items) > 0 ? `- ${formatCurrency(calculateTotalDiscount(items), settings.currency)}` : '۰'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-blue-600 block mb-1 text-[11px] font-semibold">مالیات بر ارزش افزوده</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {applyTax ? formatCurrency(calculateTotalTax(items), settings.currency) : 'غیرفعال (۰)'}
                    </span>
                  </div>

                <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/80">
                    <span className="text-blue-900 block mb-1 text-[11px] font-bold">
                      {(invoiceType === 'proforma_sale' || invoiceType === 'proforma_purchase' || invoiceType === 'proforma')
                        ? 'جمع کل برآورد پیش‌فاکتور'
                        : 'مبلغ نهایی قابل پرداخت'}
                    </span>
                    <span className="font-extrabold text-blue-900 font-mono text-sm">
                      {formatCurrency(
                        (calculateSubtotal(items) - calculateTotalDiscount(items)) + (applyTax ? calculateTotalTax(items) : 0),
                        settings.currency
                      )}
                    </span>
                  </div>
                </div>

                {amountPaid > 0 && !(invoiceType === 'proforma_sale' || invoiceType === 'proforma_purchase' || invoiceType === 'proforma') && (
                  <div className="flex justify-between items-center px-1 text-xs pt-2 border-t border-slate-200/60">
                    <span className="text-slate-600">مانده حساب پس از کسر پرداختی / بیعانه:</span>
                    <span className="font-bold font-mono text-amber-700">
                      {formatCurrency(
                        Math.max(
                          0,
                          ((calculateSubtotal(items) - calculateTotalDiscount(items)) + (applyTax ? calculateTotalTax(items) : 0)) - amountPaid
                        ),
                        settings.currency
                      )}
                    </span>
                  </div>
                )}

                {/* Live Client Balance & Projected Total Debt Impact (فقط برای فاکتورهای رسمی؛ پیش‌فاکتور سند خنثی است و اثر مالی در دفتر کل ندارد) */}
                {!(invoiceType === 'proforma_sale' || invoiceType === 'proforma_purchase' || invoiceType === 'proforma') && (() => {
                  const selectedClient = clients.find(c => c.id === clientId);
                  if (!selectedClient) return null;
                  const curBalance = selectedClient.balance || 0;
                  const activePrevBal = customPreviousBalance !== null ? customPreviousBalance : curBalance;
                  const currentRemaining = Math.max(
                    0,
                    ((calculateSubtotal(items) - calculateTotalDiscount(items)) + (applyTax ? calculateTotalTax(items) : 0)) - amountPaid
                  );
                  let balanceDelta = 0;
                  if (invoiceType === 'sale' || invoiceType === 'service') {
                    balanceDelta = currentRemaining;
                  } else if (invoiceType === 'purchase') {
                    balanceDelta = -currentRemaining;
                  } else if (invoiceType === 'sale_return') {
                    balanceDelta = -currentRemaining;
                  } else if (invoiceType === 'purchase_return') {
                    balanceDelta = currentRemaining;
                  }
                  const projDebt = activePrevBal + balanceDelta;

                  return (
                    <div className="pt-2.5 border-t border-slate-200/80 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-3 py-2 bg-slate-100/90 rounded-xl border border-slate-200 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600">مانده حساب از قبل (تراز پیشین {selectedClient.name}):</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(Math.abs(activePrevBal), settings.currency)}{' '}
                            <span className={activePrevBal > 0 ? 'text-amber-700' : activePrevBal < 0 ? 'text-emerald-700' : 'text-slate-500'}>
                              {activePrevBal > 0 ? '(بدهکار به ما)' : activePrevBal < 0 ? '(بستانکار از ما)' : '(تسویه)'}
                            </span>
                          </span>
                        </div>
                        {customPreviousBalance !== null && customPreviousBalance !== curBalance && (
                          <button
                            type="button"
                            onClick={() => setCustomPreviousBalance(curBalance)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer self-end sm:self-auto"
                            title="بازنشانی به مانده جاری ثبت‌شده در دفتر کل"
                          >
                            بازنشانی به مانده جاری دفتر کل ({formatCurrency(Math.abs(curBalance), settings.currency)})
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50/80 rounded-xl font-bold text-slate-900 border border-blue-200/80">
                        <span className="text-blue-900 font-semibold">جمع کل بدهی طرف‌حساب با احتساب این فاکتور:</span>
                        <span className="font-mono font-black text-sm text-blue-950">
                          {formatCurrency(Math.abs(projDebt), settings.currency)}{' '}
                          <span className={projDebt > 0 ? 'text-red-700' : projDebt < 0 ? 'text-emerald-700' : 'text-slate-600'}>
                            {projDebt > 0 ? '(بدهکار نهایی)' : projDebt < 0 ? '(بستانکار نهایی)' : '(تسویه کامل)'}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                {editingInvoice ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isProformaType) {
                        setUnauthorizedDeleteInvoice(editingInvoice);
                        return;
                      }
                      setInvoiceToDelete(editingInvoice);
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isProformaType
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                    }`}
                    title={isProformaType ? 'حذف پیش‌فاکتور (سند خنثی)' : 'حذف فاکتور رسمی طبق قوانین حسابداری غیرمجاز است'}
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>حذف این سند</span>
                  </button>
                ) : <div className="hidden sm:block" />}

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                  {(!clientId || String(clientId).trim() === '') && !isProformaType && (
                    <span className="text-xs text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>قانون ۱: انتخاب طرف‌حساب الزامی است.</span>
                    </span>
                  )}
                  {(!clientId || String(clientId).trim() === '') && isProformaType && (
                    <span className="text-xs text-amber-700 font-medium flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <span>پیش‌فاکتور سندی خنثی است (انتخاب طرف‌حساب اختیاری)</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={closeInvoiceModal}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>انصراف و بستن فرم</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!isProformaType && (!clientId || String(clientId).trim() === '')}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
                  >
                    {editingInvoice 
                      ? (isProformaType ? 'ذخیره پیش‌فاکتور' : 'ذخیره') 
                      : (isProformaType ? 'ثبت پیش‌فاکتور' : `ثبت سند (${INVOICE_TYPE_METADATA[invoiceType].label})`)}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onDelete={() => {
            const isProforma = previewInvoice.type === 'proforma' || previewInvoice.type === 'proforma_sale' || previewInvoice.type === 'proforma_purchase';
            if (!isProforma) {
              setUnauthorizedDeleteInvoice(previewInvoice);
              return;
            }
            setInvoiceToDelete(previewInvoice);
          }}
        />
      )}

      {/* Physical Signature Modal */}
      {signingInvoice && (
        <PhysicalSignatureCanvas
          invoiceNumber={signingInvoice.invoiceNumber}
          defaultSignerName={settings.name || 'فرید تهرانی'}
          defaultSignerRole="vendor"
          isSubmitting={isSavingSignature}
          title="امضای فیزیکی و تایید رسمی سند (مهر و امضا)"
          onCancel={() => setSigningInvoice(null)}
          onSave={async (payload) => {
            setIsSavingSignature(true);
            try {
              const res = await uploadAndRecordSignature({
                invoiceId: signingInvoice.id,
                invoiceNumber: signingInvoice.invoiceNumber,
                blob: payload.blob,
                dataUrl: payload.dataUrl,
                signerName: payload.signerName,
                signerRole: payload.signerRole,
                signerNationalId: payload.signerNationalId,
                tenantId: signingInvoice.tenantId || 'tenant-main',
                signedAt: payload.signedAt,
                signatureHash: payload.signatureHash
              });
              await updateInvoice(signingInvoice.id, {
                signatureUrl: res.signatureUrl,
                isSigned: true,
                signedAt: payload.signedAt,
                shareToken: res.shareToken,
                signatureMetadata: {
                  signatureId: res.signatureRecord?.id,
                  signerName: payload.signerName,
                  signerRole: payload.signerRole,
                  signerNationalId: payload.signerNationalId,
                  signatureHash: payload.signatureHash
                }
              });
              setSigningInvoice(null);
              setActionFeedback({
                text: `امضای رسمی فاکتور #${signingInvoice.invoiceNumber} با موفقیت ثبت شد.`,
                isError: false
              });
              setTimeout(() => setActionFeedback(null), 5000);
            } catch (err: any) {
              alert(err.message || 'خطا در ثبت امضا');
            } finally {
              setIsSavingSignature(false);
            }
          }}
        />
      )}

      {/* Secure Share Modal */}
      {sharingInvoice && (
        <ShareInvoiceModal
          invoice={sharingInvoice}
          settings={settings}
          onClose={() => setSharingInvoice(null)}
          onOpenPublicView={(token) => {
            setSharingInvoice(null);
            window.open(`/?invoice_token=${token}`, '_blank');
          }}
        />
      )}

      {/* Dedicated In-App Delete Confirmation Modal (Acid Safe & iFrame Resilient) */}
      {invoiceToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
          id="habino-delete-invoice-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setInvoiceToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
            dir="rtl"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  تایید حذف قطعی سند مالی #{toPersianDigits(invoiceToDelete.invoiceNumber)}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  آیا از حذف این سند مالی اطمینان دارید؟ سیستم مالی هابینو به‌صورت خودکار کلیه اثرات زنجیره‌ای این سند را بازگردانی می‌کند.
                </p>
              </div>
            </div>

            {/* Document Details Card */}
            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>نوع سند:</span>
                <span className="font-semibold text-slate-800">
                  {INVOICE_TYPE_METADATA[invoiceToDelete.type]?.label || invoiceToDelete.type}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>طرف‌حساب:</span>
                <span className="font-semibold text-slate-800">
                  {invoiceToDelete.clientName || 'بدون نام'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>تاریخ صدور:</span>
                <span className="font-semibold text-slate-800">
                  {toPersianDigits(invoiceToDelete.date)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">مبلغ کل فاکتور:</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  {formatCurrency(invoiceToDelete.grandTotal, settings.currency)}
                </span>
              </div>
            </div>

            {/* ACID Cascade Reversion Info */}
            <div className="mt-3 p-3 bg-rose-50/80 border border-rose-100 rounded-xl text-[11px] text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>اقدامات خودکار در هنگام حذف:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-700 pr-1 leading-relaxed">
                <li>تعدیل و اصلاح مانده بدهی یا طلب حساب «{invoiceToDelete.clientName || 'مخاطب'}»</li>
                <li>بازگردانی خودکار موجودی {toPersianDigits(invoiceToDelete.items?.length || 0)} ردیف کالا به انبار</li>
                <li>حذف ردیف‌های متناظر در دفتر کل و تراکنش‌های نقدی وابسته</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="confirm-delete-invoice-btn"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>در حال حذف و بازگردانی...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>بله، حذف قطعی سند</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Add Client Modal with Opening Balance */}
      {showQuickClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">افزودن سریع طرف‌حساب</h3>
                  <p className="text-xs text-slate-500 mt-0.5">ثبت آنی طرف‌حساب به همراه سند افتتاحیه در دفتر کل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickClientModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddClient} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام و نام خانوادگی / عنوان شرکت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickClientName}
                  onChange={e => setQuickClientName(e.target.value)}
                  placeholder="مثال: شرکت پارس آذر / علی کریمی"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">شماره تماس</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={quickClientPhone}
                    onChange={e => setQuickClientPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع شخصیت</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setQuickClientType('individual')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        quickClientType === 'individual' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>حقیقی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickClientType('corporate')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        quickClientType === 'corporate' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>حقوقی</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Opening Balance Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    وضعیت حساب اولیه (مانده اول دوره از قبل):
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickClientBalanceType('zero');
                        setQuickClientBalance(0);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        quickClientBalanceType === 'zero'
                          ? 'bg-slate-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      بی‌حساب (صفر)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickClientBalanceType('debtor')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        quickClientBalanceType === 'debtor'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      بدهکار (به ما)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickClientBalanceType('creditor')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        quickClientBalanceType === 'creditor'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      بستانکار (از ما)
                    </button>
                  </div>
                </div>

                {quickClientBalanceType !== 'zero' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      مبلغ مانده اول دوره ({settings.currency === 'IRR' ? 'ریال' : 'تومان'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quickClientBalance === 0 ? '' : quickClientBalance}
                      onChange={e => setQuickClientBalance(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-bold text-slate-900"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span>معادل حروفی:</span>
                      <span className="font-semibold text-blue-700 font-mono">
                        {formatCurrency(quickClientBalance, settings.currency)} ({quickClientBalanceType === 'debtor' ? 'بدهکار به ما' : 'بستانکار از ما'})
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 bg-blue-50/70 p-2 rounded-lg border border-blue-100/80 leading-relaxed">
                      💡 سند افتتاحیه دوبل این مانده به صورت خودکار در دفتر کل ثبت شده و مستقیماً به عنوان «تراز قبلی» در این فاکتور درج خواهد شد.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickClient || !quickClientName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingQuickClient ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ثبت سند...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>ثبت و الصاق به فاکتور</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template & Design Customization Modal */}
      {showSettingsModal && (
        <InvoiceSettingsModal
          currentTemplate={customizingInvoice ? customizingInvoice.template : settings.defaultInvoiceTemplate}
          currentDesign={customizingInvoice ? customizingInvoice.designConfig : settings.defaultInvoiceDesign}
          sourceInvoice={customizingInvoice}
          title={customizingInvoice ? `شخصی‌سازی سند شماره #${customizingInvoice.invoiceNumber}` : 'تنظیمات و شخصی‌سازی قالب‌های فاکتور'}
          onClose={() => {
            setShowSettingsModal(false);
            setCustomizingInvoice(null);
          }}
          onSave={async (tmpl, dsg) => {
            if (customizingInvoice) {
              await updateInvoice(customizingInvoice.id, {
                template: tmpl,
                designConfig: dsg
              });
            } else {
              // ذخیره قالب و طراحی پیش‌فرض سیستم برای تمامی فاکتورها
              await updateSettings({
                defaultInvoiceTemplate: tmpl,
                defaultInvoiceDesign: dsg
              });
              setTemplate(tmpl);
            }
            setShowSettingsModal(false);
            setCustomizingInvoice(null);
          }}
        />
      )}

      {/* PC-POS Bank Terminal Modal */}
      {pcPosInvoice && (
        <PcPosModal
          amount={Math.max(0, (pcPosInvoice.grandTotal || 0) - (pcPosInvoice.amountPaid || 0))}
          currency={settings.currency}
          invoiceId={pcPosInvoice.id}
          invoiceNumber={pcPosInvoice.invoiceNumber}
          clientName={pcPosInvoice.clientName}
          onClose={() => setPcPosInvoice(null)}
          onPaymentComplete={handlePcPosSettlement}
        />
      )}

      {/* Modal: خطای عدم توجیه قانونی و منع حذف فاکتورهای رسمی */}
      {unauthorizedDeleteInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  خطای عدم توجیه قانونی: حذف فاکتور غیرمجاز است
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  سند مالی شماره #{toPersianDigits(unauthorizedDeleteInvoice.invoiceNumber)} در دفاتر حسابداری و مودیان قطعی شده است.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>منع قانونی حذف اسناد مالی قطعی:</span>
              </div>
              <p>
                طبق قوانین و استانداردهای حسابداری، ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم و اصول ۹‌گانه مالی هابینو، حذف فاکتورهای رسمی و قطعی ثبت‌شده در دفاتر به علت لزوم حفظ زنجیره عطف اسناد و توازن ترازنامه اکیداً غیرمجاز است.
              </p>
              <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-800">
                💡 <strong>راهکار قانونی:</strong> در صورت انصراف، مرجوعی کالا یا اشتباه ثبتی، فاکتور «برگشت از فروش / خرید» صادر نمایید یا سند اصلاحی در دفتر کل ثبت فرمایید.
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnauthorizedDeleteInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  const inv = unauthorizedDeleteInvoice;
                  setUnauthorizedDeleteInvoice(null);
                  handleOpenReturnWizard(inv);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>صدور آنی فاکتور برگشت (ابطال قانونی)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnauthorizedDeleteInvoice(null);
                  setActiveTypeTab('returns');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                مشاهده اسناد برگشتی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Invoice Wizard Modal (ویزارد ۱-کلیکه صدور فاکتور برگشت برای تمام انواع فاکتور) */}
      {returnWizardInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">ویزارد صدور سند برگشت (ابطال قانونی)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ابطال خودکار و معکوس‌سازی دفاتر برای سند شماره #{toPersianDigits(returnWizardInvoice.invoiceNumber)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnWizardInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Document Summary Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>نوع سند مبدا:</span>
                  <span className="font-semibold text-slate-800">
                    {INVOICE_TYPE_METADATA[returnWizardInvoice.type]?.label || returnWizardInvoice.type}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>طرف‌حساب:</span>
                  <span className="font-semibold text-slate-800">{returnWizardInvoice.clientName || 'بدون نام'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>مبلغ کل سند:</span>
                  <span className="font-bold text-emerald-700 text-sm font-mono">
                    {formatCurrency(returnWizardInvoice.grandTotal, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                  <span>نوع سند برگشتی حاصل:</span>
                  <span className="font-bold text-amber-700">
                    {returnWizardInvoice.type === 'purchase' ? 'فاکتور برگشت از خرید (کاهش بستانکاری و خروج کالا)' : 'فاکتور برگشت از فروش (کاهش بدهی مشتری و ورود به انبار)'}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  علت صدور سند برگشت (ابطال قانونی):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'انصراف مشتری و مرجوعی کامل اقلام',
                    'اشتباه در قیمت‌گذاری یا تعداد اقلام فاکتور',
                    'عدم تطابق مشخصات فنی یا نقص کیفی',
                    'توافق دوجانبه در ابطال سند مالی'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReturnReason(reason)}
                      className={`p-2.5 text-right rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        returnReason === reason
                          ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Note Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  توضیحات تکمیلی یا شماره نامه پیوست (اختیاری):
                </label>
                <input
                  type="text"
                  value={customReturnNote}
                  onChange={e => setCustomReturnNote(e.target.value)}
                  placeholder="مثال: طبق هماهنگی با مدیر فروش و تایید انباردار"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Automatic Accounting Effects */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>آثار خودکار مالی پس از صدور:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 pr-1">
                  <li>صدور خودکار سند رسمی شماره <span className="font-mono font-bold">RET-{returnWizardInvoice.invoiceNumber}</span></li>
                  <li>تعدیل مانده حساب «{returnWizardInvoice.clientName}» در دفاتر مالی</li>
                  <li>ثبت خودکار گردش کالایی و بازگردانی اقلام به انبار</li>
                  <li>ثبت لاگ حسابرسی (Audit Trail) در دفتر کل و کنسول نظارتی سیستم</li>
                </ul>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessingReturn}
                  onClick={() => setReturnWizardInvoice(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isProcessingReturn}
                  onClick={handleConfirmReturnInvoice}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingReturn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال ثبت سند برگشت...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تایید و صدور آنی سند برگشت</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
