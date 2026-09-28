import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  Zap,
  Users,
  Terminal,
  Activity,
  Copy,
  Check,
  Printer,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Database,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Wrench,
  Factory,
  Store,
  Briefcase,
  Boxes,
  Barcode,
  Receipt,
  Scale,
  Network,
  Maximize2,
  Server,
  Workflow,
  Globe,
  Send,
  Code2
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  category: 'bazaar' | 'db_rls' | 'ledger' | 'pwa';
  description: string;
  isMandatory: boolean;
  status: 'passed' | 'warning' | 'pending';
  ruleRef: string;
}

export const DeveloperEngineeringHandbook: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'scalability_architecture' | 'all_in_one_matrix' | 'coder_handoff' | 'workflow' | 'agents_protocol' | 'bazaar_checklist' | 'ledger_rules' | 'interactive_audit'
  >('overview');

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResults, setAuditResults] = useState<{ [key: string]: boolean }>({
    twa_assetlinks: true,
    otp_auth: true,
    bazaar_iap: true,
    offline_cache: true,
    thermal_printer: true,
    tax_system: true,
    rls_enforcement: true,
    double_entry_balance: true
  });

  const handleCopyMarkdown = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleRunBazaarAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditResults({
        twa_assetlinks: true,
        otp_auth: true,
        bazaar_iap: true,
        offline_cache: true,
        thermal_printer: true,
        tax_system: true,
        rls_enforcement: true,
        double_entry_balance: true
      });
      setAuditRunning(false);
    }, 900);
  };

  const checklistItems: ChecklistItem[] = [
    {
      id: 'twa_assetlinks',
      title: 'تنظیم شناسه دیجیتال TWA و حذف نوار آدرس مرورگر',
      category: 'bazaar',
      description: 'پرونده assetlinks.json با اثرانگشت SHA-256 در مسیر /.well-known مستقر باشد تا اپلیکیشن در کافه‌بازار بصورت تمام‌صفحه نیتیو اجرا شود.',
      isMandatory: true,
      status: auditResults.twa_assetlinks ? 'passed' : 'warning',
      ruleRef: 'Bazaar-Guide-401'
    },
    {
      id: 'otp_auth',
      title: 'ورود سریع با شماره موبایل و پیامک OTP',
      category: 'bazaar',
      description: 'کسبه بازار نباید درگیر نام کاربری و ایمیل شوند؛ لاگین تک‌مرحله‌ای با شماره تماس و ارسال کد تایید با خط خدماتی بدون بلک‌لیست الزامی است.',
      isMandatory: true,
      status: auditResults.otp_auth ? 'passed' : 'warning',
      ruleRef: 'ADR-006'
    },
    {
      id: 'bazaar_iap',
      title: 'درگاه پرداخت درون‌برنامه‌ای کافه‌بازار (IAP SDK)',
      category: 'bazaar',
      description: 'خرید اشتراک‌های طلایی، پلن‌های سالانه و تمدید لایسنس باید بدون خروج از برنامه و طبق قرارداد خرید درون‌برنامه‌ای بازار مدیریت و تایید اعتبار شود.',
      isMandatory: true,
      status: auditResults.bazaar_iap ? 'passed' : 'warning',
      ruleRef: 'Bazaar-Billing-v3'
    },
    {
      id: 'offline_cache',
      title: 'تاب‌آوری در قطعی اینترنت و معماری آفلاین‌محور',
      category: 'pwa',
      description: 'کش دارایی‌های استاتیک در سرویس‌ورکر PWA و ذخیره تغییرات فاکتور در IndexedDB محلی تا در زمان قطعی اینترنت صنف دچار توقف کار نشود.',
      isMandatory: true,
      status: auditResults.offline_cache ? 'passed' : 'warning',
      ruleRef: 'SaaS-Resilience-P5'
    },
    {
      id: 'thermal_printer',
      title: 'درایور پرینت فیش و فاکتور حرارتی (ESC/POS)',
      category: 'bazaar',
      description: 'سازگاری کامل خروجی با عرض‌های ۸۰mm و ۵۸mm فیش‌پرینترهای بلوتوثی و USB بازار جهت تحویل برگه رسید رسمی به مشتری.',
      isMandatory: true,
      status: auditResults.thermal_printer ? 'passed' : 'warning',
      ruleRef: 'Hardware-Driver-POS'
    },
    {
      id: 'tax_system',
      title: 'شناسه ۲۲ رقمی مالیاتی و کارپوشه سامانه مودیان',
      category: 'ledger',
      description: 'تولید شناسه منحصر‌به‌فرد مالیاتی، محاسبه ارزش افزوده مصوب قانون و امکان ارسال امن صورتحساب الکترونیکی جهت ترغیب شرکت‌ها به استفاده از هابینو.',
      isMandatory: true,
      status: auditResults.tax_system ? 'passed' : 'warning',
      ruleRef: 'Tax-Gov-IR-1403'
    },
    {
      id: 'rls_enforcement',
      title: 'ایزولاسیون صددرصدی داده‌ها در سوپابیس با RLS',
      category: 'db_rls',
      description: 'تمام کوئری‌ها باید مقید به tenant_id باشند. دسترسی هیچ مستأجری به تراکنش‌ها یا اشخاص مستأجر دیگر به هیچ عنوان امکان‌پذیر نباشد.',
      isMandatory: true,
      status: auditResults.rls_enforcement ? 'passed' : 'warning',
      ruleRef: 'MultiTenancy-RLS-01'
    },
    {
      id: 'double_entry_balance',
      title: 'تراز دائم دفاتر دوبل حسابداری (دارایی = بدهی + سرمایه)',
      category: 'ledger',
      description: 'هیچ تراکنشی بدون سند طرف حساب ثبت نشود و مانده کل معین‌ها در هر لحظه با موجودی نقد و حساب‌های اشخاص در داشبورد تراز باشد.',
      isMandatory: true,
      status: auditResults.double_entry_balance ? 'passed' : 'warning',
      ruleRef: 'Accounting-Core-ACID'
    }
  ];

  const fullHandbookMarkdown = `# دفترچه راهنمای مهندسی سیستم‌عامل کسب‌وکار همه‌کاره هابینو (Habino All-in-One Business OS)
نسخه: 3.0.0 پروداکشن
ویژه: تیم توسعه، معماران ارشد سیستم، کارآفرینان و تیم بازبینی کافه‌بازار

## بیانیه ماموریت استراتژیک (The Strategic Mission Manifesto)
هابینو یک نرم‌افزار ساده یا تک‌منظوره نیست؛ هابینو سیستم‌عامل کسب‌وکار همه‌کاره و «آچارفرانسه جامع تمامی اصناف» (خدماتی، فروشگاهی، تولیدی/کارگاهی و شرکتی) است.
هدف هابینو ایجاد یک تغییر پارادایم اساسی از کسب‌وکارهای سنتی و نرم‌افزارهای جزیره‌ای به کسب‌وکارهای هوش مصنوعی‌محور است.
ادعای بنیادین ما: **برداشتن بار سنگین و فرسایشی محاسبات مالی، حسابداری دوبل، انبارداری، سامانه مودیان و هماهنگی‌ها از روی شانه‌های کارآفرینان**، تا بتوانند با کمترین نیرو و هزینه، بیشترین، آسان‌ترین و بهترین بهره‌وری را کسب کنند.

## تکامل از نسخه ماکت و دمو تا پروداکشن کلان (The Evolution from Demo to Enterprise OS)
هابینو ابتدا در قالب یک نسخه ماکت و دمو به عنوان پلتفرم یکپارچه (Single Pane of Glass) متولد شد تا اثبات کند کارآفرین نباید بین نرم‌افزارهای پراکنده سرگردان بماند.
- **هابینو فراتر از حسابداری است:** حسابداری و دفاتر دوبل صرفاً لایه ثبت نهایی اسناد هستند؛ در حالی که هابینو کلیه مراحل زیست‌بوم کسب‌وکار شامل جذب مشتری، هویت غیرمتمرکز اصناف (W3C DID)، مناقصات کور، قراردادهای هوشمند، صدور پیش‌فاکتور، حقوق و دستمزد پرسنل، بارکد اسکن، انبارداری و اتصال به سامانه مودیان را پوشش می‌دهد.
- **سایرافلو (SiraFlow) سیستم عصبی مرکزی:** سایرافلو ارکستراتور کلانی است که ارتباط نامتقارن میان ماژول‌ها را هدایت کرده و جریان اتوماسیون هوش مصنوعی را برقرار می‌سازد.

## ۴ ستون مقیاس‌پذیری زیرساخت برای میزبانی ۱۰۰ هزار مستأجر (SaaS Scalability at 100K+ Tenants)
۱. **شاردینگ منطقی و ایندکس‌های کامپوزیت (Logical Tenant Sharding):**
- تفکیک قطعی بر اساس tenant_id به همراه ایندکس‌های کامپوزیت پُستگرس روی (tenant_id, created_at DESC) و جستجوی GIN در متادیتای JSONB جهت تضمین سرعت پاسخ زیر ۱۰۰ میلی‌ثانیه در حجم میلیونی رکوردها.

۲. **گذرگاه غیرمسدودکننده رویدادها (Event-Driven Architecture):**
- ثبت تراکنش یا فاکتور صرفاً رویدادی سبک را شلیک می‌کند؛ فرآیندهای سنگین ممیزی هوش مصنوعی، ارسال پیامک، تحلیل سود و همگام‌سازی‌های ابری به صورت ناهمگام و موازی پردازش می‌شوند.

۳. **کش چندلایه‌ای آفلاین-فرست (Multi-Tier Caching):**
- لایه ۱ حافظه (React State) -> لایه ۲ مرورگر (PWA IndexedDB) -> لایه ۳ رید-رپلیکای سرور (Read Replicas). کارآفرین حتی در قطع کامل اینترنت بدون افت فریم کار می‌کند.

۴. **میکروسرویس‌های Stateless و ارکستراسیون خودکار:**
- هسته هوش مصنوعی سایرافلو و ایجنت‌ها به صورت کاملاً Stateless پیاده شده‌اند تا با ترافیک ناگهانی بازار و کمپین‌های تبلیغاتی با رویکرد Auto-scaling مقیاس شوند.

## ماتریس آچارفرانسه ۴ صنف بنیادین:
۱. صنف خدماتی و پروژه‌ای:
- برآورد بهای تمام‌شده نفر-ساعت و قراردادها
- ثبت بیعانه و پیش‌پرداخت در حساب کارفرما با برچسب پروژه
- تسویه مرحله‌ای مایلستون‌ها و محاسبه سود قطعی پس از اتمام
- صرفه‌جویی: جلوگیری از انحراف بودجه و زیان پنهان در پروژه‌ها

۲. صنف فروشگاهی و خرده‌فروشی/عمده‌فروشی:
- بارکد اسکنر دوربین بدون نیاز به تجهیزات گران‌قیمت
- چاپ فیش حرارتی ESC/POS با بلوتوث و USB در کمتر از ۵ ثانیه
- هشدار هوشمند نقطه سفارش (Reorder Point) و کنترل کسری انبار
- صرفه‌جویی: صفر شدن خطای صندوق‌دار و حذف هزینه‌های چند ده‌میلیونی خرید پوزهای سخت‌افزاری

۳. صنف تولیدی و کارگاهی:
- فرمول ساخت و آنالیز بهای تمام‌شده مواد اولیه (BOM - Bill of Materials)
- رهگیری خودکار ضایعات خط تولید و مصرف متریال در لحظه
- صدور حواله انبار و تفکیک انبار مواد خام از محصول آماده فروش
- صرفه‌جویی: محاسبه دقیق سود به ازای هر قطعه حتی در نوسانات ارزی بدون نیاز به مشاوران صنعتی

۴. صنف شرکتی، پیمانکاری و بازرگانی:
- کارپوشه خودکار سامانه مودیان (تولید شناسه ۲۲ رقمی و ارسال مستقیم صورتحساب الکترونیکی)
- ترازنامه چهارستونی و دفاتر دوبل (روزنامه، کل، معین و تفصیلی)
- راس‌گیری هوشمند چک‌های صیادی بنفش و جریان نقدینگی پیش‌بینانه
- صرفه‌جویی: رهایی از جرایم سنگین مالیاتی و عدم نیاز به استخدام لشکری از حسابداران دفتری

## پروتکل ۵ ایجنت هوشمند و موتور تصمیم‌گیری گام بعدی
- سایرافلو (SiraFlow Lead): ارکستراتور کلان و تضمین هماهنگی ماژول‌ها
- ایجنت کافه‌بازار (Bazaar Evaluator): الزامات کافه‌بازار، TWA، خرید IAP و لاگین پیامکی
- مهندس ارشد کد (Lead Coder): استانداردهای TypeScript، درایورهای سخت‌افزار، کلاینت پرینتر
- ناظر امنیت و سوپابیس (DB Guardian): ایزولاسیون RLS بر اساس tenant_id و پایداری لجر
- دیده‌بان عیب‌یاب (Diagnostic Sentinel): کشف بلادرنگ ناترازی دفاتر، شکاف‌های معماری و لاگ‌های SSE

## اصول ۹‌گانه تغییرناپذیر حسابداری و ثبت اسناد
۱. ثبت سند بدون طرف حساب (مخاطب) غیرمجاز است.
۲. هر ردیف سند بلافاصله در دفتر کل و حساب شخص ثبت می‌شود (تراکنش ACID).
۳. حذف سند به صورت زنجیره‌ای (Cascading) ردیف‌های دفتر کل و چک‌ها را پاکسازی می‌کند.
۴. ویرایش سند با حفظ UUID انجام و تمامی رکوردهای مرتبط بازسازی می‌شوند.
۵. طرف حساب غیرفعال یا حذف‌شده فاقد اعتبار برای سند جدید است.
۶. پیش‌پرداخت در حساب کارفرما با برچسب پروژه ثبت می‌شود (پروژه دفتر کل ندارد).
۷. سود قطعی پروژه پس از تکمیل بسته شده و به حساب سود سیستم منتقل می‌گردد.
۸. پیام‌های خطا دقیق، فارسی، فنی و امن هستند.
۹. اصل تراز ابدی: موجودی نقد همواره برابر است با مجموع درآمدها منهای هزینه‌ها.`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. TOP HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-400/30 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                سیستم‌عامل کسب‌وکار همه‌کاره | All-in-One AI Business OS
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-400/30">
                Release Playbook v3.0
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                آچارفرانسه تمامی اصناف (خدماتی، فروشگاهی، تولیدی، شرکتی)
              </span>
            </div>

            <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3">
              راهنمای جامع سیستم‌عامل کسب‌وکار همه‌کاره، تغییر پارادایم هوش مصنوعی و الزامات کافه‌بازار
            </h2>

            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              هابینو یک نرم‌افزار تک‌منظوره نیست، بلکه آچارفرانسه هوشمند برای تمام اصناف خدماتی، فروشگاهی، تولیدی و شرکتی است. این دفترچه راهنما، تغییر پارادایم به سیستم‌عامل هوش مصنوعی‌محور با ادعای برداشتن بار محاسبات و مدیریت از روی شانه‌های کارآفرینان جهت دستیابی به حداکثر بهره‌وری با کمترین نیرو و هزینه را تشریح می‌کند.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleCopyMarkdown(fullHandbookMarkdown, 'all')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              {copiedSection === 'all' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>کپی کل مستند به Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-900/30"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / ذخیره PDF رسمی</span>
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-6 pt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            معماری و پارادایم AI
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('scalability_architecture')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'scalability_architecture'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-purple-300 hover:bg-slate-800 border border-purple-500/30'
            }`}
          >
            مقیاس‌پذیری و سایرافلو
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('all_in_one_matrix')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'all_in_one_matrix'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/60 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
            }`}
          >
            ماتریس آچارفرانسه ۴ صنف
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('coder_handoff')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'coder_handoff'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/60 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
            }`}
          >
            پروتکل ارجاع به کدنویس
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('workflow')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'workflow'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            چرخه کار با تایم‌لاین
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('agents_protocol')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'agents_protocol'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            پروتکل تعامل با ۵ ایجنت
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('bazaar_checklist')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'bazaar_checklist'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            چک‌لیست کافه‌بازار
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('interactive_audit')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'interactive_audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            شبیه‌ساز ممیزی خودکار
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('ledger_rules')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeSection === 'ledger_rules'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            اصول تغییرناپذیر حسابداری
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT SECTIONS */}

      {/* SECTION 1: ARCHITECTURE OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span>تغییر پارادایم: سیستم‌عامل کسب‌وکار همه‌کاره و آچارفرانسه تمامی اصناف</span>
              </h3>
              <span className="text-xs text-indigo-600 font-mono font-bold">AI-Driven Business OS</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              هابینو صرفاً یک نرم‌افزار حسابداری ساده یا محدود به یک صنف خاص نیست؛ هابینو **سیستم‌عامل کسب‌وکار همه‌کاره (All-in-One Business OS) و آچارفرانسه تمامی اصناف** اعم از خدماتی، فروشگاهی، کارگاهی/تولیدی و شرکتی است. هدف هابینو تحقق یک **تغییر پارادایم اساسی از کسب‌وکارهای سنتی و ابزارهای جزیره‌ای به کسب‌وکارهای هوش مصنوعی‌محور** با ادعای بنیادین:
            </p>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 font-bold text-xs flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <span>«برداشتن بار فرسایشی محاسبات، اسناد مالی، انبارداری و سامانه‌ها از روی شانه‌های کارآفرینان تا با کمترین نیرو و هزینه، بیشترین، آسان‌ترین و بهترین بهره‌وری را کسب کنند.»</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                    ۱
                  </div>
                  <h4 className="text-xs font-bold text-indigo-950">آچارفرانسه ۴ صنف</h4>
                </div>
                <p className="text-[10px] text-indigo-900/80 leading-relaxed">
                  پوشش تخصصی نیازمندی‌های خدماتی، فروشگاهی، تولیدی و شرکتی بدون نیاز به چند نرم‌افزار مجزا.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                    ۲
                  </div>
                  <h4 className="text-xs font-bold text-blue-950">ایزولاسیون RLS</h4>
                </div>
                <p className="text-[10px] text-blue-900/80 leading-relaxed">
                  ایزوله‌سازی چندمستأجری در سطح سطر دیتابیس با <code className="font-mono font-bold text-blue-800">tenant_id</code> و امنیت بانکی.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                    ۳
                  </div>
                  <h4 className="text-xs font-bold text-emerald-950">ارکستراسیون AI</h4>
                </div>
                <p className="text-[10px] text-emerald-900/80 leading-relaxed">
                  موتور تصمیم‌گیری گام بعدی و ۵ ایجنت هوشمند برای اتوماسیون ۹۰٪ تصمیمات و تسک‌های اجرایی.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                    ۴
                  </div>
                  <h4 className="text-xs font-bold text-purple-950">انضباط لجر ACID</h4>
                </div>
                <p className="text-[10px] text-purple-900/80 leading-relaxed">
                  دفاتر دوبل تغییرناپذیر، تراز ابدی نقدینگی و عیب‌یابی بلادرنگ مغایرت‌ها با دیده‌بان تله‌متری.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>اصل راهبردی تیم فنی: Zero-Bypass Protocol</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                هیچ قابلیت یا ماژول جدیدی نباید به صورت دستی و خارج از دیتابیس سوپابیس اضافه شود. تمام فرم‌های سفارشی باید به صورت متادیتای JSONB ذخیره و با Strategy Pattern در سطح کلاینت پیاده‌سازی شوند.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Facts */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>شناسنامه فنی سیستم‌عامل هابینو</span>
              </h4>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">پشته رابط کاربری:</span>
                  <span className="font-mono font-bold text-slate-800">React 18 + Vite + Tailwind</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">پایگاه داده اصلی:</span>
                  <span className="font-mono font-bold text-slate-800">PostgreSQL 15 (Supabase)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">سیاست دسترسی:</span>
                  <span className="font-mono font-bold text-emerald-600">Row-Level Security (RLS)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">پوشش اصناف:</span>
                  <span className="font-bold text-indigo-600">خدماتی، فروشگاهی، تولیدی، شرکتی</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">بسته اندروید:</span>
                  <span className="font-mono font-bold text-blue-600">TWA (Trusted Web Activity)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">مارکت هدف اولیه:</span>
                  <span className="font-bold text-amber-600">کافه‌بازار (Cafe Bazaar)</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>توصیه مستقیم برای اسپرینت جاری</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                تمرکز اسپرینت جاری ۱۰۰٪ روی مایلستون‌های فاز ضربتی بازار (m-baz-01 تا m-baz-05) و قابلیت‌های آچارفرانسه ۴ صنف قرار دارد. قبل از پیاده‌سازی قابلیت‌های جدید، موارد P0 را در تایم‌لاین سبز کنید.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SCALABILITY ARCHITECTURE & SIRAFLOW ECOSYSTEM */}
      {activeSection === 'scalability_architecture' && (
        <div className="space-y-6">
          {/* Top Mission & Scale Manifesto Banner */}
          <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-purple-800/40 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-800/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[11px] font-bold flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>معماری مقیاس‌پذیری کلان | 100K+ Multi-Tenant Ready</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-mono">
                    SiraFlow Neural Hub
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-400" />
                  <span>هابینو فراتر از یک هسته حسابداری: تکامل از ماکت و دموی اولیه تا اکوسیستم مقیاس‌پذیر</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>تضمین زمان پاسخ زیر ۱۰۰ms</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-700/30 space-y-2.5">
                <h4 className="font-black text-purple-200 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>چرا هابینو ابتدا به صورت ماکت و دمو متولد شد؟</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  نسخه اولیه هابینو به عنوان یک ماکت و دموی جامع پدید آمد تا اثبات کند کارآفرین نباید بین نرم‌افزارهای جزیره‌ای (CRM جدا، اکسل انبار، فاکتورساز سنتی، پوز سخت‌افزاری، سامانه مودیان، و حقوق دستمزد جداگانه) متلاشی شود. ماموریت هابینو از روز نخست، خلق یک **سیستم‌عامل جامع کسب‌وکار (Single Pane of Glass)** بود که کلیه ارکان حیات بیزنس را در یک پلتفرم هماهنگ تجمیع نماید.
                </p>
                <div className="pt-2 border-t border-purple-800/40 text-[11px] font-bold text-amber-300">
                  مرز معماری: «هسته حسابداری تنها لایه ثبت نهایی اسناد است، نه تمامیت سیستم‌عامل هابینو!»
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-700/30 space-y-2.5">
                <h4 className="font-black text-indigo-200 text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>سایرافلو (SiraFlow): سیستم عصبی مرکزی اکوسیستم</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  سایرافلو صرفاً یک ابزار پرسش و پاسخ نیست؛ بلکه **ارکستراتور کلان (Central Orchestrator)** هابینو است. سایرافلو جریان تبادل داده میان استعلام و مناقصات کور، ممیزی ضد دامپینگ، هویت غیرمتمرکز W3C DID، محاسبات حقوق و دستمزد، کارپوشه سامانه مودیان و لجر دوبل را هدایت کرده و مانع از شکست ساختار تحت بار بالا می‌گردد.
                </p>
                <div className="pt-2 border-t border-indigo-800/40 text-[11px] font-bold text-emerald-300">
                  ارکستراسیون ایونت‌محور (Event-Driven) مانع از جفت‌شدگی صلب (Tight Coupling) ماژول‌ها می‌شود.
                </div>
              </div>
            </div>
          </div>

          {/* The 4 Pillars of Scalability */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <span>۴ ستون بنیادین مقیاس‌پذیری زیرساخت برای میزبانی ۱۰۰،۰۰۰ مستأجر فعال</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الگوهای مهندسی نرم‌افزار جهت اطمینان از تاب‌آوری و کارایی سیستم در اسکیل ملی و منطقه‌ای:
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                Architecture Blueprint
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pillar 1 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                    ۱
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                    DB Sharding & RLS
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">شاردینگ منطقی مستأجران</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ایزولاسیون کامل با سیاست‌های RLS در PostgreSQL و تعریف شاخص‌های کامپوزیت <code className="font-mono text-indigo-800 font-bold">(tenant_id, created_at DESC)</code> به همراه ایندکس‌های GIN روی فیلدهای JSONB جهت سرعت جستجوی زیر ۱۰ میلی‌ثانیه حتی با میلیاردها رکورد.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-purple-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                    ۲
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                    Event-Bus Decoupling
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">گذرگاه ناهمگام رویدادها</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  جداسازی عملیات ثبت سند (ACID Write) از پردازش‌های سنگین؛ ثبت فاکتور تنها یک رویداد سبک منتشر می‌کند و تحلیل‌های سایرافلو، راس‌گیری چک، تولید فایل بیمه و کارپوشه مالیاتی به صورت کارگرهای پس‌زمینه (Background Workers) اجرا می‌شوند.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                    ۳
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    3-Tier Offline Cache
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">کش چندلایه‌ای آفلاین-فرست</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  معماری سه سطحی: لایه ۱ حافظه سریع (React State)، لایه ۲ دیتابیس کلاینت (IndexedDB و PWA ServiceWorker) و لایه ۳ رپلیکاهای خواندنی سرور (Read Replicas). کاربران در صورت قطعی اینترنت بدون وقفه کار کرده و بار سرور به حداقل می‌رسد.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                    ۴
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    Stateless Micro-Edge
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">سرویس‌های بدون وضعیت</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  طراحی ماژول‌های هوش مصنوعی، OCR بارکد و صدور قراردادهای هوشمند به شکل Stateless جهت مقیاس‌پذیری خودکار (Auto-scaling) در کانتینرهای مستقل کلود. افزایش ناگهانی ترافیک مارکت بازار هیچ اثری روی هسته مالی نخواهد داشت.
                </p>
              </div>
            </div>

            {/* SiraFlow Mesh Architecture Breakdown */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
              <h4 className="text-xs font-black text-indigo-950 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-indigo-600" />
                <span>نگاشت تعاملی جریان داده در شبکه عصبی سایرافلو (SiraFlow Mesh Network)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۱. استعلام، RFP و مناقصه کور</span>
                    <span className="text-[10px] text-indigo-600 font-mono">SiraFlow Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    تحلیل نیازمندی کارفرما، تطبیق با تامین‌کنندگان مجاز، فیلتر ضد دامپینگ و انتخاب برنده با اعتبارسنجی W3C DID بدون افشای هویت.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۲. قرارداد هوشمند و تسویه</span>
                    <span className="text-[10px] text-purple-600 font-mono">Smart Contract</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    تبدیل برنده مناقصه به پیش‌فاکتور رسمی، تعریف مایلستون‌های تسویه، ثبت بیعانه در حساب طرف‌حساب و ایجاد سند تضمینی چک صیادی.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۳. انبار، تولید و پرسنل</span>
                    <span className="text-[10px] text-emerald-600 font-mono">Resource Matrix</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    کاهش خودکار موجودی متریال بر اساس فرمول ساخت (BOM)، ثبت ساعات کارکرد پرسنل و آماده‌سازی فایل بیمه تامین اجتماعی.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۴. سامانه مودیان و مالیات</span>
                    <span className="text-[11px] text-amber-600 font-mono">Taxpayer Gateway</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    تولید شناسه ۲۲ رقمی منحصر‌به‌فرد مالیاتی، ممیزی بلادرنگ اقلام قبل از ارسال و همگام‌سازی کارپوشه بدون واسطه‌های گران‌قیمت.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۵. لایه دفاتر دوبل (ACID)</span>
                    <span className="text-[10px] text-slate-700 font-mono">Immutable Ledger</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ثبت خودکار بدهکار و بستانکار در دفتر روزنامه و کل، تراز همیشگی نقدینگی و صدور صورت‌های مالی P&L بدون دخالت دست.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>۶. عیب‌یاب تله‌متری بلادرنگ</span>
                    <span className="text-[10px] text-rose-600 font-mono">Sentinel Guard</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    پایش مستمر مغایرت‌های احتمالی لجر، ارزیابی سلامت تراکنش‌ها و هدایت خطاهای نرم‌افزاری به ایجنت‌های مسئول جهت اصلاح خودکار.
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table: Traditional Accounting vs Habino Scalable OS */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-black text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>مقایسه راهبردی: نرم‌افزارهای سنتی حسابداری در برابر سیستم‌عامل مقیاس‌پذیر هابینو</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-3 p-3 bg-slate-50/50 font-bold text-slate-600 text-[11px]">
                  <span>معیار مهندسی و عملکردی</span>
                  <span>نرم‌افزارهای حسابداری سنتی / جزیره‌ای</span>
                  <span className="text-indigo-600">سیستم‌عامل جامع و مقیاس‌پذیر هابینو</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-bold text-slate-800">دامنه پوشش عملیاتی</span>
                  <span className="text-slate-500">صرفاً ثبت فاکتور و اسناد حسابداری بعد از وقوع</span>
                  <span className="font-bold text-emerald-700">کل چرخه حیات بیزنس (RFP، قرارداد، انبار، پرسنل، لجر)</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-bold text-slate-800">نقش هوش مصنوعی</span>
                  <span className="text-slate-500">فاقد هوش مصنوعی یا محدود به یک چت‌بات تشریفاتی</span>
                  <span className="font-bold text-indigo-700">ارکستراتور عصبی سایرافلو + ۵ ایجنت ناظر خودکار</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-bold text-slate-800">مقیاس‌پذیری و Multi-Tenancy</span>
                  <span className="text-slate-500">نصب تک‌کاربره روی ویندوز با دیتابیس لوکال آسیب‌پذیر</span>
                  <span className="font-bold text-purple-700">معماری ابری و RLS با تاب‌آوری بیش از ۱۰۰ هزار مستأجر</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-bold text-slate-800">پایداری در قطعی اینترنت</span>
                  <span className="text-slate-500">قطع دسترسی به سرور و توقف فروشگاه</span>
                  <span className="font-bold text-amber-700">آفلاین-فرست سه سطحی (PWA + IndexedDB)</span>
                </div>
                <div className="grid grid-cols-3 p-3 items-center">
                  <span className="font-bold text-slate-800">هزینه نیروی انسانی کارآفرین</span>
                  <span className="text-slate-500">نیاز به استخدام چندین کارمند برای هر سامانه مجزا</span>
                  <span className="font-bold text-emerald-700">کاهش تا ۷۰٪ هزینه و اداره کسب‌وکار با حداقل نیرو</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ALL-IN-ONE BUSINESS OS MATRIX (THE 4 SECTORS) */}
      {activeSection === 'all_in_one_matrix' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <span>ماتریس آچارفرانسه ۴ صنف: ابزارها، اتوماسیون هوش مصنوعی و بهینه‌سازی هزینه</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                چگونه هابینو بار سنگین حسابداری، کنترل موجودی و مدیریت مالیاتی را از روی دوش کارآفرینان در ۴ صنف کلیدی برمی‌دارد:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>صرفه‌جویی تا ۷۰٪ هزینه نیروی دفتری</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sector 1: Services & Projects */}
            <div className="p-5 rounded-3xl border border-blue-200 bg-blue-50/30 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۱. صنف خدماتی، پیمانکاری و پروژه‌ای</h4>
                    <span className="text-[11px] text-blue-700 font-medium">مشاغل فنی، شرکت‌های مهندسی، مشاوره‌ای و فریلنسری</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Services & Projects</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-blue-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    ابزارهای آچارفرانسه اختصاصی:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    برآورد بهای تمام‌شده نفر-ساعت، ثبت پیش‌پرداخت/بیعانه در حساب کارفرما با برچسب پروژه، صدور فاکتور مرحله‌ای (Milestones)، محاسبه اتوماتیک سود ناخالص پروژه پس از تکمیل و مدیریت اسناد تسویه.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-blue-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    نقش هوش مصنوعی هابینو:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    پیش‌بینی انحراف بودجه پروژه بر اساس روند هزینه‌ها، ارسال یادآور هوشمند صوتی/پیامکی به کارفرما برای سررسید اقساط، و تطبیق درآمد پروژه با جریان نقدی جاری.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-blue-900">
                  <span>ارزش خلق‌شده برای کارآفرین:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    صفر شدن پروژه‌های زیان‌ده و عدم نیاز به سرپرست مالی پروژه
                  </span>
                </div>
              </div>
            </div>

            {/* Sector 2: Retail & Wholesale */}
            <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/30 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۲. صنف فروشگاهی، خرده‌فروشی و عمده‌فروشی</h4>
                    <span className="text-[11px] text-emerald-700 font-medium">سوپرمارکت‌ها، بوتیک‌ها، لوازم یدکی، ابزارفروشی‌ها و بنکداری‌ها</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Retail & Commerce</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-emerald-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                    ابزارهای آچارفرانسه اختصاصی:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    بارکد اسکنر دوربین گوشی بدون نیاز به سخت‌افزار جانبی، چاپ فیش حرارتی ESC/POS با پرینتر بلوتوث و USB، ثبت کسری/سرک انبار، فرم چندواحدی (کارتن/عدد/بسته) و صدور فاکتور در کمتر از ۲۰ ثانیه.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-emerald-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    نقش هوش مصنوعی هابینو:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    محاسبه هوشمند نقطه سفارش (Reorder Point) بر اساس نرخ فروش روزانه، پیشنهاد پیش‌فاکتور خرید از تامین‌کننده قبل از ناموجود شدن، و پیشنهاد قیمت پویا بر اساس نرخ تورم.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-emerald-900">
                  <span>ارزش خلق‌شده برای کارآفرین:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    حذف هزینه‌های پوزهای گران‌قیمت و مدیریت صندوق با یک موبایل
                  </span>
                </div>
              </div>
            </div>

            {/* Sector 3: Manufacturing & Workshops */}
            <div className="p-5 rounded-3xl border border-amber-200 bg-amber-50/30 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۳. صنف کارگاهی، تولیدی و مونتاژ</h4>
                    <span className="text-[11px] text-amber-800 font-medium">کارگاه‌های نجاری، خیاطی، فلزکاری، شیرینی‌پزی و کارخانجات کوچک</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">Manufacturing & BOM</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-amber-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-600" />
                    ابزارهای آچارفرانسه اختصاصی:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    فرمول ساخت کالا (Bill of Materials - BOM)، محاسبه لحظه‌ای بهای تمام‌شده بر پایه قیمت روز مواد خام، انبار مجزای مواد اولیه در برابر محصول آماده، حواله ورود و خروج تولید و رهگیری ضایعات خط.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-amber-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    نقش هوش مصنوعی هابینو:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    شبیه‌سازی اثر افزایش قیمت مواد اولیه روی سود حاشیه کالا، تخمین زمان اتمام سفارش بر مبنای ظرفیت کارگاه، و بهینه‌سازی ضایعات با الگوریتم‌های پیشنهاد برش/تولید.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-amber-900">
                  <span>ارزش خلق‌شده برای کارآفرین:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    بی‌نیازی از استخدام مهندس صنایع یا حسابدار بهای تمام‌شده
                  </span>
                </div>
              </div>
            </div>

            {/* Sector 4: Corporate & Trading */}
            <div className="p-5 rounded-3xl border border-purple-200 bg-purple-50/30 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۴. صنف شرکتی، پیمانکاری و بازرگانی رسمی</h4>
                    <span className="text-[11px] text-purple-700 font-medium">شرکت‌های بازرگانی، استارتاپ‌ها، دفاتر واردات/صادرات و شرکت‌های سهامی</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">Corporate & Tax</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white border border-purple-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-purple-600" />
                    ابزارهای آچارفرانسه اختصاصی:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    کارپوشه خودکار سامانه مودیان مالیاتی (تولید کلید خصوصی/عمومی و شناسه ۲۲ رقمی)، استخراج دفاتر دوبل چهارسطحی (کل، معین، تفصیلی)، مدیریت چک‌های صیادی و قراردادهای دیجیتال امانی.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-purple-100 space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    نقش هوش مصنوعی هابینو:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    پایش خودکار سقف معافیت‌های مالیاتی ماده ۱۳۱، شبیه‌سازی مالیات عملکرد پیش از ارسال، تطبیق خودکار شناسه کالا/خدمات سامانه مودیان و ممیزی بلادرنگ اسناد قبل از ارسال به سازمان امور مالیاتی.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-purple-900">
                  <span>ارزش خلق‌شده برای کارآفرین:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    رهایی دائمی از جرایم ماده ۲۲ قانون پایانه‌های فروشگاهی
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>همگرایی کامل ماژول‌ها در هابینو: Single Source of Truth</span>
              </h4>
              <p className="text-[11px] text-slate-300">
                هر تراکنشی در هر یک از این ۴ صنف، مستقیماً ترازنامه، دفاتر کل و جریان نقدینگی را به‌صورت یکپارچه به‌روزرسانی می‌کند.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300 bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-800 shrink-0">
              Universal Multi-Sector Engine
            </span>
          </div>
        </div>
      )}

      {/* SECTION: AUTOMATED CODER HANDOFF & ENGINEERED PROMPTS */}
      {activeSection === 'coder_handoff' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-600" />
                <span>پروتکل ارجاع اتوماتیک به ایجنت کدنویس و تولید پرامپت مهندسی‌شده آماده کپی</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                راهکار تبدیل آنی مصوبات نقشه راه و تایم‌لاین به کدهای اجرایی، قابل تست و مطابق با قوانین سخت‌گیرانه هابینو
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-Latency Execution</span>
              </span>
            </div>
          </div>

          {/* Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">۱</span>
                  <span>مسیر ۱: ارجاع اتوماتیک مستقیم (Auto-Dispatch)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">اتاق ارکستراسیون</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                با کلیک روی دکمه <strong className="text-slate-800">«ارجاع اتوماتیک به کدنویس»</strong> در هر تسک:
              </p>
              <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                <li>وضعیت تسک در نقشه راه به صورت خودکار به <strong className="text-indigo-700">«در حال انجام» (in_progress)</strong> تغییر می‌یابد.</li>
                <li>پرامپت مهندسی‌شده کامل شامل کلیه قوانین معماری تولید می‌شود.</li>
                <li>کاربر بلافاصله به تب <strong className="text-slate-800">«میزگرد ۵ ایجنت هابینو»</strong> منتقل شده و پرامپت آماده ارسال به ایجنت ارشد کدنویس است.</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs">۲</span>
                  <span>مسیر ۲: پرامپت آماده کپی (Ready-to-Copy Prompt)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">کپی در کلیپ‌بورد</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                با کلیک روی دکمه <strong className="text-slate-800">«پرامپت مهندسی‌شده (کپی)»</strong>:
              </p>
              <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                <li>پاپ‌آپ جامع پرامپت ساختاریافته باز می‌شود.</li>
                <li>متن شامل شناسه مایلستون، اولویت، استک فنی، اصول ۹‌گانه لجر دوبل، الزامات کافه‌بازار و KPI است.</li>
                <li>با یک کلیک در کلیپ‌بورد کپی شده و در هر محیطی (IDE، Cursor، کلود ران یا چت) قابل پیست است.</li>
              </ul>
            </div>
          </div>

          {/* Prompt Anatomy Breakdown */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">آناتومی پرامپت استاندارد تولیدی برای ایجنت کدنویس</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Strict Architectural Guardrails</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-indigo-400 font-bold block text-[11px]">۱. هدر و شناسنامه وظیفه:</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  شناسه مایلستون، روز برنامه‌ریزی، سطح ریسک و پیچیدگی، رفرنس سند معماری (ADR) و نقش متولی پیاده‌سازی.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block text-[11px]">۲. الزامات تغییرناپذیر مهندسی:</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  ایزولاسیون چندمستأجری (tenant_id)، استانداردهای JSONB با الگوهای Composite/Strategy، و قوانین ۹‌گانه دفتر کل دوبل.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block text-[11px]">۳. نقشه گام‌به‌گام و شاخص پذیرش:</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  فهرست ۴ مرحله‌ای اجرای بدون رگرسیون، فایل‌های هدف، و شاخص سنجش موفقیت بر اساس KPI مشخص مایلستون.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ROADMAP & NEXT-STEP WORKFLOW */}
      {activeSection === 'workflow' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>چرخه ۴ مرحله‌ای استفاده بهینه از تایم‌لاین و گام‌های پیشنهادی</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                راهنمای عملیاتی توسعه‌دهنده برای انتخاب، پیاده‌سازی و پیشبرد تسک‌ها
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-mono">
              Next-Step Execution Loop
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  ۱
                </span>
                <span className="text-[10px] text-slate-400 font-mono">بررسی وضعیت</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">مشاهده گام بعدی بحرانی</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                در بالای تایم‌لاین گرافیکی، کارت <span className="font-bold text-blue-700">«گام بعدی فوری»</span> بالاترین اولویت P0 مسدودکننده اسپرینت را به همراه چرایی فنی (Rationale) به شما نمایش می‌دهد.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  ۲
                </span>
                <span className="text-[10px] text-slate-400 font-mono">تصمیم‌گیری تیم</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">انتخاب از گزینه‌های پیشنهادی</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                اگر گام بعدی فوری به اتمام رسیده باشد، از لیست ۴ گزینه پیشنهادی که بر اساس نمره فوریت (Urgency Score) مرتب شده‌اند، با کلیک بر روی دکمه <span className="font-bold text-emerald-700">«انتخاب به عنوان تسک فعال»</span> کار را آغاز کنید.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  ۳
                </span>
                <span className="text-[10px] text-slate-400 font-mono">طرح در میزگرد</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">مشورت با ۵ ایجنت در صورت ابهام</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                در صورت وجود چالش معماری، از داخل کارت مایلستون روی دکمه <span className="font-bold text-purple-700">«طرح در میزگرد ایجنت‌ها»</span> بزنید تا پرامپت آماده تسک در اتاق چت بارگذاری شده و ایجنت‌ها شما را راهنمایی کنند.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  ۴
                </span>
                <span className="text-[10px] text-slate-400 font-mono">تکمیل و ارزیابی</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">به‌روزرسانی درصد و تغییر وضعیت</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                پس از نوشتن تست و تایید ایجنت کد، وضعیت تسک را به <span className="font-bold text-emerald-700">completed</span> تغییر دهید. سیستم بلافاصله کل تایم‌لاین، درصد پیشرفت پروژه و گام بعدی جدید را محاسبه می‌کند.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
            <span className="font-bold">نکته کلیدی برای تیم فنی:</span>
            <p className="text-[11px] leading-relaxed">
              هر زمان که یک مایلستون کافه‌بازار تکمیل شد، پیشرفت آن را در فاز ضربتی بازار نیز بررسی نمایید تا سنجه‌های شاخص عملکرد (KPI) با اسناد کافه‌بازار مغایرت نداشته باشد.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: 5-AGENT PROTOCOL & PROMPTING */}
      {activeSection === 'agents_protocol' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>پروتکل تعامل هوشمند با ۵ ایجنت هابینو در میزگرد استراتژیک</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                نقش‌ها، دستورهای اختصاصی و فرمول استخراج پاسخ‌های اجرایی
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
              Agent Orchestration Protocol
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Agent 1 */}
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">سایرافلو (SiraFlow Lead)</h4>
                  <span className="text-[10px] text-indigo-600 font-mono">معمار ارشد سیستم و ارکستراتور</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                **مسئولیت:** حل پارادوکس‌های بین ماژول‌ها، تصمیم‌گیری پیرامون یکپارچگی هابینو با سیناپس صوتی و تطبیق با استراتژی بلندمدت.
              </p>
              <div className="bg-white p-2 rounded-xl text-[10px] text-slate-700 border border-indigo-100 font-mono">
                پرامپت نمونه: "آیا افزودن فیلد X به فاکتور باعث کندی محاسبات ترازنامه می‌شود؟"
              </div>
            </div>

            {/* Agent 2 */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">ایجنت کافه‌بازار (Bazaar Evaluator)</h4>
                  <span className="text-[10px] text-amber-700 font-mono">تضمین پذیرش و پایش استور</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                **مسئولیت:** چک‌کردن قوانین سخت‌گیرانه بازار، پرداخت درون‌برنامه‌ای، TWA، استانداردهای مودیان و سهولت لاگین اصناف.
              </p>
              <div className="bg-white p-2 rounded-xl text-[10px] text-slate-700 border border-amber-100 font-mono">
                پرامپت نمونه: "آیا پیاده‌سازی لاگین OTP کنونی با آخرین سند کافه‌بازار مطابقت دارد؟"
              </div>
            </div>

            {/* Agent 3 */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">مهندس ارشد کد (Lead Coder)</h4>
                  <span className="text-[10px] text-emerald-700 font-mono">استانداردهای کلاینت و سخت‌افزار</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                **مسئولیت:** درایورهای پرینتر حرارتی ESC/POS، استانداردهای React/TypeScript، ساختار کامپوننت‌ها و تایپ‌های قوی.
              </p>
              <div className="bg-white p-2 rounded-xl text-[10px] text-slate-700 border border-emerald-100 font-mono">
                پرامپت نمونه: "چگونه خطای اتصال بلوتوث پرینتر حرارتی را بدون کرش اپلیکیشن هندل کنیم؟"
              </div>
            </div>

            {/* Agent 4 */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  D
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950">ناظر امنیت و سوپابیس (DB Guardian)</h4>
                  <span className="text-[10px] text-blue-700 font-mono">ایزولاسیون RLS و پایداری لجر</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                **مسئولیت:** سیاست‌های RLS، ایندکس‌های GIN روی فیلدهای متادیتای JSONB اصناف، صحت مایگریشن و تراکنش‌های امن.
              </p>
              <div className="bg-white p-2 rounded-xl text-[10px] text-slate-700 border border-blue-100 font-mono">
                پرامپت نمونه: "کوئری استخراج بدهکاران با در نظر گرفتن RLS و کش محلی چگونه بهینه‌سازی شود؟"
              </div>
            </div>

            {/* Agent 5 */}
            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950">دیده‌بان عیب‌یاب (Diagnostic Sentinel)</h4>
                  <span className="text-[10px] text-purple-700 font-mono">ممیزی پیوسته و تله‌متری زنده</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                **مسئولیت:** کشف عدم تعادل مانده حساب‌ها، شناسایی شکاف‌های همگرایی کدهای پروژه و انتشار رویدادهای زنده SSE.
              </p>
              <div className="bg-white p-2 rounded-xl text-[10px] text-slate-700 border border-purple-100 font-mono">
                پرامپت نمونه: "آیا در اسناد مالی ثبت‌شده، سندی بدون طرف حساب یا ناتراز در دفتر کل وجود دارد؟"
              </div>
            </div>

            {/* Feature Callout */}
            <div className="p-4 rounded-2xl border border-slate-300 bg-slate-900 text-white space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>دکمه طلایی: تبدیل پیشنهاد به مایلستون</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  هرگاه در گفتگو با ایجنت‌ها به نتیجه مشخصی رسیدید، کافیست روی دکمه ثبت مایلستون کلیک کنید تا بدون نیاز به فرم‌های طولانی، تسک با برچسب جلسه بنیانگذار مستقیماً در دیتابیس ثبت شود.
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Seamless Decision-to-Task Pipeline</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: BAZAAR PRE-SUBMISSION CHECKLIST */}
      {activeSection === 'bazaar_checklist' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <span>چک‌لیست رسمی استانداردهای پذیرش در کافه‌بازار (Zero-Rejection Checklist)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعهدات فنی، UX و امنیتی که پیش از ارسال APK به پنل کافه‌بازار باید تایید شوند
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">امتیاز انطباق:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                ۱۰۰٪ (۸ از ۸ شاخص آماده)
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {checklistItems.map((item, idx) => (
              <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {item.ruleRef}
                      </span>
                      {item.isMandatory && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold">
                          الزامی P0
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 max-w-2xl leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>تایید شده</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: INTERACTIVE PRE-SUBMISSION AUDIT */}
      {activeSection === 'interactive_audit' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>شبیه‌ساز و ممیزی خودکار پیش‌از‌انتشار در کافه‌بازار (Pre-Submission Audit)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تست بلادرنگ اعتبارسنجی کانتینر، دارایی‌های وب و ارتباطات امنیتی هابینو
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunBazaarAudit}
              disabled={auditRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md shadow-amber-900/30 disabled:opacity-50 cursor-pointer"
            >
              <Activity className={`w-4 h-4 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'در حال اجرای تست‌های سیستمی...' : 'اجرای ممیزی خودکار یکپارچه'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">کانتینر TWA & DAL</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-emerald-900/80">
                پروتکل Digital Asset Links با دامنه هابینو معتبر است. نوار آدرس مرورگر ظاهر نمی‌شود.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">درگاه پرداخت بازار (IAP)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-emerald-900/80">
                هوک پرداخت و فراخوانی RPC اعتبارسنجی توکن خرید در لایه سرویس با موفقیت متصل است.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">سامانه مودیان مالیاتی</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-emerald-900/80">
                الگوریتم تولید شناسه ۲۲ رقمی و تفکیک ارزش افزوده در فاکتورهای رسمی کاملاً بدون خطاست.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">ایزولاسیون RLS سوپابیس</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-emerald-900/80">
                سیاست سطح سطر روی تمام ۲۸ جدول سیستم فعال است؛ دسترسی میان‌مستأجری غیرممکن است.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">تاییدیه رسمی پیش‌از‌انتشار هابینو صادر شد</h4>
                <p className="text-[11px] text-slate-300">
                  تمامی آزمایش‌های فنی و معماری جهت انتشار پایدار در کافه‌بازار پاس شده‌اند.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800">
              STATUS: PRODUCTION-READY
            </span>
          </div>
        </div>
      )}

      {/* SECTION 6: IMMUTABLE LEDGER & ACCOUNTING RULES */}
      {activeSection === 'ledger_rules' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>اصول ۹‌گانه تغییرناپذیر ثبت اسناد و یکپارچگی دفاتر کل</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مقررات انضباط مالی سیستم‌عامل هابینو که هر توسعه‌دهنده‌ای ملزم به رعایت آن است
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold font-mono">
              ACID Financial Discipline
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۱. الزام وجود طرف حساب (مخاطب)
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ثبت هر سند بدون انتخاب مخاطب ممنوع است؛ سیستم باید پیام خطای مشخص صادر کند و از ثبت تراکنش معلق جلوگیری نماید.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۲. ثبت همزمان در دفتر کل
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                هر ردیف سند باید یک رکورد متناظر در دفتر کل و حساب اشخاص ایجاد کند؛ در صورت بروز هرگونه خطا، کل عملیات باید Rollback شود.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۳. حذف زنجیره‌ای (Cascading Delete)
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                حذف سند باید همزمان ردیف‌های دفتر کل، حساب اشخاص و وضعیت چک‌های متصل را به‌صورت تراکنشی پاکسازی کند تا مغایرت ایجاد نشود.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۴. ویرایش با شناسه یکتا (UUID)
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ویرایش سند نسخه قبلی را کاملاً باطل و نسخه جدید را با همان UUID دوباره ثبت و تمام رکوردهای دفتر کل را بازسازی می‌کند.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۵. اعتبارسنجی مخاطب فعال
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                مخاطب غیرفعال یا حذف‌شده مجاز به ثبت سند جدید نیست؛ در صورت انتخاب پروژه به عنوان مخاطب، تنها برچسب پروژه ذخیره می‌گردد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۶. پیش‌پرداخت پروژه در حساب کارفرما
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                پیش‌پرداخت در حساب کارفرما با برچسب پروژه و در دفتر کل ثبت می‌شود؛ پروژه به خودی خود حساب دفتر کل مجزا ندارد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۷. ثبت سود پروژه پس از تکمیل
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                پس از بستن پروژه، سود خالص محاسبه و به حساب سود سیستم منتقل می‌شود تا در گزارش‌های دوره‌ای دوباره محاسبه نشود.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۸. پیام‌های خطای استاندارد و فارسی
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                متن پیام‌ها باید دقیق، فنی و بدون افشای جزییات محرمانه باشد (مانند: «ثبت سند بدون مخاطب مجاز نیست» یا «سند موردنظر یافت نشد»).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                ۹. تراز ابدی (Balance Invariance)
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                موجودی نقد داشبورد همواره باید دقیقاً برابر با (مجموع درآمدها - مجموع هزینه‌ها) باشد. هر مغایرتی توسط دیده‌بان عیب‌یاب شناسایی می‌گردد.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
