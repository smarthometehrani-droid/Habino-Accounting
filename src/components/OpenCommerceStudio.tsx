import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Code2,
  Plug,
  Store,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCw,
  Send,
  AlertCircle,
  ExternalLink,
  Sliders,
  Trash2,
  Terminal,
  Activity,
  Zap,
  Globe,
  Database,
  Building,
  Coins,
  Hammer,
  Wrench,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles
} from 'lucide-react';
import {
  CommerceApiKey,
  WebhookSubscription,
  WebhookDeliveryLog,
  GuildPlugin,
  ApiScope,
  ApiKeyEnvironment,
  WebhookEventTopic,
  getStoredApiKeys,
  saveApiKeys,
  generateApiKey,
  getStoredWebhooks,
  saveWebhooks,
  getStoredWebhookLogs,
  dispatchWebhookEvent,
  getStoredGuildPlugins,
  saveGuildPlugins,
  generateWooCommerceBridgeSnippet,
  generateApiCodeSnippet
} from '../lib/commerceApiEngine';
import { useAccounting } from '../lib/store';

export const OpenCommerceStudio: React.FC = () => {
  const { addInvoice, clients, inventory } = useAccounting();

  const [activeTab, setActiveTab] = useState<'api_keys' | 'webhooks' | 'bridges' | 'plugins' | 'explorer'>('api_keys');

  // State
  const [apiKeys, setApiKeys] = useState<CommerceApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([]);
  const [plugins, setPlugins] = useState<GuildPlugin[]>([]);

  // Modals & Forms
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<ApiKeyEnvironment>('live');
  const [newKeyScopes, setNewKeyScopes] = useState<ApiScope[]>(['invoices.read', 'invoices.write']);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<CommerceApiKey | null>(null);

  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDesc, setNewWebhookDesc] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<WebhookEventTopic[]>(['invoice.created', 'invoice.paid']);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Log for Payload Modal
  const [selectedLog, setSelectedLog] = useState<WebhookDeliveryLog | null>(null);

  // WooCommerce simulation state
  const [simulatingWooOrder, setSimulatingWooOrder] = useState(false);
  const [wooSimulationToast, setWooSimulationToast] = useState<string | null>(null);

  // Guild Plugin Calculator Test state
  const [activePluginTestId, setActivePluginTestId] = useState<string>('plugin-gold');
  const [pluginTestInputs, setPluginTestInputs] = useState<Record<string, any>>({
    goldWeightGrams: 12.5,
    caratType: 'عیار ۱۸ (۷۵۰)',
    makingFeePercent: 16,
    goldLivePricePerGram: 4380000
  });

  // API Explorer state
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/invoices');
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST'>('POST');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'nodejs' | 'python' | 'php'>('curl');
  const [explorerRequestBody, setExplorerRequestBody] = useState<string>(
    JSON.stringify(
      {
        customer: 'شرکت فناوران آریا',
        nationalCode: '10103456789',
        phone: '09121234567',
        items: [
          {
            name: 'سرور لینوکس ابری سالانه',
            quantity: 1,
            unitPrice: 36000000,
            discount: 0,
            taxPercent: 10
          }
        ],
        paymentMethod: 'cash',
        guildMetadata: {
          guildType: 'digital_services',
          serverDatacenter: 'Tehran-IDC-1'
        }
      },
      null,
      2
    )
  );
  const [explorerResponse, setExplorerResponse] = useState<any | null>(null);
  const [isExecutingApiCall, setIsExecutingApiCall] = useState(false);

  // Load initial data
  useEffect(() => {
    setApiKeys(getStoredApiKeys());
    setWebhooks(getStoredWebhooks());
    setWebhookLogs(getStoredWebhookLogs());
    setPlugins(getStoredGuildPlugins());
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Create API Key
  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const created = generateApiKey(newKeyName.trim(), newKeyEnv, newKeyScopes);
    setApiKeys(getStoredApiKeys());
    setGeneratedKeyResult(created);
    setNewKeyName('');
    setNewKeyScopes(['invoices.read', 'invoices.write']);
  };

  // Revoke Key
  const handleRevokeKey = (id: string) => {
    const updated = apiKeys.map(k => (k.id === id ? { ...k, status: 'revoked' as const } : k));
    setApiKeys(updated);
    saveApiKeys(updated);
  };

  // Create Webhook
  const handleCreateWebhook = () => {
    if (!newWebhookUrl.trim()) return;
    const newHook: WebhookSubscription = {
      id: `wh-${Date.now()}`,
      url: newWebhookUrl.trim(),
      description: newWebhookDesc.trim() || 'وب‌هوک تجاری هابینو',
      subscribedEvents: newWebhookEvents,
      secretKey: `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      status: 'active',
      createdAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
      totalDeliveries: 0,
      failureCount: 0
    };
    const updated = [newHook, ...webhooks];
    setWebhooks(updated);
    saveWebhooks(updated);
    setShowNewWebhookModal(false);
    setNewWebhookUrl('');
    setNewWebhookDesc('');
  };

  // Trigger Live Test Webhook
  const handleTriggerTestWebhook = async (hook: WebhookSubscription) => {
    const log = await dispatchWebhookEvent(hook, hook.subscribedEvents[0] || 'invoice.created');
    setWebhookLogs(getStoredWebhookLogs());
    setWebhooks(getStoredWebhooks());
    setSelectedLog(log);
  };

  // Simulate WooCommerce Order
  const handleSimulateWooCommerceOrder = async () => {
    setSimulatingWooOrder(true);
    setWooSimulationToast('در حال دریافت وب‌هوک سفارش جدید از ووکامرس (Order #1042)...');

    setTimeout(() => {
      // Create real invoice in Habino
      const randomOrderNum = Math.floor(1000 + Math.random() * 9000);
      const invoiceData = {
        invoiceNumber: `WOO-${randomOrderNum}`,
        clientId: clients[0]?.id || 'client-guest',
        clientName: 'مشتری آنلاین ووکامرس (آقای رضایی)',
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        items: [
          {
            id: `item-${Date.now()}-1`,
            description: 'لپ‌تاپ تجاری تینک‌پد سری E14 (سفارش آنلاین)',
            quantity: 1,
            unitPrice: 48500000,
            discount: 500000,
            taxRate: 10,
            total: 52800000
          }
        ],
        subtotal: 48500000,
        totalTax: 4800000,
        totalDiscount: 500000,
        grandTotal: 52800000,
        amountPaid: 52800000,
        remainingAmount: 0,
        template: 'professional' as const,
        status: 'paid' as const,
        type: 'sale' as const,
        notes: 'ثبت خودکار از طریق وب‌سرویس باز هابینو و ووکامرس (Order ID: #1042)'
      };

      addInvoice(invoiceData);

      // Dispatch webhook log
      if (webhooks.length > 0) {
        dispatchWebhookEvent(webhooks[0], 'invoice.created', {
          event: 'invoice.created',
          source: 'woocommerce_adapter',
          orderId: randomOrderNum,
          invoiceNumber: `WOO-${randomOrderNum}`,
          amount: 52800000,
          customer: 'مشتری آنلاین ووکامرس (آقای رضایی)'
        }).then(() => {
          setWebhookLogs(getStoredWebhookLogs());
        });
      }

      setSimulatingWooOrder(false);
      setWooSimulationToast(`فاکتور WOO-${randomOrderNum} با موفقیت صادر و در دفتر کل ثبت شد!`);
      setTimeout(() => setWooSimulationToast(null), 6000);
    }, 1200);
  };

  // Toggle Guild Plugin
  const handleTogglePlugin = (pluginId: string) => {
    const updated = plugins.map(p => {
      if (p.id === pluginId) {
        return { ...p, active: !p.active, installed: true };
      }
      return p;
    });
    setPlugins(updated);
    saveGuildPlugins(updated);
  };

  // Execute API Explorer Request
  const handleExecuteExplorerCall = () => {
    setIsExecutingApiCall(true);
    setExplorerResponse(null);

    setTimeout(() => {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(explorerRequestBody);
      } catch (e) {
        // ignore
      }

      const activeKey = apiKeys.find(k => k.status === 'active')?.key || 'hbn_live_demo';

      if (selectedMethod === 'GET' && selectedEndpoint === '/invoices') {
        setExplorerResponse({
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-ratelimit-limit': '1200',
            'x-ratelimit-remaining': '1198',
            'x-tenant-id': 'tenant_farid_default',
            'x-response-time': '42ms'
          },
          data: {
            success: true,
            totalCount: 4,
            page: 1,
            data: [
              {
                id: 'inv-101',
                number: 'INV-1403-901',
                customer: 'شرکت پترو سپهر پارس',
                totalAmount: 145000000,
                status: 'paid',
                date: '1403/06/14'
              },
              {
                id: 'inv-102',
                number: 'INV-1403-902',
                customer: 'مهندسی داده‌ورزی رایان',
                totalAmount: 185000000,
                status: 'pending',
                date: '1403/06/15'
              }
            ]
          }
        });
      } else if (selectedMethod === 'POST' && selectedEndpoint === '/invoices') {
        const newId = `inv_${Date.now()}`;
        setExplorerResponse({
          status: 201,
          statusText: 'Created',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-ratelimit-limit': '1200',
            'x-ratelimit-remaining': '1197',
            'x-tenant-id': 'tenant_farid_default',
            'x-idempotency-key': `idemp_${Date.now()}`,
            'x-response-time': '68ms'
          },
          data: {
            success: true,
            message: 'فاکتور با موفقیت در هابینو ایجاد و در دفتر کل ثبت شد',
            invoice: {
              id: newId,
              invoiceNumber: `INV-API-${Math.floor(1000 + Math.random() * 9000)}`,
              tenantId: 'tenant_farid_default',
              customer: (parsedBody as any).customer || 'شرکت فناوران آریا',
              totalAmount: 39600000,
              currency: 'IRT',
              ledgerTransactionId: `trx_double_entry_${Date.now()}`,
              qrVerificationUrl: `https://verify.habino.ir/v1/inv/${newId}`,
              createdAt: new Date().toISOString()
            }
          }
        });
      } else {
        setExplorerResponse({
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'x-response-time': '35ms'
          },
          data: {
            success: true,
            endpoint: selectedEndpoint,
            method: selectedMethod,
            timestamp: new Date().toISOString(),
            sampleResult: 'عملیات با موفقیت توسط هسته وب‌سرویس هابینو پردازش گردید.'
          }
        });
      }

      setIsExecutingApiCall(false);
    }, 450);
  };

  // Scope labels
  const scopeLabels: Record<ApiScope, string> = {
    'invoices.read': 'مشاهده و استعلام فاکتورها (Read)',
    'invoices.write': 'صدور و ویرایش فاکتورها (Write)',
    'inventory.read': 'استعلام موجودی و قیمت انبار',
    'inventory.sync': 'همگام‌سازی و بروزرسانی انبار',
    'tenders.read': 'مشاهده مناقصات صنفی',
    'tenders.bid': 'ارسال پیشنهاد به مناقصات',
    'ledger.read': 'دریافت تراز و اسناد دفتر کل',
    'webhooks.manage': 'مدیریت و ثبت وب‌هوک‌ها'
  };

  const currentActiveKey = apiKeys.find(k => k.status === 'active')?.key || 'hbn_live_demo_key';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Toast Alert */}
      {wooSimulationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
          <div className="text-sm font-bold">{wooSimulationToast}</div>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-800/40">
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                فاز ۴ مهندسی هابینو (Open Commerce Architecture)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                پایانه فعال و عملیاتی
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-400" />
              وب‌سرویس تجاری باز و اکوسیستم اصناف
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              پایانه امن API کلیدهای چندمستأجری، گیت‌وی وب‌هوک‌های HMAC SHA-256، افزونه‌های تخصصی اصناف (طلا، عمران، املاک) و پل یکپارچه‌سازی با ووکامرس و نرم‌افزارهای مالی.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">کلیدهای فعال</span>
              <span className="text-lg font-black text-blue-400">
                {apiKeys.filter(k => k.status === 'active').length}
              </span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">وب‌هوک‌های متصل</span>
              <span className="text-lg font-black text-emerald-400">{webhooks.length}</span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">میانگین تأخیر</span>
              <span className="text-lg font-black text-amber-400">~68ms</span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">افزونه‌های فعال</span>
              <span className="text-lg font-black text-purple-400">
                {plugins.filter(p => p.active).length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveTab('api_keys')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'api_keys'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Key className="w-4 h-4" />
            کلیدهای دسترسی API
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'webhooks'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Webhook className="w-4 h-4" />
            گیت‌وی وب‌هوک‌ها (HMAC)
          </button>
          <button
            onClick={() => setActiveTab('bridges')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'bridges'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-4 h-4" />
            پل‌های ووکامرس و سپیدار
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'plugins'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            مارکت‌پلیس افزونه‌های اصناف
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            کاوشگر API و تولید کد
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: API KEYS ==================== */}
      {activeTab === 'api_keys' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                مدیریت کلیدهای دسترسی API چندمستأجری
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                کلیدهای مجاز برای اتصال فروشگاه‌های آنلاین، پایانه‌های فروشگاهی و اسکریپت‌های اتوماسیون.
              </p>
            </div>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              تولید کلید جدید API
            </button>
          </div>

          {/* Keys List */}
          <div className="grid grid-cols-1 gap-4">
            {apiKeys.map(keyItem => (
              <div
                key={keyItem.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  keyItem.status === 'active'
                    ? 'border-slate-200 hover:border-blue-300 shadow-sm'
                    : 'border-rose-200 bg-rose-50/30 opacity-75'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-black text-slate-900 text-base">{keyItem.name}</span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          keyItem.environment === 'live'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {keyItem.environment === 'live' ? 'عملیاتی (Live)' : 'محیط آزمایشی (Test)'}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          keyItem.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {keyItem.status === 'active' ? 'فعال' : 'منقضی/باطل‌شده'}
                      </span>
                    </div>

                    {/* Key string representation with copy */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl max-w-xl">
                      <code className="text-xs font-mono font-bold text-slate-800 select-all tracking-wider flex-1 truncate">
                        {keyItem.key}
                      </code>
                      <button
                        onClick={() => handleCopy(keyItem.key, keyItem.id)}
                        className="text-slate-500 hover:text-blue-600 transition-colors p-1"
                        title="کپی کلید در کلیپ‌بورد"
                      >
                        {copiedId === keyItem.id ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Scopes badge */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-500 font-bold ml-1">دسترسی‌ها (Scopes):</span>
                      {keyItem.scopes.map(scope => (
                        <span
                          key={scope}
                          className="bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-3">
                    <div className="text-right text-xs text-slate-500 space-y-1">
                      <div>سقف نرخ: <span className="font-bold text-slate-800 font-mono">{keyItem.rateLimitPerMin} req/min</span></div>
                      <div>مجموع فراخوانی‌ها: <span className="font-bold text-blue-600 font-mono">{keyItem.totalCalls.toLocaleString('fa-IR')}</span></div>
                      {keyItem.lastUsedAt && (
                        <div className="text-[11px] text-slate-400">آخرین استفاده: {keyItem.lastUsedAt}</div>
                      )}
                    </div>

                    {keyItem.status === 'active' && (
                      <button
                        onClick={() => handleRevokeKey(keyItem.id)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                      >
                        ابطال دسترسی (Revoke)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Authentication Guide */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800">
            <h3 className="font-black text-sm text-amber-400 flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4" />
              راهنمای احراز هویت در وب‌سرویس هابینو
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              تمامی درخواست‌ها به پایانه باز هابینو باید حاوی هدر احراز هویت با ساختار <code className="text-emerald-400 font-mono">Authorization: Bearer &lt;API_KEY&gt;</code> باشند. هابینو به صورت خودکار مستأجر (Tenant) و سطح دسترسی‌ها را بر اساس کلید شما اعتبارسنجی می‌کند.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
              <span className="text-slate-500"># ارسال درخواست تستی به هابینو با cURL</span>
              <br />
              <span className="text-purple-400">curl</span> -X GET https://api.habino.ir/v1/invoices \
              <br />
              &nbsp;&nbsp;-H <span className="text-emerald-300">"Authorization: Bearer {currentActiveKey}"</span> \
              <br />
              &nbsp;&nbsp;-H <span className="text-emerald-300">"Content-Type: application/json"</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: WEBHOOKS ==================== */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600" />
                گیت‌وی وب‌هوک‌های امن با امضای رمزنگاری HMAC SHA-256
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                اطلاع‌رسانی بلادرنگ رویدادهای صدور فاکتور، تسویه چک، کسری انبار و برنده شدن در مناقصات به سرورهای خارجی.
              </p>
            </div>
            <button
              onClick={() => setShowNewWebhookModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              افزودن وب‌هوک جدید
            </button>
          </div>

          {/* Webhook Endpoints Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.map(hook => (
              <div key={hook.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{hook.description}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-600 truncate max-w-xs">{hook.url}</span>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    فعال
                  </span>
                </div>

                {/* Subscribed events */}
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-1.5">رویدادهای مشترک‌شده:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hook.subscribedEvents.map(evt => (
                      <span
                        key={evt}
                        className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-indigo-200"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Secret Key */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-bold">کلید امضای رمزنگاری (Signing Secret):</span>
                    <code className="text-xs font-mono text-slate-700 truncate">{hook.secretKey}</code>
                  </div>
                  <button
                    onClick={() => handleCopy(hook.secretKey, hook.secretKey)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="کپی کلید امضا"
                  >
                    {copiedId === hook.secretKey ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Test Trigger Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    ارسال موفق: <span className="font-bold text-slate-800 font-mono">{hook.totalDeliveries}</span>
                  </div>
                  <button
                    onClick={() => handleTriggerTestWebhook(hook)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    ارسال رویداد تستی
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Webhook Delivery Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                تاریخچه و لاگ تحویل وب‌هوک‌ها (Webhook Delivery Logs)
              </h3>
              <span className="text-xs text-slate-500">نمایش آخرین رویدادهای پردازش‌شده</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">رویداد (Event)</th>
                    <th className="py-3 px-4">آدرس مقصد</th>
                    <th className="py-3 px-4">زمان ارسال</th>
                    <th className="py-3 px-4">تأخیر (Latency)</th>
                    <th className="py-3 px-4">امضای HMAC</th>
                    <th className="py-3 px-4 text-center">مشاهده داده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {webhookLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            log.statusCode === 200
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.statusCode === 200 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {log.statusCode} OK
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{log.event}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-xs">{log.endpointUrl}</td>
                      <td className="py-3 px-4 text-slate-500">{log.timestamp}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-bold">{log.latencyMs}ms</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[10px] truncate max-w-[120px]" title={log.signature}>
                        {log.signature}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        >
                          بررسی JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: INTEGRATION BRIDGES ==================== */}
      {activeTab === 'bridges' && (
        <div className="space-y-6">
          {/* WooCommerce Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                  WOO
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">پل اتصال خودکار ووکامرس (WooCommerce Sync Bridge)</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    صدور آنی فاکتور رسمی هابینو به محض ثبت سفارش تکمیل‌شده، کسر لحظه‌ای انبار و ایجاد سند در دفتر کل.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSimulateWooCommerceOrder}
                disabled={simulatingWooOrder}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${simulatingWooOrder ? 'animate-spin' : ''}`} />
                {simulatingWooOrder ? 'در حال شبیه‌سازی...' : 'تست شبیه‌سازی سفارش از ووکامرس'}
              </button>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  قطعه کد افزونه وردپرس (PHP Hook) جهت درج در functions.php
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      generateWooCommerceBridgeSnippet(
                        'https://api.habino.ir/v1/integrations/woocommerce',
                        'whsec_e4b8a2c1d0f3e6a9c7b5d1f8e2a4c6b8',
                        currentActiveKey
                      ),
                      'php_snippet'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800"
                >
                  {copiedId === 'php_snippet' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  کپی تمام اسکریپت PHP
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl font-mono text-xs text-slate-300 overflow-x-auto max-h-72 border border-slate-800">
                <pre>
                  {generateWooCommerceBridgeSnippet(
                    'https://api.habino.ir/v1/integrations/woocommerce',
                    'whsec_e4b8a2c1d0f3e6a9c7b5d1f8e2a4c6b8',
                    currentActiveKey
                  )}
                </pre>
              </div>
            </div>
          </div>

          {/* Legacy Accounting Bridges (Sepidar / Hooloo) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                  سپیدار
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">خروجی سازگار با سپیدار همکاران سیستم</h3>
                  <p className="text-xs text-slate-500">فرمت استاندارد XML/Excel جهت انتقال اسناد دوره مالی</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                انتقال مستقیم کدهای معین، تفصیلی، فاکتورهای فروش و اسناد دفتر روزنامه هابینو به نرم‌افزار حسابداری سپیدار بدون نیاز به ثبت دستی مجدد.
              </p>
              <button
                onClick={() => alert('فایل استاندارد اسناد سپیدار با موفقیت در قالب JSON/Excel تولید گردید.')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                تولید خروجی اسناد معین و تفصیلی سپیدار
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                  POS
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">پل پایانه‌های فروشگاهی و دستگاه‌های کارتخوان (POS)</h3>
                  <p className="text-xs text-slate-500">اتصال به PSPهای سداد، به‌پرداخت، سامان‌کیش و آسان‌پرداخت</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ارسال خودکار مبلغ فاکتور به دستگاه کارتخوان با وب‌هوک محلی یا سوکت شبکه و تسویه آنی سند پس از دریافت کد پیگیری شاپرک.
              </p>
              <button
                onClick={() => alert('وب‌هوک شنونده کارتخوان فروشگاهی فعال شد و روی پورت محلی آماده دریافت است.')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                پیکربندی وب‌هوک محلی کارتخوان (Local POS Bridge)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: GUILD PLUGINS & SANDBOX ==================== */}
      {activeTab === 'plugins' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                مارکت‌پلیس و ساندباکس افزونه‌های تخصصی اصناف (Guild App Store)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تزریق فیلدهای سفارشی JSONB و فرمول‌های محاسباتی اختصاصی به فاکتورها، انبارداری و صورت‌های مالی اصناف مختلف.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              ساندباکس ایزوله و کامپایل‌شده
            </span>
          </div>

          {/* Plugin Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plugins.map(plugin => {
              const IconComp =
                plugin.guildCategory === 'gold_jewelry'
                  ? Coins
                  : plugin.guildCategory === 'civil_contracting'
                  ? Hammer
                  : plugin.guildCategory === 'real_estate'
                  ? Building
                  : Wrench;

              return (
                <div
                  key={plugin.id}
                  className={`bg-white rounded-3xl p-6 border transition-all space-y-4 ${
                    plugin.active ? 'border-purple-300 shadow-md ring-1 ring-purple-200' : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          plugin.active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{plugin.title}</h3>
                        <span className="text-[11px] text-purple-700 font-bold">{plugin.guildNamePersian}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePlugin(plugin.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                        plugin.active
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {plugin.active ? 'فعال روی فاکتورها' : 'غیرفعال (کلیک برای فعال‌سازی)'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{plugin.description}</p>

                  {/* Schema Preview */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 block">فیلدهای تزریق‌شده به JSONB فاکتور:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plugin.jsonbSchema.map(field => (
                        <span
                          key={field.fieldKey}
                          className="bg-white border border-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md"
                          title={field.labelPersian}
                        >
                          {field.fieldKey} ({field.labelPersian})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Formula Description */}
                  <div className="text-[11px] text-slate-500 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl leading-relaxed">
                    <span className="font-bold text-amber-900 block mb-0.5">فرمول محاسباتی صنف:</span>
                    {plugin.calculationFormulaDescription}
                  </div>

                  {/* Test in Sandbox Button */}
                  <button
                    onClick={() => {
                      setActivePluginTestId(plugin.id);
                      if (plugin.id === 'plugin-gold') {
                        setPluginTestInputs({
                          goldWeightGrams: 15,
                          caratType: 'عیار ۱۸ (۷۵۰)',
                          makingFeePercent: 18,
                          goldLivePricePerGram: 4350000
                        });
                      } else if (plugin.id === 'plugin-construction') {
                        setPluginTestInputs({
                          overheadFactor: 1.3,
                          deductInsurance38: true,
                          deductGoodPerformance: true
                        });
                      } else if (plugin.id === 'plugin-real-estate') {
                        setPluginTestInputs({
                          dealType: 'رهن و اجاره آپارتمان',
                          depositAmount: 600000000,
                          monthlyRent: 18000000
                        });
                      }
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    تست زنده فرمول در ماشین‌حساب ساندباکس
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Plugin Sandbox Runner */}
          {activePluginTestId && (
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-purple-500/40 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Sliders className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="font-black text-lg">ماشین‌حساب زنده ساندباکس صنف:</h3>
                    <span className="text-xs text-purple-300">
                      {plugins.find(p => p.id === activePluginTestId)?.title}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono bg-purple-950 text-purple-300 px-3 py-1 rounded-full border border-purple-800">
                  Sandboxed Engine v2.4
                </span>
              </div>

              {/* Dynamic Inputs based on Plugin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {plugins
                  .find(p => p.id === activePluginTestId)
                  ?.jsonbSchema.map(field => (
                    <div key={field.fieldKey} className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">
                        {field.labelPersian}
                        {field.unit && <span className="text-slate-400 mr-1 font-normal">({field.unit})</span>}
                      </label>
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={pluginTestInputs[field.fieldKey] ?? field.defaultValue}
                          onChange={e =>
                            setPluginTestInputs({
                              ...pluginTestInputs,
                              [field.fieldKey]: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-purple-400 outline-none"
                        />
                      )}
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={pluginTestInputs[field.fieldKey] ?? field.defaultValue}
                          onChange={e =>
                            setPluginTestInputs({
                              ...pluginTestInputs,
                              [field.fieldKey]: e.target.value
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 outline-none"
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          value={pluginTestInputs[field.fieldKey] ?? field.defaultValue}
                          onChange={e =>
                            setPluginTestInputs({
                              ...pluginTestInputs,
                              [field.fieldKey]: e.target.value
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 outline-none"
                        >
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === 'boolean' && (
                        <div className="pt-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={pluginTestInputs[field.fieldKey] ?? field.defaultValue}
                              onChange={e =>
                                setPluginTestInputs({
                                  ...pluginTestInputs,
                                  [field.fieldKey]: e.target.checked
                                })
                              }
                              className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700"
                            />
                            <span>فعال</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Calculation Output Preview */}
              {(() => {
                const activePlugin = plugins.find(p => p.id === activePluginTestId);
                if (!activePlugin) return null;
                const result = activePlugin.sampleCalculation(50000000, pluginTestInputs);

                return (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400">خروجی نهایی محاسبه شده توسط فرمول صنف:</span>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        {result.adjustedAmount.toLocaleString('fa-IR')} تومان
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>
                        مالیات محاسبه‌شده: <span className="font-bold text-white font-mono">{result.taxAmount.toLocaleString('fa-IR')}</span> تومان
                      </div>
                      <div>
                        کسورات قانونی: <span className="font-bold text-rose-400 font-mono">{result.deductions.toLocaleString('fa-IR')}</span> تومان
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 space-y-1">
                      {result.notes.map((n, i) => (
                        <div key={i} className="text-slate-400 text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: API EXPLORER & CODE GENERATOR ==================== */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-600" />
                کاوشگر تعاملی و آزمایشگاه تست API (Interactive API Console)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تست و فراخوانی بلادرنگ اندپوینت‌های تجاری هابینو به همراه تولید خودکار کد به ۴ زبان برنامه‌نویسی.
              </p>
            </div>

            {/* Endpoint Selector Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedMethod}
                onChange={e => setSelectedMethod(e.target.value as any)}
                className="bg-slate-100 border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded-xl px-3 py-2.5 outline-none"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>

              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono">
                <span className="text-slate-400 select-none">https://api.habino.ir/v1</span>
                <select
                  value={selectedEndpoint}
                  onChange={e => {
                    setSelectedEndpoint(e.target.value);
                    if (e.target.value === '/inventory') {
                      setSelectedMethod('GET');
                    } else if (e.target.value === '/invoices') {
                      setSelectedMethod('POST');
                    }
                  }}
                  className="bg-transparent text-blue-600 font-bold outline-none pr-1 flex-1"
                >
                  <option value="/invoices">/invoices (صدور فاکتور)</option>
                  <option value="/inventory">/inventory (استعلام موجودی کالاها)</option>
                  <option value="/inventory/sync">/inventory/sync (همگام‌سازی انبار)</option>
                  <option value="/tenders/bids">/tenders/bids (ارسال پیشنهاد به مناقصه)</option>
                </select>
              </div>

              <button
                onClick={handleExecuteExplorerCall}
                disabled={isExecutingApiCall}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isExecutingApiCall ? 'animate-spin' : ''}`} />
                {isExecutingApiCall ? 'در حال ارسال...' : 'ارسال درخواست'}
              </button>
            </div>

            {/* Request Body Editor (for POST) */}
            {selectedMethod === 'POST' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>بدنه درخواست (Request Body - JSON):</span>
                  <span className="text-slate-400 font-mono text-[11px]">application/json</span>
                </label>
                <textarea
                  value={explorerRequestBody}
                  onChange={e => setExplorerRequestBody(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-xs bg-slate-950 text-emerald-400 p-4 rounded-2xl border border-slate-800 focus:border-blue-500 outline-none leading-relaxed"
                  dir="ltr"
                />
              </div>
            )}

            {/* Response Preview Box */}
            {explorerResponse && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">پاسخ سرور هابینو:</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        explorerResponse.status >= 200 && explorerResponse.status < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {explorerResponse.status} {explorerResponse.statusText}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Response Time: {explorerResponse.headers['x-response-time']}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 max-h-60" dir="ltr">
                  <pre>{JSON.stringify(explorerResponse.data, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Code Generation Section */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-600" />
                  کد نمونه تولیدشده بر اساس پارامترهای بالا:
                </h3>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['curl', 'nodejs', 'python', 'php'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                        codeLanguage === lang ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto" dir="ltr">
                <button
                  onClick={() => {
                    let parsed = {};
                    try {
                      parsed = JSON.parse(explorerRequestBody);
                    } catch (e) {}
                    handleCopy(
                      generateApiCodeSnippet(codeLanguage, selectedEndpoint, selectedMethod, currentActiveKey, parsed),
                      'generated_code'
                    );
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors"
                  title="کپی کد نمونه"
                >
                  {copiedId === 'generated_code' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <pre>
                  {(() => {
                    let parsed = {};
                    try {
                      parsed = JSON.parse(explorerRequestBody);
                    } catch (e) {}
                    return generateApiCodeSnippet(codeLanguage, selectedEndpoint, selectedMethod, currentActiveKey, parsed);
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE API KEY */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              تولید کلید دسترسی جدید API
            </h3>

            {!generatedKeyResult ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نام یا عنوان کاربری کلید:</label>
                  <input
                    type="text"
                    placeholder="مثال: وب‌سرویس فروشگاه وردپرس شعبه ۲"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">محیط کاربری:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewKeyEnv('live')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        newKeyEnv === 'live'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      عملیاتی (Live - hbn_live_)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewKeyEnv('test')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        newKeyEnv === 'test'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      تستی / سندباکس (Test - hbn_test_)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">سطوح دسترسی مجاز (Scopes):</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(Object.keys(scopeLabels) as ApiScope[]).map(sc => (
                      <label key={sc} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(sc)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewKeyScopes([...newKeyScopes, sc]);
                            } else {
                              setNewKeyScopes(newKeyScopes.filter(s => s !== sc));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="font-mono text-[11px] font-bold text-blue-700">{sc}</span>
                        <span className="text-slate-500 text-[11px]">({scopeLabels[sc]})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewKeyModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim() || newKeyScopes.length === 0}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                  >
                    تولید و ثبت کلید
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    کلید جدید با موفقیت ساخته شد!
                  </div>
                  <p className="text-xs text-emerald-700">
                    این کلید را کپی کرده و در محل امنی ذخیره کنید:
                  </p>
                  <div className="bg-white p-3 rounded-xl border border-emerald-300 font-mono text-xs text-slate-800 select-all break-all">
                    {generatedKeyResult.key}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowNewKeyModal(false);
                    setGeneratedKeyResult(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  بستن و بازگشت به لیست
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE WEBHOOK */}
      {showNewWebhookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-indigo-600" />
              افزودن وب‌هوک مقصد جدید
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">آدرس اینترنتی دریافت وب‌هوک (Endpoint URL):</label>
                <input
                  type="url"
                  placeholder="https://yourdomain.com/api/habino-webhook"
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-indigo-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">توضیحات یا عنوان سامانه دریافت‌کننده:</label>
                <input
                  type="text"
                  placeholder="مثال: سرور مرکزی انبارداری و فروشگاه"
                  value={newWebhookDesc}
                  onChange={e => setNewWebhookDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">رویدادهای مورد نظر جهت ارسال (Events):</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {[
                    { id: 'invoice.created', label: 'صدور فاکتور جدید' },
                    { id: 'invoice.paid', label: 'تسویه و پرداخت فاکتور' },
                    { id: 'inventory.low_stock', label: 'هشدار کسری موجودی کالا در انبار' },
                    { id: 'tender.awarded', label: 'برنده شدن در مناقصه صنفی' },
                    { id: 'check.due', label: 'سررسید موعد چک صیادی' }
                  ].map(item => (
                    <label key={item.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={newWebhookEvents.includes(item.id as any)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewWebhookEvents([...newWebhookEvents, item.id as any]);
                          } else {
                            setNewWebhookEvents(newWebhookEvents.filter(x => x !== item.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span className="font-mono text-indigo-700 font-bold">{item.id}</span>
                      <span className="text-slate-500">({item.label})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewWebhookModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleCreateWebhook}
                  disabled={!newWebhookUrl.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  ثبت وب‌هوک
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW WEBHOOK LOG PAYLOAD */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base text-slate-900">
                  جزئیات پی‌لود ارسالی رویداد ({selectedLog.event})
                </h3>
              </div>
              <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
                Status: {selectedLog.statusCode} OK
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">آدرس مقصد:</span>
                <code className="text-xs font-mono text-slate-800">{selectedLog.endpointUrl}</code>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block">امضای اعتبارسنجی هدر (X-Habino-Signature):</span>
                <code className="text-[11px] font-mono text-purple-700 bg-purple-50 p-2 rounded-lg block break-all">
                  {selectedLog.signature}
                </code>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">پی‌لود ارسالی (JSON Body):</span>
                <div className="bg-slate-950 p-4 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto" dir="ltr">
                  <pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
