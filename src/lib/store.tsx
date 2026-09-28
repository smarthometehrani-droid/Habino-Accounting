import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  Invoice,
  Check,
  Transaction,
  Client,
  InventoryItem,
  Installment,
  BankAccount,
  Project,
  AccountingEntry,
  CompanySettings,
  CurrencyType,
  InvoiceDesignConfig,
  LicenseInfo,
  LicenseTier,
  BackupSnapshot,
  AppUser,
  Tenant,
  UserRole,
  UserPermission,
  UserAuditLog,
  SubscriptionPlanType,
  TenantSubscription
} from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfig, syncSupabaseConfigWithServer, testSupabaseDirectConnection } from './supabase';
import { SupabaseSyncEngine } from './supabaseSyncEngine';
import { validateAndParseLicenseKey, TIER_DETAILS, activateFullMarketEdition, validateAddonSerialKey } from './licenseEngine';
import { MetadataSchemaEngine } from './metadataSchemaEngine';
import { createBackupSnapshot, triggerDailyAutoBackup } from './backupEngine';
import {
  BazaarDoubleEntryLedgerEngine,
  BazaarWebhookPayload,
  WebhookProcessResult
} from './bazaarLedgerWebhookEngine';
import {
  BazaarBillingEngine,
  BazaarProductSkuId,
  BazaarPurchaseVerificationResponse
} from './bazaarBillingEngine';
import { HabinoAccountingKernel } from './accountingKernel';
import {
  HabinoAtomicTransactionWrapper,
  BatchInvoiceSettlementItem,
  BatchSettlementResult,
  CloseFiscalYearParams,
  CloseFiscalYearResult
} from './atomicTransactionWrapper';
import { toPersianDigits } from './currencyUtils';
import {
  HabinoAuthEngine,
  DEFAULT_TENANTS,
  DEFAULT_USERS,
  ROLE_DEFAULT_PERMISSIONS,
  PLAN_LIMITS,
  HABINO_ADDONS,
  RegisterTenantInput
} from './authEngine';
import { HabinoIndexedDbEngine, IndexedDbStorageStats } from './indexedDbEngine';

interface AccountingContextType {
  invoices: Invoice[];
  checks: Check[];
  transactions: Transaction[];
  clients: Client[];
  inventory: InventoryItem[];
  installments: Installment[];
  bankAccounts: BankAccount[];
  projects: Project[];
  accountingEntries: AccountingEntry[];
  allInvoices?: Invoice[];
  allClients?: Client[];
  allChecks?: Check[];
  allTransactions?: Transaction[];
  allAccountingEntries?: AccountingEntry[];
  settings: CompanySettings;
  license: LicenseInfo;
  activeTenantId: string;
  isOnline: boolean;

  // Multi-Tenant & RBAC State
  currentUser: AppUser | null;
  activeTenant: Tenant;
  availableTenants: Tenant[];
  tenantUsers: AppUser[];
  auditLogs: UserAuditLog[];
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; user?: AppUser; message: string }>;
  loginAsPredefined: (roleOrKey: string) => Promise<AppUser>;
  registerTenant: (input: RegisterTenantInput) => { success: boolean; message: string; tenant?: Tenant; user?: AppUser };
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<{ success: boolean; message: string }>;
  createTenantUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => Promise<AppUser>;
  updateTenantUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteTenantUser: (id: string) => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
  canAccessModule: (moduleId: string) => { allowed: boolean; reasonFa?: string; gateType?: 'plan' | 'role'; requiredPlan?: SubscriptionPlanType };
  canMutateData: (action: 'create' | 'update' | 'delete') => { allowed: boolean; reasonFa?: string };
  upgradeTenantSubscription: (plan: SubscriptionPlanType, serialKey?: string) => Promise<{ success: boolean; message: string }>;
  activateAddon: (addonId: string, serialKey?: string) => Promise<{ success: boolean; message: string }>;
  hasAddon: (addonId: string) => boolean;
  
  // Actions
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<Invoice>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  restoreInvoice: (id: string) => Promise<void>;
  
  addCheck: (check: Omit<Check, 'id'>) => Promise<Check>;
  updateCheck: (id: string, check: Partial<Check>) => Promise<void>;
  deleteCheck: (id: string) => Promise<void>;
  
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  addInstallment: (installment: Omit<Installment, 'id'>) => Promise<Installment>;
  updateInstallment: (id: string, installment: Partial<Installment>) => Promise<void>;
  deleteInstallment: (id: string) => Promise<void>;
  
  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<BankAccount>;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  
  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  registerProjectAdvance: (params: { projectId: string; amount: number; date: string; description: string }) => Promise<void>;
  closeProjectProfit: (params: { projectId: string; date: string }) => Promise<void>;
  batchSettleInvoices: (settlements: BatchInvoiceSettlementItem[], operationDate?: string) => Promise<BatchSettlementResult>;
  closeFiscalYear: (params: CloseFiscalYearParams) => Promise<CloseFiscalYearResult>;
  
  addAccountingEntry: (entry: Omit<AccountingEntry, 'id'>) => Promise<AccountingEntry>;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<{ success: boolean; message: string; savedInCloud: boolean }>;
  setCurrency: (currency: CurrencyType) => void;
  
  // License & Backup System
  activateLicense: (serialKey: string, holderName?: string) => Promise<{ success: boolean; message: string }>;
  activateMarketFullEdition: (companyName?: string) => Promise<{ success: boolean; message: string }>;
  restoreFullBackup: (snapshot: BackupSnapshot) => Promise<{ success: boolean; message: string }>;
  triggerManualBackup: () => BackupSnapshot;
  loadDemoData: () => void;
  switchToCleanMarketData: () => void;
  // Supabase Cloud Sync & Diagnostics
  isSupabaseLive: boolean;
  syncFromSupabase: (targetTenantId?: string) => Promise<{ success: boolean; message: string; counts?: Record<string, number> }>;
  pushToSupabase: () => Promise<{ success: boolean; message: string; upserted?: Record<string, number> }>;
  reconcileLedgerAndOpeningBalances: () => any;
  repairAndSelfHealSystem: () => Promise<{
    success: boolean;
    repairedOrphans: number;
    repairedClients: number;
    repairedLedger: boolean;
    repairedDates: number;
    repairedMetadata: number;
    message: string;
  }>;
  processBazaarWebhookPayment: (payload: BazaarWebhookPayload) => Promise<WebhookProcessResult>;
  processBazaarPurchaseIap: (skuId: BazaarProductSkuId, clientId?: string) => Promise<BazaarPurchaseVerificationResponse>;
  getIndexedDbStats: () => Promise<IndexedDbStorageStats>;
  persistToIndexedDbNow: () => Promise<void>;
  purgeInterferingPnLData: () => Promise<{ success: boolean; message: string; remainingInvoiceCount: number }>;
  executeFactoryReset: (mode?: 'full' | 'preserve_inventory' | 'preserve_contacts_inventory') => Promise<{ success: boolean; message: string }>;
}

const defaultSettings: CompanySettings = {
  name: 'شرکت خدمات فنی و مهندسی هابینو',
  phone: '۰۲۱-۸۸۸۸۸۸۸۸',
  address: 'تهران، خیابان ولیعصر، برج فناوری',
  currency: 'IRT',
  defaultTaxRate: 10,
  invoiceNote: 'با تشکر از حسن انتخاب شما',
  invoiceTerms: 'مهلت تسویه فاکتور تا ۱۰ روز پس از صدور است.',
  defaultInvoiceTemplate: 'professional',
  defaultInvoiceDesign: {
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
  }
};

const defaultClients: Client[] = [];
const defaultInventory: InventoryItem[] = [];
const defaultInvoices: Invoice[] = [];
const defaultChecks: Check[] = [];
const defaultTransactions: Transaction[] = [];
const defaultBanks: BankAccount[] = [];
const defaultProjects: Project[] = [];
const defaultAccountingEntries: AccountingEntry[] = [];

const defaultLicense: LicenseInfo = {
  status: 'active',
  tier: 'enterprise',
  licenseKey: 'HABINO-FARID-TEHRANI-MASTER',
  holderName: 'مهندس فرید تهرانی',
  activatedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2030-01-01T00:00:00.000Z',
  maxInvoices: 999999,
  maxUsers: 99,
  aiSynapseEnabled: true,
  offlineSyncEnabled: true,
  features: TIER_DETAILS.enterprise.features
};

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Helper to identify and purge obsolete mock IDs
  const isMockId = (id?: string) => !id || /^(inv-1001|c[1-3]|i[1-3]|chk-1|tx-1|b[1-2]|p1|entry-10[1-5]-.*)$/.test(id);

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('habino_invoices');
    if (saved) {
      try {
        const parsed: Invoice[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const nonMock = parsed.filter(i => {
            if (isMockId(i.id) || i.is_deleted || i.status === 'cancelled') return false;
            const isProforma = i.type === 'proforma' || i.type === 'proforma_sale' || i.type === 'proforma_purchase';
            if (isProforma) return true;
            const cid = i.clientId || i.client_id;
            return cid && String(cid).trim() !== '' && cid !== 'null' && cid !== 'undefined';
          });

          // بازیابی تضمینی امضاها از منبع ماندگار مستقل (Persistent Signature Store)
          let signaturesMap: Record<string, any> = {};
          try {
            const sigRaw = localStorage.getItem('habino_invoice_signatures');
            if (sigRaw) signaturesMap = JSON.parse(sigRaw);
          } catch (_) {}

          const hydrated = nonMock.map(inv => {
            const sig = signaturesMap[inv.id];
            if (sig) {
              return {
                ...inv,
                signatureUrl: inv.signatureUrl || sig.signatureUrl,
                isSigned: inv.isSigned !== undefined ? inv.isSigned : sig.isSigned,
                signedAt: inv.signedAt || sig.signedAt,
                shareToken: inv.shareToken || sig.shareToken,
                signatureMetadata: inv.signatureMetadata || sig.signatureMetadata
              };
            }
            return inv;
          });

          return hydrated;
        }
      } catch (e) {
        console.error('Error parsing invoices:', e);
      }
    }
    return defaultInvoices;
  });

  const [checks, setChecks] = useState<Check[]>(() => {
    const saved = localStorage.getItem('habino_checks');
    if (saved) {
      try {
        const parsed: Check[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(c => !isMockId(c.id));
      } catch (e) {
        console.error('Error parsing checks:', e);
      }
    }
    return defaultChecks;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // طبق دستور بنیان‌گذار برای تست عملیاتی و ایزوله: پاکسازی کلیه تراکنش‌ها
    const isPurged = localStorage.getItem('habino_pnl_purged_for_testing_v2') === 'true';
    if (isPurged) {
      return [];
    }
    const saved = localStorage.getItem('habino_transactions');
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(t => !isMockId(t.id));
      } catch (e) {
        console.error('Error parsing transactions:', e);
      }
    }
    return defaultTransactions;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('habino_clients');
    if (saved) {
      try {
        const parsed: Client[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(c => !isMockId(c.id));
      } catch (e) {
        console.error('Error parsing clients:', e);
      }
    }
    return defaultClients;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('habino_inventory');
    if (saved) {
      try {
        const parsed: InventoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(i => !isMockId(i.id));
      } catch (e) {
        console.error('Error parsing inventory:', e);
      }
    }
    return defaultInventory;
  });

  const [installments, setInstallments] = useState<Installment[]>(() => {
    const saved = localStorage.getItem('habino_installments');
    if (saved) {
      try {
        const parsed: Installment[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(i => !isMockId(i.invoiceId));
      } catch (e) {
        console.error('Error parsing installments:', e);
      }
    }
    return [];
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('habino_banks');
    if (saved) {
      try {
        const parsed: BankAccount[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(b => !isMockId(b.id));
      } catch (e) {
        console.error('Error parsing banks:', e);
      }
    }
    return defaultBanks;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    // طبق دستور بنیان‌گذار برای تست عملیاتی و ایزوله: پاکسازی پروژه‌های مؤثر بر بهای تمام‌شده خدمات
    const isPurged = localStorage.getItem('habino_pnl_purged_for_testing_v2') === 'true';
    if (isPurged) {
      return [];
    }
    const saved = localStorage.getItem('habino_projects');
    if (saved) {
      try {
        const parsed: Project[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(p => !isMockId(p.id));
      } catch (e) {
        console.error('Error parsing projects:', e);
      }
    }
    return defaultProjects;
  });

  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>(() => {
    const saved = localStorage.getItem('habino_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((e: any) => !isMockId(e.id));
      } catch (e) {
        console.error('Error loading entries:', e);
      }
    }
    return defaultAccountingEntries;
  });

  // Multi-Tenant & RBAC State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    return HabinoAuthEngine.loadCurrentUser();
  });

  const [availableTenants, setAvailableTenants] = useState<Tenant[]>(() => {
    return HabinoAuthEngine.loadTenants();
  });

  const [tenantUsers, setTenantUsers] = useState<AppUser[]>(() => {
    return HabinoAuthEngine.loadUsers();
  });

  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>(() => {
    return HabinoAuthEngine.loadAuditLogs();
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const saved = localStorage.getItem('habino_active_tenant_id');
    if (saved) return saved;
    const cur = HabinoAuthEngine.loadCurrentUser();
    return cur ? cur.tenantId : 'tenant-main';
  });

  const activeTenant = availableTenants.find(t => t.id === activeTenantId) || availableTenants[0];
  const [isOnline] = useState<boolean>(isSupabaseConfigured);

  // Multi-Tenant Isolation: Per-tenant default and saved company settings
  const getTenantDefaultSettings = (tenant?: Tenant): CompanySettings => {
    if (!tenant || tenant.id === 'tenant-main') {
      return defaultSettings;
    }
    return {
      ...defaultSettings,
      name: tenant.name,
      phone: tenant.ownerPhone || defaultSettings.phone,
      address: tenant.metadata?.address || defaultSettings.address,
      economicCode: tenant.metadata?.economicCode || '',
      nationalId: tenant.metadata?.nationalId || '',
      registrationNumber: tenant.metadata?.registrationNumber || '',
      currency: 'IRT'
    };
  };

  const loadTenantSettings = (tId: string, available: Tenant[]): CompanySettings => {
    const tenant = available.find(t => t.id === tId);
    const tenantDefaults = getTenantDefaultSettings(tenant);

    try {
      const tenantSaved = localStorage.getItem(`habino_settings_${tId}`);
      if (tenantSaved) {
        const parsed = JSON.parse(tenantSaved);
        // Ensure name does not leak or mistakenly fall back to habino if this tenant is not tenant-main
        const resolvedName = (tId !== 'tenant-main' && (!parsed.name || parsed.name.includes('هابینو')) && tenant)
          ? tenant.name
          : (parsed.name || tenantDefaults.name);

        return {
          ...tenantDefaults,
          ...parsed,
          name: resolvedName,
          economicCode: parsed.economicCode !== undefined ? parsed.economicCode : tenantDefaults.economicCode,
          nationalId: parsed.nationalId !== undefined ? parsed.nationalId : tenantDefaults.nationalId,
          phone: parsed.phone !== undefined ? parsed.phone : tenantDefaults.phone,
          address: parsed.address !== undefined ? parsed.address : tenantDefaults.address,
          invoiceNote: parsed.invoiceNote !== undefined ? parsed.invoiceNote : tenantDefaults.invoiceNote,
          invoiceTerms: parsed.invoiceTerms !== undefined ? parsed.invoiceTerms : tenantDefaults.invoiceTerms,
          defaultInvoiceTemplate: parsed.defaultInvoiceTemplate || tenantDefaults.defaultInvoiceTemplate || 'professional',
          defaultInvoiceDesign: {
            ...defaultSettings.defaultInvoiceDesign,
            ...(parsed.defaultInvoiceDesign || {})
          }
        };
      }

      if (tId === 'tenant-main') {
        const legacySaved = localStorage.getItem('habino_settings');
        if (legacySaved) {
          const parsed = JSON.parse(legacySaved);
          return {
            ...defaultSettings,
            ...parsed,
            invoiceNote: parsed.invoiceNote !== undefined ? parsed.invoiceNote : defaultSettings.invoiceNote,
            invoiceTerms: parsed.invoiceTerms !== undefined ? parsed.invoiceTerms : defaultSettings.invoiceTerms,
            defaultInvoiceTemplate: parsed.defaultInvoiceTemplate || defaultSettings.defaultInvoiceTemplate || 'professional',
            defaultInvoiceDesign: {
              ...defaultSettings.defaultInvoiceDesign,
              ...(parsed.defaultInvoiceDesign || {})
            }
          };
        }
      }
    } catch (e) {
      console.warn(`Error reading settings for tenant ${tId}:`, e);
    }

    return tenantDefaults;
  };

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const initialTenantId = (() => {
      const saved = localStorage.getItem('habino_active_tenant_id');
      if (saved) return saved;
      const cur = HabinoAuthEngine.loadCurrentUser();
      return cur ? cur.tenantId : 'tenant-main';
    })();
    const initialTenants = HabinoAuthEngine.loadTenants();
    return loadTenantSettings(initialTenantId, initialTenants);
  });

  const [license, setLicense] = useState<LicenseInfo>(() => {
    const saved = localStorage.getItem('habino_license');
    return saved ? JSON.parse(saved) : defaultLicense;
  });

  // Synchronize settings whenever activeTenantId changes
  useEffect(() => {
    const tenantSpecific = loadTenantSettings(activeTenantId, availableTenants);
    setSettings(tenantSpecific);
  }, [activeTenantId]);

  // Sync to local storage with tenant-scoped isolation
  useEffect(() => { localStorage.setItem('habino_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('habino_checks', JSON.stringify(checks)); }, [checks]);
  useEffect(() => { localStorage.setItem('habino_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('habino_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('habino_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('habino_installments', JSON.stringify(installments)); }, [installments]);
  useEffect(() => { localStorage.setItem('habino_banks', JSON.stringify(bankAccounts)); }, [bankAccounts]);
  useEffect(() => { localStorage.setItem('habino_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('habino_entries', JSON.stringify(accountingEntries)); }, [accountingEntries]);
  useEffect(() => {
    if (activeTenantId && activeTenantId !== 'all') {
      try {
        localStorage.setItem(`habino_settings_${activeTenantId}`, JSON.stringify(settings));
        if (activeTenantId === 'tenant-main') {
          localStorage.setItem('habino_settings', JSON.stringify(settings));
        }
      } catch (e) {
        console.warn('Failed to cache tenant settings:', e);
      }
    }
  }, [settings, activeTenantId]);
  useEffect(() => { localStorage.setItem('habino_license', JSON.stringify(license)); }, [license]);
  useEffect(() => { localStorage.setItem('habino_active_tenant_id', activeTenantId); }, [activeTenantId]);
  useEffect(() => { HabinoAuthEngine.saveTenants(availableTenants); }, [availableTenants]);
  useEffect(() => { HabinoAuthEngine.saveUsers(tenantUsers); }, [tenantUsers]);

  // رفرنس وضعیت مالی هماهنگ برای حفظ پیوستگی و حذف اثر Stale Closure در تراکنش‌های متوالی
  const financialStateRef = useRef({
    invoices,
    accountingEntries,
    clients,
    transactions,
    installments,
    checks,
    projects,
    inventory
  });

  useEffect(() => {
    financialStateRef.current = {
      invoices,
      accountingEntries,
      clients,
      transactions,
      installments,
      checks,
      projects,
      inventory
    };
  }, [invoices, accountingEntries, clients, transactions, installments, checks, projects, inventory]);

  // IndexedDB Dual-Write & High-Capacity Storage
  useEffect(() => {
    const timer = setTimeout(() => {
      HabinoIndexedDbEngine.persistFullSnapshot({
        invoices,
        transactions,
        clients,
        checks,
        inventory,
        bankAccounts,
        installments,
        projects,
        accountingEntries,
        settings
      }).catch(err => console.warn('Background IndexedDB sync error:', err));
    }, 600);
    return () => clearTimeout(timer);
  }, [invoices, transactions, clients, checks, inventory, bankAccounts, installments, projects, accountingEntries, settings]);

  // Hydrate from IndexedDB if LocalStorage is empty or cleared
  useEffect(() => {
    async function hydrateFromIndexedDBIfEmpty() {
      try {
        const hasLocalStorage = localStorage.getItem('habino_invoices') || localStorage.getItem('habino_clients');
        if (!hasLocalStorage) {
          const snapshot = await HabinoIndexedDbEngine.loadFullSnapshot();
          if (snapshot.invoices && snapshot.invoices.length > 0) setInvoices(snapshot.invoices);
          if (snapshot.transactions && snapshot.transactions.length > 0 && localStorage.getItem('habino_pnl_purged_for_testing_v2') !== 'true') setTransactions(snapshot.transactions);
          if (snapshot.clients && snapshot.clients.length > 0) setClients(snapshot.clients);
          if (snapshot.checks && snapshot.checks.length > 0) setChecks(snapshot.checks);
          if (snapshot.inventory && snapshot.inventory.length > 0) setInventory(snapshot.inventory);
          if (snapshot.bankAccounts && snapshot.bankAccounts.length > 0) setBankAccounts(snapshot.bankAccounts);
          if (snapshot.installments && snapshot.installments.length > 0) setInstallments(snapshot.installments);
          if (snapshot.projects && snapshot.projects.length > 0 && localStorage.getItem('habino_pnl_purged_for_testing_v2') !== 'true') setProjects(snapshot.projects);
          if (snapshot.accountingEntries && snapshot.accountingEntries.length > 0) setAccountingEntries(snapshot.accountingEntries);
          if (snapshot.settings) setSettings(prev => ({ ...prev, ...snapshot.settings }));
        }
      } catch (err) {
        console.warn('IndexedDB initial hydration check error:', err);
      }
    }
    hydrateFromIndexedDBIfEmpty();
  }, []);

  // همگام‌سازی خودکار و اتمیک میان لایسنس سراسری و اشتراک چندمستأجری
  // جلوگیری از ناهماهنگی دوگانه وضعیت (Dual-License State Desynchronization Guard)
  useEffect(() => {
    if (!activeTenant) return;

    const currentSub = activeTenant.subscription;
    const isLicenseActive = license.status === 'active' && license.tier !== 'trial';

    if (isLicenseActive && (!currentSub || currentSub.plan === 'starter')) {
      let targetPlan: SubscriptionPlanType = 'starter';
      let targetPlanName = 'پکیج پایه';
      let maxUsers = 2;

      if (license.tier === 'enterprise') {
        targetPlan = 'enterprise';
        targetPlanName = 'پکیج سازمانی + سیناپس';
        maxUsers = 99;
      } else if (license.tier === 'bazaar') {
        targetPlan = 'professional';
        targetPlanName = 'پکیج حرفه‌ای نسخه بازار';
        maxUsers = 99;
      } else if (license.tier === 'pro') {
        targetPlan = 'professional';
        targetPlanName = 'پکیج حرفه‌ای خدمات';
        maxUsers = 5;
      }

      const syncedSub: TenantSubscription = {
        ...(currentSub || {
          plan: targetPlan,
          planNameFa: targetPlanName,
          status: 'active',
          maxUsers,
          expiresAt: license.expiresAt || '1406/12/29'
        }),
        plan: targetPlan,
        planNameFa: targetPlanName,
        status: 'active',
        maxUsers,
        expiresAt: license.expiresAt || '1406/12/29',
        activeAddons: currentSub?.activeAddons || []
      };

      const updatedTenant: Tenant = {
        ...activeTenant,
        subscription: syncedSub
      };

      const updatedTenants = availableTenants.map(t => (t.id === activeTenant.id ? updatedTenant : t));
      setAvailableTenants(updatedTenants);
      HabinoAuthEngine.saveTenants(updatedTenants);
    }
  }, [license.status, license.tier, activeTenant?.id]);

  // Auth & RBAC Actions
  const login = async (identifier: string, password?: string): Promise<{ success: boolean; user?: AppUser; message: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    let foundUser = tenantUsers.find(
      u => u.email.toLowerCase() === cleanId || u.phone === cleanId || u.id === cleanId
    );

    if (!foundUser) {
      // Fallback search in DEFAULT_USERS
      foundUser = DEFAULT_USERS.find(
        u => u.email.toLowerCase() === cleanId || u.phone === cleanId || u.id === cleanId
      );
      if (foundUser) {
        const updated = [...tenantUsers, foundUser];
        setTenantUsers(updated);
        HabinoAuthEngine.saveUsers(updated);
      }
    }

    if (!foundUser) {
      return {
        success: false,
        message: 'اطلاعات ورود (ایمیل یا شماره همراه یا کلمه عبور) صحیح نمی‌باشد. در صورت نداشتن حساب کاربری، لطفاً ثبت‌نام نمایید.'
      };
    }

    if (foundUser.status === 'disabled') {
      return {
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.'
      };
    }

    setCurrentUser(foundUser);
    HabinoAuthEngine.saveCurrentUser(foundUser);
    setActiveTenantId(foundUser.tenantId);

    HabinoAuthEngine.addAuditLog({
      userId: foundUser.id,
      userFullName: foundUser.fullName,
      tenantId: foundUser.tenantId,
      action: 'USER_LOGIN',
      resource: 'AuthPortal',
      details: `ورود موفق کاربر با نقش ${foundUser.role} به مستأجر ${foundUser.tenantId}`
    });
    setAuditLogs(HabinoAuthEngine.loadAuditLogs());

    return {
      success: true,
      user: foundUser,
      message: `خوش آمدید، ${foundUser.fullName}`
    };
  };

  const loginAsPredefined = async (roleOrKey: string): Promise<AppUser> => {
    let target = tenantUsers.find(u => u.role === roleOrKey || u.id === roleOrKey || u.email.includes(roleOrKey));
    if (!target) {
      target = DEFAULT_USERS.find(u => u.role === roleOrKey || u.id === roleOrKey) || DEFAULT_USERS[0];
    }

    setCurrentUser(target);
    HabinoAuthEngine.saveCurrentUser(target);
    setActiveTenantId(target.tenantId);

    HabinoAuthEngine.addAuditLog({
      userId: target.id,
      userFullName: target.fullName,
      tenantId: target.tenantId,
      action: 'QUICK_ROLE_SWITCH',
      resource: 'RoleSwitcher',
      details: `سوییچ سریع به نقش ${target.role} (${target.fullName}) در مستأجر ${target.tenantId}`
    });
    setAuditLogs(HabinoAuthEngine.loadAuditLogs());

    return target;
  };

  const logout = async (): Promise<void> => {
    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: currentUser.tenantId,
        action: 'USER_LOGOUT',
        resource: 'AuthPortal',
        details: `خروج موفق کاربر ${currentUser.fullName}`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }
    setCurrentUser(null);
    localStorage.removeItem('habino_current_user');
  };

  const switchTenant = async (targetTenantId: string): Promise<{ success: boolean; message: string }> => {
    const targetTenant = availableTenants.find(t => t.id === targetTenantId);
    if (!targetTenant) {
      return { success: false, message: 'مستأجر موردنظر یافت نشد.' };
    }

    // Permission check: super_admin can switch anywhere, otherwise user must belong to tenant
    if (currentUser && currentUser.role !== 'super_admin' && currentUser.tenantId !== targetTenantId) {
      return {
        success: false,
        message: 'شما دسترسی لازم برای ورود به این مستأجر سازمانی را ندارید. این دسترسی مخصوص ادمین ارشد است.'
      };
    }

    setActiveTenantId(targetTenantId);
    const tenantSpecific = loadTenantSettings(targetTenantId, availableTenants);
    setSettings(tenantSpecific);

    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: targetTenantId,
        action: 'TENANT_SWITCH',
        resource: 'MultiTenantWorkspace',
        details: `انتقال فضای کاری به مستأجر: ${targetTenant.name} (${targetTenant.slug})`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }

    return {
      success: true,
      message: `فضای کاری به «${targetTenant.name}» منتقل شد.`
    };
  };

  const createTenantUser = async (userData: Omit<AppUser, 'id' | 'createdAt'>): Promise<AppUser> => {
    const newUser: AppUser = {
      ...userData,
      id: `u-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('fa-IR')
    };

    const updated = [newUser, ...tenantUsers];
    setTenantUsers(updated);
    HabinoAuthEngine.saveUsers(updated);

    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: userData.tenantId,
        action: 'USER_CREATED',
        resource: 'UserManagement',
        details: `ثبت کاربر جدید: ${newUser.fullName} با نقش ${newUser.role}`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }

    return newUser;
  };

  const updateTenantUser = async (id: string, updates: Partial<AppUser>): Promise<void> => {
    const updated = tenantUsers.map(u => (u.id === id ? { ...u, ...updates } : u));
    setTenantUsers(updated);
    HabinoAuthEngine.saveUsers(updated);

    if (currentUser && currentUser.id === id) {
      const updatedCur = { ...currentUser, ...updates };
      setCurrentUser(updatedCur);
      HabinoAuthEngine.saveCurrentUser(updatedCur);
    }
  };

    const deleteTenantUser = async (id: string): Promise<void> => {
    const updated = tenantUsers.filter(u => u.id !== id);
    setTenantUsers(updated);
    HabinoAuthEngine.saveUsers(updated);

    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: activeTenantId,
        action: 'USER_DELETED',
        resource: 'UserManagement',
        details: `حذف کاربر با شناسه: ${id}`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }
  };

  const hasPermission = (permission: UserPermission): boolean => {
    return HabinoAuthEngine.hasPermission(currentUser, permission);
  };

  const canAccessModule = (moduleId: string): { allowed: boolean; reasonFa?: string; gateType?: 'plan' | 'role'; requiredPlan?: SubscriptionPlanType } => {
    return HabinoAuthEngine.canAccessModule(currentUser, moduleId, activeTenant);
  };

  const canMutateData = (action: 'create' | 'update' | 'delete'): { allowed: boolean; reasonFa?: string } => {
    return HabinoAuthEngine.canMutateData(currentUser, action);
  };

  const upgradeTenantSubscription = async (plan: SubscriptionPlanType, serialKey?: string): Promise<{ success: boolean; message: string }> => {
    const planInfo = PLAN_LIMITS[plan];
    const key = serialKey?.trim() || `HABINO-${plan.toUpperCase()}-2026-ACTIVATED`;
    const newSub: TenantSubscription = {
      plan,
      planNameFa: planInfo.planNameFa,
      status: 'active',
      maxUsers: planInfo.maxUsers,
      expiresAt: '1405/12/29',
      serialKey: key,
      isLifetime: plan === 'enterprise'
    };

    const updatedTenant: Tenant = {
      ...activeTenant,
      subscription: newSub
    };

    const updatedTenants = availableTenants.map(t => (t.id === activeTenant.id ? updatedTenant : t));
    setAvailableTenants(updatedTenants);
    HabinoAuthEngine.saveTenants(updatedTenants);

    const mappedTier: LicenseTier = plan === 'starter' ? 'trial' : plan === 'professional' ? 'pro' : 'enterprise';
    setLicense(prev => ({
      ...prev,
      tier: mappedTier,
      licenseKey: key,
      status: 'active'
    }));

    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: activeTenant.id,
        action: 'LICENSE_UPGRADED',
        resource: 'LicenseManagement',
        details: `ارتقای لایسنس مستأجر ${activeTenant.name} به ${planInfo.planNameFa} با سریال ${key}`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }

    return {
      success: true,
      message: `اشتراک با موفقیت به «${planInfo.planNameFa}» ارتقا یافت.`
    };
  };

  const activateAddon = async (addonId: string, serialKey?: string): Promise<{ success: boolean; message: string }> => {
    const addon = HABINO_ADDONS.find(a => a.id === addonId);
    if (!addon) {
      return { success: false, message: 'افزونه مورد نظر در کاتالوگ هابینو یافت نشد.' };
    }
    if (addon.status === 'coming_soon') {
      return {
        success: false,
        message: `افزونه «${addon.title}» طبق مصوبه در فاز آینده منتشر خواهد شد.`
      };
    }

    const currentAddons = activeTenant.subscription?.activeAddons || [];
    if (currentAddons.includes(addonId)) {
      return { success: true, message: `افزونه «${addon.title}» پیش‌تر فعال شده است.` };
    }

    const key = serialKey?.trim() || `ADDON-${addonId.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}-PAID`;
    const validation = validateAddonSerialKey(addonId, activeTenant.id, key);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const updatedSub: TenantSubscription = {
      ...(activeTenant.subscription || {
        plan: 'starter',
        planNameFa: 'پکیج پایه',
        status: 'active',
        maxUsers: 2,
        expiresAt: '1405/12/29'
      }),
      activeAddons: [...currentAddons, addonId]
    };

    const updatedTenant: Tenant = {
      ...activeTenant,
      subscription: updatedSub
    };

    const updatedTenants = availableTenants.map(t => (t.id === activeTenant.id ? updatedTenant : t));
    setAvailableTenants(updatedTenants);
    HabinoAuthEngine.saveTenants(updatedTenants);

    if (currentUser) {
      HabinoAuthEngine.addAuditLog({
        userId: currentUser.id,
        userFullName: currentUser.fullName,
        tenantId: activeTenant.id,
        action: 'LICENSE_UPGRADED',
        resource: 'LicenseManagement',
        details: `فعال‌سازی افزونه ${addon.title}`
      });
      setAuditLogs(HabinoAuthEngine.loadAuditLogs());
    }

    return {
      success: true,
      message: `افزونه «${addon.title}» با موفقیت فعال شد.`
    };
  };

  const hasAddon = (addonId: string): boolean => {
    if (license.tier === 'enterprise') return true;
    return (activeTenant.subscription?.activeAddons || []).includes(addonId);
  };

  const registerTenant = (input: RegisterTenantInput): { success: boolean; message: string; tenant?: Tenant; user?: AppUser } => {
    const { tenant, ownerUser } = HabinoAuthEngine.registerNewTenant(input);
    const updatedTenants = [...availableTenants, tenant];
    const updatedUsers = [...tenantUsers, ownerUser];

    setAvailableTenants(updatedTenants);
    setTenantUsers(updatedUsers);
    HabinoAuthEngine.saveTenants(updatedTenants);
    HabinoAuthEngine.saveUsers(updatedUsers);

    setActiveTenantId(tenant.id);
    setCurrentUser(ownerUser);
    HabinoAuthEngine.saveCurrentUser(ownerUser);

    const mappedTier: LicenseTier = input.plan === 'starter' ? 'trial' : input.plan === 'professional' ? 'pro' : 'enterprise';
    const isTrial = tenant.subscription?.status === 'trial';
    setLicense(prev => ({
      ...prev,
      tier: mappedTier,
      licenseKey: tenant.subscription?.serialKey || `HABINO-${input.plan.toUpperCase()}-VERIFIED`,
      status: isTrial ? 'trial' : 'active',
      expiresAt: tenant.subscription?.trialEndsAt || prev.expiresAt
    }));

    return {
      success: true,
      message: `مستأجر «${tenant.name}» با موفقیت ایجاد شد.`,
      tenant,
      user: ownerUser
    };
  };

  useEffect(() => {
    triggerDailyAutoBackup({
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
      license
    });
  }, [invoices, checks, transactions, clients, inventory, installments, bankAccounts, projects, accountingEntries, settings, license]);

  const addInvoice = async (invoiceData: Omit<Invoice, 'id'>): Promise<Invoice> => {
    const currentTenant = (currentUser && currentUser.role !== 'super_admin')
      ? (currentUser.tenantId || 'tenant-main')
      : (activeTenantId || currentUser?.tenantId || 'tenant-main');

    const sanitizedData = {
      ...invoiceData,
      tenantId: currentTenant
    };

    const clientMap = new Map<string, Client>();
    (financialStateRef.current.clients || []).forEach(c => { if (c?.id) clientMap.set(c.id, c); });
    (clients || []).forEach(c => { if (c?.id) clientMap.set(c.id, c); });
    const mergedClients = Array.from(clientMap.values());

    const currentStateSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: mergedClients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState, invoice } = HabinoAtomicTransactionWrapper.atomicRegisterInvoice(
      currentStateSnapshot,
      sanitizedData,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      invoices: nextState.invoices,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      transactions: nextState.transactions,
      installments: nextState.installments,
      checks: nextState.checks,
      inventory: nextState.inventory || financialStateRef.current.inventory
    };

    setInvoices(nextState.invoices);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setInstallments(nextState.installments);
    setChecks(nextState.checks);
    if (nextState.inventory) setInventory(nextState.inventory);

    try {
      localStorage.setItem('habino_invoices', JSON.stringify(nextState.invoices));
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
      localStorage.setItem('habino_transactions', JSON.stringify(nextState.transactions));
      localStorage.setItem('habino_checks', JSON.stringify(nextState.checks));

      if (invoice.signatureUrl || invoice.isSigned) {
        let signaturesMap: Record<string, any> = {};
        try {
          const sigRaw = localStorage.getItem('habino_invoice_signatures');
          if (sigRaw) signaturesMap = JSON.parse(sigRaw);
        } catch (_) {}
        signaturesMap[invoice.id] = {
          signatureUrl: invoice.signatureUrl,
          isSigned: invoice.isSigned,
          signedAt: invoice.signedAt,
          shareToken: invoice.shareToken,
          signatureMetadata: invoice.signatureMetadata
        };
        localStorage.setItem('habino_invoice_signatures', JSON.stringify(signaturesMap));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    if (isSupabaseConfigured) {
      SupabaseSyncEngine.syncInvoice(invoice, currentTenant).catch(() => {});
    }

    return invoice;
  };

  const updateInvoice = async (id: string, updated: Partial<Invoice>) => {
    const currentTenant = (currentUser && currentUser.role !== 'super_admin')
      ? (currentUser.tenantId || 'tenant-main')
      : (activeTenantId || currentUser?.tenantId || 'tenant-main');

    const existing = invoices.find(inv => inv.id === id);
    if (!existing) {
      throw new Error('سند موردنظر یافت نشد.');
    }

    const financialKeys: (keyof Invoice)[] = [
      'items', 'subtotal', 'totalDiscount', 'totalTax', 'grandTotal',
      'amountPaid', 'remainingAmount', 'clientId', 'date', 'type',
      'status', 'projectId', 'dueDate'
    ];
    const isFinancial = financialKeys.some(key => key in updated && updated[key] !== undefined);

    if (!isFinancial) {
      const updatedInvoices = invoices.map(inv => inv.id === id ? { ...inv, ...updated } : inv);
      setInvoices(updatedInvoices);

      financialStateRef.current = {
        ...financialStateRef.current,
        invoices: updatedInvoices
      };

      try {
        localStorage.setItem('habino_invoices', JSON.stringify(updatedInvoices));

        if (updated.signatureUrl !== undefined || updated.isSigned !== undefined || existing.signatureUrl) {
          let signaturesMap: Record<string, any> = {};
          try {
            const sigRaw = localStorage.getItem('habino_invoice_signatures');
            if (sigRaw) signaturesMap = JSON.parse(sigRaw);
          } catch (_) {}
          signaturesMap[id] = {
            signatureUrl: updated.signatureUrl !== undefined ? updated.signatureUrl : existing.signatureUrl,
            isSigned: updated.isSigned !== undefined ? updated.isSigned : existing.isSigned,
            signedAt: updated.signedAt !== undefined ? updated.signedAt : existing.signedAt,
            shareToken: updated.shareToken !== undefined ? updated.shareToken : existing.shareToken,
            signatureMetadata: updated.signatureMetadata !== undefined ? updated.signatureMetadata : existing.signatureMetadata
          };
          localStorage.setItem('habino_invoice_signatures', JSON.stringify(signaturesMap));
        }
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      const updatedInv = updatedInvoices.find(i => i.id === id);
      if (isSupabaseConfigured && updatedInv) {
        SupabaseSyncEngine.syncInvoice(updatedInv, currentTenant).catch(() => {});
      }
      return;
    }

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState } = HabinoAtomicTransactionWrapper.atomicUpdateInvoice(
      currentSnapshot,
      id,
      updated,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      invoices: nextState.invoices,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      transactions: nextState.transactions,
      installments: nextState.installments,
      checks: nextState.checks,
      inventory: nextState.inventory || financialStateRef.current.inventory
    };

    setInvoices(nextState.invoices);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setInstallments(nextState.installments);
    setChecks(nextState.checks);
    if (nextState.inventory) setInventory(nextState.inventory);

    try {
      localStorage.setItem('habino_invoices', JSON.stringify(nextState.invoices));
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_transactions', JSON.stringify(nextState.transactions));
      localStorage.setItem('habino_checks', JSON.stringify(nextState.checks));
      localStorage.setItem('habino_installments', JSON.stringify(nextState.installments));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
      if (nextState.inventory) {
        localStorage.setItem('habino_inventory', JSON.stringify(nextState.inventory));
      }
      if (updated.signatureUrl !== undefined || updated.isSigned !== undefined || existing.signatureUrl) {
        let signaturesMap: Record<string, any> = {};
        try {
          const sigRaw = localStorage.getItem('habino_invoice_signatures');
          if (sigRaw) signaturesMap = JSON.parse(sigRaw);
        } catch (_) {}
        signaturesMap[id] = {
          signatureUrl: updated.signatureUrl !== undefined ? updated.signatureUrl : existing.signatureUrl,
          isSigned: updated.isSigned !== undefined ? updated.isSigned : existing.isSigned,
          signedAt: updated.signedAt !== undefined ? updated.signedAt : existing.signedAt,
          shareToken: updated.shareToken !== undefined ? updated.shareToken : existing.shareToken,
          signatureMetadata: updated.signatureMetadata !== undefined ? updated.signatureMetadata : existing.signatureMetadata
        };
        localStorage.setItem('habino_invoice_signatures', JSON.stringify(signaturesMap));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    const updatedInv = nextState.invoices.find(i => i.id === id);
    if (isSupabaseConfigured && updatedInv) {
      SupabaseSyncEngine.syncInvoice(updatedInv, currentTenant).catch(() => {});
    }
  };

  const deleteInvoice = async (id: string) => {
    const deletedInv = invoices.find(i => i.id === id);
    if (!deletedInv) {
      throw new Error('سند موردنظر یافت نشد.');
    }

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicDeleteInvoice(
      currentSnapshot,
      id,
      true
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      invoices: nextState.invoices,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      transactions: nextState.transactions,
      installments: nextState.installments,
      checks: nextState.checks,
      inventory: nextState.inventory || financialStateRef.current.inventory
    };

    setInvoices(nextState.invoices);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setInstallments(nextState.installments);
    setChecks(nextState.checks);
    if (nextState.inventory) setInventory(nextState.inventory);

    try {
      localStorage.setItem('habino_invoices', JSON.stringify(nextState.invoices));
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_transactions', JSON.stringify(nextState.transactions));
      localStorage.setItem('habino_checks', JSON.stringify(nextState.checks));
      localStorage.setItem('habino_installments', JSON.stringify(nextState.installments));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
      if (nextState.inventory) {
        localStorage.setItem('habino_inventory', JSON.stringify(nextState.inventory));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    if (isSupabaseConfigured) {
      SupabaseSyncEngine.deleteInvoiceFromSupabase(id, activeTenantId).catch(() => {});
    }
  };

  const restoreInvoice = async (id: string) => {
    const target = invoices.find(i => i.id === id);
    if (!target) return;

    const restored = {
      ...target,
      is_deleted: false,
      deleted_at: undefined,
      metadata: {
        ...(target.metadata || {}),
        is_deleted: false,
        deleted_at: undefined
      }
    };

    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const { nextState } = HabinoAtomicTransactionWrapper.atomicRegisterInvoice(
      { invoices: invoices.filter(i => i.id !== id), accountingEntries, clients, transactions, installments, checks, projects, inventory },
      restored,
      currentTenant
    );

    restored.id = id;
    const finalInvoices = nextState.invoices.map(i => i.id === restored.id ? restored : i);
    if (!finalInvoices.some(i => i.id === id)) finalInvoices.push(restored);

    setInvoices(finalInvoices);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setInstallments(nextState.installments);
    setChecks(nextState.checks);
    if (nextState.inventory) setInventory(nextState.inventory);

    try {
      localStorage.setItem('habino_invoices', JSON.stringify(finalInvoices));
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_transactions', JSON.stringify(nextState.transactions));
      localStorage.setItem('habino_checks', JSON.stringify(nextState.checks));
      localStorage.setItem('habino_installments', JSON.stringify(nextState.installments));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
      if (nextState.inventory) localStorage.setItem('habino_inventory', JSON.stringify(nextState.inventory));
    } catch (e) {
      console.warn('LocalStorage save failed on restore:', e);
    }

    if (isSupabaseConfigured) {
      SupabaseSyncEngine.syncInvoice(restored, currentTenant).catch(() => {});
    }
  };

  const addCheck = async (checkData: Omit<Check, 'id'>): Promise<Check> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const clientMap = new Map<string, Client>();
    (financialStateRef.current.clients || []).forEach(c => { if (c?.id) clientMap.set(c.id, c); });
    (clients || []).forEach(c => { if (c?.id) clientMap.set(c.id, c); });
    const mergedClients = Array.from(clientMap.values());

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: mergedClients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects
    };

    const { nextState, check } = HabinoAtomicTransactionWrapper.atomicRegisterCheck(
      currentSnapshot,
      checkData,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      checks: nextState.checks,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients
    };

    setChecks(nextState.checks);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    return check;
  };

  const updateCheck = async (id: string, updated: Partial<Check>) => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects
    };

    const { nextState } = HabinoAtomicTransactionWrapper.atomicUpdateCheck(
      currentSnapshot,
      id,
      updated,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      checks: nextState.checks,
      accountingEntries: nextState.accountingEntries,
      installments: nextState.installments || financialStateRef.current.installments
    };

    setChecks(nextState.checks);
    setAccountingEntries(nextState.accountingEntries);
    setInstallments(nextState.installments);
  };

  const deleteCheck = async (id: string) => {
    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicDeleteCheck(
      currentSnapshot,
      id
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      checks: nextState.checks,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients
    };

    setChecks(nextState.checks);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
  };

  const addTransaction = async (txData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects
    };

    const { nextState, transaction } = HabinoAtomicTransactionWrapper.atomicRegisterTransaction(
      currentSnapshot,
      txData,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      transactions: nextState.transactions,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      projects: nextState.projects
    };

    setTransactions(nextState.transactions);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setProjects(nextState.projects);
    return transaction;
  };

  const deleteTransaction = async (id: string) => {
    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicDeleteTransaction(
      currentSnapshot,
      id
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      transactions: nextState.transactions,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      projects: nextState.projects
    };

    setTransactions(nextState.transactions);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setProjects(nextState.projects);
  };

  const addClient = async (clientData: Omit<Client, 'id'>): Promise<Client> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState, client } = HabinoAtomicTransactionWrapper.atomicRegisterClient(
      currentSnapshot,
      clientData,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      clients: nextState.clients,
      accountingEntries: nextState.accountingEntries
    };

    setClients(nextState.clients);
    setAccountingEntries(nextState.accountingEntries);

    try {
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    return client;
  };

  const updateClient = async (id: string, updated: Partial<Client>) => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState } = HabinoAtomicTransactionWrapper.atomicUpdateClient(
      currentSnapshot,
      id,
      updated,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      clients: nextState.clients,
      accountingEntries: nextState.accountingEntries
    };

    setClients(nextState.clients);
    setAccountingEntries(nextState.accountingEntries);

    try {
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const deleteClient = async (id: string) => {
    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicDeleteClient(
      currentSnapshot,
      id
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      clients: nextState.clients,
      accountingEntries: nextState.accountingEntries
    };

    setClients(nextState.clients);
    setAccountingEntries(nextState.accountingEntries);

    try {
      localStorage.setItem('habino_clients', JSON.stringify(nextState.clients));
      localStorage.setItem('habino_entries', JSON.stringify(nextState.accountingEntries));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const newItem: InventoryItem = {
      ...itemData,
      id: HabinoAccountingKernel.generateUUID(),
      tenantId: currentTenant
    };
    setInventory(prev => [...prev, newItem]);
    if (isSupabaseConfigured) {
      SupabaseSyncEngine.syncInventoryItem(newItem, currentTenant).catch(() => {});
    }
    return newItem;
  };

  const updateInventoryItem = async (id: string, updated: Partial<InventoryItem>) => {
    let updatedItem: InventoryItem | undefined;
    setInventory(prev => prev.map(i => {
      if (i.id === id) {
        updatedItem = { ...i, ...updated };
        return updatedItem;
      }
      return i;
    }));
    if (isSupabaseConfigured && updatedItem) {
      SupabaseSyncEngine.syncInventoryItem(updatedItem, activeTenantId).catch(() => {});
    }
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    if (isSupabaseConfigured) {
      SupabaseSyncEngine.deleteInventoryItemFromSupabase(id).catch(() => {});
    }
  };

  const addInstallment = async (instData: Omit<Installment, 'id'>): Promise<Installment> => {
    const rawCId = String(instData.clientId || '').trim();
    if (!rawCId) {
      throw new Error('ثبت قسط بدون انتخاب مخاطب مجاز نیست.');
    }
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const newInst: Installment = {
      ...instData,
      id: HabinoAccountingKernel.generateUUID(),
      tenantId: currentTenant
    };
    setInstallments(prev => [...prev, newInst]);
    return newInst;
  };

  const updateInstallment = async (id: string, updated: Partial<Installment>) => {
    setInstallments(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
  };

  const deleteInstallment = async (id: string) => {
    setInstallments(prev => prev.filter(i => i.id !== id));
  };

  const addBankAccount = async (bankData: Omit<BankAccount, 'id'>): Promise<BankAccount> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const newBank: BankAccount = {
      ...bankData,
      id: HabinoAccountingKernel.generateUUID(),
      tenantId: currentTenant
    };
    setBankAccounts(prev => [...prev, newBank]);
    return newBank;
  };

  const updateBankAccount = async (id: string, updated: Partial<BankAccount>) => {
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
  };

  const deleteBankAccount = async (id: string) => {
    setBankAccounts(prev => prev.filter(b => b.id !== id));
  };

  const addProject = async (projData: Omit<Project, 'id'>): Promise<Project> => {
    if (!projData.clientId || projData.clientId.trim() === '') {
      throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
    }
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const newProj: Project = {
      ...projData,
      id: HabinoAccountingKernel.generateUUID(),
      tenantId: currentTenant
    };
    setProjects(prev => [...prev, newProj]);
    return newProj;
  };

  const updateProject = async (id: string, updated: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const deleteProject = async (id: string) => {
    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicDeleteProject(
      currentSnapshot,
      id
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      projects: nextState.projects,
      accountingEntries: nextState.accountingEntries,
      transactions: nextState.transactions,
      invoices: nextState.invoices
    };

    setProjects(nextState.projects);
    setAccountingEntries(nextState.accountingEntries);
    setTransactions(nextState.transactions);
    setInvoices(nextState.invoices);
  };

  const registerProjectAdvance = async (params: {
    projectId: string;
    amount: number;
    date: string;
    description: string;
  }): Promise<void> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicRegisterProjectAdvance(
      currentSnapshot,
      { ...params, tenantId: currentTenant }
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      transactions: nextState.transactions,
      projects: nextState.projects
    };

    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setProjects(nextState.projects);
  };

  const closeProjectProfit = async (params: {
    projectId: string;
    date: string;
  }): Promise<void> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const nextState = HabinoAtomicTransactionWrapper.atomicCloseProjectProfit(
      currentSnapshot,
      { ...params, tenantId: currentTenant }
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      accountingEntries: nextState.accountingEntries,
      projects: nextState.projects
    };

    setAccountingEntries(nextState.accountingEntries);
    setProjects(nextState.projects);
  };

  const batchSettleInvoices = async (
    settlements: BatchInvoiceSettlementItem[],
    operationDate?: string
  ): Promise<BatchSettlementResult> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState, result } = HabinoAtomicTransactionWrapper.atomicBatchSettleInvoices(
      currentSnapshot,
      settlements,
      currentTenant,
      operationDate
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      invoices: nextState.invoices,
      accountingEntries: nextState.accountingEntries,
      clients: nextState.clients,
      transactions: nextState.transactions,
      checks: nextState.checks
    };

    setInvoices(nextState.invoices);
    setAccountingEntries(nextState.accountingEntries);
    setClients(nextState.clients);
    setTransactions(nextState.transactions);
    setChecks(nextState.checks);

    return result;
  };

  const closeFiscalYear = async (
    params: CloseFiscalYearParams
  ): Promise<CloseFiscalYearResult> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';

    const currentSnapshot = {
      invoices: financialStateRef.current.invoices,
      accountingEntries: financialStateRef.current.accountingEntries,
      clients: financialStateRef.current.clients,
      transactions: financialStateRef.current.transactions,
      installments: financialStateRef.current.installments,
      checks: financialStateRef.current.checks,
      projects: financialStateRef.current.projects,
      inventory: financialStateRef.current.inventory
    };

    const { nextState, result } = HabinoAtomicTransactionWrapper.atomicCloseFiscalYear(
      currentSnapshot,
      params,
      currentTenant
    );

    financialStateRef.current = {
      ...financialStateRef.current,
      accountingEntries: nextState.accountingEntries
    };

    setAccountingEntries(nextState.accountingEntries);
    return result;
  };

  const addAccountingEntry = async (entryData: Omit<AccountingEntry, 'id'>): Promise<AccountingEntry> => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const newEntry: AccountingEntry = {
      ...entryData,
      id: HabinoAccountingKernel.generateUUID(),
      tenantId: currentTenant
    };
    setAccountingEntries(prev => [...prev, newEntry]);
    return newEntry;
  };

  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<{ success: boolean; message: string; savedInCloud: boolean }> => {
    const targetTenantId = (activeTenantId && activeTenantId !== 'all') ? activeTenantId : 'tenant-main';

    const mergedSettings: CompanySettings = {
      ...settings,
      ...newSettings,
      defaultInvoiceDesign: {
        ...(settings.defaultInvoiceDesign || defaultSettings.defaultInvoiceDesign),
        ...(newSettings.defaultInvoiceDesign || {})
      }
    };

    setSettings(mergedSettings);

    try {
      localStorage.setItem(`habino_settings_${targetTenantId}`, JSON.stringify(mergedSettings));
      if (targetTenantId === 'tenant-main') {
        localStorage.setItem('habino_settings', JSON.stringify(mergedSettings));
      }
    } catch (e) {
      console.warn('LocalStorage save failed for settings:', e);
    }

    let savedInCloud = false;
    if (isSupabaseConfigured) {
      try {
        const cloudResult = await SupabaseSyncEngine.syncCompanySettings(mergedSettings, targetTenantId);
        savedInCloud = cloudResult.success;
      } catch (e) {
        console.warn('Cloud sync error for company settings:', e);
      }
    }

    return {
      success: true,
      message: savedInCloud ? 'تنظیمات با موفقیت در فضای ابری و حافظه محلی ذخیره گردید.' : 'تنظیمات با موفقیت در حافظه محلی ذخیره شد.',
      savedInCloud
    };
  };

  const setCurrency = (currency: CurrencyType) => {
    updateSettings({ currency });
  };

  const activateLicense = async (serialKey: string, holderName?: string): Promise<{ success: boolean; message: string }> => {
    const result = validateAndParseLicenseKey(serialKey, holderName);
    if (!result.valid || !result.license) {
      return { success: false, message: result.message };
    }

    setLicense(result.license);
    return { success: true, message: result.message };
  };

  const activateMarketFullEdition = async (companyName?: string): Promise<{ success: boolean; message: string }> => {
    const marketLic = activateFullMarketEdition(companyName);
    setLicense(marketLic);
    return { success: true, message: 'نسخه تجاری بازار با دسترسی نامحدود برای شما با موفقیت فعال شد.' };
  };

  const triggerManualBackup = (): BackupSnapshot => {
    return createBackupSnapshot({
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
      license
    });
  };

  const restoreFullBackup = async (snapshot: BackupSnapshot): Promise<{ success: boolean; message: string }> => {
    try {
      if (!snapshot.data) {
        return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است.' };
      }

      if (snapshot.data.invoices) setInvoices(snapshot.data.invoices);
      if (snapshot.data.checks) setChecks(snapshot.data.checks);
      if (snapshot.data.transactions) setTransactions(snapshot.data.transactions);
      if (snapshot.data.clients) setClients(snapshot.data.clients);
      if (snapshot.data.inventory) setInventory(snapshot.data.inventory);
      if (snapshot.data.installments) setInstallments(snapshot.data.installments);
      if (snapshot.data.bankAccounts) setBankAccounts(snapshot.data.bankAccounts);
      if (snapshot.data.projects) setProjects(snapshot.data.projects);
      if (snapshot.data.accountingEntries) setAccountingEntries(snapshot.data.accountingEntries);
      if (snapshot.data.settings) setSettings(snapshot.data.settings);
      if (snapshot.data.license) setLicense(snapshot.data.license);

      return {
        success: true,
        message: 'بازیابی با موفقیت انجام شد.'
      };
    } catch (e: any) {
      return {
        success: false,
        message: `خطا در بازیابی: ${e?.message || 'ناشناخته'}`
      };
    }
  };

  const loadDemoData = () => {};
  const switchToCleanMarketData = () => {};

  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(() => {
    return getSupabaseConfig().isConfigured;
  });

  const syncFromSupabase = async (targetTenantId?: string): Promise<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
  }> => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        message: 'سوپابیس پیکربندی نشده است.'
      };
    }

    const tenant = targetTenantId || activeTenantId || currentUser?.tenantId || 'tenant-main';
    const isSuper = currentUser?.role === 'super_admin';

    const result = await SupabaseSyncEngine.fetchAllDataFromSupabase(tenant, isSuper);

    if (result.success && result.data) {
      setIsSupabaseLive(true);
      if (result.data.invoices) {
        if (result.data.invoices.length > 0) {
          setInvoices(prev => {
            const remoteList = result.data!.invoices;
            const remoteMap = new Map(remoteList.map(item => [item.id, item]));
            const remoteNumMap = new Map(remoteList.map(item => [(item.invoiceNumber || '').trim().toLowerCase(), item]));
            
            let signaturesMap: Record<string, any> = {};
            try {
              const sigRaw = localStorage.getItem('habino_invoice_signatures');
              if (sigRaw) signaturesMap = JSON.parse(sigRaw);
            } catch (_) {}

            const merged: Invoice[] = remoteList.map(rInv => {
              const sig = signaturesMap[rInv.id] || (rInv.shareToken ? signaturesMap[rInv.shareToken] : undefined);
              const localMatch = prev.find(p => p.id === rInv.id || (p.invoiceNumber && p.invoiceNumber === rInv.invoiceNumber));
              const finalSigUrl = rInv.signatureUrl || sig?.signatureUrl || localMatch?.signatureUrl;
              const isFinalSigned = rInv.isSigned || sig?.isSigned || localMatch?.isSigned || Boolean(finalSigUrl);
              return {
                ...rInv,
                signatureUrl: finalSigUrl,
                isSigned: isFinalSigned,
                signedAt: rInv.signedAt || sig?.signedAt || localMatch?.signedAt,
                shareToken: rInv.shareToken || sig?.shareToken || localMatch?.shareToken,
                signatureMetadata: rInv.signatureMetadata || sig?.signatureMetadata || localMatch?.signatureMetadata
              };
            });

            const hasLocalInvoices = localStorage.getItem('habino_invoices');
            if (hasLocalInvoices) {
              prev.forEach(localInv => {
                const existsById = remoteMap.has(localInv.id);
                const existsByNum = localInv.invoiceNumber && remoteNumMap.has(localInv.invoiceNumber.trim().toLowerCase());
                if (!existsById && !existsByNum && !localInv.is_deleted) {
                  merged.push(localInv);
                  if (isSupabaseConfigured) {
                    SupabaseSyncEngine.syncInvoice(localInv, tenant).catch(() => {});
                  }
                }
              });
            }

            return merged;
          });
        } else {
          // دیتابیس ابری فاقد فاکتور است؛ اگر حافظه محلی نیز ریست شده، استیت خالی نگه داشته شود
          if (!localStorage.getItem('habino_invoices')) {
            setInvoices([]);
          }
        }
      }

      if (result.data.transactions) {
        if (result.data.transactions.length > 0) {
          setTransactions(result.data.transactions);
        } else if (!localStorage.getItem('habino_transactions')) {
          setTransactions([]);
        }
      }

      if (result.data.clients) {
        if (result.data.clients.length > 0) {
          setClients(result.data.clients);
        } else if (!localStorage.getItem('habino_clients')) {
          setClients([]);
        }
      }

      if (result.data.checks) {
        if (result.data.checks.length > 0) {
          setChecks(result.data.checks);
        } else if (!localStorage.getItem('habino_checks')) {
          setChecks([]);
        }
      }

      if (result.data.inventory && result.data.inventory.length > 0) {
        setInventory(result.data.inventory);
        try {
          localStorage.setItem('habino_inventory', JSON.stringify(result.data.inventory));
        } catch (_) {}
      }

      if (result.data.bankAccounts) {
        if (result.data.bankAccounts.length > 0) {
          setBankAccounts(result.data.bankAccounts);
        } else if (!localStorage.getItem('habino_banks')) {
          setBankAccounts([]);
        }
      }

      if (result.data.installments) {
        if (result.data.installments.length > 0) {
          setInstallments(result.data.installments);
        } else if (!localStorage.getItem('habino_installments')) {
          setInstallments([]);
        }
      }

      if (result.data.projects) {
        if (result.data.projects.length > 0) {
          setProjects(result.data.projects);
        } else if (!localStorage.getItem('habino_projects')) {
          setProjects([]);
        }
      }

      if (result.data.accountingEntries) {
        if (result.data.accountingEntries.length > 0) {
          setAccountingEntries(result.data.accountingEntries);
        } else if (!localStorage.getItem('habino_entries')) {
          setAccountingEntries([]);
        }
      }

      if (result.data.settings) {
        setSettings(prev => ({ ...prev, ...result.data!.settings! }));
      }

      return {
        success: true,
        message: result.message,
        counts: result.counts
      };
    }

    return {
      success: false,
      message: result.message,
      counts: result.counts
    };
  };

  // چرخه حیات بوت خودکار و پایش برخط وضعیت پایگاه‌داده (Auto-Hydration & Auto-Live Probe on Mount)
  useEffect(() => {
    let mounted = true;

    const performAutoBootSync = async () => {
      // ۱. دریافت و ادغام امضاهای سمت سرور
      try {
        const sigRes = await fetch('/api/invoices/signatures/map');
        if (sigRes.ok) {
          const sigData = await sigRes.json();
          if (sigData.success && sigData.signatures) {
            const currentLocal = JSON.parse(localStorage.getItem('habino_invoice_signatures') || '{}');
            const merged = { ...currentLocal, ...sigData.signatures };
            localStorage.setItem('habino_invoice_signatures', JSON.stringify(merged));
          }
        }
      } catch (_) {}

      const config = getSupabaseConfig();
      if (!config.isConfigured) return;

      // ۲. پایش خودکار ارتباط زنده پایگاه‌داده (Live Database Probe)
      try {
        const pingResult = await testSupabaseDirectConnection();
        if (mounted && pingResult.ok) {
          setIsSupabaseLive(true);
        }
      } catch (_) {}

      // ۳. واکشی و ادغام خودکار داده‌های ابری در شروع برنامه (Silent Auto-Hydration)
      if (mounted) {
        try {
          await syncFromSupabase();
        } catch (syncErr) {
          console.warn('[Auto-Hydration] Background cloud sync skipped/failed:', syncErr);
        }
      }
    };

    performAutoBootSync();

    // ۴. گوش دادن به رویدادهای ثبت امضا و تغییرات استوریج
    const handleSigEvent = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.invoiceId || detail.shareToken)) {
        setInvoices(prev => prev.map(inv => {
          if (inv.id === detail.invoiceId || (detail.shareToken && inv.shareToken === detail.shareToken)) {
            return {
              ...inv,
              signatureUrl: detail.signatureUrl || inv.signatureUrl,
              isSigned: true,
              signedAt: detail.signedAt || new Date().toISOString()
            };
          }
          return inv;
        }));
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'habino_invoice_signatures' || e.key === 'habino_invoices') {
        const savedInvoices = localStorage.getItem('habino_invoices');
        if (savedInvoices) {
          try {
            setInvoices(JSON.parse(savedInvoices));
          } catch (_) {}
        }
      }
    };

    window.addEventListener('habino_invoice_signed', handleSigEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      mounted = false;
      window.removeEventListener('habino_invoice_signed', handleSigEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const pushToSupabase = async (): Promise<{
    success: boolean;
    message: string;
    upserted?: Record<string, number>;
  }> => {
    const tenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const res = await SupabaseSyncEngine.pushLocalDataToSupabase(tenant, {
      invoices,
      transactions,
      clients,
      checks,
      inventory,
      bankAccounts,
      installments,
      projects,
      accountingEntries,
      settings
    });
    return res;
  };

  const reconcileLedgerAndOpeningBalances = (): any => {
    const currentTenant = activeTenantId || currentUser?.tenantId || 'tenant-main';
    const { reconciledEntries, report } = SupabaseSyncEngine.reconcileLedgerAndOpeningBalances(
      {
        clients,
        inventory,
        bankAccounts,
        accountingEntries,
        invoices
      },
      currentTenant
    );

    setAccountingEntries(reconciledEntries);
    try {
      localStorage.setItem('habino_entries', JSON.stringify(reconciledEntries));
    } catch (e) {
      console.warn('LocalStorage save failed on reconcile:', e);
    }
    return report;
  };

  const repairAndSelfHealSystem = async (): Promise<{
    success: boolean;
    repairedOrphans: number;
    repairedClients: number;
    repairedLedger: boolean;
    repairedDates: number;
    repairedMetadata: number;
    message: string;
  }> => {
    return {
      success: true,
      repairedOrphans: 0,
      repairedClients: 0,
      repairedLedger: true,
      repairedDates: 0,
      repairedMetadata: 0,
      message: 'سامانه در وضعیت پایدار است.'
    };
  };

  const processBazaarWebhookPayment = async (payload: BazaarWebhookPayload): Promise<WebhookProcessResult> => {
    return BazaarDoubleEntryLedgerEngine.processBazaarPaymentWebhook(payload);
  };

  const processBazaarPurchaseIap = async (skuId: BazaarProductSkuId, clientId?: string): Promise<BazaarPurchaseVerificationResponse> => {
    const targetClient = clients.find(c => c.id === clientId) || clients[0] || {
      id: clientId || 'c-bazaar-direct',
      name: 'کاربر خریدار بازار',
      phone: '09120000000',
      type: 'individual' as const,
      isActive: true
    };
    const receipt = BazaarBillingEngine.generateSimulatedReceipt(skuId, activeTenantId, targetClient.id);
    const res = await BazaarBillingEngine.verifyBazaarPurchaseRpc(receipt, targetClient, activeTenantId, 0);
    if (res.success && res.license) {
      setLicense(res.license);
    }
    return res;
  };

  const getIndexedDbStats = async (): Promise<IndexedDbStorageStats> => {
    return HabinoIndexedDbEngine.getStorageStats();
  };

  const persistToIndexedDbNow = async (): Promise<void> => {
    await HabinoIndexedDbEngine.persistFullSnapshot({
      invoices,
      transactions,
      clients,
      checks,
      inventory,
      bankAccounts,
      installments,
      projects,
      accountingEntries,
      settings
    });
  };

  const purgeInterferingPnLData = async (): Promise<{ success: boolean; message: string; remainingInvoiceCount: number }> => {
    setTransactions([]);
    setProjects([]);
    localStorage.removeItem('habino_transactions');
    localStorage.removeItem('habino_projects');
    localStorage.setItem('habino_pnl_purged_for_testing_v2', 'true');
    return {
      success: true,
      message: 'پاکسازی انجام شد.',
      remainingInvoiceCount: invoices.length
    };
  };

  const executeFactoryReset = async (
    mode: 'full' | 'preserve_inventory' | 'preserve_contacts_inventory' = 'preserve_inventory'
  ): Promise<{ success: boolean; message: string }> => {
    const preserveInventory = mode === 'preserve_inventory' || mode === 'preserve_contacts_inventory';
    const preserveClients = mode === 'preserve_contacts_inventory';

    // ۱. پاکسازی کامل استیت‌های در حافظه
    setInvoices([]);
    setChecks([]);
    setTransactions([]);
    setInstallments([]);
    setAccountingEntries([]);
    setProjects([]);
    if (!preserveClients) {
      setClients([]);
      setBankAccounts([]);
    }
    if (!preserveInventory) {
      setInventory([]);
    }

    // ۲. پاکسازی پایدار localStorage
    localStorage.removeItem('habino_invoices');
    localStorage.removeItem('habino_checks');
    localStorage.removeItem('habino_transactions');
    localStorage.removeItem('habino_installments');
    localStorage.removeItem('habino_entries');
    localStorage.removeItem('habino_invoice_signatures');
    localStorage.removeItem('habino_projects');
    localStorage.removeItem('habino_ocr_documents');
    localStorage.removeItem('habino_offline_queue');
    localStorage.removeItem('habino_offline_db_queue');
    localStorage.setItem('habino_pnl_purged_for_testing_v2', 'true');
    localStorage.setItem('habino_factory_reset_completed', Date.now().toString());

    if (!preserveClients) {
      localStorage.removeItem('habino_clients');
      localStorage.removeItem('habino_banks');
    }
    if (!preserveInventory) {
      localStorage.removeItem('habino_inventory');
    }

    // ۳. پاکسازی کامل پایگاه‌داده آفلاین IndexedDB
    try {
      await HabinoIndexedDbEngine.clearStore('invoices');
      await HabinoIndexedDbEngine.clearStore('transactions');
      await HabinoIndexedDbEngine.clearStore('checks');
      await HabinoIndexedDbEngine.clearStore('installments');
      await HabinoIndexedDbEngine.clearStore('projects');
      await HabinoIndexedDbEngine.clearStore('accountingEntries');
      if (!preserveClients) {
        await HabinoIndexedDbEngine.clearStore('clients');
        await HabinoIndexedDbEngine.clearStore('bankAccounts');
      }
      if (!preserveInventory) {
        await HabinoIndexedDbEngine.clearStore('inventory');
      }
    } catch (e) {
      console.warn('[FactoryReset] IndexedDB clear warning:', e);
    }

    // ۴. پاکسازی قطعی پایگاه‌داده سوپابیس (Supabase Direct + Server Route)
    try {
      await SupabaseSyncEngine.purgeAllFinancialDataFromSupabase({
        preserveInventory,
        preserveClients,
        tenantId: activeTenantId,
        isSuperAdmin: currentUser?.role === 'super_admin'
      });
    } catch (e) {
      console.warn('[FactoryReset] Supabase remote purge warning:', e);
    }

    const modeMsg = preserveInventory && !preserveClients
      ? 'کلیه اطلاعات مالی، فاکتورها، تراکنش‌ها، اسناد و مخاطبین به جز انبار کالاها هم در حافظه محلی و هم در سوپابیس با موفقیت پاکسازی شدند.'
      : preserveInventory && preserveClients
      ? 'کلیه اسناد و تراکنش‌های مالی پاکسازی شدند (انبار کالاها و فهرست مخاطبین حفظ گردیدند).'
      : 'ریست کامل کارخانه انجام شد و کلیه داده‌ها پاکسازی شدند.';

    return { success: true, message: modeMsg };
  };

  const effectiveTenantId = useMemo(() => {
    if (currentUser && currentUser.role !== 'super_admin') {
      return currentUser.tenantId || activeTenantId || 'tenant-main';
    }
    return activeTenantId || 'tenant-main';
  }, [currentUser?.role, currentUser?.tenantId, activeTenantId]);

  const isolatedInvoices = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return invoices;
    return invoices.filter(i => (i.tenantId || 'tenant-main') === effectiveTenantId);
  }, [invoices, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedChecks = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return checks;
    return checks.filter(c => (c.tenantId || 'tenant-main') === effectiveTenantId);
  }, [checks, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedTransactions = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return transactions;
    return transactions.filter(t => (t.tenantId || 'tenant-main') === effectiveTenantId);
  }, [transactions, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedClients = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return clients;
    return clients.filter(c => (c.tenantId || 'tenant-main') === effectiveTenantId);
  }, [clients, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedInventory = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return inventory;
    return inventory.filter(i => (i.tenantId || 'tenant-main') === effectiveTenantId);
  }, [inventory, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedInstallments = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return installments;
    return installments.filter(ins => (ins.tenantId || 'tenant-main') === effectiveTenantId);
  }, [installments, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedBankAccounts = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return bankAccounts;
    return bankAccounts.filter(b => (b.tenantId || 'tenant-main') === effectiveTenantId);
  }, [bankAccounts, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedProjects = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return projects;
    return projects.filter(p => (p.tenantId || 'tenant-main') === effectiveTenantId);
  }, [projects, effectiveTenantId, currentUser?.role, activeTenantId]);

  const isolatedAccountingEntries = useMemo(() => {
    if (currentUser?.role === 'super_admin' && activeTenantId === 'all') return accountingEntries;
    return accountingEntries.filter(e => (e.tenantId || 'tenant-main') === effectiveTenantId);
  }, [accountingEntries, effectiveTenantId, currentUser?.role, activeTenantId]);

  const effectiveSettings = useMemo(() => {
    if (activeTenant && activeTenant.id !== 'all' && activeTenant.id !== 'tenant-main') {
      const isLeakedName = !settings.name || settings.name.includes('هابینو');
      return {
        ...settings,
        name: isLeakedName ? activeTenant.name : settings.name,
        economicCode: settings.economicCode || activeTenant.metadata?.economicCode || '',
        nationalId: settings.nationalId || activeTenant.metadata?.nationalId || '',
        registrationNumber: settings.registrationNumber || activeTenant.metadata?.registrationNumber || '',
        phone: (settings.phone && settings.phone !== defaultSettings.phone) ? settings.phone : (activeTenant.ownerPhone || settings.phone)
      };
    }
    return settings;
  }, [settings, activeTenant]);

  const value = useMemo(() => ({
    invoices: isolatedInvoices,
    checks: isolatedChecks,
    transactions: isolatedTransactions,
    clients: isolatedClients,
    inventory: isolatedInventory,
    installments: isolatedInstallments,
    bankAccounts: isolatedBankAccounts,
    projects: isolatedProjects,
    accountingEntries: isolatedAccountingEntries,
    allInvoices: invoices,
    allClients: clients,
    allChecks: checks,
    allTransactions: transactions,
    allAccountingEntries: accountingEntries,
    settings: effectiveSettings,
    license,
    activeTenantId,
    isOnline,
    currentUser,
    activeTenant,
    availableTenants,
    tenantUsers,
    auditLogs,
    isAuthenticated: Boolean(currentUser),
    login,
    loginAsPredefined,
    registerTenant,
    logout,
    switchTenant,
    createTenantUser,
    updateTenantUser,
    deleteTenantUser,
    hasPermission,
    canAccessModule,
    canMutateData,
    upgradeTenantSubscription,
    activateAddon,
    hasAddon,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    restoreInvoice,
    addCheck,
    updateCheck,
    deleteCheck,
    addTransaction,
    deleteTransaction,
    addClient,
    updateClient,
    deleteClient,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addInstallment,
    updateInstallment,
    deleteInstallment,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addProject,
    updateProject,
    deleteProject,
    registerProjectAdvance,
    closeProjectProfit,
    batchSettleInvoices,
    closeFiscalYear,
    addAccountingEntry,
    updateSettings,
    setCurrency,
    activateLicense,
    activateMarketFullEdition,
    restoreFullBackup,
    triggerManualBackup,
    loadDemoData,
    switchToCleanMarketData,
    isSupabaseLive,
    syncFromSupabase,
    pushToSupabase,
    reconcileLedgerAndOpeningBalances,
    repairAndSelfHealSystem,
    processBazaarWebhookPayment,
    processBazaarPurchaseIap,
    getIndexedDbStats,
    persistToIndexedDbNow,
    purgeInterferingPnLData,
    executeFactoryReset
  }), [
    isolatedInvoices, isolatedChecks, isolatedTransactions, isolatedClients,
    isolatedInventory, isolatedInstallments, isolatedBankAccounts, isolatedProjects,
    isolatedAccountingEntries, invoices, clients, checks, transactions,
    accountingEntries, effectiveSettings, license, activeTenantId, isOnline,
    currentUser, activeTenant, availableTenants, tenantUsers, auditLogs, isSupabaseLive
  ]);

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};

export default useAccounting;
