/**
 * Habino Synapse Voice AI Assistant Training Document & Deep Learning Engine
 * 
 * سند راهبردی آموزش و یادگیری عمیق پیوسته دستیار صوتی هابینو (Synapse / SiraFlow)
 * مرجع یکپارچه قواعد ذهنی، تطبیق صوتی، تفکیک پیش‌فاکتورها و ممیزی دفاتر مالی
 */

export interface LearnedTrainingRule {
  id: string;
  title: string;
  category: 'accounting_kernel' | 'proforma_handling' | 'voice_auth' | 'multi_tenant_rls' | 'ocr_pipeline' | 'custom_voice';
  learnedRule: string;
  userCorrectionReason?: string;
  source: 'founder_mandate' | 'user_voice_instruction' | 'system_standard' | 'cfo_directive';
  createdAt: string;
  isActive: boolean;
}

const STORAGE_KEY = 'habino_assistant_training_rules';

export const DEFAULT_ASSISTANT_TRAINING_RULES: LearnedTrainingRule[] = [
  {
    id: 'rule-proforma-separation',
    title: 'تفکیک قطعی پیش‌فاکتور از فاکتور رسمی',
    category: 'proforma_handling',
    learnedRule: 'پیش‌فاکتور (Proforma) سندی خنثی جهت برآورد قیمت و استعلام است؛ هرگز به حساب بدهکاری شخص یا دفاتر دوبل دفتر کل ثبت نمی‌شود و در صورت پرسش کاربر درباره آخرین پیش‌فاکتور، باید مشخصات همان پیش‌فاکتور (مشتری، مبلغ، تاریخ و اقلام) گزارش شود نه فاکتور فروش قطعی.',
    userCorrectionReason: 'تطبیق استانداردهای حسابداری و جلوگیری از تداخل پیش‌نویس با اسناد قطعی',
    source: 'founder_mandate',
    createdAt: '1403/07/01',
    isActive: true
  },
  {
    id: 'rule-nine-accounting-principles',
    title: 'قوانین ۹‌گانه ثبت اسناد مالی هابینو',
    category: 'accounting_kernel',
    learnedRule: 'مخاطب (طرف‌حساب) همیشه اجباری است؛ ثبت سند اتمیک بوده و در جدول اسناد، دفتر کل و حساب اشخاص هماهنگ اعمال می‌شود؛ پروژه فقط برچسب است و حساب دفتر کل ندارد؛ حذف و ویرایش اسناد آبشاری و بدون رکورد یتیم است.',
    userCorrectionReason: 'منشور واحد حقیقت هابینو (Single Source of Truth)',
    source: 'founder_mandate',
    createdAt: '1403/07/01',
    isActive: true
  },
  {
    id: 'rule-voice-auth-farid-tehrani',
    title: 'پروتکل احراز هویت صوتی و شنود پیوسته',
    category: 'voice_auth',
    learnedRule: 'شناسایی مهندس فرید تهرانی با عبارت صوتی «سیناپس، مدیریت وارد شد» یا دکمه احراز هویت انجام می‌شود. پس از احراز هویت، تمامی ابزارهای خواندنی و نوشتنی فعال شده و شنود پیوسته بدون وقفه (Always-on Hot-Mic) برقرار می‌ماند.',
    userCorrectionReason: 'امنیت اسناد مالی و تجربه کاربری بدون وقفه صوتی (Hands-free)',
    source: 'founder_mandate',
    createdAt: '1403/07/01',
    isActive: true
  },
  {
    id: 'rule-cfo-liquidity-metrics',
    title: 'پایش نسبت‌های مالی و تحلیل نقدینگی (CFO Brain)',
    category: 'accounting_kernel',
    learnedRule: 'نسبت جاری (Current Assets / Current Liabilities) زیر ۱.۲ هشدار قرمز نقدینگی ایجاد می‌کند؛ تراز دفاتر دوبل (دارایی‌ها = بدهی‌ها + حقوق صاحبان سهام) همیشه پایش می‌شود؛ گزارش‌های صوتی باید خلاصه‌محور، حرفه‌ای و آرامش‌بخش باشند.',
    userCorrectionReason: 'نقش مدیر مالی ارشد (CFO) هوشمند برای مهندس فرید تهرانی',
    source: 'cfo_directive',
    createdAt: '1403/07/01',
    isActive: true
  },
  {
    id: 'rule-ocr-vision-pipeline',
    title: 'خط لوله هوشمند بینایی اسناد و OCR',
    category: 'ocr_pipeline',
    learnedRule: 'اسناد دریافت شده از دوربین یا بارگذاری باید به صورت خودکار شناسایی و پس از تایید صوتی فرید تهرانی یا کاربر به دفاتر دوبل تزریق شوند.',
    userCorrectionReason: 'اتوماسیون اسناد کاغذی به دفاتر کل بدون مداخله دستی',
    source: 'system_standard',
    createdAt: '1403/07/01',
    isActive: true
  }
];

export class HabinoAssistantTrainingEngine {
  /**
   * دریافت فهرست تمامی قواعد آموزش‌داده‌شده به دستیار
   */
  static getLearnedRules(): LearnedTrainingRule[] {
    if (typeof window === 'undefined') {
      return DEFAULT_ASSISTANT_TRAINING_RULES;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSISTANT_TRAINING_RULES));
        return DEFAULT_ASSISTANT_TRAINING_RULES;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_ASSISTANT_TRAINING_RULES;
    } catch {
      return DEFAULT_ASSISTANT_TRAINING_RULES;
    }
  }

  /**
   * ثبت خودکار یا دستی آموزش جدید از کلام کاربر یا رابط کاربری
   */
  static recordLearnedRule(input: {
    title: string;
    learnedRule: string;
    userCorrectionReason?: string;
    source?: 'founder_mandate' | 'user_voice_instruction' | 'system_standard' | 'cfo_directive';
    category?: 'accounting_kernel' | 'proforma_handling' | 'voice_auth' | 'multi_tenant_rls' | 'ocr_pipeline' | 'custom_voice';
  }): LearnedTrainingRule {
    const rules = this.getLearnedRules();
    const newRule: LearnedTrainingRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      learnedRule: input.learnedRule.trim(),
      userCorrectionReason: input.userCorrectionReason || 'آموزش ثبت‌شده توسط کاربر در مکالمه صوتی',
      source: input.source || 'user_voice_instruction',
      category: input.category || 'custom_voice',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      isActive: true
    };

    const updated = [newRule, ...rules];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save learned rule to localStorage:', e);
      }
    }
    return newRule;
  }

  /**
   * حذف یک قاعده آموزشی
   */
  static deleteLearnedRule(id: string): void {
    const rules = this.getLearnedRules();
    const updated = rules.filter(r => r.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  }

  /**
   * فعال/غیرفعال‌سازی قاعده
   */
  static toggleRule(id: string): void {
    const rules = this.getLearnedRules();
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  }

  /**
   * بازگردانی به قواعد پیش‌فرض مصوب بنیانگذار
   */
  static resetToDefaults(): LearnedTrainingRule[] {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSISTANT_TRAINING_RULES));
      } catch {}
    }
    return DEFAULT_ASSISTANT_TRAINING_RULES;
  }

  /**
   * تولید متن مارک‌داون یکپارچه سند آموزش جهت تزریق به پرامپت یا پرینت
   */
  static exportTrainingDocMarkdown(): string {
    const rules = this.getLearnedRules().filter(r => r.isActive);
    let md = `# سند راهبردی آموزش و یادگیری عمیق هوش صوتی سیناپس هابینو\n\n`;
    md += `> نسخه زنده یادگیری پیوسته | تاریخ استخراج: ${new Date().toLocaleDateString('fa-IR')}\n\n`;
    md += `## قواعد حاکم و آموخته‌شده:\n\n`;

    rules.forEach((r, idx) => {
      md += `### ${idx + 1}. ${r.title}\n`;
      md += `- **دستور قاعده:** ${r.learnedRule}\n`;
      if (r.userCorrectionReason) {
        md += `- **علت و زمینه:** ${r.userCorrectionReason}\n`;
      }
      md += `- **منبع:** ${r.source} | **تاریخ:** ${r.createdAt}\n\n`;
    });

    return md;
  }
}
