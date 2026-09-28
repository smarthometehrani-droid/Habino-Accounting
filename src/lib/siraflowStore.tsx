import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  RFPProject,
  BlindTender,
  BlindTenderBid,
  SmartContractDraft,
  ProjectScale
} from '../types';
import { SiraFlowOrchestrator } from './siraflowOrchestrator';
import { HabinoDIDProtocol } from './didProtocol';

interface SiraFlowContextType {
  rfpProjects: RFPProject[];
  blindTenders: BlindTender[];
  smartContracts: SmartContractDraft[];
  
  // Actions
  submitRFP: (rfpData: Omit<RFPProject, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<RFPProject>;
  runAnalysis: (rfpId: string) => Promise<RFPProject>;
  launchTender: (rfpId: string) => Promise<BlindTender>;
  submitBid: (tenderId: string, bidData: {
    tenantId: string;
    bidAmount: number;
    deliveryDays: number;
    warrantyMonths: number;
    technicalProposal: string;
    technicalScore: number;
  }) => Promise<BlindTenderBid>;
  selectWinner: (tenderId: string) => Promise<{ tender: BlindTender; contract: SmartContractDraft }>;
  signContract: (contractId: string, role: 'employer' | 'winning_tenant', customDid?: string) => Promise<void>;
  verifyContractProof: (contractId: string) => Promise<{
    isValid: boolean;
    allSigned: boolean;
    partiesProof: Array<{
      role: string;
      title: string;
      did: string;
      signatureValid: boolean;
      hashMatches: boolean;
      signatureValue: string;
    }>;
  }>;
  resolveTicket: (rfpId: string, ticketId: string, fixedData: Record<string, any>) => Promise<void>;
  resetToSampleData: () => void;
}

const defaultSampleRFPs: RFPProject[] = [
  {
    id: 'rfp-101',
    tenantId: 'tenant-main',
    clientRefId: 'c1',
    clientName: 'مهندس فرید تهرانی (هلدینگ پارس)',
    clientPhone: '09120000000',
    title: 'تأمین و استقرار تجهیزات شبکه و نظارت تصویری ساختمان مرکزی',
    category: 'شبکه و تأسیسات هوشمند',
    description: 'نیاز به تجهیز ۱۰ طبقه به دوربین‌های مداربسته هایک‌ویژن و سوییچ‌های مدیریتی سیسکو به همراه بازدید میدانی و کابل‌کشی ساخت‌یافته Cat6A.',
    dynamicFormData: {
      brand: 'Hikvision & Cisco',
      model: 'DS-2CD2143G2 & Catalyst 2960X',
      location: 'تهران، بلوار نلسون ماندلا',
      durationDays: 45,
      estimatedBudget: 380000000,
      scope: '۱۰ طبقه اداری با ۱۲۰ نود فعال شبکه و ۳۲ دوربین نظارتی',
      standards: 'ISO 27001 & TIA-942',
      onSiteVisitRequested: true
    },
    attachments: [
      { id: 'att-1', name: 'نقشه_فنی_پسیو_طبقات.dwg', size: '4.2 MB', type: 'dwg' },
      { id: 'att-2', name: 'مشخصات_تجهیزات_اکتیو.pdf', size: '1.8 MB', type: 'pdf' }
    ],
    status: 'in_blind_tender',
    analysis: {
      extractedAttributes: {
        brand: 'Hikvision & Cisco',
        modelOrStandard: 'DS-2CD2143G2 & Catalyst 2960X',
        technicalSpecs: {
          scope: '۱۰ طبقه اداری با ۱۲۰ نود فعال شبکه و ۳۲ دوربین نظارتی',
          standards: 'ISO 27001 & TIA-942'
        },
        location: 'تهران، بلوار نلسون ماندلا',
        executionDurationDays: 45,
        requiresOnSiteVisit: true,
        missingCriticalFields: []
      },
      projectClassification: {
        scale: 'large',
        complexityScore: 82,
        estimatedBudgetFloor: 320000000,
        estimatedBudgetCeiling: 450000000,
        dumpingThresholdRatio: 0.75
      },
      decisionPoints: {
        onSiteInspectionRequired: true,
        qualificationScoreThreshold: 75,
        evaluationWeights: { priceWeight: 35, qualityWeight: 65 }
      },
      confidenceScore: 96,
      aiReasoning: 'برندهای معتبر و استانداردهای TIA استخراج شد. به دلیل پیچیدگی چندطبقه، بازدید میدانی الزامی تشخیص داده شد. مناقصه با سقف ۴۵۰ میلیون تومان و کف ممیزی دامپینگ ۲۴۰ میلیون تومان تأیید شد.',
      analyzedAt: '1403/06/12'
    },
    tenderId: 'tender-101',
    createdAt: '1403/06/10',
    updatedAt: '1403/06/12'
  },
  {
    id: 'rfp-102',
    tenantId: 'tenant-main',
    clientRefId: 'c2',
    clientName: 'شرکت تجارت نوین البرز',
    clientPhone: '09121111111',
    title: 'توسعه ماژول انبارداری ابری و همگام‌سازی بارکدخوان‌ها',
    category: 'نرم‌افزار و فناوری اطلاعات',
    description: 'پیاده‌سازی ماژول انبارداری بارکدی متصل به پرتال حسابداری هابینو بدون نیاز به زیرساخت فیزیکی.',
    dynamicFormData: {
      location: 'کرج، شهرک صنعتی سیمین دشت',
      durationDays: 20,
      estimatedBudget: 85000000,
      scope: 'اتصال ۴ بارکدخوان بی‌سیم و ثبت لحظه‌ای ورودی/خروجی کالا'
    },
    attachments: [],
    status: 'classified',
    analysis: {
      extractedAttributes: {
        brand: 'نرم‌افزار هابینو',
        modelOrStandard: 'REST API & Webhook',
        technicalSpecs: { scope: 'اتصال ۴ بارکدخوان بی‌سیم' },
        location: 'کرج، شهرک صنعتی سیمین دشت',
        executionDurationDays: 20,
        requiresOnSiteVisit: false,
        missingCriticalFields: []
      },
      projectClassification: {
        scale: 'medium',
        complexityScore: 58,
        estimatedBudgetFloor: 70000000,
        estimatedBudgetCeiling: 105000000,
        dumpingThresholdRatio: 0.75
      },
      decisionPoints: {
        onSiteInspectionRequired: false,
        qualificationScoreThreshold: 65,
        evaluationWeights: { priceWeight: 40, qualityWeight: 60 }
      },
      confidenceScore: 91,
      aiReasoning: 'پروژه نرم‌افزاری در سطح متوسط ارزیابی شد. به حضور فیزیکی نیاز ندارد و تست از راه دور کفایت می‌کند.',
      analyzedAt: '1403/06/13'
    },
    createdAt: '1403/06/13',
    updatedAt: '1403/06/13'
  },
  {
    id: 'rfp-103',
    tenantId: 'tenant-main',
    clientRefId: 'c3',
    clientName: 'سارا احمدی',
    clientPhone: '09122222222',
    title: 'بازسازی دکوراسیون و نورپردازی فروشگاهی',
    category: 'معماری و تأسیسات',
    description: 'تعویض سیستم روشنایی و طراحی ویترین.',
    dynamicFormData: {
      location: 'نامشخص'
    },
    attachments: [],
    status: 'needs_revision',
    systemTickets: [
      {
        id: 'ticket-103-1',
        issue: 'نقص داده‌های حیاتی در فرم RFP: حجم کار، تعداد یا سقف بودجه اولیه، محل فیزیکی و استان/شهر اجرای تعهدات',
        severity: 'high',
        createdAt: '1403/06/14',
        resolved: false
      }
    ],
    createdAt: '1403/06/14',
    updatedAt: '1403/06/14'
  },
  {
    id: 'rfp-104',
    tenantId: 'tenant-main',
    clientRefId: 'c4',
    clientName: 'جناب حاج محمود مظفری (جواهری مظفری)',
    clientPhone: '09123333333',
    title: 'طراحی، ساخت و نصب ویترین گاوصندوقی و درب ضدگلوله طلافروشی',
    category: 'طلا، جواهر و فلزات گرانبها',
    description: 'ساخت ویترین آسانسوری ضدسرقت و شیشه‌های ضدگلوله با استاندارد ملی ایران و اتصال به سیستم مه امنیتی.',
    dynamicFormData: {
      brand: 'Safeguard Heavy Duty',
      model: 'SG-9000 Bulletproof',
      location: 'تهران، بازار بزرگ، بازار زرگرها',
      durationDays: 25,
      estimatedBudget: 520000000,
      scope: 'ویترین آسانسوری هیدرولیک به ابعاد ۲.۵ در ۱.۸ متر با شیشه ضدگلوله ۶ لایه',
      standards: 'استاندارد ملی ۱۷۲۲۶ شیشه‌های ایمنی و امنیتی',
      onSiteVisitRequested: true
    },
    attachments: [],
    status: 'classified',
    analysis: {
      extractedAttributes: {
        brand: 'Safeguard Heavy Duty',
        modelOrStandard: 'SG-9000 Bulletproof',
        technicalSpecs: {
          scope: 'ویترین آسانسوری هیدرولیک ۲.۵×۱.۸ متر با شیشه ضدگلوله ۶ لایه',
          standards: 'استاندارد ملی ۱۷۲۲۶'
        },
        location: 'تهران، بازار بزرگ، بازار زرگرها',
        executionDurationDays: 25,
        requiresOnSiteVisit: true,
        missingCriticalFields: []
      },
      projectClassification: {
        scale: 'large',
        complexityScore: 88,
        estimatedBudgetFloor: 460000000,
        estimatedBudgetCeiling: 620000000,
        dumpingThresholdRatio: 0.78
      },
      decisionPoints: {
        onSiteInspectionRequired: true,
        qualificationScoreThreshold: 80,
        evaluationWeights: { priceWeight: 30, qualityWeight: 70 }
      },
      confidenceScore: 97,
      aiReasoning: 'صنف حساس طلا و جواهر نیازمند بالاترین ضرایب ایمنی است. بازدید میدانی و رعایت استاندارد ۱۷۲۲۶ الزامی شد. وزن کیفیت ۷۰٪ منظور گردید.',
      analyzedAt: '1403/06/14'
    },
    createdAt: '1403/06/14',
    updatedAt: '1403/06/14'
  },
  {
    id: 'rfp-105',
    tenantId: 'tenant-main',
    clientRefId: 'c5',
    clientName: 'شرکت کشت و صنعت مزارع سبز توس',
    clientPhone: '09124444444',
    title: 'تأمین خط اتوماتیک سورتینگ، بسته‌بندی و توزین زعفران و خشکبار',
    category: 'کشاورزی و صنایع غذایی',
    description: 'خط سورتینگ بینایی ماشین (Vision AI) برای جداسازی ناخالصی و دستگاه بسته‌بندی گاز نیتروژن با پروانه‌های بهداشتی سیب سلامت.',
    dynamicFormData: {
      brand: 'Multi-head Weigher & VisionSorter',
      model: 'VS-4X Vision AI',
      location: 'مشهد، شهرک صنعتی طوس',
      durationDays: 35,
      estimatedBudget: 890000000,
      scope: 'خط کامل با ظرفیت ۵۰۰ کیلوگرم در ساعت با تزریق گاز نیتروژن',
      standards: 'ISO 22000 & HACCP',
      onSiteVisitRequested: true
    },
    attachments: [],
    status: 'classified',
    analysis: {
      extractedAttributes: {
        brand: 'Multi-head Weigher & VisionSorter',
        modelOrStandard: 'VS-4X Vision AI',
        technicalSpecs: {
          scope: 'ظرفیت ۵۰۰ کیلوگرم در ساعت با تزریق نیتروژن',
          standards: 'ISO 22000 & HACCP'
        },
        location: 'مشهد، شهرک صنعتی طوس',
        executionDurationDays: 35,
        requiresOnSiteVisit: true,
        missingCriticalFields: []
      },
      projectClassification: {
        scale: 'large',
        complexityScore: 84,
        estimatedBudgetFloor: 780000000,
        estimatedBudgetCeiling: 1050000000,
        dumpingThresholdRatio: 0.75
      },
      decisionPoints: {
        onSiteInspectionRequired: true,
        qualificationScoreThreshold: 75,
        evaluationWeights: { priceWeight: 35, qualityWeight: 65 }
      },
      confidenceScore: 95,
      aiReasoning: 'ماشین‌آلات صنایع غذایی منطبق با استانداردهای بهداشتی ISO 22000 تحلیل شد. به دلیل راه‌اندازی خطوط پیوسته، بازدید و کالیبراسیون میدانی الزامی است.',
      analyzedAt: '1403/06/14'
    },
    createdAt: '1403/06/14',
    updatedAt: '1403/06/14'
  }
];

const defaultSampleTenders: BlindTender[] = [
  {
    id: 'tender-101',
    rfpId: 'rfp-101',
    projectTitle: 'تأمین و استقرار تجهیزات شبکه و نظارت تصویری ساختمان مرکزی',
    projectScale: 'large',
    status: 'open',
    budgetFloor: 320000000,
    budgetCeiling: 450000000,
    dumpingAuditThreshold: 240000000,
    invitedTenantsCount: 14,
    openedAt: '1403/06/12',
    closingDate: '1403/06/22',
    bids: [
      {
        id: 'bid-1',
        tenderId: 'tender-101',
        tenantId: 'tenant-delta-infra',
        anonymousCode: 'مستأجر امن #T-4819',
        bidAmount: 360000000,
        deliveryDays: 40,
        warrantyMonths: 24,
        technicalProposal: 'استفاده از پارت‌نامبرهای گارانتی اصلی هایک‌ویژن پارس، کابل‌کشی با تست فلوک چنل و ۵ سال گارانتی زیرساخت پسیو.',
        technicalScore: 92,
        priceScore: 84,
        finalBalancedScore: 89,
        isDumpingSuspected: false,
        complianceChecked: true,
        submittedAt: '1403/06/12'
      },
      {
        id: 'bid-2',
        tenderId: 'tender-101',
        tenantId: 'tenant-alpha-tech',
        anonymousCode: 'مستأجر امن #T-7192',
        bidAmount: 410000000,
        deliveryDays: 35,
        warrantyMonths: 18,
        technicalProposal: 'تأمین کالا از انبار مرکزی تهران، تجهیز تیم ۳ نفره مقیم، بدون هزینه سربار ایاب و ذهاب.',
        technicalScore: 86,
        priceScore: 68,
        finalBalancedScore: 79,
        isDumpingSuspected: false,
        complianceChecked: true,
        submittedAt: '1403/06/13'
      },
      {
        id: 'bid-3',
        tenderId: 'tender-101',
        tenantId: 'tenant-fake-dump',
        anonymousCode: 'مستأجر امن #T-9921',
        bidAmount: 210000000,
        deliveryDays: 15,
        warrantyMonths: 6,
        technicalProposal: 'اجرای ضرب‌الاجل ارزان‌قیمت بدون اعلام پارت‌نامبر دقیق کابل‌ها.',
        technicalScore: 42,
        priceScore: 30,
        finalBalancedScore: 37,
        isDumpingSuspected: true,
        dumpingAuditNote: 'هشدار سایرافلو: مبلغ پیشنهادی (۲۱۰,۰۰۰,۰۰۰) زیر آستانه ایمن (۲۴۰,۰۰۰,۰۰۰) است؛ احتمال قطعی کالای تقلبی یا عدم توانایی تکمیل کار.',
        complianceChecked: false,
        submittedAt: '1403/06/14'
      }
    ]
  }
];

const defaultSampleContracts: SmartContractDraft[] = [
  {
    id: 'contract-sample-01',
    rfpId: 'rfp-101',
    tenderId: 'tender-101',
    contractNumber: 'HC-1403-88410',
    title: 'قرارداد هوشمند اجرایی: تأمین و استقرار تجهیزات شبکه و نظارت تصویری ساختمان مرکزی',
    parties: [
      {
        role: 'employer',
        title: 'مهندس فرید تهرانی (هلدینگ پارس)',
        identifier: 'c1',
        did: 'did:habino:employer-holding-pars',
        signatureStatus: 'signed',
        signedAt: '1403/06/13',
        signatureProof: {
          type: 'JsonWebSignature2020',
          created: '2024-09-03T11:00:00Z',
          verificationMethod: 'did:habino:employer-holding-pars#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'sig_employer_holding_9c4f18a209ef71b0_verified',
          documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          algorithm: 'ECDSA-SHA256'
        }
      },
      {
        role: 'winning_tenant',
        title: 'مستأجر امن #T-4819 (برنده منتخب سایرافلو)',
        identifier: 'tenant-delta-infra',
        did: 'did:habino:tenant-delta-infra',
        signatureStatus: 'signed',
        signedAt: '1403/06/14',
        signatureProof: {
          type: 'JsonWebSignature2020',
          created: '2024-09-03T11:05:00Z',
          verificationMethod: 'did:habino:tenant-delta-infra#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'sig_tenant_delta_7a19c43b90f2d811_verified',
          documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          algorithm: 'ECDSA-SHA256'
        }
      },
      {
        role: 'habino_escrow',
        title: 'پلتفرم تجارت غیرمتمرکز هابینو (ضامن نقدینگی و حسن اجرا)',
        identifier: 'HABINO-PROTOCOL-ESCROW-01',
        did: 'did:habino:escrow-safe-settle',
        signatureStatus: 'signed',
        signedAt: '1403/06/14',
        signatureProof: {
          type: 'JsonWebSignature2020',
          created: '2024-09-03T11:06:00Z',
          verificationMethod: 'did:habino:escrow-safe-settle#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'sig_escrow_safe_fe8923bc71d4a012_verified',
          documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          algorithm: 'ECDSA-SHA256'
        }
      }
    ],
    totalAmount: 360000000,
    currency: 'IRT',
    penaltiesPerDayDelay: 720000,
    warrantyPeriodMonths: 24,
    arbitrationClause: 'در صورت بروز اختلاف، هیئت داوری اتاق اصناف و کمیته فنی هوش مصنوعی هابینو به عنوان داور مرضی‌الطرفین رأی نهایی و لازم‌الاجرا صادر خواهند نمود.',
    milestones: [
      {
        title: 'پیش‌پرداخت اولیه پس از تجهیز کارگاه و تحویل ضمانت‌نامه',
        percentage: 25,
        amount: 90000000,
        conditions: 'تأییدیه حضور تکنسین‌ها در محل و بازرسی فیزیکی ناظر هابینو',
        status: 'released'
      },
      {
        title: 'پرداخت مرحله‌ای پس از اتمام پسیو و تست فلوک',
        percentage: 45,
        amount: 162000000,
        conditions: 'ارائه گزارش تست فلوک چنل و نصب سوئیچ‌ها با تأیید سایرافلو',
        status: 'in_progress'
      },
      {
        title: 'تسویه نهایی پس از راه‌اندازی دوربین‌ها و دوره آزمون',
        percentage: 30,
        amount: 108000000,
        conditions: 'تست تصویر بدون قطعی به مدت ۷ روز کاری و تحویل مستندات',
        status: 'pending'
      }
    ],
    generatedByAi: true,
    aiVerificationHash: '0x8f2b7401c9a834e56720d1fe395a64387c124e5b',
    status: 'active_in_execution',
    createdAt: '1403/06/13'
  }
];

const SiraFlowContext = createContext<SiraFlowContextType | undefined>(undefined);

export const SiraFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rfpProjects, setRfpProjects] = useState<RFPProject[]>(() => {
    const saved = localStorage.getItem('habino_rfp_projects');
    return saved ? JSON.parse(saved) : defaultSampleRFPs;
  });

  const [blindTenders, setBlindTenders] = useState<BlindTender[]>(() => {
    const saved = localStorage.getItem('habino_blind_tenders');
    return saved ? JSON.parse(saved) : defaultSampleTenders;
  });

  const [smartContracts, setSmartContracts] = useState<SmartContractDraft[]>(() => {
    const saved = localStorage.getItem('habino_smart_contracts');
    return saved ? JSON.parse(saved) : defaultSampleContracts;
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('habino_rfp_projects', JSON.stringify(rfpProjects));
  }, [rfpProjects]);

  useEffect(() => {
    localStorage.setItem('habino_blind_tenders', JSON.stringify(blindTenders));
  }, [blindTenders]);

  useEffect(() => {
    localStorage.setItem('habino_smart_contracts', JSON.stringify(smartContracts));
  }, [smartContracts]);

  // Actions
  const submitRFP = async (rfpData: Omit<RFPProject, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<RFPProject> => {
    const newRFP: RFPProject = {
      ...rfpData,
      id: `rfp-${Date.now()}`,
      status: 'rfp_submitted',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      updatedAt: new Date().toLocaleDateString('fa-IR')
    };

    // اجرای فوری تحلیل سایرافلو
    const analysisResult = SiraFlowOrchestrator.analyzeRFP(newRFP);
    newRFP.status = analysisResult.updatedStatus;
    newRFP.analysis = analysisResult.analysis;

    if (analysisResult.ticketCreated) {
      newRFP.systemTickets = [
        ...(newRFP.systemTickets || []),
        {
          id: analysisResult.ticketCreated.id,
          issue: analysisResult.ticketCreated.issue,
          severity: analysisResult.ticketCreated.severity,
          createdAt: new Date().toLocaleDateString('fa-IR'),
          resolved: false
        }
      ];
    }

    setRfpProjects(prev => [newRFP, ...prev]);
    return newRFP;
  };

  const runAnalysis = async (rfpId: string): Promise<RFPProject> => {
    const rfp = rfpProjects.find(r => r.id === rfpId);
    if (!rfp) throw new Error('پروژه یافت نشد');

    const result = SiraFlowOrchestrator.analyzeRFP(rfp);
    const updated: RFPProject = {
      ...rfp,
      status: result.updatedStatus,
      analysis: result.analysis,
      systemTickets: result.ticketCreated
        ? [...(rfp.systemTickets || []), { ...result.ticketCreated, createdAt: new Date().toLocaleDateString('fa-IR'), resolved: false }]
        : rfp.systemTickets,
      updatedAt: new Date().toLocaleDateString('fa-IR')
    };

    setRfpProjects(prev => prev.map(item => item.id === rfpId ? updated : item));
    return updated;
  };

  const launchTender = async (rfpId: string): Promise<BlindTender> => {
    const rfp = rfpProjects.find(r => r.id === rfpId);
    if (!rfp) throw new Error('پروژه مورد نظر یافت نشد');
    if (rfp.status === 'needs_revision') {
      throw new Error('این پروژه به دلیل نقص اطلاعات حیاتی امکان ارسال به مناقصه را ندارد. ابتدا تیکت اصلاحی را برطرف کنید.');
    }

    const newTender = SiraFlowOrchestrator.createBlindTender(rfp);

    // افزودن چند پیشنهاد اولیه آزمایشی از مستأجران اکوسیستم
    const mockTenants = [
      { id: 'tenant-tech-1', bid: Math.round(newTender.budgetFloor * 1.05), score: 88, days: 30, text: 'پیشنهاد کامل همراه با ضمانت رسمی ۲۴ ماهه' },
      { id: 'tenant-tech-2', bid: Math.round(newTender.budgetCeiling * 0.95), score: 82, days: 25, text: 'تأمین کالا از دپوی داخلی با تحویل سریع' },
      { id: 'tenant-tech-3', bid: Math.round(newTender.dumpingAuditThreshold * 0.8), score: 45, days: 12, text: 'قیمت کف با امکان تحویل فوری' }
    ];

    mockTenants.forEach(m => {
      const bid = SiraFlowOrchestrator.auditAndAddBid(newTender, {
        tenantId: m.id,
        bidAmount: m.bid,
        deliveryDays: m.days,
        warrantyMonths: 18,
        technicalProposal: m.text,
        technicalScore: m.score
      });
      newTender.bids.push(bid);
    });

    setBlindTenders(prev => [newTender, ...prev]);
    setRfpProjects(prev => prev.map(item => item.id === rfpId ? { ...item, status: 'in_blind_tender', tenderId: newTender.id } : item));

    return newTender;
  };

  const submitBid = async (tenderId: string, bidData: {
    tenantId: string;
    bidAmount: number;
    deliveryDays: number;
    warrantyMonths: number;
    technicalProposal: string;
    technicalScore: number;
  }): Promise<BlindTenderBid> => {
    const tender = blindTenders.find(t => t.id === tenderId);
    if (!tender) throw new Error('مناقصه یافت نشد');

    const bid = SiraFlowOrchestrator.auditAndAddBid(tender, bidData);
    const updatedTender: BlindTender = {
      ...tender,
      bids: [...tender.bids, bid]
    };

    setBlindTenders(prev => prev.map(t => t.id === tenderId ? updatedTender : t));
    return bid;
  };

  const selectWinner = async (tenderId: string): Promise<{ tender: BlindTender; contract: SmartContractDraft }> => {
    const tender = blindTenders.find(t => t.id === tenderId);
    if (!tender) throw new Error('مناقصه یافت نشد');

    const rfp = rfpProjects.find(r => r.id === tender.rfpId);
    if (!rfp) throw new Error('پروژه مرتبط با مناقصه یافت نشد');

    const { updatedTender, winnerBid, selectionReason } = SiraFlowOrchestrator.evaluateAndSelectWinner(tender);
    const contract = SiraFlowOrchestrator.generateSmartContract(rfp, updatedTender, winnerBid);

    setBlindTenders(prev => prev.map(t => t.id === tenderId ? updatedTender : t));
    setRfpProjects(prev => prev.map(r => r.id === rfp.id ? { ...r, status: 'contract_generated' } : r));
    setSmartContracts(prev => [contract, ...prev]);

    return { tender: updatedTender, contract };
  };

  const signContract = async (contractId: string, role: 'employer' | 'winning_tenant', customDid?: string): Promise<void> => {
    const targetContract = smartContracts.find(c => c.id === contractId);
    if (!targetContract) return;

    const targetParty = targetContract.parties.find(p => p.role === role);
    const didToUse = customDid || targetParty?.did || (role === 'employer' ? 'did:habino:employer-holding-pars' : 'did:habino:tenant-delta-infra');

    // Create cryptographic proof
    let proof;
    try {
      proof = await HabinoDIDProtocol.signDocument(didToUse, {
        contractId: targetContract.id,
        contractNumber: targetContract.contractNumber,
        totalAmount: targetContract.totalAmount,
        title: targetContract.title,
        role
      });
    } catch (e) {
      console.warn('Fallback proof generation:', e);
      proof = {
        type: 'JsonWebSignature2020',
        created: new Date().toISOString(),
        verificationMethod: `${didToUse}#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'sig_' + Math.random().toString(36).substring(2) + Date.now().toString(16),
        documentHash: '0x' + Math.random().toString(36).substring(2) + 'fa810',
        algorithm: 'ECDSA-SHA256'
      };
    }

    setSmartContracts(prev => prev.map(c => {
      if (c.id !== contractId) return c;
      const updatedParties = c.parties.map(p => {
        if (p.role === role) {
          return {
            ...p,
            did: didToUse,
            signatureStatus: 'signed' as const,
            signedAt: new Date().toLocaleDateString('fa-IR'),
            signatureProof: proof
          };
        }
        return p;
      });

      const allSigned = updatedParties.every(p => p.signatureStatus === 'signed');

      return {
        ...c,
        parties: updatedParties,
        status: allSigned ? 'active_in_execution' : c.status
      };
    }));
  };

  const verifyContractProof = async (contractId: string): Promise<{
    isValid: boolean;
    allSigned: boolean;
    partiesProof: Array<{
      role: string;
      title: string;
      did: string;
      signatureValid: boolean;
      hashMatches: boolean;
      signatureValue: string;
    }>;
  }> => {
    const targetContract = smartContracts.find(c => c.id === contractId);
    if (!targetContract) throw new Error('قرارداد یافت نشد');

    const partiesProof: Array<{
      role: string;
      title: string;
      did: string;
      signatureValid: boolean;
      hashMatches: boolean;
      signatureValue: string;
    }> = [];

    let overallValid = true;

    for (const p of targetContract.parties) {
      if (p.signatureStatus === 'signed' && p.signatureProof) {
        const verification = await HabinoDIDProtocol.verifyDocumentProof(
          {
            contractId: targetContract.id,
            contractNumber: targetContract.contractNumber,
            totalAmount: targetContract.totalAmount,
            title: targetContract.title,
            role: p.role
          },
          p.signatureProof
        );

        partiesProof.push({
          role: p.role,
          title: p.title,
          did: p.did || p.identifier,
          signatureValid: verification.signatureValid,
          hashMatches: verification.hashMatches,
          signatureValue: p.signatureProof.proofValue.substring(0, 24) + '...'
        });

        if (!verification.isValid) {
          overallValid = false;
        }
      } else {
        overallValid = false;
      }
    }

    const allSigned = targetContract.parties.every(p => p.signatureStatus === 'signed');

    return {
      isValid: overallValid && allSigned,
      allSigned,
      partiesProof
    };
  };

  const resolveTicket = async (rfpId: string, ticketId: string, fixedData: Record<string, any>): Promise<void> => {
    const rfp = rfpProjects.find(r => r.id === rfpId);
    if (!rfp) return;

    const mergedData = { ...rfp.dynamicFormData, ...fixedData };
    const updatedTickets = (rfp.systemTickets || []).map(t => t.id === ticketId ? { ...t, resolved: true } : t);

    const tempRfp: RFPProject = {
      ...rfp,
      dynamicFormData: mergedData,
      systemTickets: updatedTickets,
      updatedAt: new Date().toLocaleDateString('fa-IR')
    };

    // ارزیابی مجدد پس از رفع نقص
    const analysisResult = SiraFlowOrchestrator.analyzeRFP(tempRfp);
    tempRfp.status = analysisResult.updatedStatus;
    tempRfp.analysis = analysisResult.analysis;

    setRfpProjects(prev => prev.map(item => item.id === rfpId ? tempRfp : item));
  };

  const resetToSampleData = () => {
    setRfpProjects(defaultSampleRFPs);
    setBlindTenders(defaultSampleTenders);
    setSmartContracts(defaultSampleContracts);
    localStorage.removeItem('habino_rfp_projects');
    localStorage.removeItem('habino_blind_tenders');
    localStorage.removeItem('habino_smart_contracts');
  };

  return (
    <SiraFlowContext.Provider
      value={{
        rfpProjects,
        blindTenders,
        smartContracts,
        submitRFP,
        runAnalysis,
        launchTender,
        submitBid,
        selectWinner,
        signContract,
        verifyContractProof,
        resolveTicket,
        resetToSampleData
      }}
    >
      {children}
    </SiraFlowContext.Provider>
  );
};

export const useSiraFlow = (): SiraFlowContextType => {
  const context = useContext(SiraFlowContext);
  if (!context) {
    throw new Error('useSiraFlow must be used within a SiraFlowProvider');
  }
  return context;
};
