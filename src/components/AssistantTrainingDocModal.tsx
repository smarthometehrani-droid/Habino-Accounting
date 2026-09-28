import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  RotateCcw,
  X,
  Shield,
  Brain,
  Cpu,
  FileText,
  Check,
  Tag,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  HabinoAssistantTrainingEngine,
  LearnedTrainingRule
} from '../lib/assistantTrainingDoc';

export interface AssistantTrainingDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRuleAdded?: (rule: { title: string; learnedRule: string }) => void;
}

export const AssistantTrainingDocModal: React.FC<AssistantTrainingDocModalProps> = ({
  isOpen,
  onClose,
  onRuleAdded
}) => {
  const [rules, setRules] = useState<LearnedTrainingRule[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // فرم ثبت قاعده جدید
  const [newTitle, setNewTitle] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState<LearnedTrainingRule['category']>('custom_voice');

  const refreshRules = () => {
    setRules(HabinoAssistantTrainingEngine.getLearnedRules());
  };

  useEffect(() => {
    if (isOpen) {
      refreshRules();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRuleText.trim()) return;

    const created = HabinoAssistantTrainingEngine.recordLearnedRule({
      title: newTitle,
      learnedRule: newRuleText,
      userCorrectionReason: newReason || 'آموزش مستقیم ثبت شده در سند یادگیری عمیق سیستم',
      category: newCategory,
      source: 'user_voice_instruction'
    });

    refreshRules();
    setNewTitle('');
    setNewRuleText('');
    setNewReason('');
    setShowAddForm(false);

    if (onRuleAdded) {
      onRuleAdded({ title: created.title, learnedRule: created.learnedRule });
    }
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('آیا از حذف این اصل آموزشی از سند یادگیری عمیق اطمینان دارید؟')) {
      HabinoAssistantTrainingEngine.deleteLearnedRule(id);
      refreshRules();
    }
  };

  const handleToggleRule = (id: string) => {
    HabinoAssistantTrainingEngine.toggleRule(id);
    refreshRules();
  };

  const handleResetDefaults = () => {
    if (confirm('آیا مایلید تمام قواعد سند آموزش به مقادیر مصوب بنیانگذار بازنشانی شوند؟')) {
      HabinoAssistantTrainingEngine.resetToDefaults();
      refreshRules();
    }
  };

  const handleCopyMarkdown = () => {
    const md = HabinoAssistantTrainingEngine.exportTrainingDocMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryLabels: Record<LearnedTrainingRule['category'], { label: string; color: string }> = {
    proforma_handling: { label: 'پیش‌فاکتورها و استعلام', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    accounting_kernel: { label: 'قوانین هسته حسابداری', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    voice_auth: { label: 'احراز هویت و شنود صوتی', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    multi_tenant_rls: { label: 'امنیت و چندمستأجری', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    ocr_pipeline: { label: 'بینایی اسناد و OCR', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    custom_voice: { label: 'آموزش‌های صوتی کاربر', color: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>سند آموزش و یادگیری عمیق سیستم (Synapse Training KB)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  حافظه فعال
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                قواعد رفتاری، استانداردهای مالی و آموزش‌های کلامی فرید تهرانی که در استدلال‌های صوتی اعمال می‌شوند.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'بستن فرم آموزش' : 'افزودن قاعده آموزشی جدید'}</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="کپی متن کامل سند آموزش به کلیپ‌بورد"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'کپی شد!' : 'کپی سند مارک‌داون'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              {rules.length} اصل آموزشی فعال
            </span>
            <button
              onClick={handleResetDefaults}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="بازنشانی به اصول پیش‌فرض مصوب بنیانگذار"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Add Form (Collapsible) */}
          {showAddForm && (
            <form onSubmit={handleAddRule} className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  آموزش اصل جدید به مغز تحلیلی سیناپس
                </span>
                <span className="text-[11px] text-blue-600">
                  (می‌توانید در مکالمه صوتی نیز با گفتن «یادت باشه که...» آموزش دهید)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    عنوان قاعده / اصل
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="مثال: نحوه محاسبه مانده در پیش‌فاکتور"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    دسته‌بندی موضوعی
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="proforma_handling">پیش‌فاکتورها و استعلام</option>
                    <option value="accounting_kernel">قوانین هسته حسابداری</option>
                    <option value="voice_auth">احراز هویت و شنود صوتی</option>
                    <option value="multi_tenant_rls">امنیت و چندمستأجری</option>
                    <option value="ocr_pipeline">بینایی اسناد و OCR</option>
                    <option value="custom_voice">آموزش سفارشی کاربر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  متن دقیق دستور و منطق قاعده (Learned Rule)
                </label>
                <textarea
                  value={newRuleText}
                  onChange={e => setNewRuleText(e.target.value)}
                  placeholder="دستور مشخصی که دستیار صوتی و مدل‌های هوش مصنوعی باید در پاسخ‌ها و رفتارهای خود رعایت کنند..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  دلیل یا علت آموزش (اختیاری)
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  placeholder="علت اصلاحیه یا دستور مستقیم فرید تهرانی..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت در سند آموزش</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Rules */}
          <div className="space-y-3">
            {rules.map((rule, idx) => {
              const catMeta = categoryLabels[rule.category] || categoryLabels.custom_voice;
              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rule.isActive
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {rule.title}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                      {rule.source === 'founder_mandate' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-500" />
                          دستور بنیانگذار
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        title={rule.isActive ? 'غیرفعال‌سازی این قاعده' : 'فعال‌سازی'}
                      >
                        {rule.isActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      {rule.source !== 'founder_mandate' && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف قاعده"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 mt-2.5 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {rule.learnedRule}
                  </p>

                  {rule.userCorrectionReason && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{rule.userCorrectionReason}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 font-mono">
                    <span>ثبت‌شده: {rule.createdAt}</span>
                    <span>شناسه: {rule.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            تمامی قواعد فوق بلافاصله در فرآیند استدلال هوش صوتی سیناپس اعمال می‌شوند.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            بستن سند آموزش
          </button>
        </div>
      </div>
    </div>
  );
};
