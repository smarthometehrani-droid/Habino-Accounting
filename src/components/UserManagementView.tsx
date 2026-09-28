import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import {
  ROLE_DETAILS_FA,
  ROLE_DEFAULT_PERMISSIONS,
  GUILD_STRATEGIES,
  PLAN_LIMITS
} from '../lib/authEngine';
import { UserRole, UserPermission, AppUser, GuildType } from '../types';
import {
  Users,
  Shield,
  ShieldCheck,
  Building2,
  UserPlus,
  Crown,
  Briefcase,
  FileSpreadsheet,
  ScanBarcode,
  Package,
  Headphones,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRightLeft,
  Key,
  Lock,
  Calendar,
  Check,
  Trash2,
  Edit,
  Sliders,
  History,
  Info,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { TenantIsolationVerificationStudio } from './TenantIsolationVerificationStudio';

export const UserManagementView: React.FC = () => {
  const {
    currentUser,
    activeTenant,
    availableTenants,
    tenantUsers,
    auditLogs,
    switchTenant,
    createTenantUser,
    updateTenantUser,
    deleteTenantUser,
    loginAsPredefined
  } = useAccounting();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'tenants' | 'matrix' | 'guild' | 'audit' | 'isolation'>('users');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New User Form State
  const [newUserFullName, setNewUserFullName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('tenant_cashier');
  const [newUserTenantId, setNewUserTenantId] = useState<string>(activeTenant.id);
  const [newUserNotes, setNewUserNotes] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isOwner = currentUser?.role === 'tenant_owner' || isSuperAdmin;

  // Filtered users
  const filteredUsers = tenantUsers.filter(u => {
    // If not super admin, only show users belonging to active tenant
    if (!isSuperAdmin && u.tenantId !== activeTenant.id) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    return true;
  });

  const roleIcons: Record<UserRole, any> = {
    super_admin: Crown,
    hubino_support: Headphones,
    tenant_owner: Briefcase,
    tenant_accountant: FileSpreadsheet,
    tenant_cashier: ScanBarcode,
    tenant_inventory: Package,
    tenant_auditor: Eye
  };

  const permissionsList: { id: UserPermission; labelFa: string; category: string }[] = [
    { id: 'platform:manage_tenants', labelFa: 'مدیریت کل مستأجران پلتفرم', category: 'سطح پلتفرم' },
    { id: 'platform:view_all_data', labelFa: 'مشاهده تجمیعی کل اطلاعات سیستم', category: 'سطح پلتفرم' },
    { id: 'tenant:manage_users', labelFa: 'تعریف و مدیریت کاربران مستأجر', category: 'سازمانی' },
    { id: 'tenant:manage_settings', labelFa: 'تغییر تنظیمات و اطلاعات شرکت', category: 'سازمانی' },
    { id: 'tenant:manage_license', labelFa: 'ارتقای لایسنس و اشتراک', category: 'سازمانی' },
    { id: 'accounting:access_ledger', labelFa: 'دسترسی به دفتر کل و ثبت سند دوبل', category: 'مالی و حسابداری' },
    { id: 'accounting:manage_invoices', labelFa: 'صدور، تایید و ویرایش فاکتورها', category: 'مالی و حسابداری' },
    { id: 'accounting:manage_checks', labelFa: 'ثبت و وصول چک‌های صیادی', category: 'مالی و حسابداری' },
    { id: 'accounting:manage_payroll', labelFa: 'محاسبه حقوق، دستمزد و دیسکت بیمه', category: 'مالی و حسابداری' },
    { id: 'accounting:view_reports', labelFa: 'مشاهده صورت‌های مالی و ترازنامه', category: 'گزارش‌گیری' },
    { id: 'accounting:view_profit', labelFa: 'مشاهده ارقام سود خالص، حاشیه سود و بهای تمام‌شده', category: 'گزارش‌گیری' },
    { id: 'accounting:delete_records', labelFa: 'حذف دائمی اسناد، فاکتورها و چک‌ها', category: 'امنیتی' },
    { id: 'inventory:manage_stock', labelFa: 'مدیریت انبار، موجودی و خدمات', category: 'عملیات' },
    { id: 'tax:submit_mowadian', labelFa: 'ارسال اسناد به سامانه مودیان مالیاتی', category: 'مالیاتی' },
    { id: 'ai:use_synapse_cfo', labelFa: 'مشاوره صوتی و تحلیلی هوش مصنوعی سیناپس', category: 'هوشمند' }
  ];

  const currentPlan = activeTenant.subscription?.plan || 'starter';
  const planLimits = PLAN_LIMITS[currentPlan];
  const activeTenantUsersCount = tenantUsers.filter(u => u.tenantId === activeTenant.id).length;
  const isSeatLimitReached = activeTenantUsersCount >= planLimits.maxUsers && !isSuperAdmin;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFullName.trim() || !newUserEmail.trim()) {
      setFeedbackMsg({ type: 'error', text: 'نام کامل و ایمیل کاربر الزامی است.' });
      return;
    }

    if (isSeatLimitReached) {
      setFeedbackMsg({
        type: 'error',
        text: `سقف تعداد مجاز کاربران در ${planLimits.planNameFa} تکمیل است (${planLimits.maxUsers} کاربر). لطفاً جهت تعریف کاربر جدید، پکیج خود را ارتقا دهید.`
      });
      return;
    }

    try {
      await createTenantUser({
        tenantId: newUserTenantId,
        email: newUserEmail.trim(),
        phone: newUserPhone.trim() || '۰۹۱۲۰۰۰۰۰۰۰',
        fullName: newUserFullName.trim(),
        role: newUserRole,
        permissions: ROLE_DEFAULT_PERMISSIONS[newUserRole],
        status: 'active',
        notes: newUserNotes.trim()
      });

      setFeedbackMsg({ type: 'success', text: `کاربر «${newUserFullName}» با موفقیت اضافه شد.` });
      setShowAddModal(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserNotes('');
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e?.message || 'خطا در ثبت کاربر' });
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    await updateTenantUser(user.id, { status: nextStatus });
    setFeedbackMsg({
      type: 'success',
      text: `وضعیت کاربر «${user.fullName}» به ${nextStatus === 'active' ? 'فعال' : 'غیرفعال'} تغییر یافت.`
    });
  };

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (window.confirm(`آیا از حذف کاربر «${fullName}» از پایگاه داده اطمینان دارید؟`)) {
      await deleteTenantUser(userId);
      setFeedbackMsg({ type: 'success', text: `کاربر «${fullName}» حذف شد.` });
    }
  };

  const handleSwitchWorkspace = async (targetTenantId: string) => {
    const res = await switchTenant(targetTenantId);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs text-blue-200 font-mono tracking-wider">HABINO RBAC & MULTI-TENANT ENGINE</span>
          </div>
          <h1 className="text-xl font-black text-white">مدیریت اعضا، نقش‌ها و مستأجران سازمانی هابینو</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            ایزولاسیون کامل اطلاعات بر اساس <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">tenant_id</code>، اعمال الگوهای امنیتی RLS، مدیریت ۵ سطح نقش کاربری، و استراتژی اصناف.
          </p>
        </div>

        {/* Current User & Workspace Card */}
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3 backdrop-blur-xs shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
            {currentUser?.fullName ? currentUser.fullName[0] : 'هـ'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">{currentUser?.fullName}</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                {currentUser?.role ? ROLE_DETAILS_FA[currentUser.role]?.title.split('(')[0] : 'کاربر'}
              </span>
            </div>
            <div className="text-[11px] text-blue-200/90 mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-300" />
              <span>مستأجر: <strong>{activeTenant.name}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
            بستن
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>کاربران و اعضای مستأجر ({filteredUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tenants')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'tenants'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>مستأجران سازمانی هابینو ({availableTenants.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'matrix'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>ماتریس سطوح دسترسی (RBAC Matrix)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guild')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'guild'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>استراتژی اصناف کسب‌وکار (Strategy Pattern)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>لاگ‌های امنیتی ورود و رخدادها ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('isolation')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'isolation'
              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>تست ایزولاسیون مستأجران (RLS Studio)</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="جستجو در اعضا (نام، ایمیل، موبایل)..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="all">همه نقش‌ها</option>
                <option value="super_admin">ادمین ارشد هابینو</option>
                <option value="hubino_support">پشتیبان فنی هابینو</option>
                <option value="tenant_owner">مالک مستأجر</option>
                <option value="tenant_accountant">حسابدار ارشد</option>
                <option value="tenant_cashier">صندوق‌دار</option>
                <option value="tenant_inventory">انباردار و مجری خدمات</option>
                <option value="tenant_auditor">حسابرس مستقل</option>
              </select>
            </div>

            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>تعریف کاربر سازمانی جدید</span>
              </button>
            )}
          </div>

          {/* Seat & License Quota Banner (Level 2 Entitlement) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">سطح پکیج و لایسنس مستأجر:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${planLimits.badgeColor}`}>
                    {planLimits.planNameFa}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تعداد اعضای فعال: <strong className="text-slate-800">{activeTenantUsersCount}</strong> از{' '}
                  <strong className="text-slate-800">{planLimits.maxUsers >= 900 ? 'نامحدود' : `${planLimits.maxUsers} کاربر`}</strong>{' '}
                  مجاز در این پکیج
                </p>
              </div>
            </div>

            {isSeatLimitReached && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ظرفیت کاربران تکمیل شده است (نیازمند ارتقای پکیج)</span>
              </div>
            )}
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => {
              const roleMeta = ROLE_DETAILS_FA[user.role];
              const RoleIcon = roleIcons[user.role] || Users;
              const isCurrent = currentUser?.id === user.id;
              const tenantObj = availableTenants.find(t => t.id === user.tenantId);

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition-all relative flex flex-col justify-between ${
                    isCurrent ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${roleMeta.badgeColor}`}>
                        {roleMeta.title.split('(')[0]}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                            اکانت جاری
                          </span>
                        )}
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={user.status === 'active' ? 'کاربر فعال' : 'غیرفعال'}
                        />
                      </div>
                    </div>

                    {/* User profile details */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                        <RoleIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{user.fullName}</h3>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 ltr text-right font-mono">{user.phone}</p>
                      </div>
                    </div>

                    {/* Metadata & Tenant info */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] space-y-1 mb-3">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>مستأجر سازمانی:</span>
                        <span className="font-bold text-slate-700">{tenantObj?.name || user.tenantId}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>آخرین فعالیت:</span>
                        <span className="text-slate-600">{user.lastLoginAt || 'ثبت نشده'}</span>
                      </div>
                      {user.notes && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/60">
                          {user.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => loginAsPredefined(user.id)}
                      disabled={isCurrent}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        isCurrent
                          ? 'text-slate-400 bg-slate-100 cursor-default'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {isCurrent ? 'آنلاین' : 'ورود مستقیم'}
                    </button>

                    {isOwner && !isCurrent && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            user.status === 'active'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={user.status === 'active' ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی مجدد'}
                        >
                          {user.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.fullName)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="حذف کاربر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS LIST & WORKSPACE SWITCHER */}
      {activeSubTab === 'tenants' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-800">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">معماری ایزولاسیون چندمستأجری هابینو (SaaS Multi-Tenancy):</p>
              <p className="leading-relaxed text-blue-700">
                هر مستأجر (Tenant) یک فضای کاری کاملاً مجزا با دفاتر مالی، مشتریان، انبار و سامانه مودیان مستقل دارد. ادمین‌های ارشد هابینو می‌توانند بدون افشای داده‌های بین‌شرکتی، فضای کاری را تغییر دهند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableTenants.map(tenant => {
              const isCurrentTenant = activeTenant.id === tenant.id;
              const guildStrategy = GUILD_STRATEGIES[tenant.guildType];
              const membersCount = tenantUsers.filter(u => u.tenantId === tenant.id).length;

              return (
                <div
                  key={tenant.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isCurrentTenant
                      ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: tenant.metadata.themeColor || '#2563eb' }}
                        />
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{tenant.slug}</span>
                      </div>
                      {isCurrentTenant ? (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          مستأجر فعال
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          مستأجر مستقل
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1">{tenant.name}</h3>
                    <p className="text-xs text-blue-600 font-semibold mb-3">صنف: {guildStrategy?.nameFa}</p>

                    {/* Metadata breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5 mb-4">
                      <div className="flex justify-between text-slate-600">
                        <span>مدیرعامل / مالک:</span>
                        <span className="font-bold text-slate-900">{tenant.ownerName}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>کد اقتصادی:</span>
                        <span className="font-mono text-slate-800">{tenant.metadata.economicCode || '---'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>تعداد کاربران فعال:</span>
                        <span className="font-bold text-slate-900">{membersCount} کاربر</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>شناسه سامانه مودیان:</span>
                        <span className="font-mono text-[10px] text-slate-500">{tenant.metadata.mowadianClientId || 'فعال'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSwitchWorkspace(tenant.id)}
                    disabled={isCurrentTenant}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isCurrentTenant
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-slate-900 hover:bg-blue-600 text-white shadow-xs'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isCurrentTenant ? 'فضای کاری جاری' : 'ورود و سوییچ به این مستأجر'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RBAC PERMISSIONS MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">ماتریس مجوزهای دسترسی نقش‌های ۵‌گانه هابینو</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تعیین دقیق حدود دسترسی هر لایه کاربری برای تضمین عدم نشت اسناد و کنترل‌های داخلی
              </p>
            </div>
            <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-xl font-bold border border-purple-200">
              ۵ سطح نقش سازمانی
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">دسته‌بندی و عنوان دسترسی</th>
                  <th className="p-3.5 text-center bg-purple-50 text-purple-900">ادمین ارشد هابینو</th>
                  <th className="p-3.5 text-center bg-blue-50 text-blue-900">مدیر مستأجر</th>
                  <th className="p-3.5 text-center bg-emerald-50 text-emerald-900">حسابدار ارشد</th>
                  <th className="p-3.5 text-center bg-amber-50 text-amber-900">صندوق‌دار</th>
                  <th className="p-3.5 text-center bg-slate-200/60 text-slate-900">حسابرس مستقل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsList.map(perm => {
                  const hasSuper = ROLE_DEFAULT_PERMISSIONS.super_admin.includes(perm.id);
                  const hasOwner = ROLE_DEFAULT_PERMISSIONS.tenant_owner.includes(perm.id);
                  const hasAccountant = ROLE_DEFAULT_PERMISSIONS.tenant_accountant.includes(perm.id);
                  const hasCashier = ROLE_DEFAULT_PERMISSIONS.tenant_cashier.includes(perm.id);
                  const hasAuditor = ROLE_DEFAULT_PERMISSIONS.tenant_auditor.includes(perm.id);

                  return (
                    <tr key={perm.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{perm.labelFa}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{perm.id} ({perm.category})</div>
                      </td>
                      <td className="p-3.5 text-center bg-purple-50/30">
                        {hasSuper ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3.5 text-center bg-blue-50/30">
                        {hasOwner ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3.5 text-center bg-emerald-50/30">
                        {hasAccountant ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3.5 text-center bg-amber-50/30">
                        {hasCashier ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3.5 text-center bg-slate-100/40">
                        {hasAuditor ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GUILD STRATEGY PATTERN */}
      {activeSubTab === 'guild' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">الگوی استراتژی اصناف (Guild Strategy Pattern)</h2>
              <p className="text-xs text-slate-300 mt-1">
                تطبیق خودکار سرفصل‌های دفتر کل دوبل، ضرایب مالیاتی، و ساختار فاکتور بر اساس صنف مستأجر
              </p>
            </div>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-xl border border-blue-400/30">
              صنف مستأجر فعال: {GUILD_STRATEGIES[activeTenant.guildType]?.nameFa}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(GUILD_STRATEGIES) as GuildType[]).map(key => {
              const strategy = GUILD_STRATEGIES[key];
              const isSelected = activeTenant.guildType === key;

              return (
                <div
                  key={key}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900">{strategy.nameFa}</h3>
                    {isSelected && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                        صنف فعال مستأجر
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{strategy.description}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-600">نرخ پیش‌فرض مالیات:</span>
                      <span className="font-bold text-slate-900">٪{strategy.defaultTaxRate} ارزش افزوده</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-600">قالب فاکتور پیشنهادی:</span>
                      <span className="font-bold text-blue-600">{strategy.recommendedInvoiceTemplate}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-600 block mb-1.5 font-bold">سرفصل‌های اختصاصی دفتر کل دوبل:</span>
                      <div className="space-y-1">
                        {strategy.customLedgerAccounts.map(acc => (
                          <div key={acc.code} className="flex justify-between text-[11px] text-slate-700">
                            <span>{acc.title}</span>
                            <span className="font-mono text-slate-500">{acc.code} ({acc.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">تاریخچه رویدادهای امنیتی و ورود کاربران (Security Audit Trail)</h2>
              <p className="text-xs text-slate-500 mt-0.5">ثبت غیرقابل دستکاری رخدادهای ورود، سوییچ مستأجر و عملیات حساس</p>
            </div>
            <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
              {auditLogs.length} لاگ ثبتی
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{log.userFullName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">({log.resource})</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.details}</p>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 block">{log.timestamp}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">مستأجر: {log.tenantId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ISOLATION AUDIT & BREACH SIMULATOR */}
      {activeSubTab === 'isolation' && (
        <TenantIsolationVerificationStudio />
      )}

      {/* CREATE NEW USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm text-white">تعریف کاربر سازمانی جدید</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-white/80 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={newUserFullName}
                  onChange={e => setNewUserFullName(e.target.value)}
                  placeholder="مثال: علی رضایی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پست الکترونیکی (ایمیل):</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="user@company.ir"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs ltr text-left focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شماره همراه:</label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs ltr text-left focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نقش سازمانی و سطح دسترسی:</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="tenant_cashier">صندوق‌دار و متصدی فروش (ثبت سریع فاکتور و چک)</option>
                  <option value="tenant_inventory">انباردار و مجری خدمات (موجودی کالا، بارکد و فرم اصناف)</option>
                  <option value="tenant_accountant">حسابدار ارشد مستأجر (دفتر کل دوبل، تراز و حقوق)</option>
                  <option value="tenant_owner">مدیر ارشد و مالک مستأجر (دسترسی کامل شرکتی)</option>
                  <option value="tenant_auditor">حسابرس و ناظر مالی (فقط‌خواندنی)</option>
                  {isSuperAdmin && <option value="hubino_support">پشتیبان فنی هابینو (سطح پلتفرم / عیب‌یابی)</option>}
                  {isSuperAdmin && <option value="super_admin">ادمین ارشد هابینو (دسترسی فراگیر)</option>}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {ROLE_DETAILS_FA[newUserRole]?.description}
                </p>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تخصیص به مستأجر:</label>
                  <select
                    value={newUserTenantId}
                    onChange={e => setNewUserTenantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    {availableTenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">یادداشت سازمانی (اختیاری):</label>
                <textarea
                  value={newUserNotes}
                  onChange={e => setNewUserNotes(e.target.value)}
                  placeholder="مثال: متصدی شعبه ۲ فروشگاه"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  ثبت و فعال‌سازی کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
