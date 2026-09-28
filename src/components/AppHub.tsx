import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  Layers,
  Users,
  Wrench,
  Landmark,
  FolderKanban,
  BookOpen,
  BarChart3,
  Activity,
  Bot,
  Compass,
  Settings as SettingsIcon,
  ArrowRight,
  ArrowLeftRight,
  Key,
  Database,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Fingerprint,
  Globe,
  Calculator,
  ScanLine,
  Cpu,
  FolderTree,
  Scale,
  Printer,
  Package
} from 'lucide-react';
import { useAccounting } from '../lib/store';
import { DEMO_VS_MARKET_COMPARISON } from '../lib/licenseEngine';

interface AppHubProps {
  onSelectModule: (moduleId: string) => void;
}

export const AppHub: React.FC<AppHubProps> = ({ onSelectModule }) => {
  const { license, activateMarketFullEdition } = useAccounting();
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [activationMsg, setActivationMsg] = useState<string | null>(null);

  const handleInstantMarketActivation = async () => {
    const res = await activateMarketFullEdition('کسب‌وکار فعال نسخه بازار');
    setActivationMsg(res.message);
    setTimeout(() => setActivationMsg(null), 5000);
  };

  // ۱۱ ماژول و افزونه کلیدی نسخه رودمپ یکماهه
  const roadmapModules = [
    {
      id: 'roadmap-chart',
      title: 'ماژول سرفصل‌های ۳ سطحی حسابداری',
      description: 'کدینگ استاندارد ۳ سطحی (گروه، کل، معین) با درختواره حساب‌ها، سطوح تفصیلی و تفکیک ماهیت',
      icon: FolderTree,
      color: 'bg-blue-50 text-blue-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_ledger_subtab', 'chart');
        onSelectModule('ledger');
      }
    },
    {
      id: 'roadmap-journal',
      title: 'ماژول اسناد دوبل و دفتر روزنامه',
      description: 'ثبت اسناد متوازن با تراز خودکار، فرم استاندارد بدهکار/بستانکار و کنترل دقیق طرف‌حساب',
      icon: BookOpen,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_ledger_subtab', 'journal');
        onSelectModule('ledger');
      }
    },
    {
      id: 'roadmap-tafsili',
      title: 'ماژول تفصیلی شناور اشخاص و شرکا',
      description: 'تفصیلی چندبعدی و شناور برای اتصال یکپارچه اسناد به اشخاص، پروژه‌ها، بانک‌ها و سهامداران',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_ledger_subtab', 'tafsili');
        onSelectModule('ledger');
      }
    },
    {
      id: 'roadmap-trial',
      title: 'ماژول گزارش تراز آزمایشی ۲، ۴ و ۶ ستونی',
      description: 'تراز آزمایشی تحلیلی در سطوح کل و معین با محاسبه دقیق گردش و مانده و ممیزی ناترازی',
      icon: Scale,
      color: 'bg-amber-50 text-amber-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_ledger_subtab', 'trial');
        onSelectModule('ledger');
      }
    },
    {
      id: 'roadmap-checks',
      title: 'افزونه چک‌های صیادی و اقساط فروشگاهی',
      description: 'مدیریت و استعلام چک‌های صیادی دریافتی/پرداختی و دفترچه اقساط متصل به اسناد مالی',
      icon: CreditCard,
      color: 'bg-purple-50 text-purple-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        onSelectModule('checks');
      }
    },
    {
      id: 'roadmap-banks',
      title: 'افزونه حساب‌های بانکی و اسناد مالی پیشرفته',
      description: 'مدیریت حساب‌های بانکی، شماره شبا، دستگاه‌های کارتخوان (POS) و انتقال بین بانکی',
      icon: Landmark,
      color: 'bg-teal-50 text-teal-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        onSelectModule('banks');
      }
    },
    {
      id: 'roadmap-projects',
      title: 'افزونه مدیریت پروژه و پیمانکاری',
      description: 'حسابداری پروژه‌ای، ثبت برچسب قراردادها، بهای تمام‌شده و سود/زیان هر پروژه به تفکیک',
      icon: FolderKanban,
      color: 'bg-cyan-50 text-cyan-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        onSelectModule('projects');
      }
    },
    {
      id: 'roadmap-payroll',
      title: 'افزونه حقوق، دستمزد و پرسنلی هوشمند',
      description: 'محاسبه مکانیزه حقوق، ماده ۸۴ مالیات، دیسکت‌های تأمین اجتماعی DSKKAR/DSKVOR و صدور سند دوبل',
      icon: Calculator,
      color: 'bg-rose-50 text-rose-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        onSelectModule('payroll');
      }
    },
    {
      id: 'roadmap-logistics',
      title: 'مدیریت انبار و لجستیک',
      description: 'کنترل موجودی کالا، حواله ورود و خروج، نقطه سفارش و انبارداری چندواحدی با کاردکس',
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        onSelectModule('inventory');
      }
    },
    {
      id: 'roadmap-thermal-labels',
      title: 'افزونه چاپگر و صدور فاکتور بارکد و لیبل حرارتی پیشرفته',
      description: 'تولید بارکد استاندارد، برچسب قیمت حرارتی، فیش پرینتر و بارکدهای بین‌المللی Code128',
      icon: Printer,
      color: 'bg-violet-50 text-violet-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_barcode_subtab', 'generator');
        onSelectModule('barcode_scanner');
      }
    },
    {
      id: 'roadmap-barcode-scanner',
      title: 'افزونه اسکن و مدیریت بارکد حسابداری و انبارداری هابینو',
      description: 'اسکن سریع بارکد با دوربین گوشی و بارکدخوان تفنگی USB، استعلام موجودی و ورود مستقیم به فاکتور',
      icon: ScanLine,
      color: 'bg-sky-50 text-sky-600',
      badge: 'فعال - ماه ۱',
      action: () => {
        localStorage.setItem('habino_barcode_subtab', 'camera');
        onSelectModule('barcode_scanner');
      }
    },
    {
      id: 'roadmap-ocr-pipeline',
      title: 'اتوماسیون اسناد مالی و OCR هوشمند هابینو',
      description: 'اسکن و پردازش خودکار فاکتورها و قبوض، استخراج اقلام، تفکیک معین و نگاشت هوشمند به تفصیلی شناور',
      icon: ScanLine,
      color: 'bg-purple-50 text-purple-600',
      badge: 'استراتژیک',
      action: () => {
        localStorage.setItem('habino_ledger_subtab', 'ocr');
        onSelectModule('ledger');
      }
    },
    {
      id: 'roadmap-jsonb-gin',
      title: 'موتور بهینه‌سازی دیتابیس و ایندکس‌های GIN',
      description: 'کاهش تأخیر کوئری‌ها به زیر ۳۰ میلی‌ثانیه، شتاب‌بخشی متادیتای اصناف و بنچمارک زنده EXPLAIN ANALYZE',
      icon: Database,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'کارایی دیتابیس',
      action: () => {
        onSelectModule('diagnostic');
      }
    }
  ];

  const modules = [
    {
      id: 'invoices',
      title: 'فاکتورها و پیش‌فاکتورها',
      description: 'صدور و چاپ فاکتور ۴ قالبه با محاسبه خودکار مالیات، پیش‌نمایش زنده و تخفیف',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      badge: 'اصلی'
    },
    {
      id: 'checks',
      title: 'چک‌های صیادی',
      description: 'سامانه پیگیری چک‌های دریافتی، پرداختی و سررسید با تسویه زنجیره‌ای',
      icon: CreditCard,
      color: 'bg-purple-50 text-purple-600',
      badge: 'صیاد'
    },
    {
      id: 'installments',
      title: 'اقساط و وصول مطالبات',
      description: 'جدول زمان‌بندی اقساط و اتصال خودکار به چک‌ها و اسناد مالی',
      icon: Layers,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'مالی'
    },
    {
      id: 'transactions',
      title: 'تراکنش‌ها و وجوه نقد',
      description: 'ثبت دریافت‌ها، پرداخت‌ها، تفکیک درآمد و هزینه و انضباط صندوق',
      icon: ArrowLeftRight,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'نقدینگی'
    },
    {
      id: 'clients',
      title: 'اشخاص و طرف‌های حساب',
      description: 'پرونده مالی کارفرمایان و مشتریان حقیقی و حقوقی با منوی کرکره‌ای',
      icon: Users,
      color: 'bg-cyan-50 text-cyan-600'
    },
    {
      id: 'inventory',
      title: 'خدمات و تعرفه‌ها',
      description: 'تعرفه خدمات تخصصی، بهای تمام‌شده و کالاهای موجود با کنترل حداقل',
      icon: Wrench,
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      id: 'barcode_scanner',
      title: 'بارکدخوان و اسکنر کالا',
      description: 'اسکن سریع بارکد با دوربین زنده و دستگاه تفنگی USB، استعلام انبار، تولید برچسب و ایران‌کد',
      icon: ScanLine,
      color: 'bg-teal-50 text-teal-600',
      badge: 'جدید'
    },
    {
      id: 'banks',
      title: 'بانک‌ها و صندوق',
      description: 'مدیریت کارت‌ها، شماره شبا و مانده موجودی نقد و تسویه بانکی',
      icon: Landmark,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      id: 'projects',
      title: 'پروژه‌ها و قراردادها',
      description: 'حسابداری پروژه‌ای، بهای تمام‌شده و سود خالص هر قرارداد بر اساس برچسب',
      icon: FolderKanban,
      color: 'bg-teal-50 text-teal-600'
    },
    {
      id: 'did_protocol',
      title: 'پروتکل هویت W3C DID و VC',
      description: 'شناسه دیجیتال غیرمتمرکز، گواهی‌های اعتباری قابل‌تأیید و امضای رمزنگاری اسناد مالی',
      icon: Fingerprint,
      color: 'bg-indigo-50 text-indigo-700',
      badge: 'فاز ۳'
    },
    {
      id: 'open_commerce',
      title: 'وب‌سرویس باز و افزونه‌ها (Open API)',
      description: 'زیرساخت کلیدهای API، وب‌هوک‌های HMAC، وب‌سرویس ووکامرس و اکوسیستم افزونه‌های اصناف',
      icon: Globe,
      color: 'bg-blue-50 text-blue-700',
      badge: 'فاز ۴ فعال'
    },
    {
      id: 'payroll',
      title: 'حقوق و دستمزد و بیمه تأمین اجتماعی',
      description: 'محاسبه مکانیزه حقوق، ماده ۸۴ مالیات، دیسکت‌های رسمی DSKKAR/DSKVOR و صدور خودکار سند دوبل',
      icon: Calculator,
      color: 'bg-indigo-50 text-indigo-700',
      badge: 'قانون کار و بیمه'
    },
    {
      id: 'ledger',
      title: 'دفتر روزنامه و سند دوبل',
      description: 'ثبت اسناد متوازن بر اساس اصول استاندارد حسابداری و کدینگ دوبل',
      icon: BookOpen,
      color: 'bg-slate-100 text-slate-800'
    },
    {
      id: 'reports',
      title: 'صورت‌های مالی و سود و زیان (P&L)',
      description: 'گزارش سود و زیان رسمی، تراز آزمایشی ۴ ستونی و ترازنامه متوازن',
      icon: BarChart3,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'صورت مالی'
    },
    {
      id: 'analytics',
      title: 'داشبورد تحلیلی نمودارهای ماهانه (Recharts)',
      description: 'نمودارهای تعاملی هزینه‌ها، درآمدها، حاشیه سود خالص ماهانه و تفکیک جریان وجوه نقد',
      icon: BarChart3,
      color: 'bg-violet-50 text-violet-600',
      badge: 'هوش تجاری'
    },
    {
      id: 'synapse',
      title: 'دستیار صوتی سایرافلو (SiraFlow)',
      description: 'ارکستراتور مرکزی هوش مصنوعی، پاسخگویی صوتی با آواتار کوانتومی و ممیزی دفاتر بازار',
      icon: Bot,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'Bazaar AI'
    },
    {
      id: 'agents_studio',
      title: 'استودیو ۵ ایجنت هابینو',
      description: 'مرکز مانیتورینگ زنده ۵ ایجنت هوشمند (معماری، عیب‌یابی، ایده، نیازسنجی و توسعه فنی)، پایپ‌لاین رویدادها و ارزیابی همگرایی',
      icon: Cpu,
      color: 'bg-purple-50 text-purple-600',
      badge: '۵ ایجنت هوشمند'
    },
    {
      id: 'diagnostics',
      title: 'عیب‌یاب و تطبیق دفاتر',
      description: 'پایش مغایرت‌های مالی، ردیابی رکوردهای یتیم و تست‌های پذیرش خودکار',
      icon: Activity,
      color: 'bg-rose-50 text-rose-600'
    },
    {
      id: 'pre_launch_qa',
      title: 'آزمون جامع و آمادگی انتشار (QA & UAT)',
      description: 'ممیزی خودکار هوش مصنوعی، ماتریس سناریوهای آزمون انسانی و صدور گواهی رسمی انتشار در کافه‌بازار',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-600',
      badge: 'تاییدیه استور'
    },
    {
      id: 'accounting_verification',
      title: 'آزمون خودکار تراز و دفتر کل',
      description: 'ممیزی خودکار ۱۰ سناریوی بحرانی سند دوبل، تراز ۲، ۴ و ۶ ستونی، مانده در گردش دفتر کل و آزمون آشوب',
      icon: Scale,
      color: 'bg-teal-50 text-teal-700',
      badge: 'ممیزی مالی ۱۰/۱۰'
    },
    {
      id: 'backup',
      title: 'پشتیبان‌گیری و بازیابی داده‌ها',
      description: 'تهیه نسخه پشتیبان محلی و ابری، خروجی JSON و تضمین عدم از دست رفتن اسناد',
      icon: Database,
      color: 'bg-teal-50 text-teal-600',
      badge: 'امنیت'
    },
    {
      id: 'license',
      title: 'مدیریت لایسنس و خرید بازار',
      description: 'مقایسه امکانات نسخه دمو و بازار، خرید درون‌برنامه‌ای و صدور سریال',
      icon: Key,
      color: 'bg-blue-50 text-blue-600',
      badge: 'نسخه بازار'
    },
    {
      id: 'roadmap',
      title: 'رودمپ و ساختار استقرار',
      description: 'برنامه استقرار ۳۰ روزه و توکن‌های طراحی چندمستأجری',
      icon: Compass,
      color: 'bg-sky-50 text-sky-600'
    },
    {
      id: 'settings',
      title: 'تنظیمات کسب‌وکار',
      description: 'تنظیم نرخ مالیات، واحد پولی و اطلاعات حقوقی شرکت',
      icon: SettingsIcon,
      color: 'bg-slate-50 text-slate-600'
    }
  ];

  return (
    <div className="space-y-6" id="apphub-container">
      {/* Top Banner: Demo vs Market Comparison & Instant Activation */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                نسخه بازار فعال (Cafe Bazaar Edition)
              </span>
              <span className="text-xs text-blue-200">
                {license.tier === 'bazaar' || license.tier === 'enterprise' ? 'کلیه امکانات حسابداری فعال است' : 'حالت آزمایشی'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              مقایسه و تطابق ۱۰۰٪ امکانات نسخه دمو با نسخه بازار
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تمامی قابلیت‌های مدلسازی شده در نسخه دمو (فاکتور ۴ قالبه، پیش‌نمایش زنده، چک صیادی، اقساط، دوبل، ترازنامه، P&L و هوش مصنوعی) در نسخه بازار کاملاً فعال و عملیاتی است.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowComparisonModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مشاهده جدول مقایسه دمو و بازار</span>
            </button>
            <button
              onClick={handleInstantMarketActivation}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>فعال‌سازی فوری کلیه امکانات بازار</span>
            </button>
          </div>
        </div>

        {activationMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{activationMsg}</span>
          </div>
        )}
      </div>

      {/* ۱۱ ماژول و افزونه کلیدی نسخه رودمپ یکماهه هابینو */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                بسته ۱۱ ماژول و افزونه استاندارد نسخه رودمپ یکماهه هابینو
              </h2>
              <p className="text-xs text-slate-500">
                فعال‌سازی و دسترسی ۱ کلیکی به سرفصل‌های ۳ سطحی، اسناد دوبل، تفصیلی شناور، تراز چندستونی، صیاد، بانک، پروژه، پرسنلی، لجستیک و بارکد
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ۱۱ ماژول فعال و عملیاتی
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {roadmapModules.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={mod.action}
                className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                      {mod.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                  <span>فعال‌سازی و بازگشایی ماژول</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">کلیه افزونه‌ها و ابزارهای سیستم</h2>
          <p className="text-sm text-slate-500">پورتفولیوی جامع ابزارهای حسابداری، فروش، انبار و هوش مصنوعی</p>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          ۱۶ ماژول فعال
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(mod => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${mod.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {mod.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                      {mod.badge}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                <span>ورود به ماژول</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Full Demo vs Bazaar Comparison Matrix */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    جدول مقایسه جامع امکانات نسخه دمو با نسخه بازار
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    بررسی انطباق تک‌تک بخش‌های در نظر گرفته شده در نسخه دمو و فعال‌سازی در نسخه بازار
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowComparisonModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer text-xs font-bold"
              >
                بستن
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="p-3">بخش و قابلیت</th>
                      <th className="p-3">دسته‌بندی</th>
                      <th className="p-3">وضعیت در نسخه دمو</th>
                      <th className="p-3">وضعیت در نسخه بازار</th>
                      <th className="p-3 text-center">وضعیت فعال‌سازی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DEMO_VS_MARKET_COMPARISON.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</div>
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          <span className="text-slate-700">{item.demoStatus}</span>
                        </td>
                        <td className="p-3 text-emerald-700 font-medium whitespace-nowrap">
                          {item.bazaarStatus}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            فعال در بازار
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                تمامی ۱۵ قابلیت در نظر گرفته شده در نسخه بازار ۱۰۰٪ فعال و مورد تایید است.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowComparisonModal(false);
                    onSelectModule('license');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  مدیریت لایسنس و ارتقا
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
