export type CurrencyType = 'IRT' | 'IRR' | 'USD';

export interface Client {
  id: string;
  tenantId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  nationalCode?: string;
  economicCode?: string;
  companyName?: string;
  balance?: number; // positive = debtor, negative = creditor
  creditLimit?: number; // سقف اعتبار مالی مجاز (۰ یا مقدار خالی = نامحدود)
  isBlockedForCredit?: boolean; // نشانگر مسدودی به دلیل فراتر رفتن از سقف اعتبار
  type?: 'individual' | 'corporate';
  notes?: string;
  isActive?: boolean;
  is_deleted?: boolean;
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>; // JSONB guild/custom metadata
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  barcode?: string;
  category?: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock?: number;
  description?: string;
  type?: 'good' | 'service';
  metadata?: Record<string, any>; // JSONB guild-specific strategy parameters (e.g. batch, expiry, specs)
}

export interface BarcodeScanRecord {
  id: string;
  code: string;
  format: string;
  timestamp: string;
  source: 'camera' | 'usb_gun' | 'image_upload' | 'manual';
  matchedItemId?: string;
  matchedItemName?: string;
  price?: number;
  stock?: number;
}

export interface InvoiceItem {
  id: string;
  itemId?: string;
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  metadata?: Record<string, any>; // JSONB guild-specific strategy parameters (e.g. area_sqm, expiry_date, carat)
}

export type InvoiceType = 
  | 'sale' 
  | 'purchase' 
  | 'proforma_sale' 
  | 'proforma_purchase' 
  | 'sale_return' 
  | 'purchase_return' 
  | 'proforma' 
  | 'service';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'cancelled' | 'overdue';
export type InvoiceTemplate = 'professional' | 'modern' | 'minimal' | 'classic';

export interface InvoiceDesignConfig {
  primaryColor?: string; // Hex color or preset e.g. #1e40af, #047857, #b91c1c, #4f46e5, #0f172a
  fontFamily?: 'vazir' | 'iranyekan' | 'serif' | 'mono';
  showLogo?: boolean;
  showStamp?: boolean;
  showSignature?: boolean;
  showWatermark?: boolean;
  showTaxColumn?: boolean;
  showDiscountColumn?: boolean;
  showPreviousBalance?: boolean; // نمایش مانده از قبل و جمع کل بدهی طرف‌حساب
  headerTitle?: string;
  notesTitle?: string;
  signatureSignerTitle?: string;
}

export interface Invoice {
  id: string;
  tenantId?: string;
  invoiceNumber: string;
  clientId: string;
  client_id?: string;
  clientName?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  template: InvoiceTemplate;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  amountPaid: number;
  remainingAmount: number;
  previousBalance?: number; // مانده حساب طرف‌حساب قبل از این فاکتور (تراز پیشین)
  totalDebt?: number; // جمع کل بدهی طرف‌حساب با احتساب مانده این فاکتور
  notes?: string;
  terms?: string;
  projectId?: string;
  designConfig?: InvoiceDesignConfig;
  metadata?: Record<string, any>; // JSONB guild-specific document metadata
  created_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  // ماژول امضای فیزیکی و تایید پیش‌فاکتور
  signatureUrl?: string;
  isSigned?: boolean;
  signedAt?: string;
  shareToken?: string;
  signatureMetadata?: {
    signatureId?: string;
    signerName?: string;
    signerRole?: 'vendor' | 'client' | 'representative';
    signerNationalId?: string;
    ipAddress?: string;
    userAgent?: string;
    signatureHash?: string;
  };
}

export interface InvoiceSignature {
  id: string;
  invoice_id: string;
  tenant_id: string;
  signature_url: string;
  ip_address?: string;
  user_agent?: string;
  signed_at: string;
  status: 'pending' | 'signed' | 'rejected';
  signer_name?: string;
  signer_national_id?: string;
  signer_role?: 'vendor' | 'client' | 'representative';
  verification_token?: string;
  signature_hash?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type CheckType = 'receivable' | 'payable';
export type CheckStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';

export interface Check {
  id: string;
  tenantId?: string;
  checkNumber: string;
  sayadNumber?: string;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  type: CheckType;
  status: CheckStatus;
  clientId: string;
  clientName?: string;
  description?: string;
  notes?: string;
  relatedInvoiceId?: string;
  relatedInstallmentId?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  tenantId?: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  fromAccount?: string;
  toAccount?: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  relatedInvoiceId?: string;
  relatedCheckId?: string;
  metadata?: Record<string, any>; // JSONB guild/audit metadata
}

export interface Installment {
  id: string;
  tenantId?: string;
  invoiceId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  checkId?: string;
  clientId: string;
  clientName?: string;
}

export interface BankAccount {
  id: string;
  tenantId?: string;
  bankName: string;
  accountNumber: string;
  cardNumber?: string;
  iban?: string;
  balance: number;
  branch?: string;
  holderName: string;
}

export interface Project {
  id: string;
  tenantId?: string;
  title: string;
  clientId: string;
  clientName?: string;
  budget: number;
  startDate: string;
  endDate?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  totalIncome?: number;
  totalExpense?: number;
  netProfit?: number;
  description?: string;
  rfpId?: string; // Linked RFP if originated from SiraFlow workflow
}

// ==========================================
// SiraFlow Decentralized RFP & Tender Protocol
// ==========================================

export type ProjectScale = 'small' | 'medium' | 'large' | 'enterprise';

export type RFPStatus = 
  | 'draft'
  | 'rfp_submitted'
  | 'ai_analyzing'
  | 'needs_revision' // Exception: missing critical fields -> creates system ticket
  | 'classified'
  | 'in_blind_tender'
  | 'evaluating_bids'
  | 'winner_selected'
  | 'contract_generated'
  | 'contract_signed';

export interface SiraFlowAnalysisResult {
  extractedAttributes: {
    brand?: string;
    modelOrStandard?: string;
    technicalSpecs: Record<string, any>;
    location: string;
    executionDurationDays: number;
    requiresOnSiteVisit: boolean;
    missingCriticalFields: string[];
  };
  projectClassification: {
    scale: ProjectScale;
    complexityScore: number; // 1-100
    estimatedBudgetFloor: number;
    estimatedBudgetCeiling: number;
    dumpingThresholdRatio: number; // e.g. 0.75 of floor budget
  };
  decisionPoints: {
    onSiteInspectionRequired: boolean;
    qualificationScoreThreshold: number; // e.g. 70/100
    evaluationWeights: {
      priceWeight: number; // e.g. 40%
      qualityWeight: number; // e.g. 60%
    };
  };
  confidenceScore: number; // 0-100
  aiReasoning: string;
  analyzedAt: string;
}

export interface RFPProject {
  id: string;
  tenantId: string;
  clientRefId: string;
  clientName: string;
  clientPhone?: string;
  title: string;
  category: string;
  description: string;
  dynamicFormData: Record<string, any>; // JSONB flexible inputs
  attachments: { id: string; name: string; size: string; type: string }[];
  status: RFPStatus;
  analysis?: SiraFlowAnalysisResult;
  tenderId?: string;
  systemTickets?: {
    id: string;
    issue: string;
    severity: 'low' | 'high' | 'critical';
    createdAt: string;
    resolved: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface BlindTenderBid {
  id: string;
  tenderId: string;
  tenantId: string;
  anonymousCode: string; // e.g. "مستأجر امن #T-8821" - identity hidden in blind tender
  bidAmount: number;
  deliveryDays: number;
  warrantyMonths: number;
  technicalProposal: string;
  technicalScore: number; // 0-100 given by SiraFlow
  priceScore: number; // calculated mathematically
  finalBalancedScore: number; // weighted balance between price & quality
  isDumpingSuspected: boolean; // Anti-dumping audit rule flag
  dumpingAuditNote?: string;
  complianceChecked: boolean;
  submittedAt: string;
}

export interface BlindTender {
  id: string;
  rfpId: string;
  projectTitle: string;
  projectScale: ProjectScale;
  status: 'open' | 'closed' | 'awarded';
  budgetCeiling: number;
  budgetFloor: number;
  dumpingAuditThreshold: number;
  invitedTenantsCount: number;
  bids: BlindTenderBid[];
  winnerBidId?: string;
  winnerTenantId?: string;
  winnerAnonymousCode?: string;
  selectionReason?: string;
  openedAt: string;
  closingDate: string;
}

export interface CryptographicProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
  documentHash: string;
  algorithm: string;
}

export interface SmartContractParty {
  role: 'employer' | 'winning_tenant' | 'habino_escrow';
  title: string;
  identifier: string;
  signatureStatus: 'signed' | 'pending';
  signedAt?: string;
  did?: string;
  signatureProof?: CryptographicProof;
}

export interface SmartContractMilestone {
  title: string;
  percentage: number;
  amount: number;
  conditions: string;
  status: 'pending' | 'in_progress' | 'verified' | 'released';
}

export interface SmartContractDraft {
  id: string;
  rfpId: string;
  tenderId: string;
  contractNumber: string;
  title: string;
  parties: SmartContractParty[];
  totalAmount: number;
  currency: CurrencyType;
  penaltiesPerDayDelay: number;
  warrantyPeriodMonths: number;
  arbitrationClause: string;
  milestones: SmartContractMilestone[];
  generatedByAi: boolean;
  aiVerificationHash: string;
  status: 'draft' | 'pending_signatures' | 'active_in_execution' | 'settled';
  createdAt: string;
}

// ==========================================
// ۳-LEVEL CHART OF ACCOUNTS (سرفصل‌های ۳ سطحی حسابداری)
// ==========================================

export type AccountNature = 'debit' | 'credit' | 'both';

export interface AccountGroup {
  code: string; // ۱ رقمی: ۱ تا ۹
  title: string;
  nature: AccountNature;
  description?: string;
}

export interface AccountKol {
  code: string; // ۲ رقمی: ۱۰ تا ۹۹
  groupCode: string;
  title: string;
  nature: AccountNature;
  description?: string;
}

export interface AccountMoein {
  code: string; // ۴ یا ۵ رقمی: مثلاً ۱۰۱۰۱
  kolCode: string;
  groupCode: string;
  title: string;
  nature: AccountNature;
  isFloatingTafsiliAllowed?: boolean; // آیا معین پذیرنده تفصیلی شناور است؟
  isSystem?: boolean; // سرفصل پیش‌فرض سیستمی یا کاربرساز
  description?: string;
}

// ==========================================
// FLOATING SUBSIDIARY ACCOUNTS (تفصیلی شناور اشخاص، شرکا و مراکز)
// ==========================================

export type TafsiliType = 
  | 'client'        // مشتری
  | 'supplier'      // تأمین‌کننده
  | 'partner'       // شریک یا سهامدار
  | 'personnel'     // پرسنل و کارمند
  | 'cost_center'   // مرکز هزینه / پروژه
  | 'bank_fund'     // صندوق / حساب واسط
  | 'other';        // سایر اشخاص و طرف‌حساب‌ها

export interface FloatingTafsiliAccount {
  id: string;
  code: string; // ۴ رقمی یکتا: مثلاً ۴۰۰۱، ۴۰۰۲
  title: string;
  type: TafsiliType;
  entityId?: string; // لینک به ClientId، EmployeeId، ProjectId و غیره
  phone?: string;
  nationalCode?: string;
  economicCode?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
  tenantId?: string;
  created_at?: string;
}

// ==========================================
// MULTI-COLUMN TRIAL BALANCE (تراز آزمایشی ۲، ۴ و ۶ ستونی)
// ==========================================

export type TrialBalanceColumnMode = '2_col' | '4_col' | '6_col';
export type TrialBalanceLevel = 'group' | 'kol' | 'moein' | 'tafsili';

export interface TrialBalanceRow {
  code: string;
  title: string;
  level: TrialBalanceLevel;
  parentCode?: string;
  
  // ۲ ستون گردش ابتدای دوره / قبل از دوره (مخصوص تراز ۶ ستونی)
  openingDebit: number;
  openingCredit: number;
  
  // ۲ ستون گردش طی دوره (مخصوص تراز ۴ و ۶ ستونی)
  periodDebit: number;
  periodCredit: number;
  
  // ۲ ستون مانده نهایی / پایان دوره (مشترک در ۲، ۴ و ۶ ستونی)
  closingDebit: number;
  closingCredit: number;
}

export interface AccountingEntry {
  id: string;
  tenantId?: string;
  documentNumber: string;
  date: string;
  description: string;
  accountCode: string; // کد معین یا سرفصل
  accountTitle: string;
  groupCode?: string; // کد گروه (سطح ۱)
  kolCode?: string;   // کد کل (سطح ۲)
  moeinCode?: string; // کد معین (سطح ۳)
  tafsiliCode?: string; // کد تفصیلی شناور (سطح ۴ اختیاری)
  tafsiliTitle?: string; // عنوان تفصیلی شناور (مثلاً نام شریک یا مشتری)
  tafsiliType?: TafsiliType; // جنس تفصیلی شناور
  debit: number;
  credit: number;
  clientId?: string;
  clientName?: string;
  projectTag?: string;
  referenceId?: string;
  baseCurrency?: CurrencyType; // واحد پول مبنای ذخیره‌سازی ثابت (ریال)
  baseDebit?: number; // مبلغ بدهکار به ریال پایه
  baseCredit?: number; // مبلغ بستانکار به ریال پایه
  exchangeRate?: number; // ضریب تبدیل به ریال (مثلاً برای تومان = ۱۰)
  created_at?: string;
}

export interface CompanySettings {
  name: string;
  legalName?: string;
  nationalId?: string;
  economicCode?: string;
  registrationNumber?: string;
  phone: string;
  email?: string;
  address: string;
  postalCode?: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  currency: CurrencyType;
  defaultTaxRate: number;
  invoiceNote?: string;
  invoiceTerms?: string;
  defaultInvoiceTemplate?: InvoiceTemplate;
  defaultInvoiceDesign?: InvoiceDesignConfig;
  ssoConfig?: SSODisketteConfig;
  guild?: string; // Tenant business guild e.g. services, consumables, installation, gold, it, general
  guildType?: string; // Guild type strategy alias
}

export interface DesignTokens {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    fontSizeBase: string;
    headingScale: number;
  };
  spacing: {
    paddingBase: string;
    borderRadius: string;
  };
}

export type ColorTokens = DesignTokens['colors'];
export type TypographyTokens = DesignTokens['typography'];
export type SpacingAndShapeTokens = DesignTokens['spacing'];

export type LicenseTier = 'trial' | 'pro' | 'enterprise' | 'bazaar';

export interface DemoVsMarketFeature {
  id: string;
  category: string;
  title: string;
  description: string;
  demoStatus: string;
  bazaarStatus: string;
  isActivatedInBazaar: boolean;
}

export interface LicenseInfo {
  status: 'active' | 'expired' | 'trial';
  tier: LicenseTier;
  licenseKey: string;
  holderName: string;
  activatedAt: string;
  expiresAt: string;
  maxInvoices?: number;
  maxUsers?: number;
  aiSynapseEnabled: boolean;
  offlineSyncEnabled: boolean;
  features: string[];
}

export interface BackupSnapshot {
  version: string;
  timestamp: string;
  backupId: string;
  tenantId: string;
  summary: {
    invoicesCount: number;
    checksCount: number;
    transactionsCount: number;
    clientsCount: number;
    inventoryCount: number;
    installmentsCount: number;
    banksCount: number;
    projectsCount: number;
    ledgerEntriesCount: number;
  };
  data: {
    invoices: Invoice[];
    checks: Check[];
    transactions: Transaction[];
    clients: Client[];
    inventory: InventoryItem[];
    installments: Installment[];
    bankAccounts: BankAccount[];
    projects: Project[];
    accountingEntries: AccountingEntry[];
    settings: CompanySettings;
    license?: LicenseInfo;
  };
}

// ────────────────────────────────────────
// PHASE 3: W3C DID & VERIFIABLE CREDENTIALS
// ────────────────────────────────────────

export interface W3CVerificationMethod {
  id: string;
  type: 'JsonWebKey2020' | 'Ed25519VerificationKey2020';
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
  publicKeyHex?: string;
}

export interface W3CServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
  description?: string;
}

export interface W3CDIDDocument {
  '@context': string[];
  id: string;
  controller?: string;
  verificationMethod: W3CVerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  capabilityInvocation?: string[];
  service?: W3CServiceEndpoint[];
  created?: string;
  updated?: string;
}

export interface VerifiableCredentialSubject {
  id: string; // Subject DID (e.g. did:habino:tenant-delta-infra)
  holderName: string;
  guildCategory: string;
  registrationNumber?: string;
  nationalEconomicCode?: string;
  technicalCompetencyScore?: number;
  siraFlowTrustRank?: 'A+' | 'A' | 'B' | 'Verified';
  licensedScope?: string;
  establishedYear?: number;
  city?: string;
  verifiedBySiraFlow: boolean;
  [key: string]: any;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: {
    id: string; // Issuer DID (e.g. did:habino:sira-authority)
    name: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: VerifiableCredentialSubject;
  proof: CryptographicProof;
}

export interface DIDKeypairRecord {
  did: string;
  alias: string;
  role: 'tenant' | 'client' | 'authority' | 'escrow';
  publicKeyHex: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk?: JsonWebKey;
  algorithm: 'ECDSA-P256' | 'Ed25519' | 'RSA-PSS';
  fingerprint: string;
  createdAt: string;
  isActive: boolean;
  didDocument: W3CDIDDocument;
}

// ==========================================
// Payroll & Social Security Insurance Types
// ==========================================

export type EmploymentType = 'full_time' | 'part_time' | 'contractual' | 'hourly' | 'consultant';

export interface Employee {
  id: string;
  tenantId: string;
  nationalId: string; // ۱۰ رقمی کد ملی
  identityNumber?: string; // شماره شناسنامه
  firstName: string;
  lastName: string;
  fatherName?: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married';
  childrenCount: number;
  ssoInsuranceNumber: string; // شماره بیمه تأمین اجتماعی ۸-۱۰ رقمی
  jobTitle: string;
  jobCode?: string; // کد استاندارد شغل تأمین اجتماعی
  department?: string;
  employmentType: EmploymentType;
  hireDate: string;
  bankName: string;
  bankAccountNumber: string;
  shabaNumber: string; // IR...
  baseDailyWage: number; // مزد روزانه مصوب قانون کار ریال
  monthlyBaseSalary: number; // حقوق پایه ماهانه ریال
  hasHousingAllowance: boolean; // حق مسکن
  hasGroceryAllowance: boolean; // بن کارگری (اقلام مصرفی خانوار)
  positionAllowance: number; // حق مسئولیت / سرپرستی / جذب
  isTaxExempt: boolean;
  workshopCode: string; // کد کارگاه ۱۰ رقمی تامین اجتماعی
  didIdentifier?: string; // W3C DID کارمند
  status: 'active' | 'leave' | 'terminated';
  createdAt: string;
}

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  year: number; // e.g. 1403 or 1404
  month: number; // 1 - 12
  monthName: string; // فروردین، اردیبهشت، ...
  workDaysInMonth: number; // 30 or 31
  status: 'draft' | 'calculated' | 'approved' | 'posted_to_ledger' | 'archived';
  accountingDocumentNumber?: string;
  ssoDisketteGenerated: boolean;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalEmployeeInsurance7Percent: number;
  totalEmployerInsurance23Percent: number;
  totalSocialSecurityInsurance30Percent: number;
  totalPayrollTax: number;
  slipsCount: number;
  approvedAt?: string;
  createdAt: string;
  ssoSubmissionStatus?: 'not_submitted' | 'pending' | 'submitted' | 'accepted' | 'receipt_issued' | 'paid';
  ssoTrackingCode?: string;
  ssoReceiptNumber?: string;
  ssoSubmissionDate?: string;
}

export interface PayrollSlip {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  nationalId: string;
  identityNumber?: string;
  fatherName?: string;
  ssoInsuranceNumber: string;
  jobTitle: string;
  bankName: string;
  shabaNumber: string;
  
  // Working days & hours
  daysWorked: number;
  overtimeHours: number;
  absenceDays: number;
  leaveDays: number;
  
  // Earnings (مزایا و دریافتی‌ها)
  dailyWage: number;
  baseSalary: number; // حقوق پایه بر مبنای روزهای کارکرد
  housingAllowance: number; // حق مسکن
  groceryAllowance: number; // بن خواروبار
  childAllowance: number; // حق اولاد
  positionAllowance: number; // حق مسئولیت / جذب
  overtimePay: number; // دستمزد اضافه کاری
  bonuses: number; // پاداش و بهره‌وری
  grossSalary: number; // ناخالص کل
  
  // Insurance details
  insuredGrossSalary: number; // دستمزد مشمول کسر حق بیمه
  employeeInsurance7Percent: number; // ۷٪ سهم بیمه کارمند
  employerInsurance20Percent: number; // ۲۰٪ سهم بیمه کارفرما
  unemploymentInsurance3Percent: number; // ۳٪ سهم بیمه بیکاری
  totalEmployerInsurance23Percent: number; // ۲۳٪ کل سهم کارفرما
  totalInsurance30Percent: number; // ۳۰٪ کل به تامین اجتماعی
  
  // Tax details
  taxableSalary: number; // حقوق مشمول مالیات (با اعمال معافیت ۲/۷ سهم بیمه کارگر)
  taxExemptionAmount: number; // سقف معافیت ماده ۸۴ قانون مالیات‌ها
  incomeTax: number; // مالیات بر درآمد حقوق
  
  // Deductions
  advancePaymentDeduction: number; // مساعده
  otherDeductions: number; // سایر کسورات (وام و...)
  totalDeductions: number; // مجموع کسورات (بیمه ۷٪ + مالیات + مساعده + سایر)
  
  // Net payout
  netPayable: number; // خالص پرداختی
  
  // Cryptographic & SiraFlow certification
  cryptographicHash?: string;
  didProofSignature?: string;
  status: 'draft' | 'final' | 'paid';
  generatedAt: string;
}

export interface SSODisketteConfig {
  workshopCode: string; // کد کارگاه ۱۰ رقمی (مثلاً 0123456789)
  workshopName: string; // نام کارگاه
  employerName: string; // نام کارفرما / مدیرعامل
  workshopAddress: string;
  subContractCode: string; // ردیف پیمان (معمولاً ۰۰۰ برای کارگاه عادی)
  insuranceBranch: string; // نام یا کد شعبه تأمین اجتماعی
  employerRate: number; // درصد حق بیمه سهم کارفرما (معمولاً ۲۰٪ - متغیر بر حسب سال یا کارگاه)
  unemploymentRate: number; // درصد بیمه بیکاری (معمولاً ۳٪ - متغیر)
  employeeRate: number; // درصد حق بیمه سهم کارگر/بیمه‌شده (معمولاً ۷٪ - متغیر)
  extraHardLaborRate?: number; // درصد بیمه مشاغل سخت و زیان‌آور سهم کارفرما (معمولاً ۴٪)
  isExemptWorkshop5Persons?: boolean; // کارگاه مشمول معافیت حق بیمه سهم کارفرما تا ۵ نفر کارگر
  exemptionPercentage?: number; // درصد معافیت یا تخفیف کارفرما
}

export interface SiraFlowPayrollAudit {
  id: string;
  periodId: string;
  timestamp: string;
  overallScore: number; // 0-100
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
  summary: string;
  checks: {
    category: 'minimum_wage' | 'sso_insurance' | 'tax_compliance' | 'ledger_balance' | 'personnel_data';
    passed: boolean;
    title: string;
    details: string;
    actionRequired?: string;
  }[];
  deadlineAlert: {
    ssoFilingDeadline: string; // تا پایان ماه بعد
    daysRemaining: number;
    penaltyRiskNote: string;
  };
}

// ==========================================
// MULTI-TENANT & RBAC USER TIERS ARCHITECTURE (معماری سه‌لایه‌ای ایزوله هابینو)
// ==========================================

// لایه ۱: نقش‌های سراسری پلتفرم هابینو (Platform Governance)
export type PlatformRole = 'super_admin' | 'hubino_support' | 'none';

// لایه ۲: سطح پکیج و لایسنس خریداری‌شده (Subscription Entitlements)
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionPlanType = SubscriptionPlan;

// لایه ۳: نقش‌های سازمانی مستأجر (Tenant Staff Roles)
export type TenantUserRole = 
  | 'tenant_owner'      // مدیر ارشد / مالک مستاجر - مدیریت کامل شرکت، کاربران زیرمجموعه و لایسنس
  | 'tenant_accountant' // حسابدار ارشد مستاجر - ثبت اسناد دوبل، گزارشات مالی، چک‌ها و ترازنامه
  | 'tenant_cashier'    // صندوق‌دار و متصدی فروش - ثبت فاکتور فروش، دریافت چک و بارکدخوان
  | 'tenant_inventory'  // انباردار مستأجر - مدیریت کالا، ورود و خروج و فرم‌های اصناف بدون دسترسی به سود
  | 'tenant_auditor';   // حسابرس و ناظر مالی - دسترسی فقط‌خواندنی به دفاتر، فاکتورها و ترازها

export type UserRole =
  | 'super_admin'       // ادمین ارشد هابینو - دسترسی فراگیر به کل پلتفرم، تمام مستاجران و نظارت سیستمی
  | 'hubino_support'    // پشتیبان فنی پلتفرم هابینو - مشاهده وضعیت سیستم و لاگ‌های خطا بدون افشای داده‌های مالی
  | TenantUserRole;

// مجوزهای دانه‌بندی‌شده کاربران مستأجر (Fine-Grained RBAC Permissions)
export type UserPermission =
  | 'platform:manage_tenants'    // مدیریت مستاجران پلتفرم هابینو
  | 'platform:view_all_data'     // مشاهده تجمیعی داده‌های تمام مستاجران
  | 'tenant:manage_users'        // تعریف و مدیریت کاربران مستاجر
  | 'tenant:manage_settings'     // تغییر تنظیمات و اطلاعات رسمی شرکت
  | 'tenant:manage_license'      // ارتقا و تغییر پلن لایسنس
  | 'accounting:access_ledger'   // دسترسی به دفتر کل، روزنامه و ثبت اسناد دوبل
  | 'accounting:manage_invoices' // صدور، ویرایش و تایید فاکتورها
  | 'accounting:manage_checks'   // ثبت و تغییر وضعیت چک‌های صیادی
  | 'accounting:manage_payroll'  // دسترسی به سیستم حقوق و دستمزد
  | 'accounting:view_reports'    // مشاهده ترازنامه، سود و زیان و گزارش‌های تحلیلی
  | 'accounting:view_profit'     // مشاهده سود خالص، حاشیه سود و سرمایه کسب‌وکار
  | 'accounting:delete_records'  // حذف دائمی اسناد و فاکتورها
  | 'inventory:manage_stock'     // تعریف کالا و خدمات و موجودی انبار
  | 'tax:submit_mowadian'        // ارسال فاکتورها به سامانه مودیان
  | 'ai:use_synapse_cfo';        // استفاده از هوش مصنوعی سیناپس و مشاور CFO

export type TenantUserPermission = UserPermission;

export interface TenantSubscription {
  plan: SubscriptionPlanType;
  planNameFa: string;
  status: 'active' | 'expired' | 'trial';
  maxUsers: number;
  expiresAt: string;
  serialKey?: string;
  isLifetime?: boolean;
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  isSuspended?: boolean;
  activeAddons?: string[];
}

export interface AddonItem {
  id: string;
  title: string;
  category: 'operational' | 'future_strategic';
  priceToman: number;
  billingType: 'monthly' | 'yearly' | 'pay_per_use' | 'lifetime';
  badge: string;
  description: string;
  unlocksModules: string[];
  status: 'available' | 'coming_soon';
  roadmapPhase?: string;
  problemFa: string;
  solutionFa: string;
  revenueModelFa: string;
}

export type GuildType = 'services' | 'technology' | 'contracting' | 'commercial';

export interface TenantMetadata {
  economicCode?: string;
  nationalId?: string;
  registrationNumber?: string;
  guildCategory?: string;
  address?: string;
  phone?: string;
  postalCode?: string;
  customFields?: Record<string, any>;
  themeColor?: string;
  mowadianClientId?: string;
  autoDoubleEntryEnabled?: boolean;
}

export interface Tenant {
  id: string; // e.g. 'tenant-main', 'tenant-alborz'
  name: string;
  slug: string;
  guildType: GuildType;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  subscription?: TenantSubscription;
  metadata: TenantMetadata; // JSONB in PostgreSQL
  stats?: {
    usersCount: number;
    invoicesCount: number;
    balance: number;
  };
}

export interface AppUser {
  id: string;
  tenantId: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermission[];
  status: 'active' | 'disabled';
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  notes?: string;
}

export interface UserAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userFullName: string;
  tenantId: string;
  action: string;
  resource: string;
  details: string;
  ipAddress?: string;
}

// Strategy Pattern for Business Guilds
export interface GuildBusinessStrategy {
  guildType: GuildType;
  nameFa: string;
  description: string;
  defaultTaxRate: number;
  requiresInventoryStock: boolean;
  requiresProjectContract: boolean;
  recommendedInvoiceTemplate: 'professional' | 'modern' | 'minimal' | 'classic';
  customLedgerAccounts: { code: string; title: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }[];
}

// Composite Pattern for Dynamic Forms & Metadata
export interface FormFieldComponent {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'group';
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  children?: FormFieldComponent[]; // Composite child nodes
}

