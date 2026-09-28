import { BackupSnapshot, Invoice, Check, Transaction, Client, InventoryItem, Installment, BankAccount, Project, AccountingEntry, CompanySettings, LicenseInfo } from '../types';
import { getSupabaseClient, getSupabaseConfig } from './supabase';

export interface StoreSnapshotInput {
  invoices: Invoice[];
  checks: Check[];
  transactions: Transaction[];
  clients: Client[];
  inventory: InventoryItem[];
  installments: Installment[];
  bankAccounts: BankAccount[];
  projects: Project[];
  accountingEntries: AccountingEntry[];
  settings: CompanySettings;
  license?: LicenseInfo;
}

/**
 * Generate a complete, verified snapshot of all financial books
 */
export function createBackupSnapshot(data: StoreSnapshotInput, tenantId: string = 'tenant-main'): BackupSnapshot {
  const now = new Date();
  const backupId = `hab-bk-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

  return {
    version: '1.0.0',
    timestamp: now.toISOString(),
    backupId,
    tenantId,
    summary: {
      invoicesCount: data.invoices?.length || 0,
      checksCount: data.checks?.length || 0,
      transactionsCount: data.transactions?.length || 0,
      clientsCount: data.clients?.length || 0,
      inventoryCount: data.inventory?.length || 0,
      installmentsCount: data.installments?.length || 0,
      banksCount: data.bankAccounts?.length || 0,
      projectsCount: data.projects?.length || 0,
      ledgerEntriesCount: data.accountingEntries?.length || 0
    },
    data: {
      invoices: data.invoices || [],
      checks: data.checks || [],
      transactions: data.transactions || [],
      clients: data.clients || [],
      inventory: data.inventory || [],
      installments: data.installments || [],
      bankAccounts: data.bankAccounts || [],
      projects: data.projects || [],
      accountingEntries: data.accountingEntries || [],
      settings: data.settings,
      license: data.license
    }
  };
}

/**
 * Download Backup JSON File to User's Machine
 */
export function downloadBackupJson(snapshot: BackupSnapshot) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `habino-financial-backup-${dateStr}-${snapshot.backupId}.json`;
  
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse an imported backup file
 */
export async function parseBackupFile(file: File): Promise<{ success: boolean; snapshot?: BackupSnapshot; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as BackupSnapshot;

    // Integrity checks
    if (!data.version || !data.data || typeof data.data !== 'object') {
      return { success: false, error: 'ساختار فایل پشتیبان نامعتبر است (فرمت فایل متعلق به هابینو نیست).' };
    }

    if (!Array.isArray(data.data.invoices) || !Array.isArray(data.data.transactions) || !Array.isArray(data.data.clients)) {
      return { success: false, error: 'جداول اصلی مالی در فایل پشتیبان یافت نشدند.' };
    }

    return {
      success: true,
      snapshot: data
    };
  } catch (err) {
    return {
      success: false,
      error: 'خطا در خواندن و تجزیه فایل JSON. فایل ممکن است آسیب دیده باشد.'
    };
  }
}

/**
 * Daily Auto Backup Storage Check
 */
export function triggerDailyAutoBackup(data: StoreSnapshotInput) {
  try {
    const lastBackupDate = localStorage.getItem('habino_last_daily_backup_date');
    const today = new Date().toDateString();

    if (lastBackupDate !== today) {
      const snapshot = createBackupSnapshot(data);
      localStorage.setItem('habino_daily_auto_backup', JSON.stringify(snapshot));
      localStorage.setItem('habino_last_daily_backup_date', today);
      console.log('Habino Auto Backup triggered successfully for:', today);
    }
  } catch (e) {
    console.error('Failed to save daily auto backup:', e);
  }
}

/**
 * Export data to Excel-ready CSV format with Persian UTF-8 BOM
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF'; // Byte Order Mark for Excel Persian text display
  const csvContent = bom + [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Interface for Cloud Backup metadata stored in Supabase
 */
export interface CloudBackupRecord {
  id: string;
  tenant_id: string;
  backup_id: string;
  version: string;
  summary: {
    invoicesCount: number;
    checksCount: number;
    transactionsCount: number;
    clientsCount: number;
    inventoryCount: number;
    installmentsCount: number;
    banksCount: number;
    projectsCount: number;
    ledgerEntriesCount: number;
  };
  snapshot_data?: BackupSnapshot['data'];
  created_at: string;
}

/**
 * Save snapshot directly to Supabase `backups` table
 */
export async function saveBackupToSupabase(
  snapshot: BackupSnapshot,
  tenantId: string = 'tenant-main'
): Promise<{ success: boolean; message: string; backupId?: string }> {
  try {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        message: 'اتصال به سوپابیس پیکربندی نشده است. لطفاً ابتدا در تنظیمات آدرس و کلید اتصال سوپابیس را وارد نمایید.'
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'امکان اتصال به کلاینت سوپابیس وجود ندارد.'
      };
    }

    const payload = {
      tenant_id: tenantId,
      backup_id: snapshot.backupId,
      version: snapshot.version || '1.0.0',
      summary: snapshot.summary,
      snapshot_data: snapshot.data,
      created_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('backups')
      .upsert([payload], { onConflict: 'tenant_id,backup_id' })
      .select('id, backup_id, created_at')
      .single();

    if (error) {
      console.error('Error uploading backup to Supabase:', error);
      return {
        success: false,
        message: `خطا در ذخیره نسخه پشتیبان در سوپابیس: ${error.message || 'خطای پایگاه داده'}`
      };
    }

    return {
      success: true,
      message: `نسخه پشتیبان ابری با شناسه ${snapshot.backupId} با موفقیت در سوپابیس ذخیره گردید.`,
      backupId: snapshot.backupId
    };
  } catch (err: any) {
    console.error('Fatal error in saveBackupToSupabase:', err);
    return {
      success: false,
      message: `خطای غیرمنتظره در ارتباط با سرور سوپابیس: ${err?.message || 'خطای شبکه'}`
    };
  }
}

/**
 * Fetch available cloud backups from Supabase
 */
export async function fetchCloudBackups(
  tenantId: string = 'tenant-main'
): Promise<{ success: boolean; backups: CloudBackupRecord[]; message?: string }> {
  try {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        backups: [],
        message: 'تنظیمات سوپابیس فعال نیست.'
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        backups: [],
        message: 'کلاینت سوپابیس در دسترس نیست.'
      };
    }

    const { data, error } = await client
      .from('backups')
      .select('id, tenant_id, backup_id, version, summary, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch backups from Supabase:', error);
      return {
        success: false,
        backups: [],
        message: error.message
      };
    }

    return {
      success: true,
      backups: (data as CloudBackupRecord[]) || []
    };
  } catch (err: any) {
    return {
      success: false,
      backups: [],
      message: err?.message || 'خطای دریافت نسخ ابری'
    };
  }
}

/**
 * Fetch a single full snapshot from Supabase by backup_id for restoration
 */
export async function fetchSingleCloudBackupSnapshot(
  backupId: string,
  tenantId: string = 'tenant-main'
): Promise<{ success: boolean; snapshot?: BackupSnapshot; message?: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'کلاینت سوپابیس در دسترس نیست.' };
    }

    const { data, error } = await client
      .from('backups')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('backup_id', backupId)
      .single();

    if (error || !data) {
      return {
        success: false,
        message: `نسخه پشتیبان مورد نظر در سرور ابری یافت نشد: ${error?.message || ''}`
      };
    }

    const fullSnapshot: BackupSnapshot = {
      version: data.version || '1.0.0',
      timestamp: data.created_at,
      backupId: data.backup_id,
      tenantId: data.tenant_id,
      summary: data.summary,
      data: data.snapshot_data
    };

    return {
      success: true,
      snapshot: fullSnapshot
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'خطای بازیابی پشتیبان از سرور'
    };
  }
}

/**
 * Delete a cloud backup from Supabase
 */
export async function deleteCloudBackupFromSupabase(
  backupId: string,
  tenantId: string = 'tenant-main'
): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'کلاینت سوپابیس در دسترس نیست.' };
    }

    const { error } = await client
      .from('backups')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('backup_id', backupId);

    if (error) {
      return {
        success: false,
        message: `خطا در حذف پشتیبان ابری: ${error.message}`
      };
    }

    return {
      success: true,
      message: `نسخه پشتیبان ${backupId} از پایگاه ابری سوپابیس با موفقیت حذف شد.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'خطا در حذف'
    };
  }
}

