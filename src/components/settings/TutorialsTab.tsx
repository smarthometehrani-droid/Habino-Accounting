import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Video,
  FileText,
  CheckCircle2,
  Mic,
  Camera,
  Cpu,
  Brain,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

interface TutorialItem {
  id: string;
  category: 'accounting' | 'voice_synapse' | 'ocr' | 'checks' | 'cfo' | 'security';
  title: string;
  duration: string;
  summary: string;
  badge: string;
  steps: string[];
  keyRules?: string[];
  sampleEntry?: {
    debit: string;
    credit: string;
    tag?: string;
  };
}

export const TutorialsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTutorialId, setExpandedTutorialId] = useState<string | null>('tut-1');

  const categories = [
    { id: 'all', label: 'همه آموزش‌ها' },
    { id: 'accounting', label: 'قوانین ۹‌گانه و دفاتر دوبل' },
    { id: 'voice_synapse', label: 'هوش صوتی سیناپس (SiraFlow)' },
    { id: 'ocr', label: 'خط لوله OCR و اسناد' },
    { id: 'checks', label: 'چک‌های صیادی و اقساط' },
    { id: 'cfo', label: 'تحلیل نقدینگی و CFO' },
    { id: 'security', label: 'امنیت و چندمستأجری' }
  ];

  const tutorials: TutorialItem[] = [
    {
      id: 'tut-1',
      category: 'accounting',
      title: 'قوانین ۹‌گانه ثبت اسناد مالی و دفتر کل در هابینو',
      duration: '۵ دقیقه مطالعه',
      summary: 'اصول اتمیک ثبت، اصلاح و حذف اسناد حسابداری بدون باقی ماندن رکوردهای یتیم.',
      badge: 'قوانین هسته (Core Rules)',
      steps: [
        '۱. مخاطب (طرف حساب) همیشه اجباری است و سند بدون انتخاب مخاطب هرگز ثبت نمی‌شود.',
        '۲. ثبت سند به صورت اتمیک در جدول اسناد، دفتر کل و حساب اشخاص اعمال می‌گردد.',
        '۳. پروژه صرفاً برچسب (Tag) تحلیلی است و حساب مجزای دفتر کل ندارد.',
        '۴. حذف و ویرایش اسناد باید به صورت آبشاری (Cascade) و بدون باقی گذاشتن رکورد یتیم انجام گیرد.',
        '۵. پیش‌پرداخت پروژه در حساب کارفرما با برچسب پروژه ثبت و در دفتر کل منعکس می‌شود.',
        '۶. سود پروژه پس از بستن، به حساب سود سیستم منتقل شده و دوباره در دوره محاسبه نمی‌شود.'
      ],
      keyRules: [
        'هیچ سندی بدون مخاطب ثبت نشود',
        'مبالغ بدهکار و بستانکار در اسناد دوبل باید کاملاً متوازن باشند',
        'ویرایش سند ابتدا نسخه قبلی را کاملاً حذف کرده و نسخه جدید را با همان UUID می‌سازد'
      ],
      sampleEntry: {
        debit: 'بانک / صندوق / اسناد دریافتنی',
        credit: 'کارفرما (مخاطب انتخاب‌شده)',
        tag: 'پروژه تجاری آلفا'
      }
    },
    {
      id: 'tut-2',
      category: 'voice_synapse',
      title: 'کار با هوش صوتی سیناپس (SiraFlow) و احراز هویت صوتی',
      duration: '۴ دقیقه',
      summary: 'نحوه مکالمه بلادرنگ، پروتکل تایید صوتی دوبل و شنود پیوسته بدون قطع نشست.',
      badge: 'پروتکل صوتی (Voice Protocol)',
      steps: [
        '۱. جهت دسترسی به ابزارهای مالی حساس، عبارت رمز «سیناپس، مدیریت وارد شد» را بیان کنید.',
        '۲. ابزارهای خواندنی (مانند گزارش نقدینگی، سود یا فاکتورها) مستقیماً به صورت خلاصه صوتی بیان می‌شوند.',
        '۳. ابزارهای نوشتنی یا اسناد بالای ۱۰ میلیون تومان نیازمند تایید صوتی صریح «بله، تایید است ثبت کن» هستند.',
        '۴. قابلیت شنود پیوسته (Hot-Mic) را می‌توانید برای تعامل پشت‌سرهم بدون کلیک فعال نمایید.',
        '۵. در هر لحظه می‌توانید با صحبت کردن پاسخ گوینده را قطع کنید (Barge-in Enabled).'
      ],
      keyRules: [
        'خلاصه‌گویی حداکثر در ۳۰ ثانیه برای پاسخ‌های صوتی',
        'قفل خودکار ابزارها در صورت عدم فعالیت پس از ۵ دقیقه',
        'حفظ موجودیت قبلی (Context State) در حافظه کوتاه‌مدت مدل'
      ]
    },
    {
      id: 'tut-3',
      category: 'ocr',
      title: 'اتوماسیون اسناد و صورتحساب‌ها با خط لوله OCR',
      duration: '۶ دقیقه',
      summary: 'تبدیل تصویر و PDF فاکتورهای کاغذی به اسناد دوبل با کادربندی ارقام و تایید صوتی.',
      badge: 'بینایی ماشین و هوش مصنوعی',
      steps: [
        '۱. تصویر فاکتور خرید یا رسید بانکی را در ماژول OCR بارگذاری فرمایید.',
        '۲. سیستم با Bounding Boxes ارقام مبلغ، مالیات، شماره فاکتور و نام فروشنده را کادربندی می‌کند.',
        '۳. برای مبالغ بالای ۱۰ میلیون تومان، هوش صوتی سیناپس تاییدیه دوبل دریافت می‌نماید.',
        '۴. پس از تایید، سند به صورت خودکار در دفتر روزنامه و حساب تفصیلی طرف‌حساب ثبت می‌شود.'
      ],
      keyRules: [
        'شناسایی دقیق نرخ‌های ارزش افزوده ۱۰٪',
        'تطبیق خودکار شناسه ملی و کد اقتصادی طرف‌حساب',
        'امکان ویرایش دستی اقلام استخراج‌شده قبل از ثبت نهایی'
      ]
    },
    {
      id: 'tut-4',
      category: 'checks',
      title: 'مدیریت چک‌های صیادی و اقساط متصل به فاکتور',
      duration: '۵ دقیقه',
      summary: 'روال وصول چک، سررسیدها و به‌روزرسانی زنجیره‌ای اقساط در ماژول‌های حسابداری.',
      badge: 'اسناد دریافتنی و پرداختنی',
      steps: [
        '۱. در هنگام صدور فاکتور، می‌توانید روش پرداخت را به صورت اقساطی یا چکی تعیین نمایید.',
        '۲. چک‌های صیادی ثبت‌شده با شماره صیاد ۱۶ رقمی و تاریخ سررسید شمسی پایش می‌شوند.',
        '۳. با تغییر وضعیت چک به «پاس‌شده»، وضعیت قسط متصل به فاکتور نیز خودکار «تسویه‌شده» می‌گردد.',
        '۴. در صورت برگشت چک، اخطار آنی در داشبورد پیش‌بینی نقدینگی و جریان وجوه نقد صادر می‌شود.'
      ],
      keyRules: [
        'محاسبه دقیق تراز وجوه نقد با احتساب چک‌های در جریان وصول',
        'پشتیبانی کامل از تقویم جلالی/شمسی بدون باگ تاریخ',
        'انعکاس سند پاس‌شدن چک در دفتر کل به صورت بدهکار بانک و بستانکار اسناد دریافتنی'
      ]
    },
    {
      id: 'tut-5',
      category: 'cfo',
      title: 'داشبورد پیش‌بینی جریان وجوه نقد و سلامت مالی (CFO Analytics)',
      duration: '۷ دقیقه',
      summary: 'فرمول‌های نقدینگی (Liquidity)، کارایی سود، نسبت جاری و فاصله تا نقطه سربه‌سر.',
      badge: 'هوش محاسباتی و تحلیل',
      steps: [
        '۱. نسبت جاری نقدینگی: تقسیم دارایی‌های جاری بر بدهی‌های جاری (اگر زیر ۱.۲ باشد هشدار بحران نقدینگی صادر می‌شود).',
        '۲. تراز پیش‌بینی‌شده ۱۵ روزه: موجودی فعلی نقد + چک‌های ورودی سررسید شده - چک‌های خروجی.',
        '۳. ترازنامه متوازن: Assets = Liabilities + Equity (در صورت عدم تساوی، هشدار ناترازی اعلام می‌شود).',
        '۴. تحلیل نقطه سربه‌سر (Break-even): محاسبه حداقل درآمد ماهیانه برای پوشش کامل هزینه‌های ثابت و متغیر.'
      ],
      keyRules: [
        'عدم نیاز به محاسبات دستی توسط کاربر؛ هسته تحلیلی سیناپس خودکار نمودارها را رسم می‌کند',
        'امکان تفکیک گزارشات بر اساس ارزهای تومان، ریال و دلار'
      ]
    },
    {
      id: 'tut-6',
      category: 'security',
      title: 'معماری چندمستأجری (Multi-Tenant) و سطوح دسترسی کاربران',
      duration: '۴ دقیقه',
      summary: 'ایزولاسیون کامل داده‌های هر شرکت با Row-Level Security و نقش‌های پنج‌گانه.',
      badge: 'امنیت و RLS',
      steps: [
        '۱. هر شرکت در پلتفرم دارای یک tenant_id اختصاصی و کاملاً ایزوله در پایگاه داده است.',
        '۲. نقش سوپر ادمین (Super Admin) حاکمیت کامل بر ممیزی سیستم، کدهای هسته و لاگ‌ها دارد.',
        '۳. نقش‌های مستأجر شامل: مدیر شرکت، حسابدار ارشد، صندوق‌دار، انباردار و حسابرس ناظر است.',
        '۴. کاربران سطح صندوق‌دار و انباردار اجازه مشاهده سود خالص، ترازنامه یا تغییر تنظیمات را ندارند.'
      ],
      keyRules: [
        'پشتیبان‌گیری رمزنگاری‌شده روزانه به صورت JSON و دیتابیس ابری',
        'امکان تغییر رمز عبور و تنظیم زمان قفل خودکار نشست در تب امنیت'
      ]
    }
  ];

  const filteredTutorials = tutorials.filter(t => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.includes(searchQuery) ||
      t.summary.includes(searchQuery) ||
      t.badge.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="tutorials-settings-tab">
      {/* Search & Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-2 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">پایگاه دانش و مرکز آموزش‌های جامع هابینو</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              راهنماهای تعاملی و کاربردی تسلط بر قوانین ۹‌گانه حسابداری، هوش صوتی سیناپس، خط لوله OCR و تحلیل‌های مالی CFO
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در سرفصل‌های آموزشی..."
              className="w-full pr-9 pl-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Tutorials Cards List */}
      <div className="space-y-4">
        {filteredTutorials.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">موردی متناسب با جستجوی شما یافت نشد.</p>
          </div>
        ) : (
          filteredTutorials.map(tut => {
            const isExpanded = expandedTutorialId === tut.id;
            return (
              <div
                key={tut.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs transition-all hover:border-blue-200"
              >
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedTutorialId(isExpanded ? null : tut.id)}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                        {tut.badge}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ⏱️ {tut.duration}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <span>{tut.title}</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{tut.summary}</p>
                  </div>

                  <button
                    type="button"
                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Detailed Step-by-Step Guide */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>مراحل گام‌به‌گام پیاده‌سازی و اجرا:</span>
                      </h5>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        {tut.steps.map((st, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Rules Card */}
                    {tut.keyRules && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>قوانین طلایی غیرقابل تغییر:</span>
                        </div>
                        <ul className="text-xs space-y-1 text-slate-700 list-disc list-inside">
                          {tut.keyRules.map((kr, idx) => (
                            <li key={idx}>{kr}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sample Accounting Ledger Entry */}
                    {tut.sampleEntry && (
                      <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 font-mono text-xs">
                        <div className="text-slate-400 text-[11px] font-sans flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>نمونه سند استاندارد در دفتر کل:</span>
                        </div>
                        <div className="text-emerald-400">بدهکار: {tut.sampleEntry.debit}</div>
                        <div className="text-cyan-400">بستانکار: {tut.sampleEntry.credit}</div>
                        {tut.sampleEntry.tag && (
                          <div className="text-amber-300 text-[11px]">برچسب پروژه: {tut.sampleEntry.tag}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
