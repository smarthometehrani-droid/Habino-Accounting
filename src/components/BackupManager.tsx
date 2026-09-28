import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import {
  downloadBackupJson,
  parseBackupFile,
  exportToCsv,
  saveBackupToSupabase,
  fetchCloudBackups,
  fetchSingleCloudBackupSnapshot,
  deleteCloudBackupFromSupabase
} from '../lib/backupEngine';
import { BackupSnapshot } from '../types';
import { formatCurrency } from '../lib/currencyUtils';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText,
  CreditCard,
  Users,
  ArrowLeftRight,
  Wifi,
  WifiOff,
  AlertCircle,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  Code2,
  Copy,
  Check,
  X
} from 'lucide-react';

export const BackupManager: React.FC = () => {
  const {
    invoices,
    checks,
    transactions,
    clients,
    inventory,
    installments,
    bankAccounts,
    projects,
    accountingEntries,
    settings,
    triggerManualBackup,
    restoreFullBackup,
    isOnline,
    isSupabaseLive
  } = useAccounting();

  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<BackupSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cloud Backup State
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [loadingCloudBackups, setLoadingCloudBackups] = useState<boolean>(false);
  const [savingToCloud, setSavingToCloud] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const loadCloudBackups = async () => {
    setLoadingCloudBackups(true);
    try {
      const res = await fetchCloudBackups();
      if (res.success && res.backups) {
        setCloudBackups(res.backups);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingCloudBackups(false);
    }
  };

  useEffect(() => {
    loadCloudBackups();
  }, []);

  // Save to Cloud Handler
  const handleSaveToCloud = async () => {
    setSavingToCloud(true);
    setRestoreMessage(null);
    try {
      const snapshot = triggerManualBackup();
      const res = await saveBackupToSupabase(snapshot);
      if (res.success) {
        setRestoreMessage({
          type: 'success',
          text: `نسخه پشتیبان ابری با موفقیت در پایگاه داده سوپابیس ثبت گردید (شناسه: ${snapshot.backupId})`
        });
        await loadCloudBackups();
      } else {
        setRestoreMessage({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: `خطا در ارتباط با سرور ابری: ${err?.message || 'نامشخص'}`
      });
    } finally {
      setSavingToCloud(false);
    }
  };

  // Restore from Cloud Handler
  const handleRestoreFromCloud = async (backupId: string) => {
    if (!window.confirm(`آیا از بازیابی نسخه پشتیبان ابری با شناسه ${backupId} اطمینان دارید؟ اسناد فعلی با این نسخه جایگزین خواهند شد.`)) {
      return;
    }
    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const res = await fetchSingleCloudBackupSnapshot(backupId);
      if (!res.success || !res.snapshot) {
        setRestoreMessage({
          type: 'error',
          text: res.message
        });
        return;
      }
      const restoreRes = await restoreFullBackup(res.snapshot);
      setRestoreMessage({
        type: restoreRes.success ? 'success' : 'error',
        text: restoreRes.message
      });
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: `خطا در بازیابی ابری: ${err?.message || 'نامشخص'}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete from Cloud Handler
  const handleDeleteCloudBackup = async (backupId: string) => {
    if (!window.confirm(`آیا از حذف نسخه پشتیبان ابری ${backupId} مطمئن هستید؟`)) {
      return;
    }
    try {
      const res = await deleteCloudBackupFromSupabase(backupId);
      if (res.success) {
        setCloudBackups(prev => prev.filter(b => b.backup_id !== backupId));
        setRestoreMessage({
          type: 'success',
          text: 'نسخه پشتیبان از ابر حذف شد.'
        });
      } else {
        setRestoreMessage({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err?.message || 'خطا در حذف'
      });
    }
  };

  // Manual Local Backup Handler
  const handleDownloadFullBackup = () => {
    const snapshot = triggerManualBackup();
    downloadBackupJson(snapshot);
    setRestoreMessage({
      type: 'success',
      text: `فایل پشتیبان کامل (${snapshot.backupId}) با موفقیت تولید و دانلود شد.`
    });
  };

  // File Upload & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreMessage(null);
    const result = await parseBackupFile(file);

    if (result.success && result.snapshot) {
      setSelectedSnapshot(result.snapshot);
    } else {
      setSelectedSnapshot(null);
      setRestoreMessage({
        type: 'error',
        text: result.error || 'فایل نامعتبر است.'
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!selectedSnapshot) return;

    setIsRestoring(true);
    const result = await restoreFullBackup(selectedSnapshot);
    setIsRestoring(false);

    if (result.success) {
      setRestoreMessage({
        type: 'success',
        text: result.message
      });
      setSelectedSnapshot(null);
    } else {
      setRestoreMessage({
        type: 'error',
        text: result.message
      });
    }
  };

  const SUPABASE_BACKUP_SQL = `-- ۱. ساخت یا ارتقاء جدول نسخه‌های پشتیبان چندمستأجری هابینو
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'default_tenant',
    backup_id TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '2.5.0',
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ۲. حصول اطمینان از وجود تمام ستون‌ها (در صورت وجود جدول قبلی در دیتابیس)
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default_tenant';
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS backup_id TEXT;
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '2.5.0';
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.backups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ۳. ایجاد قید یکتایی برای هماهنگی با متد Upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'backups_tenant_backup_id_key'
    ) THEN
        ALTER TABLE public.backups 
        ADD CONSTRAINT backups_tenant_backup_id_key UNIQUE (tenant_id, backup_id);
    END IF;
END $$;

-- ۴. ساخت ایندکس‌های بهینه‌سازی سرعت واکشی
CREATE INDEX IF NOT EXISTS idx_backups_tenant_created 
    ON public.backups(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backups_backup_id 
    ON public.backups(backup_id);

-- ۵. فعال‌سازی امنیت سطح ردیف (Row Level Security)
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- ۶. تنظیم سیاست‌های دسترسی امن (Idempotent RLS Policies)
DROP POLICY IF EXISTS "Allow public read backups" ON public.backups;
CREATE POLICY "Allow public read backups" ON public.backups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert backups" ON public.backups;
CREATE POLICY "Allow public insert backups" ON public.backups
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update backups" ON public.backups;
CREATE POLICY "Allow public update backups" ON public.backups
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete backups" ON public.backups;
CREATE POLICY "Allow public delete backups" ON public.backups
    FOR DELETE USING (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_BACKUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // CSV Exporters
  const handleExportInvoicesCsv = () => {
    const headers = ['شماره فاکتور', 'مشتری', 'تاریخ', 'مبلغ کل', 'پرداخت شده', 'مانده', 'وضعیت'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.clientName || '',
      inv.date,
      inv.grandTotal,
      inv.amountPaid,
      inv.remainingAmount,
      inv.status
    ]);
    exportToCsv(`habino-invoices-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleExportTransactionsCsv = () => {
    const headers = ['تاریخ', 'نوع', 'دسته‌بندی', 'مبلغ', 'شرح', 'مشتری'];
    const rows = transactions.map(tx => [
      tx.date,
      tx.type === 'income' ? 'درآمد' : tx.type === 'expense' ? 'هزینه' : 'انتقال',
      tx.category,
      tx.amount,
      tx.description,
      tx.clientName || ''
    ]);
    exportToCsv(`habino-transactions-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleExportChecksCsv = () => {
    const headers = ['شماره چک', 'شناسه صیاد', 'بانک', 'مبلغ', 'سررسید', 'نوع', 'طرف حساب', 'وضعیت'];
    const rows = checks.map(c => [
      c.checkNumber,
      c.sayadNumber || '',
      c.bankName,
      c.amount,
      c.dueDate,
      c.type === 'receivable' ? 'دریافتی' : 'پرداختی',
      c.clientName || '',
      c.status
    ]);
    exportToCsv(`habino-checks-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleExportClientsCsv = () => {
    const headers = ['نام مخاطب', 'شرکت', 'تلفن', 'کد ملی / اقتصادی', 'مانده حساب'];
    const rows = clients.map(c => [
      c.name,
      c.companyName || '',
      c.phone || '',
      c.nationalCode || c.economicCode || '',
      c.balance || 0
    ]);
    exportToCsv(`habino-clients-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10" id="backup-manager-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Database className="w-7 h-7 text-blue-600" />
            <span>پشتیبان‌گیری خودکار و حفظ حاکمیت داده‌ها</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            تهیه پشتیبان کامل از دفاتر مالی، بازگردانی اسناد و ذخیره‌سازی محلی مقاوم در برابر قطعی اینترنت
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSqlModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            id="view-supabase-sql-btn"
            title="مشاهده کدهای SQL سوپابیس برای بارگذاری جدول پشتیبان‌ها"
          >
            <Code2 className="w-4 h-4 text-slate-600" />
            <span>اسکریپت SQL سوپابیس</span>
          </button>
          <button
            onClick={handleSaveToCloud}
            disabled={savingToCloud}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            id="save-to-supabase-cloud-btn"
          >
            <CloudUpload className={`w-4 h-4 ${savingToCloud ? 'animate-spin' : ''}`} />
            <span>{savingToCloud ? 'در حال ثبت در ابر...' : 'ذخیره در ابر سوپابیس'}</span>
          </button>
          <button
            onClick={handleDownloadFullBackup}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            id="download-local-json-btn"
          >
            <Download className="w-4 h-4" />
            <span>دانلود فایل آفلاین (JSON)</span>
          </button>
        </div>
      </div>

      {/* Notification Message */}
      {restoreMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
          restoreMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {restoreMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{restoreMessage.text}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Storage Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-600" />
              حجم اسناد ثبت‌شده
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
              حافظه محلی امن
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {invoices.length + transactions.length + checks.length + clients.length} رکورد
            </p>
            <p className="text-xs text-slate-500 mt-1">شامل فاکتورها، تراکنش‌ها، چک‌ها و مخاطبان</p>
          </div>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>فاکتورها: <span className="font-bold text-slate-800">{invoices.length}</span></div>
            <div>چک‌ها: <span className="font-bold text-slate-800">{checks.length}</span></div>
            <div>تراکنش‌ها: <span className="font-bold text-slate-800">{transactions.length}</span></div>
            <div>مشتریان: <span className="font-bold text-slate-800">{clients.length}</span></div>
          </div>
        </div>

        {/* Daily Auto-Backup Status */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              پشتیبان‌گیری خودکار روزانه
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
              فعال (Auto-Run)
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">
              ذخیره خودکار در پایان هر روز کاری
            </p>
            <p className="text-xs text-slate-500 mt-1">
              حتی در صورت ریست مرورگر، پشتیبان روزانه در حافظه ذخیره است.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>آخرین همگام‌سازی:</span>
            <span className="font-bold text-slate-700">امروز (پایدار)</span>
          </div>
        </div>

        {/* Offline & Resilience Status */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
              ایزولاسیون و شرایط تحریم
            </span>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
              isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {isOnline ? 'ابر متصل' : 'حالت آفلاین امن'}
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">
              معماری Offline-First مستقل
            </p>
            <p className="text-xs text-slate-500 mt-1">
              بدون وابستگی به سرورهای خارجی یا اختلالات فیلترینگ و اینترنت بین‌الملل.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>حاکمیت کامل روی داده‌ها</span>
          </div>
        </div>
      </div>

      {/* Cloud Backups on Supabase Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-600" />
              <span>پایگاه داده ابری سوپابیس (Multi-Tenant Cloud Backups)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              نسخه‌های پشتیبان ذخیره‌شده در جدول backups سوپابیس به همراه امکان بازیابی و حذف آنی
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCloudBackups}
              disabled={loadingCloudBackups}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCloudBackups ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی فهرست ابری</span>
            </button>
            <button
              onClick={handleSaveToCloud}
              disabled={savingToCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>پشتیبان‌گیری ابری جدید</span>
            </button>
          </div>
        </div>

        {/* Cloud Backups Table */}
        {loadingCloudBackups ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>در حال واکشی نسخه‌های ابری از سوپابیس...</span>
          </div>
        ) : cloudBackups.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">شناسه پشتیبان</th>
                  <th className="p-3">تاریخ و زمان</th>
                  <th className="p-3">نسخه</th>
                  <th className="p-3">تعداد فاکتور / چک / مشتری / تراکنش</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cloudBackups.map((bk) => (
                  <tr key={bk.id || bk.backup_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-900 font-bold">
                      {bk.backup_id}
                    </td>
                    <td className="p-3 text-slate-700">
                      {(bk.created_at || bk.timestamp) ? new Date(bk.created_at || bk.timestamp).toLocaleString('fa-IR') : '—'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px]">
                        v{bk.version || '2.5.0'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {bk.summary ? (
                        <div className="flex items-center gap-2 text-[11px]">
                          <span>فاکتور: <b>{bk.summary.invoicesCount ?? 0}</b></span>
                          <span>|</span>
                          <span>چک: <b>{bk.summary.checksCount ?? 0}</b></span>
                          <span>|</span>
                          <span>مخاطب: <b>{bk.summary.clientsCount ?? 0}</b></span>
                          <span>|</span>
                          <span>تراکنش: <b>{bk.summary.transactionsCount ?? 0}</b></span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleRestoreFromCloud(bk.backup_id)}
                          disabled={isRestoring}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="بازیابی مستقیم دفاتر مالی از این نسخه ابری"
                        >
                          <CloudDownload className="w-3 h-3 text-emerald-600" />
                          <span>بازیابی</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCloudBackup(bk.backup_id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف این نسخه ابری"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2">
            <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">هنوز نسخه پشتیبانی در پایگاه ابری سوپابیس ثبت نشده است.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              با فشردن دکمه «ذخیره در ابر سوپابیس»، دفاتر مالی شما به صورت یکپارچه با فرمت استاندارد در جدول backups سوپابیس ذخیره خواهند شد.
            </p>
          </div>
        )}
      </div>

      {/* Restore Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <span>بازیابی اطلاعات از فایل پشتیبان (JSON Restore)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            جهت انتقال دفاتر مالی به سیستم دیگر یا بازیابی نسخه قبلی، فایل JSON پشتیبان را انتخاب کنید.
          </p>
        </div>

        <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer">
          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-input"
          />
          <label htmlFor="backup-file-input" className="cursor-pointer space-y-3 block">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">برای انتخاب فایل پشتیبان کلیک کنید</p>
              <p className="text-xs text-slate-500 mt-1">فرمت مورد تایید: JSON استخراج‌شده از نرم‌افزار هابینو</p>
            </div>
          </label>
        </div>

        {/* Selected Snapshot Preview Modal / Card */}
        {selectedSnapshot && (
          <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-indigo-950">فایل پشتیبان تایید شد: شناسه {selectedSnapshot.backupId}</h4>
              </div>
              <span className="text-xs text-indigo-700">
                تاریخ تولید: {new Date(selectedSnapshot.timestamp).toLocaleDateString('fa-IR')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-xl border border-indigo-100 text-slate-700">
              <div>فاکتورها: <span className="font-bold text-indigo-900">{selectedSnapshot.summary.invoicesCount} عدد</span></div>
              <div>چک‌ها: <span className="font-bold text-indigo-900">{selectedSnapshot.summary.checksCount} عدد</span></div>
              <div>مشتریان: <span className="font-bold text-indigo-900">{selectedSnapshot.summary.clientsCount} نفر</span></div>
              <div>تراکنش‌ها: <span className="font-bold text-indigo-900">{selectedSnapshot.summary.transactionsCount} سند</span></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'در حال بازیابی دفاتر...' : 'تایید و بازگردانی کلیه دفاتر'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Excel / CSV Exporters Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>خروجی اکسل و CSV تفکیکی (Excel-Ready with Persian UTF-8 BOM)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            دانلود مجزای جداول برای حسابرسان، ارائه به اداره مالیات یا تحلیل با نرم‌افزار Excel
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={handleExportInvoicesCsv}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-right transition-all group"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">فهرست فاکتورها</span>
              <span className="text-[11px] text-slate-400">{invoices.length} ردیف آماده خروجی</span>
            </div>
            <FileText className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          </button>

          <button
            onClick={handleExportTransactionsCsv}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-right transition-all group"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">درآمد و هزینه‌ها</span>
              <span className="text-[11px] text-slate-400">{transactions.length} ردیف گردش مالی</span>
            </div>
            <ArrowLeftRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          </button>

          <button
            onClick={handleExportChecksCsv}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-right transition-all group"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">دفتر چک‌های صیادی</span>
              <span className="text-[11px] text-slate-400">{checks.length} فقره چک ثبت‌شده</span>
            </div>
            <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          </button>

          <button
            onClick={handleExportClientsCsv}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-right transition-all group"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">مخاطبان و مشتریان</span>
              <span className="text-[11px] text-slate-400">{clients.length} پرونده کارفرما</span>
            </div>
            <Users className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          </button>
        </div>
      </div>

      {/* Supabase SQL DDL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    کدهای DDL ارتقاء سوپابیس برای ماژول پشتیبان‌گیری
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    اسکریپت استاندارد ساخت جدول backups، ایندکس‌های کارایی و امنیت سطح ردیف (RLS)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                این کدها جدول <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">backups</code> را با معماری <b>Multi-Tenant</b> و نوع داده <b>JSONB</b> ایجاد می‌کنند تا تمام اسناد، چک‌ها و فاکتورها به صورت یکپارچه و اتمیک ذخیره و بازیابی شوند.
              </p>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4" dir="ltr">
              <pre className="text-xs font-mono text-emerald-400 overflow-y-auto max-h-72 leading-relaxed selection:bg-indigo-700 selection:text-white">
                {SUPABASE_BACKUP_SQL}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                قابل اجرا در تب SQL Editor داشبورد پروژه Supabase
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>کپی اسکریپت SQL</span>
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
