import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Fingerprint,
  FileBadge,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Code,
  Sparkles,
  RefreshCw,
  FileSignature,
  Lock,
  Award,
  Building2,
  Download,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  HabinoDIDProtocol,
  computeSHA256
} from '../lib/didProtocol';
import {
  DIDKeypairRecord,
  VerifiableCredential,
  W3CDIDDocument,
  CryptographicProof
} from '../types';

export const DecentralizedIdStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keyring' | 'credentials' | 'signer' | 'roadmap'>('keyring');
  const [keyring, setKeyring] = useState<DIDKeypairRecord[]>([]);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Selected DID for inspecting document
  const [selectedDidDoc, setSelectedDidDoc] = useState<W3CDIDDocument | null>(null);
  const [selectedVC, setSelectedVC] = useState<VerifiableCredential | null>(null);

  // New DID Modal
  const [showNewDidModal, setShowNewDidModal] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newRole, setNewRole] = useState<'tenant' | 'client' | 'authority' | 'escrow'>('tenant');
  const [newSlug, setNewSlug] = useState('');
  const [isGeneratingDid, setIsGeneratingDid] = useState(false);

  // New VC Modal
  const [showNewVcModal, setShowNewVcModal] = useState(false);
  const [vcSubjectName, setVcSubjectName] = useState('شرکت مهندسی البرز فناوری');
  const [vcSubjectDid, setVcSubjectDid] = useState('');
  const [vcGuildCategory, setVcGuildCategory] = useState('فناوری اطلاعات و خدمات رایانه‌ای');
  const [vcRegNumber, setVcRegNumber] = useState('۲۹۱۸۴-صنف');
  const [vcScope, setVcScope] = useState('طراحی و پیاده‌سازی زیرساخت‌های فناوری و سامانه‌های یکپارچه بازرگانی');
  const [vcScore, setVcScore] = useState(95);
  const [isIssuingVc, setIsIssuingVc] = useState(false);

  // Signer / Verifier Playground State
  const [signSelectedDid, setSignSelectedDid] = useState<string>('');
  const [documentToSign, setDocumentToSign] = useState<string>(
    'قرارداد هوشمند هابینو شماره HC-1403-88410\nموضوع: استقرار تجهیزات شبکه و نظارت تصویری ساختمان مرکزی هلدینگ پارس\nمبلغ قرارداد: ۳۶۰,۰۰۰,۰۰۰ تومان\nتعهدات: تحویل در ۴۰ روز با گارانتی ۲۴ ماهه و داوری مرضی‌الطرفین کمیته فنی سایرافلو.'
  );
  const [generatedProof, setGeneratedProof] = useState<CryptographicProof | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Verifier Playground
  const [verifyInputDoc, setVerifyInputDoc] = useState<string>('');
  const [verifyInputProof, setVerifyInputProof] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    isValid?: boolean;
    hashMatches?: boolean;
    signatureValid?: boolean;
    details?: string;
  }>({ tested: false });

  // Universal VC Verification modal/state
  const [vcVerifyResult, setVcVerifyResult] = useState<Record<string, { isValid: boolean; details: string }>>({});

  useEffect(() => {
    loadKeyringAndCredentials();
  }, []);

  const loadKeyringAndCredentials = () => {
    const keys = HabinoDIDProtocol.getKeyring();
    setKeyring(keys);
    if (keys.length > 0 && !signSelectedDid) {
      setSignSelectedDid(keys[0].did);
    }
    const creds = HabinoDIDProtocol.getCredentials();
    setCredentials(creds);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Generate New DID Identity
  const handleCreateNewIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;

    setIsGeneratingDid(true);
    try {
      const created = await HabinoDIDProtocol.createIdentity({
        alias: newAlias.trim(),
        role: newRole,
        customSlug: newSlug.trim() || undefined
      });
      loadKeyringAndCredentials();
      setShowNewDidModal(false);
      setNewAlias('');
      setNewSlug('');
      setSelectedDidDoc(created.didDocument);
    } catch (err) {
      console.error(err);
      alert('خطا در تولید شناسه W3C DID');
    } finally {
      setIsGeneratingDid(false);
    }
  };

  // Issue New Verifiable Credential
  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuingVc(true);
    try {
      const targetSubjectDid = vcSubjectDid || keyring.find(k => k.role === 'tenant')?.did || 'did:habino:tenant-custom';
      const authorityDid = keyring.find(k => k.role === 'authority')?.did || 'did:habino:sira-authority';

      const vc = await HabinoDIDProtocol.issueCredential({
        issuerDid: authorityDid,
        credentialType: 'GuildBusinessLicense',
        expirationDays: 365,
        subject: {
          id: targetSubjectDid,
          holderName: vcSubjectName,
          guildCategory: vcGuildCategory,
          registrationNumber: vcRegNumber,
          technicalCompetencyScore: vcScore,
          siraFlowTrustRank: vcScore >= 90 ? 'A+' : 'A',
          licensedScope: vcScope,
          verifiedBySiraFlow: true,
          establishedYear: 1400,
          city: 'تهران'
        }
      });

      loadKeyringAndCredentials();
      setShowNewVcModal(false);
      setSelectedVC(vc);
    } catch (err) {
      console.error(err);
      alert('خطا در صدور مدرک');
    } finally {
      setIsIssuingVc(false);
    }
  };

  // Sign Document with WebCrypto
  const handleSignDocument = async () => {
    if (!signSelectedDid || !documentToSign.trim()) return;
    setIsSigning(true);
    try {
      const proof = await HabinoDIDProtocol.signDocument(signSelectedDid, documentToSign);
      setGeneratedProof(proof);
      setVerifyInputDoc(documentToSign);
      setVerifyInputProof(JSON.stringify(proof, null, 2));
    } catch (err: any) {
      alert('خطا در امضای رمزنگاری: ' + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // Verify Document with Public Key
  const handleVerifyDocument = async () => {
    if (!verifyInputDoc || !verifyInputProof) return;
    try {
      const parsedProof: CryptographicProof = JSON.parse(verifyInputProof);
      const res = await HabinoDIDProtocol.verifyDocumentProof(verifyInputDoc, parsedProof);
      
      let details = '';
      if (!res.hashMatches) {
        details = 'هش محتوای سند تغییر یافته است! سند دستکاری شده است.';
      } else if (!res.signatureValid) {
        details = 'امضای الکترونیکی با کلید عمومی صادرکننده تطابق ندارد.';
      } else {
        details = `امضای رمزنگاری (${res.signerDid}) کاملاً معتبر و محتوای سند غیرقابل انکار است.`;
      }

      setVerifyResult({
        tested: true,
        isValid: res.isValid,
        hashMatches: res.hashMatches,
        signatureValid: res.signatureValid,
        details
      });
    } catch (err: any) {
      setVerifyResult({
        tested: true,
        isValid: false,
        details: 'خطای فرمت در بلوک اثبات امضا (JSON نامعتبر است): ' + err.message
      });
    }
  };

  // Verify a single VC
  const handleVerifyCredentialCard = async (vc: VerifiableCredential) => {
    const res = await HabinoDIDProtocol.verifyCredential(vc);
    setVcVerifyResult(prev => ({
      ...prev,
      [vc.id]: {
        isValid: res.isValid,
        details: res.details
      }
    }));
  };

  // Export Keyring as JSON
  const handleExportKeyring = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keyring, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `habino_did_keyring_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Banner: Protocol Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>فاز ۳ رودمپ مهندسی هابینو — استقرار پروتکل غیرمتمرکز هویت وب</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>پروتکل هویت غیرمتمرکز و امضای رمزنگاری (W3C DID & VC)</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              تثبیت هویت سازمانی مستأجران، مدارک قابل راستی‌آزمایی اصناف (Verifiable Credentials) و امضای زنجیره‌ای اسناد تجاری با زوج‌کلیدهای نامتقارن ECDSA P-256 و SHA-256 بدون وابستگی به سرورهای متمرکز.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-xl font-black text-blue-400 font-mono block">{keyring.length}</span>
              <span className="text-[11px] text-slate-300">شناسه DID فعال</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-xl font-black text-emerald-400 font-mono block">{credentials.length}</span>
              <span className="text-[11px] text-slate-300">مدارک اصناف (VC)</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-amber-300 block mt-1">ECDSA P-256</span>
              <span className="text-[11px] text-slate-300">رمزنگاری سخت‌افزاری</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-indigo-300 block mt-1">W3C Compliant</span>
              <span className="text-[11px] text-slate-300">استاندارد جهانی</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('keyring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'keyring'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>کیف‌پول هویت سازمانی (DID Keyring)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono">{keyring.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'credentials'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileBadge className="w-4 h-4" />
          <span>مدارک قابل راستی‌آزمایی اصناف (Verifiable Credentials)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono">{credentials.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('signer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'signer'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>کارگاه امضا و صحه‌گذاری رمزنگاری اسناد</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'roadmap'
              ? 'bg-amber-500 text-slate-900 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>وضعیت مایلستون‌های فاز ۳ رودمپ</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-900 text-amber-300 font-bold font-mono">۱۰۰٪</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: DID KEYRING & IDENTITIES
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'keyring' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">کلیدهای هویت سازمانی غیرمتمرکز هابینو (did:habino:...)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                کلیدهای رمزنگاری نامتقارن تولید شده در مرورگر مستأجران و کارفرمایان مطابق استاندارد رسمی کنسرسیوم وب (W3C DID)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportKeyring}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="دانلود نسخه پشتیبان کلیدها"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>پشتیبان JSON</span>
              </button>
              <button
                onClick={() => setShowNewDidModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تولید شناسه هویت جدید</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {keyring.map((k) => (
              <div
                key={k.did}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                      k.role === 'authority' ? 'bg-gradient-to-br from-indigo-600 to-purple-600' :
                      k.role === 'tenant' ? 'bg-gradient-to-br from-blue-600 to-cyan-600' :
                      k.role === 'client' ? 'bg-gradient-to-br from-emerald-600 to-teal-600' :
                      'bg-gradient-to-br from-slate-700 to-slate-900'
                    }`}>
                      {k.role === 'authority' ? <ShieldCheck className="w-5 h-5" /> :
                       k.role === 'tenant' ? <Building2 className="w-5 h-5" /> :
                       k.role === 'client' ? <Key className="w-5 h-5" /> :
                       <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{k.alias}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        k.role === 'authority' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        k.role === 'tenant' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        k.role === 'client' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {k.role === 'authority' ? 'نهاد صادرکننده و داوری سایرافلو' :
                         k.role === 'tenant' ? 'مستأجر تأییدشده پلتفرم' :
                         k.role === 'client' ? 'کارفرما و متقاضی خدمت' :
                         'صندوق امانی و تسویه قراردادها'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(k.did, k.did)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                      title="کپی شناسه کامل DID"
                    >
                      {copiedText === k.did ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setSelectedDidDoc(k.didDocument)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                      title="مشاهده مستند کامل W3C DID Document"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>W3C Document</span>
                    </button>
                  </div>
                </div>

                {/* DID Identifier Badge */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">شناسه استاندارد W3C DID:</span>
                  <div className="flex items-center justify-between font-mono text-xs text-blue-700 font-bold select-all overflow-x-auto no-scrollbar">
                    <span>{k.did}</span>
                  </div>
                </div>

                {/* Crypto Key Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">الگوریتم رمزنگاری:</span>
                    <span className="font-bold text-slate-800 font-mono">{k.algorithm}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">اثرانگشت کلید (Fingerprint):</span>
                    <span className="font-bold text-slate-800 font-mono">{k.fingerprint}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">تاریخ ایجاد:</span>
                    <span className="font-bold text-slate-800 font-mono">{k.createdAt}</span>
                  </div>
                </div>

                {/* Public Key snippet */}
                <div className="text-[11px] text-slate-500 font-mono truncate bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 ml-1">Pub:</span>
                  {k.publicKeyHex.substring(0, 42)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: VERIFIABLE CREDENTIALS (VC)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-800">مدارک و پروانه‌های کسب قابل راستی‌آزمایی اصناف (W3C Verifiable Credentials)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مدارک دارای مهر و امضای رمزنگاری‌شده دیجیتال، جهت تبادل برون‌پلتفرمی و اثبات بی‌واسطه صلاحیت فنی بدون نیاز به استعلام کاغذی
              </p>
            </div>
            <button
              onClick={() => setShowNewVcModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>صدور گواهی صلاحیت دیجیتال جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {credentials.map((vc) => {
              const verifyStatus = vcVerifyResult[vc.id];
              return (
                <div
                  key={vc.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block font-mono">
                            {vc.type.find(t => t !== 'VerifiableCredential') || 'Credential'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {vc.credentialSubject.holderName}
                          </h4>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>معتبر W3C</span>
                      </span>
                    </div>

                    {/* Guild and Attributes */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">صنف / رسته:</span>
                        <span className="font-bold text-slate-800">{vc.credentialSubject.guildCategory}</span>
                      </div>
                      {vc.credentialSubject.registrationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">شماره پروانه صنفی:</span>
                          <span className="font-bold text-slate-800 font-mono">{vc.credentialSubject.registrationNumber}</span>
                        </div>
                      )}
                      {vc.credentialSubject.technicalCompetencyScore && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">امتیاز صلاحیت فنی سایرافلو:</span>
                          <span className="font-extrabold text-blue-700 font-mono">
                            {vc.credentialSubject.technicalCompetencyScore} / ۱۰۰ (رتبه {vc.credentialSubject.siraFlowTrustRank})
                          </span>
                        </div>
                      )}
                      {vc.credentialSubject.licensedScope && (
                        <div className="pt-1 text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/60">
                          <span className="font-bold text-slate-700 block mb-0.5">دامنه صلاحیت و فعالیت:</span>
                          {vc.credentialSubject.licensedScope}
                        </div>
                      )}
                    </div>

                    {/* Issuer & Signature Block */}
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-indigo-900 font-bold">
                        <span>صادرکننده:</span>
                        <span className="text-[10px] text-indigo-600 font-mono">{vc.issuer.id}</span>
                      </div>
                      <p className="text-indigo-800 text-[10px] truncate">{vc.issuer.name}</p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>الگوریتم امضا: {vc.proof.algorithm}</span>
                        <span>هش: {vc.proof.documentHash.substring(0, 8)}...</span>
                      </div>
                    </div>

                    {/* Verification Result Toast if clicked */}
                    {verifyStatus && (
                      <div className={`p-3 rounded-2xl text-xs font-bold border transition-all ${
                        verifyStatus.isValid
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {verifyStatus.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                          <span>{verifyStatus.isValid ? 'راستی‌آزمایی رمزنگاری موفق:' : 'خطا در اصالت:'}</span>
                        </div>
                        <p className="text-[11px] font-normal mt-1 leading-relaxed">{verifyStatus.details}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleVerifyCredentialCard(vc)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>راستی‌آزمایی آفلاین</span>
                    </button>
                    <button
                      onClick={() => setSelectedVC(vc)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>JSON-LD</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: CRYPTOGRAPHIC SIGNER & VERIFIER
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'signer' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800">کارگاه امضای الکترونیکی نامتقارن و راستی‌آزمایی اسناد (ECDSA Signer & Verifier)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              امضای مستقیم هر متن، پیش‌نویس قرارداد، RFP یا فاکتور مالی با کلید اختصاصی DID و راستی‌آزمایی فوری با کلید عمومی جهت اثبات عدم انکار (Non-repudiation)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Signer */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-blue-600" />
                  <span>۱. امضای رمزنگاری سند با هویت DID</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">ECDSA P-256</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">انتخاب هویت امضاکننده (DID Keyring):</label>
                <select
                  value={signSelectedDid}
                  onChange={e => setSignSelectedDid(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {keyring.map(k => (
                    <option key={k.did} value={k.did}>
                      {k.alias} ({k.did})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">محتوای سند جهت امضا (متن قرارداد، شرایط RFP، تعهدات مالی):</label>
                <textarea
                  rows={6}
                  value={documentToSign}
                  onChange={e => setDocumentToSign(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSignDocument}
                disabled={isSigning || !documentToSign.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSigning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>امضای رمزنگاری سند با کلید خصوصی و ثبت هش SHA-256</span>
              </button>

              {/* Output proof */}
              {generatedProof && (
                <div className="p-4 bg-slate-900 text-emerald-400 rounded-2xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300 pb-1 border-b border-slate-800">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      بلوک اثبات امضا (Cryptographic Proof):
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(generatedProof, null, 2), 'proof-gen')}
                      className="p-1 hover:text-white transition-all"
                    >
                      {copiedText === 'proof-gen' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[11px] space-y-1 text-slate-300">
                    <p><span className="text-slate-500">Method:</span> {generatedProof.verificationMethod}</p>
                    <p><span className="text-slate-500">Doc SHA-256:</span> {generatedProof.documentHash.substring(0, 32)}...</p>
                    <p className="text-emerald-400 truncate"><span className="text-slate-500">Signature:</span> {generatedProof.proofValue}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Verifier */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>۲. آزمون راستی‌آزمایی و کشف هرگونه جعل (Verifier)</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">مستقل و آفلاین</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">متن سند ورودی (می‌توانید برای آزمون جعل، ۱ کاراکتر را تغییر دهید):</label>
                <textarea
                  rows={4}
                  value={verifyInputDoc}
                  onChange={e => setVerifyInputDoc(e.target.value)}
                  placeholder="متن سندی که باید اصالت آن سنجیده شود..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">بلوک اثبات امضا (JSON Proof):</label>
                <textarea
                  rows={4}
                  value={verifyInputProof}
                  onChange={e => setVerifyInputProof(e.target.value)}
                  placeholder="بلوک JSON شامل proofValue و documentHash..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleVerifyDocument}
                disabled={!verifyInputDoc || !verifyInputProof}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>بررسی تطابق ریاضی هش و راستی‌آزمایی امضا با کلید عمومی</span>
              </button>

              {/* Verification Result */}
              {verifyResult.tested && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                  verifyResult.isValid
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {verifyResult.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>سند کاملاً اصیل و امضا مورد تأیید است!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>هشدار امنیتی: امضا یا محتوای سند نامعتبر است!</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] pt-1">{verifyResult.details}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: ROADMAP PHASE 3 TRACKER
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">وضعیت تحقق کامل فاز ۳: پروتکل هویت غیرمتمرکز (W3C DID)</h3>
                  <p className="text-xs text-slate-500">تحویل موفق مایلستون‌های m-301 تا m-303 در اسپرینت جاری</p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                پیشرفت: ۱۰۰٪ (Ready for Phase 4)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              با پیاده‌سازی متد <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">did:habino:tenant</code>، استاندارد W3C Verifiable Credentials و یکپارچه‌سازی با قراردادهای هوشمند مناقصات، پلتفرم هابینو از یک نرم‌افزار صرفاً حسابداری به «سیستم‌عامل غیرمتمرکز تجارت و زیرساخت هویت وب» ارتقا یافت.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600">m-301</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">تکمیل ۱۰۰٪</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">تولید شناسه هویت W3C DID</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                پیاده‌سازی ساختار کامل DID Document شامل verificationMethod، authentication، assertionMethod و اتصال به کلیدهای ECDSA P-256.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                پشته: WebCrypto API, JSON-LD, NIST P-256
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600">m-302</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">تکمیل ۱۰۰٪</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">مدارک قابل راستی‌آزمایی (VC)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                صدور پروانه کسب دیجیتال اصناف، گواهی صلاحیت فنی سایرافلو و موتور راستی‌آزمایی آفلاین بدون نیاز به سرور مرکزی.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                پشته: W3C VC v1.1, Cryptographic Proofs
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600">m-303</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">تکمیل ۱۰۰٪</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">امضای رمزنگاری واقعی قراردادها</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                اتصال مستقیم به قراردادهای مناقصات و امضای دوطرفه کارفرما و مستأجر برنده با ثبت هش امن SHA-256 در زنجیره اثبات.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                پشته: WebCrypto Keyring, Non-repudiation
              </div>
            </div>
          </div>

          {/* ADR-004 Box */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">ADR-004 (ثبت مصوب معماری)</span>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">اجرا شده در کُد</span>
            </div>
            <h4 className="text-sm font-bold text-white">پیاده‌سازی پروتکل هویت غیرمتمرکز W3C DID و گواهی‌های قابل راستی‌آزمایی (VC)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>تصمیم اتخاذشده:</strong> استفاده از استاندارد W3C DID و زوج‌کلیدهای نامتقارن با شتاب‌دهنده سخت‌افزاری مرورگر (<code className="text-blue-300 font-mono">crypto.subtle</code>). این تصمیم امکان تبادل مستقل و برون‌پلتفرمی هویت اصناف را بدون قفل‌شدگی در دیتابیس اختصاصی میسر ساخته و هابینو را آماده جهش به فاز ۴ (Open Commerce API) می‌کند.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: W3C DID DOCUMENT VIEWER
          ───────────────────────────────────────────────────────────── */}
      {selectedDidDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-200 w-full max-w-2xl rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">مستند رسمی W3C DID Document (JSON-LD)</h3>
              </div>
              <button
                onClick={() => setSelectedDidDoc(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto font-mono text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-blue-300 select-all leading-relaxed">
              <pre>{JSON.stringify(selectedDidDoc, null, 2)}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-500 font-mono">{selectedDidDoc.id}</span>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedDidDoc, null, 2), 'did-doc-copy')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText === 'did-doc-copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>کپی کامل سند W3C</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VERIFIABLE CREDENTIAL JSON VIEWER
          ───────────────────────────────────────────────────────────── */}
      {selectedVC && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-200 w-full max-w-2xl rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">مستند گواهی قابل راستی‌آزمایی (W3C Verifiable Credential)</h3>
              </div>
              <button
                onClick={() => setSelectedVC(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto font-mono text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-emerald-300 select-all leading-relaxed">
              <pre>{JSON.stringify(selectedVC, null, 2)}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-500 font-mono">{selectedVC.id}</span>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedVC, null, 2), 'vc-doc-copy')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText === 'vc-doc-copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>کپی کامل JSON-LD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE NEW DID IDENTITY
          ───────────────────────────────────────────────────────────── */}
      {showNewDidModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">تولید شناسه هویت سازمانی W3C DID جدید</h3>
              </div>
              <button
                onClick={() => setShowNewDidModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewIdentity} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">نام یا عنوان سازمانی *</label>
                <input
                  type="text"
                  required
                  value={newAlias}
                  onChange={e => setNewAlias(e.target.value)}
                  placeholder="مثال: شرکت فنی مهندسی آریا نوین"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">نقش در اکوسیستم هابینو</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tenant">مستأجر / پیمانکار اصناف (Tenant)</option>
                  <option value="client">کارفرما / سفارش‌دهنده (Client)</option>
                  <option value="authority">نهاد داوری و ممیزی (Authority)</option>
                  <option value="escrow">صندوق امانی (Escrow)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">شناسه دلخواه (Slug اختیاری)</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                  placeholder="مثال: tenant-arya-novin"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">فرمت خروجی: did:habino:[slug]</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDidModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingDid || !newAlias.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                  {isGeneratingDid ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>تولید زوج‌کلید و ثبت DID</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ISSUE NEW VERIFIABLE CREDENTIAL
          ───────────────────────────────────────────────────────────── */}
      {showNewVcModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">صدور گواهی صلاحیت و پروانه کسب دیجیتال (VC)</h3>
              </div>
              <button
                onClick={() => setShowNewVcModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueCredential} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">نام دارنده گواهی (کسب‌وکار / مستأجر) *</label>
                <input
                  type="text"
                  required
                  value={vcSubjectName}
                  onChange={e => setVcSubjectName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">صنف کاری</label>
                  <input
                    type="text"
                    value={vcGuildCategory}
                    onChange={e => setVcGuildCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">شماره پروانه نظام صنفی</label>
                  <input
                    type="text"
                    value={vcRegNumber}
                    onChange={e => setVcRegNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">امتیاز صلاحیت فنی و کیفی (از ۱۰۰)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={vcScore}
                    onChange={e => setVcScore(Number(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className="font-mono font-bold text-sm text-emerald-700 w-12 text-center">{vcScore}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">دامنه تعهدات و صلاحیت ممیزی‌شده</label>
                <textarea
                  rows={2}
                  value={vcScope}
                  onChange={e => setVcScope(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                این مدرک پس از صدور، با کلید اختصاصی نهاد داوری هوشمند سایرافلو (<code className="font-mono text-[10px] font-bold">did:habino:sira-authority</code>) امضای رمزنگاری خواهد شد.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVcModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isIssuingVc || !vcSubjectName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {isIssuingVc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                  <span>صدور و امضای دیجیتال مدرک</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
