/**
 * Habino IndexedDB Storage Engine (High-Capacity Offline Resilience Layer)
 * لایه ذخیره‌سازی بومی IndexedDB برای پشتیبانی کامل آفلاین، نگهداری ده‌ها هزار رکورد
 * و پیشگیری از محدودیت ۵ مگابایتی LocalStorage
 */

const DB_NAME = 'habino_indexed_db';
const DB_VERSION = 3;

export const INDEXED_DB_STORES = [
  'invoices',
  'transactions',
  'clients',
  'checks',
  'inventory',
  'bankAccounts',
  'installments',
  'projects',
  'accountingEntries',
  'companySettings',
  'outbox'
] as const;

export type IndexedDbStoreName = typeof INDEXED_DB_STORES[number];

export interface IndexedDbStorageStats {
  isSupported: boolean;
  totalRecords: number;
  storeCounts: Record<string, number>;
  estimatedSizeKb: number;
  lastPersistTimestamp?: number;
}

class IndexedDbEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.indexedDB;
  }

  private async getDb(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB در این مرورگر یا محیط پشتیبانی نمی‌شود.');
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        INDEXED_DB_STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            if (storeName !== 'companySettings') {
              try {
                store.createIndex('tenantId', 'tenantId', { unique: false });
              } catch (e) {
                // Ignore index recreation error
              }
            }
          }
        });
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('خطا در بازگشایی پایگاه داده IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * ذخیره دسته‌ای از رکوردها در یک جدول IndexedDB
   */
  public async saveBatch<T extends { id: string }>(storeName: IndexedDbStoreName, items: T[]): Promise<void> {
    if (!this.isSupported() || !items || items.length === 0) return;

    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);

        items.forEach(item => {
          if (item && item.id) {
            store.put(item);
          }
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error(`تراکنش ذخیره در ${storeName} لغو شد.`));
      });
    } catch (err) {
      console.warn(`IndexedDB saveBatch error in ${storeName}:`, err);
    }
  }

  /**
   * دریافت تمامی رکوردهای یک جدول از IndexedDB
   */
  public async getAll<T>(storeName: IndexedDbStoreName): Promise<T[]> {
    if (!this.isSupported()) return [];

    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (err) {
      console.warn(`IndexedDB getAll error in ${storeName}:`, err);
      return [];
    }
  }

  /**
   * ذخیره یک رکورد منفرد در IndexedDB
   */
  public async putItem<T extends { id: string }>(storeName: IndexedDbStoreName, item: T): Promise<void> {
    if (!this.isSupported() || !item || !item.id) return;
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`IndexedDB putItem error in ${storeName}:`, err);
    }
  }

  /**
   * حذف یک رکورد با شناسه id از IndexedDB
   */
  public async deleteItem(storeName: IndexedDbStoreName, id: string): Promise<void> {
    if (!this.isSupported() || !id) return;
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`IndexedDB deleteItem error in ${storeName}:`, err);
    }
  }

  /**
   * پاکسازی کامل یک جدول در IndexedDB
   */
  public async clearStore(storeName: IndexedDbStoreName): Promise<void> {
    if (!this.isSupported()) return;
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`IndexedDB clearStore error in ${storeName}:`, err);
    }
  }

  /**
   * پاکسازی کامل کلیه جداول IndexedDB در سناریوی ریست و تنظیم کارخانه
   */
  public async clearAllStores(): Promise<void> {
    if (!this.isSupported()) return;
    try {
      await Promise.all(INDEXED_DB_STORES.map(store => this.clearStore(store)));
      localStorage.removeItem('habino_idb_last_persist');
    } catch (err) {
      console.warn('Error clearing all IndexedDB stores:', err);
    }
  }

  /**
   * ذخیره یک اسنپ‌شات کامل از کل برنامه در IndexedDB (Dual-Write Persistence)
   */
  public async persistFullSnapshot(data: {
    invoices?: any[];
    transactions?: any[];
    clients?: any[];
    checks?: any[];
    inventory?: any[];
    bankAccounts?: any[];
    installments?: any[];
    projects?: any[];
    accountingEntries?: any[];
    settings?: any;
  }): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const promises: Promise<any>[] = [];
      if (data.invoices && data.invoices.length > 0) promises.push(this.saveBatch('invoices', data.invoices));
      if (data.transactions && data.transactions.length > 0) promises.push(this.saveBatch('transactions', data.transactions));
      if (data.clients && data.clients.length > 0) promises.push(this.saveBatch('clients', data.clients));
      if (data.checks && data.checks.length > 0) promises.push(this.saveBatch('checks', data.checks));
      if (data.inventory && data.inventory.length > 0) promises.push(this.saveBatch('inventory', data.inventory));
      if (data.bankAccounts && data.bankAccounts.length > 0) promises.push(this.saveBatch('bankAccounts', data.bankAccounts));
      if (data.installments && data.installments.length > 0) promises.push(this.saveBatch('installments', data.installments));
      if (data.projects && data.projects.length > 0) promises.push(this.saveBatch('projects', data.projects));
      if (data.accountingEntries && data.accountingEntries.length > 0) promises.push(this.saveBatch('accountingEntries', data.accountingEntries));
      if (data.settings) {
        promises.push(this.putItem('companySettings', { id: 'current', ...data.settings }));
      }

      await Promise.all(promises);
      localStorage.setItem('habino_idb_last_persist', Date.now().toString());
    } catch (err) {
      console.warn('Error persisting full snapshot to IndexedDB:', err);
    }
  }

  /**
   * بازیابی کامل تمام جداول از IndexedDB
   */
  public async loadFullSnapshot(): Promise<{
    invoices: any[];
    transactions: any[];
    clients: any[];
    checks: any[];
    inventory: any[];
    bankAccounts: any[];
    installments: any[];
    projects: any[];
    accountingEntries: any[];
    settings: any | null;
  }> {
    if (!this.isSupported()) {
      return {
        invoices: [],
        transactions: [],
        clients: [],
        checks: [],
        inventory: [],
        bankAccounts: [],
        installments: [],
        projects: [],
        accountingEntries: [],
        settings: null
      };
    }

    try {
      const [
        invoices,
        transactions,
        clients,
        checks,
        inventory,
        bankAccounts,
        installments,
        projects,
        accountingEntries,
        settingsRows
      ] = await Promise.all([
        this.getAll('invoices'),
        this.getAll('transactions'),
        this.getAll('clients'),
        this.getAll('checks'),
        this.getAll('inventory'),
        this.getAll('bankAccounts'),
        this.getAll('installments'),
        this.getAll('projects'),
        this.getAll('accountingEntries'),
        this.getAll('companySettings')
      ]);

      const settings = settingsRows.length > 0 ? settingsRows[0] : null;

      return {
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
      };
    } catch (err) {
      console.warn('Error loading snapshot from IndexedDB:', err);
      return {
        invoices: [],
        transactions: [],
        clients: [],
        checks: [],
        inventory: [],
        bankAccounts: [],
        installments: [],
        projects: [],
        accountingEntries: [],
        settings: null
      };
    }
  }

  /**
   * آمار و سلامت پایگاه داده محلی IndexedDB
   */
  public async getStorageStats(): Promise<IndexedDbStorageStats> {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        totalRecords: 0,
        storeCounts: {},
        estimatedSizeKb: 0
      };
    }

    try {
      const counts: Record<string, number> = {};
      let totalRecords = 0;

      for (const storeName of INDEXED_DB_STORES) {
        const items = await this.getAll(storeName);
        counts[storeName] = items.length;
        totalRecords += items.length;
      }

      // برآورد حافظه بر اساس میانگین سایز رکورد
      const estimatedSizeKb = Math.round(totalRecords * 1.8);
      const lastPersistTimestamp = Number(localStorage.getItem('habino_idb_last_persist') || 0);

      return {
        isSupported: true,
        totalRecords,
        storeCounts: counts,
        estimatedSizeKb,
        lastPersistTimestamp: lastPersistTimestamp || undefined
      };
    } catch (err) {
      return {
        isSupported: true,
        totalRecords: 0,
        storeCounts: {},
        estimatedSizeKb: 0
      };
    }
  }
}

export const HabinoIndexedDbEngine = new IndexedDbEngine();
