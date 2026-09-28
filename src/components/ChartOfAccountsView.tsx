import React, { useState, useMemo } from 'react';
import {
  STANDARD_ACCOUNT_GROUPS,
  STANDARD_ACCOUNT_KOLS,
  getAllAccountMoeins,
  addCustomAccountMoein,
  generateNextMoeinCode
} from '../lib/chartOfAccountsData';
import { AccountGroup, AccountKol, AccountMoein, AccountNature } from '../types';
import { toPersianDigits } from '../lib/currencyUtils';
import {
  FolderTree,
  Folder,
  FileText,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  Layers,
  Building,
  ShieldCheck,
  Tag,
  Printer,
  Sparkles,
  X
} from 'lucide-react';

interface Props {
  onSelectMoein?: (moeinCode: string) => void;
}

export const ChartOfAccountsView: React.FC<Props> = ({ onSelectMoein }) => {
  const [moeins, setMoeins] = useState<AccountMoein[]>(() => getAllAccountMoeins());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '1': true,
    '3': true,
    '5': true,
    '6': true
  });
  const [expandedKols, setExpandedKols] = useState<Record<string, boolean>>({
    '10': true,
    '12': true,
    '30': true
  });

  // New Custom Moein Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedKolForNew, setSelectedKolForNew] = useState<string>('10');
  const [newMoeinCode, setNewMoeinCode] = useState<string>('');
  const [newMoeinTitle, setNewMoeinTitle] = useState<string>('');
  const [newMoeinNature, setNewMoeinNature] = useState<AccountNature>('debit');
  const [isTafsiliAllowed, setIsTafsiliAllowed] = useState(true);
  const [modalFeedback, setModalFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleKol = (code: string) => {
    setExpandedKols(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleOpenAddModal = (defaultKolCode?: string) => {
    const kol = defaultKolCode || '10';
    setSelectedKolForNew(kol);
    const nextCode = generateNextMoeinCode(kol);
    setNewMoeinCode(nextCode);
    setNewMoeinTitle('');
    const kolObj = STANDARD_ACCOUNT_KOLS.find(k => k.code === kol);
    setNewMoeinNature(kolObj?.nature || 'debit');
    setIsTafsiliAllowed(true);
    setModalFeedback(null);
    setShowAddModal(true);
  };

  const handleKolChange = (kolCode: string) => {
    setSelectedKolForNew(kolCode);
    setNewMoeinCode(generateNextMoeinCode(kolCode));
    const kolObj = STANDARD_ACCOUNT_KOLS.find(k => k.code === kolCode);
    if (kolObj) {
      setNewMoeinNature(kolObj.nature);
    }
  };

  const handleSaveMoein = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoeinCode.trim() || !newMoeinTitle.trim()) {
      setModalFeedback({ msg: 'کد و عنوان حساب معین الزامی است.', isError: true });
      return;
    }

    const kolObj = STANDARD_ACCOUNT_KOLS.find(k => k.code === selectedKolForNew);
    if (!kolObj) {
      setModalFeedback({ msg: 'حساب کل نامعتبر است.', isError: true });
      return;
    }

    const result = addCustomAccountMoein({
      code: newMoeinCode.trim(),
      kolCode: kolObj.code,
      groupCode: kolObj.groupCode,
      title: newMoeinTitle.trim(),
      nature: newMoeinNature,
      isFloatingTafsiliAllowed: isTafsiliAllowed,
      isSystem: false
    });

    if (result.success) {
      setMoeins(getAllAccountMoeins());
      setExpandedGroups(prev => ({ ...prev, [kolObj.groupCode]: true }));
      setExpandedKols(prev => ({ ...prev, [kolObj.code]: true }));
      setShowAddModal(false);
    } else {
      setModalFeedback({ msg: result.message, isError: true });
    }
  };

  // Hierarchy Computation & Search Filter
  const filteredHierarchy = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return STANDARD_ACCOUNT_GROUPS.filter(group => {
      if (selectedGroupFilter !== 'all' && group.code !== selectedGroupFilter) {
        return false;
      }
      return true;
    }).map(group => {
      const kolsInGroup = STANDARD_ACCOUNT_KOLS.filter(k => k.groupCode === group.code);

      const kolsWithMoeins = kolsInGroup.map(kol => {
        const moeinsInKol = moeins.filter(m => m.kolCode === kol.code);
        const filteredMoeins = moeinsInKol.filter(m => {
          if (!q) return true;
          return m.code.includes(q) || m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
        });

        const isKolMatch = q && (kol.code.includes(q) || kol.title.toLowerCase().includes(q));

        return {
          ...kol,
          moeins: filteredMoeins,
          isVisible: filteredMoeins.length > 0 || isKolMatch || !q
        };
      }).filter(k => k.isVisible);

      const isGroupMatch = q && (group.code.includes(q) || group.title.toLowerCase().includes(q));

      return {
        ...group,
        kols: kolsWithMoeins,
        isVisible: kolsWithMoeins.length > 0 || isGroupMatch || !q
      };
    }).filter(g => g.isVisible);
  }, [moeins, searchQuery, selectedGroupFilter]);

  const totalMoeinsCount = moeins.length;
  const totalKolsCount = STANDARD_ACCOUNT_KOLS.length;
  const totalGroupsCount = STANDARD_ACCOUNT_GROUPS.length;

  return (
    <div className="space-y-4">
      {/* Top Header & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              سرفصل‌های ۳ سطحی حسابداری هابینو
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                گروه • کل • معین
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              کدینگ جامع، منطبق با استاندارد سازمان حسابرسی با تفکیک ماهیت و تفصیلی‌پذیری
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            id="btn-add-custom-moein"
          >
            <Plus className="w-4 h-4" />
            افزودن حساب معین جدید
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            چاپ کدینگ
          </button>
        </div>
      </div>

      {/* Summary Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">سطح ۱: گروه‌های حساب</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{toPersianDigits(totalGroupsCount)} گروه</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            ۱
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">سطح ۲: حساب‌های کل</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{toPersianDigits(totalKolsCount)} حساب</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
            ۲
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">سطح ۳: حساب‌های معین</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{toPersianDigits(totalMoeinsCount)} سرفصل</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            ۳
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">سطح ۴: تفصیلی شناور</p>
            <p className="text-base font-bold text-emerald-700 font-medium mt-0.5">فعال و متصل</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
            ۴
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="جستجو در عنوان، کد معین، کد کل یا شرح حساب..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>

          <select
            value={selectedGroupFilter}
            onChange={e => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white cursor-pointer"
          >
            <option value="all">همه گروه‌ها (۱ تا ۹)</option>
            {STANDARD_ACCOUNT_GROUPS.map(g => (
              <option key={g.code} value={g.code}>
                گروه {g.code}: {g.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            بدهکار
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            بستانکار
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            دوطرفه
          </span>
        </div>
      </div>

      {/* Tree View Hierarchy */}
      <div className="space-y-3" id="chart-of-accounts-tree">
        {filteredHierarchy.map(group => {
          const isGroupExpanded = expandedGroups[group.code] ?? false;

          return (
            <div
              key={group.code}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              {/* Level 1: Group Header */}
              <div
                onClick={() => toggleGroup(group.code)}
                className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shadow-2xs">
                    {group.code}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      {group.title}
                      <span className="text-[10px] font-normal text-slate-500">({group.description})</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      group.nature === 'debit'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : group.nature === 'credit'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    ماهیت: {group.nature === 'debit' ? 'بدهکار' : group.nature === 'credit' ? 'بستانکار' : 'دوگانه'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">
                    {toPersianDigits(group.kols.length)} حساب کل
                  </span>
                  {isGroupExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Level 2: Kols inside Group */}
              {isGroupExpanded && (
                <div className="divide-y divide-slate-100">
                  {group.kols.map(kol => {
                    const isKolExpanded = expandedKols[kol.code] ?? false;

                    return (
                      <div key={kol.code} className="p-3 bg-white">
                        <div
                          onClick={() => toggleKol(kol.code)}
                          className="flex items-center justify-between cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] font-mono">
                              {kol.code}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                {kol.title}
                                {kol.description && (
                                  <span className="text-[10px] font-normal text-slate-400">
                                    • {kol.description}
                                  </span>
                                )}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(kol.code);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="افزودن معین ذیل این حساب کل"
                            >
                              <Plus className="w-3 h-3" />
                              معین جدید
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {toPersianDigits(kol.moeins.length)} معین
                            </span>
                            {isKolExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Level 3: Moeins inside Kol */}
                        {isKolExpanded && (
                          <div className="mt-2 mr-6 border-r-2 border-slate-200 pr-3 space-y-1.5">
                            {kol.moeins.map(moein => (
                              <div
                                key={moein.code}
                                onClick={() => onSelectMoein?.(moein.code)}
                                className="p-2 bg-slate-50/50 hover:bg-blue-50/40 rounded-xl border border-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                                    {moein.code}
                                  </span>
                                  <div>
                                    <p className="text-xs font-medium text-slate-800">
                                      {moein.title}
                                    </p>
                                    {moein.description && (
                                      <p className="text-[10px] text-slate-400">
                                        {moein.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {moein.isFloatingTafsiliAllowed ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                      پذیرنده تفصیلی شناور
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                      معین مستقل
                                    </span>
                                  )}

                                  {!moein.isSystem && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                      کاربرساز
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}

                            {kol.moeins.length === 0 && (
                              <div className="py-2 text-[11px] text-slate-400 italic">
                                حساب معینی در این حساب کل تعریف نشده است. با دکمه «معین جدید» اضافه کنید.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Moein Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800">تعریف حساب معین جدید (سطح ۳)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMoein} className="p-4 space-y-3.5">
              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                    modalFeedback.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {modalFeedback.msg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  حساب کل والد (سطح ۲):
                </label>
                <select
                  value={selectedKolForNew}
                  onChange={e => handleKolChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white"
                >
                  {STANDARD_ACCOUNT_KOLS.map(k => (
                    <option key={k.code} value={k.code}>
                      {k.code} - {k.title} (گروه {k.groupCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    کد معین (پیشنهادی):
                  </label>
                  <input
                    type="text"
                    value={newMoeinCode}
                    onChange={e => setNewMoeinCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:bg-white"
                    placeholder="مثال: 10105"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ماهیت حساب:
                  </label>
                  <select
                    value={newMoeinNature}
                    onChange={e => setNewMoeinNature(e.target.value as AccountNature)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                  >
                    <option value="debit">بدهکار</option>
                    <option value="credit">بستانکار</option>
                    <option value="both">دوگانه</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان حساب معین:
                </label>
                <input
                  type="text"
                  value={newMoeinTitle}
                  onChange={e => setNewMoeinTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                  placeholder="مثلاً: تنخواه شعبه اصفهان یا درآمد نصب تجهیزات"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-tafsili-allowed"
                  checked={isTafsiliAllowed}
                  onChange={e => setIsTafsiliAllowed(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chk-tafsili-allowed" className="text-xs text-slate-700 font-medium cursor-pointer">
                  این حساب معین پذیرنده تفصیلی شناور (سطح ۴) است
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  ذخیره حساب معین
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
