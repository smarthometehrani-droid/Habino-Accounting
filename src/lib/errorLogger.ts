/**
 * Habino Accounting - Client-Side Error Logger & Console Watchdog
 * سامانه هوشمند ثبت لاگ و نظارت بر خطاهای بلادرنگ کلاینت در ماژول عیب‌یابی (DiagnosticModule)
 */

export interface HabinoLogEntry {
  id: string;
  timestamp: string;
  isoTime: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  source?: string;
  stack?: string;
  details?: any;
}

class HabinoErrorLogger {
  private static instance: HabinoErrorLogger;
  private logs: HabinoLogEntry[] = [];
  private readonly maxLogs: number = 200;
  private listeners: Array<(logs: HabinoLogEntry[]) => void> = [];
  private initialized: boolean = false;

  private constructor() {
    this.loadPersistedLogs();
    this.initGlobalWatchdog();
  }

  public static getInstance(): HabinoErrorLogger {
    if (!HabinoErrorLogger.instance) {
      HabinoErrorLogger.instance = new HabinoErrorLogger();
    }
    return HabinoErrorLogger.instance;
  }

  private shouldIgnoreError(entry: { message?: string; source?: string; stack?: string }): boolean {
    const raw = `${entry.message || ''} ${entry.source || ''} ${entry.stack || ''}`.toLowerCase();
    return (
      raw.includes('[vite]') ||
      raw.includes('websocket') ||
      raw.includes('failed to connect to websocket') ||
      raw.includes('@vite/client') ||
      raw.includes('vite/client') ||
      raw.includes('vite/dist/client') ||
      raw.includes('vite:not-found') ||
      raw.includes('hmr') ||
      raw.includes('chrome-extension://') ||
      raw.includes('moz-extension://')
    );
  }

  private loadPersistedLogs(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const saved = sessionStorage.getItem('habino_runtime_errors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.logs = parsed.filter(item => !this.shouldIgnoreError(item)).slice(-this.maxLogs);
          this.persistLogs();
        }
      }
    } catch (_) {
      // Ignored
    }
  }

  private persistLogs(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      sessionStorage.setItem('habino_runtime_errors', JSON.stringify(this.logs.slice(-this.maxLogs)));
    } catch (_) {
      // Ignored
    }
  }

  private initGlobalWatchdog(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. Trap window unhandled errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.logInternal({
        level: 'error',
        message: event.message || 'خطای ناشناخته در زمان اجرا (Window Error)',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'window.onerror',
        stack: event.error?.stack || undefined
      });
    });

    // 2. Trap unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      let msg = 'خطای پرامیس مدیریت‌نشده (Unhandled Promise Rejection)';
      let stack: string | undefined = undefined;

      if (event.reason instanceof Error) {
        msg = event.reason.message;
        stack = event.reason.stack;
      } else if (typeof event.reason === 'string') {
        msg = event.reason;
      } else if (event.reason && typeof event.reason === 'object') {
        try {
          msg = JSON.stringify(event.reason);
        } catch (_) {}
      }

      this.logInternal({
        level: 'error',
        message: msg,
        source: 'unhandledrejection',
        stack
      });
    });

    // 3. Wrap console.error and console.warn while maintaining native logs
    const originalConsoleError = console.error.bind(console);
    const originalConsoleWarn = console.warn.bind(console);

    console.error = (...args: any[]) => {
      try {
        const primary = args[0];
        const msg = typeof primary === 'string' 
          ? primary 
          : primary instanceof Error 
            ? primary.message 
            : typeof primary === 'object' 
              ? JSON.stringify(primary) 
              : String(primary);

        const stack = primary instanceof Error ? primary.stack : undefined;
        this.logInternal({
          level: 'error',
          message: msg || 'خطای ثبت‌شده در کنسول',
          source: 'console.error',
          stack,
          details: args.length > 1 ? args.slice(1) : undefined
        });
      } catch (_) {}
      originalConsoleError(...args);
    };

    console.warn = (...args: any[]) => {
      try {
        const primary = args[0];
        const msg = typeof primary === 'string' 
          ? primary 
          : typeof primary === 'object' 
            ? JSON.stringify(primary) 
            : String(primary);

        // Filter out noisy Vite HMR or websocket warnings
        if (!msg.includes('[vite]') && !msg.includes('WebSocket')) {
          this.logInternal({
            level: 'warn',
            message: msg || 'هشدار کنسول',
            source: 'console.warn',
            details: args.length > 1 ? args.slice(1) : undefined
          });
        }
      } catch (_) {}
      originalConsoleWarn(...args);
    };
  }

  private logInternal(entry: Omit<HabinoLogEntry, 'id' | 'timestamp' | 'isoTime'>): void {
    if (this.shouldIgnoreError(entry)) {
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('fa-IR');
    const formattedTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog: HabinoLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: `${formattedDate} ${formattedTime}`,
      isoTime: now.toISOString(),
      ...entry
    };

    this.logs.unshift(newLog);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.persistLogs();
    this.notify();
  }

  public logCustom(level: 'error' | 'warn' | 'info', message: string, source?: string, details?: any): void {
    this.logInternal({ level, message, source: source || 'application', details });
  }

  public getLogs(): HabinoLogEntry[] {
    return [...this.logs];
  }

  public getCounts(): { total: number; errors: number; warnings: number; unhandled: number } {
    let errors = 0;
    let warnings = 0;
    let unhandled = 0;

    for (const log of this.logs) {
      if (log.level === 'error') {
        errors++;
        if (log.source === 'unhandledrejection' || log.source === 'window.onerror') {
          unhandled++;
        }
      } else if (log.level === 'warn') {
        warnings++;
      }
    }

    return {
      total: this.logs.length,
      errors,
      warnings,
      unhandled
    };
  }

  public clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('habino_runtime_errors');
    }
    this.notify();
  }

  public subscribe(listener: (logs: HabinoLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener([...this.logs]);
      } catch (_) {}
    }
  }
}

export const habinoErrorLogger = HabinoErrorLogger.getInstance();
