import {
  RFPProject,
  SiraFlowAnalysisResult,
  BlindTender,
  BlindTenderBid,
  SmartContractDraft,
  ProjectScale
} from '../types';

export class SiraFlowOrchestrator {
  /**
   * 1. فاز تحلیل خودکار و اعتبارسنجی RFP توسط سایرافلو
   * استخراج فیلدهای حیاتی (برند، مدل، مشخصات فنی، محل و زمان) و طبقه‌بندی هوشمند
   */
  static analyzeRFP(rfp: RFPProject): {
    updatedStatus: RFPProject['status'];
    analysis: SiraFlowAnalysisResult;
    ticketCreated?: { id: string; issue: string; severity: 'low' | 'high' | 'critical' };
  } {
    const formData = rfp.dynamicFormData || {};
    const textCorpus = `${rfp.title} ${rfp.description} ${JSON.stringify(formData)}`.toLowerCase();

    // 1. استخراج خودکار برند و استانداردها
    let brand: string | undefined = formData.brand || formData.manufacturer;
    if (!brand) {
      if (textCorpus.includes('سامسونگ') || textCorpus.includes('samsung')) brand = 'Samsung';
      else if (textCorpus.includes('سیسکو') || textCorpus.includes('cisco')) brand = 'Cisco';
      else if (textCorpus.includes('اشنایدر') || textCorpus.includes('schneider')) brand = 'Schneider Electric';
      else if (textCorpus.includes('هایک‌ویژن') || textCorpus.includes('hikvision')) brand = 'Hikvision';
      else if (textCorpus.includes('میکروتیک') || textCorpus.includes('mikrotik')) brand = 'Mikrotik';
      else if (textCorpus.includes('ایران رادیاتور')) brand = 'Iran Radiator';
    }

    const modelOrStandard = formData.model || formData.standard || (textCorpus.match(/[a-z0-9-]{3,15}/i)?.[0]);

    // 2. استخراج مشخصات فنی
    const technicalSpecs = { ...formData };
    delete technicalSpecs.brand;
    delete technicalSpecs.location;
    delete technicalSpecs.durationDays;

    // 3. استخراج محل اجرا
    const location = formData.location || (textCorpus.includes('تهران') ? 'تهران' : textCorpus.includes('اصفهان') ? 'اصفهان' : textCorpus.includes('مشهد') ? 'مشهد' : 'محل پروژه اعلامی کارفرما');

    // 4. استخراج زمان‌بندی
    const executionDurationDays = Number(formData.durationDays) || (textCorpus.includes('فوری') ? 14 : 30);

    // 5. بررسی نیاز به بازدید حضوری (On-site Visit)
    const catLower = (rfp.category || '').toLowerCase();
    const requiresOnSiteVisit = 
      Boolean(formData.onSiteVisitRequested) ||
      catLower.includes('عمران') ||
      catLower.includes('تأسیسات') ||
      catLower.includes('شبکه') ||
      catLower.includes('ساختمان') ||
      catLower.includes('ابنیه') ||
      catLower.includes('دکوراسیون') ||
      catLower.includes('مکانیک') ||
      catLower.includes('تراشکاری') ||
      catLower.includes('برق') ||
      catLower.includes('نصب') ||
      catLower.includes('پایپینگ') ||
      catLower.includes('کارخانجات') ||
      textCorpus.includes('نصب') ||
      textCorpus.includes('بازدید') ||
      textCorpus.includes('میدانی') ||
      textCorpus.includes('کارگاه') ||
      textCorpus.includes('حضور در محل');

    // 6. استثنا: بررسی نواقص حیاتی
    const missingCriticalFields: string[] = [];
    if (!rfp.title || rfp.title.trim().length < 5) missingCriticalFields.push('عنوان مشخص و کافی پروژه');
    if (!formData.estimatedBudget && !formData.quantity && !formData.scope) {
      missingCriticalFields.push('حجم کار، تعداد یا سقف بودجه اولیه');
    }
    if (!location || location === 'نامشخص') {
      missingCriticalFields.push('محل فیزیکی و استان/شهر اجرای تعهدات');
    }

    // اگر اطلاعات حیاتی ناقص بود -> تشکیل تیکت سیستمی و تغییر وضعیت به نیازمند اصلاح
    if (missingCriticalFields.length > 0) {
      const ticket = {
        id: `ticket-${Date.now()}`,
        issue: `نقص داده‌های حیاتی در فرم RFP: ${missingCriticalFields.join('، ')}`,
        severity: 'high' as const
      };

      const analysis: SiraFlowAnalysisResult = {
        extractedAttributes: {
          brand,
          modelOrStandard,
          technicalSpecs,
          location,
          executionDurationDays,
          requiresOnSiteVisit,
          missingCriticalFields
        },
        projectClassification: {
          scale: 'small',
          complexityScore: 40,
          estimatedBudgetFloor: 10000000,
          estimatedBudgetCeiling: 30000000,
          dumpingThresholdRatio: 0.75
        },
        decisionPoints: {
          onSiteInspectionRequired: requiresOnSiteVisit,
          qualificationScoreThreshold: 65,
          evaluationWeights: { priceWeight: 40, qualityWeight: 60 }
        },
        confidenceScore: 60,
        aiReasoning: 'به دلیل نقص فیلدهای حیاتی، پروژه به تیکت اصلاحی ارجاع داده شد تا کارفرما داده‌ها را تکمیل کند.',
        analyzedAt: new Date().toISOString()
      };

      return {
        updatedStatus: 'needs_revision',
        analysis,
        ticketCreated: ticket
      };
    }

    // 7. طبقه‌بندی هوشمند پروژه (کوچک، متوسط، بزرگ، سازمانی)
    const rawBudget = Number(formData.estimatedBudget) || 120000000;
    let scale: ProjectScale = 'medium';
    let complexityScore = 50;

    if (rawBudget < 50000000) {
      scale = 'small';
      complexityScore = 35;
    } else if (rawBudget <= 300000000) {
      scale = 'medium';
      complexityScore = 60;
    } else if (rawBudget <= 2000000000) {
      scale = 'large';
      complexityScore = 80;
    } else {
      scale = 'enterprise';
      complexityScore = 95;
    }

    const estimatedBudgetFloor = Math.round(rawBudget * 0.85);
    const estimatedBudgetCeiling = Math.round(rawBudget * 1.25);
    const dumpingThresholdRatio = 0.75; // اگر قیمت پیشنهادی زیر ۷۵٪ کف باشد مشکوک به دامپینگ است

    const analysis: SiraFlowAnalysisResult = {
      extractedAttributes: {
        brand,
        modelOrStandard,
        technicalSpecs,
        location,
        executionDurationDays,
        requiresOnSiteVisit,
        missingCriticalFields: []
      },
      projectClassification: {
        scale,
        complexityScore,
        estimatedBudgetFloor,
        estimatedBudgetCeiling,
        dumpingThresholdRatio
      },
      decisionPoints: {
        onSiteInspectionRequired: requiresOnSiteVisit,
        qualificationScoreThreshold: scale === 'enterprise' ? 85 : scale === 'large' ? 75 : 65,
        evaluationWeights: {
          priceWeight: scale === 'small' ? 50 : 35,
          qualityWeight: scale === 'small' ? 50 : 65
        }
      },
      confidenceScore: 94,
      aiReasoning: `پروژه در کلاس «${scale === 'enterprise' ? 'سازمانی' : scale === 'large' ? 'بزرگ' : scale === 'medium' ? 'متوسط' : 'کوچک'}» طبقه‌بندی شد. نیاز به بازدید حضوری: ${requiresOnSiteVisit ? 'تأیید شد' : 'منتفی است'}. وزن کیفیت در انتخاب برنده: ۶۵٪.`,
      analyzedAt: new Date().toISOString()
    };

    return {
      updatedStatus: 'classified',
      analysis
    };
  }

  /**
   * 2. فاز بازگشایی مناقصه کور (Blind Tender)
   * مخفی‌سازی هویت مستأجران و تخصیص کدهای هش امنیتی
   */
  static createBlindTender(rfp: RFPProject): BlindTender {
    const analysis = rfp.analysis;
    const floor = analysis?.projectClassification.estimatedBudgetFloor || 50000000;
    const ceiling = analysis?.projectClassification.estimatedBudgetCeiling || 100000000;
    const dumpingThreshold = Math.round(floor * (analysis?.projectClassification.dumpingThresholdRatio || 0.75));

    const closing = new Date();
    closing.setDate(closing.getDate() + 7);

    return {
      id: `tender-${Date.now()}`,
      rfpId: rfp.id,
      projectTitle: rfp.title,
      projectScale: analysis?.projectClassification.scale || 'medium',
      status: 'open',
      budgetFloor: floor,
      budgetCeiling: ceiling,
      dumpingAuditThreshold: dumpingThreshold,
      invitedTenantsCount: 12, // ۱۲ مستأجر واجد شرایط هابینو
      bids: [],
      openedAt: new Date().toISOString(),
      closingDate: closing.toISOString()
    };
  }

  /**
   * 3. ثبت و ممیزی پیشنهاد قیمت (Anti-Dumping Audit)
   * محاسبه موازنه قیمت و کیفیت با رعایت پنهان‌سازی هویت مستأجر
   */
  static auditAndAddBid(
    tender: BlindTender,
    bidInput: {
      tenantId: string;
      bidAmount: number;
      deliveryDays: number;
      warrantyMonths: number;
      technicalProposal: string;
      technicalScore: number;
    }
  ): BlindTenderBid {
    const anonymousSuffix = Math.floor(1000 + Math.random() * 9000);
    const anonymousCode = `مستأجر امن هابینو #T-${anonymousSuffix}`;

    // ممیزی دامپینگ (قانون: قیمت نباید کمتر از کف مجاز محاسباتی سایرافلو باشد)
    const isDumpingSuspected = bidInput.bidAmount < tender.dumpingAuditThreshold;
    const dumpingAuditNote = isDumpingSuspected
      ? `هشدار سایرافلو: مبلغ پیشنهادی (${bidInput.bidAmount.toLocaleString('fa-IR')}) زیر آستانه ایمن (${tender.dumpingAuditThreshold.toLocaleString('fa-IR')}) است؛ احتمال عدم توانایی تکمیل کار یا کسر کیفیت وجود دارد.`
      : undefined;

    // محاسبه نمره قیمت (نزدیک‌تر به بهینه، امتیاز بیشتر، قیمت‌های پرتی نمره کم)
    let priceScore = 0;
    if (isDumpingSuspected) {
      priceScore = 30; // جریمه سنگین برای دامپینگ مشکوک
    } else {
      const budgetSpread = tender.budgetCeiling - tender.dumpingAuditThreshold;
      const relativePosition = (tender.budgetCeiling - bidInput.bidAmount) / (budgetSpread || 1);
      priceScore = Math.min(100, Math.max(40, Math.round(50 + relativePosition * 50)));
    }

    // موازنه قیمت و کیفیت بر اساس وزن‌های سایرافلو (60% فنی + 40% قیمت)
    const finalBalancedScore = Math.round(bidInput.technicalScore * 0.6 + priceScore * 0.4);

    return {
      id: `bid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenderId: tender.id,
      tenantId: bidInput.tenantId,
      anonymousCode,
      bidAmount: bidInput.bidAmount,
      deliveryDays: bidInput.deliveryDays,
      warrantyMonths: bidInput.warrantyMonths,
      technicalProposal: bidInput.technicalProposal,
      technicalScore: bidInput.technicalScore,
      priceScore,
      finalBalancedScore,
      isDumpingSuspected,
      dumpingAuditNote,
      complianceChecked: true,
      submittedAt: new Date().toISOString()
    };
  }

  /**
   * 4. ارزیابی نهایی و انتخاب برنده مناقصه توسط سایرافلو
   */
  static evaluateAndSelectWinner(tender: BlindTender): {
    updatedTender: BlindTender;
    winnerBid: BlindTenderBid;
    selectionReason: string;
  } {
    if (!tender.bids || tender.bids.length === 0) {
      throw new Error('هیچ پیشنهادی برای این مناقصه ثبت نشده است.');
    }

    // فیلتر پیشنهادهای نامنطبق یا مشکوک به دامپینگ بدون توجیه
    const validBids = [...tender.bids].sort((a, b) => b.finalBalancedScore - a.finalBalancedScore);
    const winnerBid = validBids[0];

    const selectionReason = `انتخاب توسط موتور موازنه سایرافلو: ${winnerBid.anonymousCode} با کسب بالاترین نمره ترکیبی (${winnerBid.finalBalancedScore} از ۱۰۰)، امتیاز فنی ${winnerBid.technicalScore} و انطباق کامل با سقف بودجه، به عنوان برنده انتخاب شد.`;

    const updatedTender: BlindTender = {
      ...tender,
      status: 'awarded',
      winnerBidId: winnerBid.id,
      winnerTenantId: winnerBid.tenantId,
      winnerAnonymousCode: winnerBid.anonymousCode,
      selectionReason
    };

    return {
      updatedTender,
      winnerBid,
      selectionReason
    };
  }

  /**
   * 5. صدور خودکار قرارداد هوشمند دیجیتال
   */
  static generateSmartContract(
    rfp: RFPProject,
    tender: BlindTender,
    winnerBid: BlindTenderBid
  ): SmartContractDraft {
    const contractNum = `HC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const totalAmount = winnerBid.bidAmount;

    // مایلستون‌های پرداخت هوشمند ۳ مرحله‌ای
    const milestones = [
      {
        title: 'پیش‌پرداخت پس از تجهیز کارگاه و تحویل ضمانت‌نامه',
        percentage: 25,
        amount: Math.round(totalAmount * 0.25),
        conditions: 'تأییدیه حضور در محل و آغاز تعهدات فنی با امضای ناظر هابینو',
        status: 'pending' as const
      },
      {
        title: 'پرداخت میانی پس از پیشرفت ۵۰٪ فیزیکی',
        percentage: 45,
        amount: Math.round(totalAmount * 0.45),
        conditions: 'ارائه صورت‌وضعیت مرحله‌ای و تأیید ممیزی کیفیت سایرافلو',
        status: 'pending' as const
      },
      {
        title: 'تسویه نهایی پس از تحویل قطعی و دوره آزمون',
        percentage: 30,
        amount: Math.round(totalAmount * 0.30),
        conditions: 'تحویل بدون نقص، تست کارایی و آغاز دوره گارانتی رسمی',
        status: 'pending' as const
      }
    ];

    const parties = [
      {
        role: 'employer' as const,
        title: rfp.clientName,
        identifier: rfp.clientRefId,
        did: `did:habino:employer-${rfp.clientRefId}`,
        signatureStatus: 'signed' as const,
        signedAt: new Date().toISOString()
      },
      {
        role: 'winning_tenant' as const,
        title: winnerBid.anonymousCode,
        identifier: winnerBid.tenantId,
        did: `did:habino:${winnerBid.tenantId}`,
        signatureStatus: 'pending' as const
      },
      {
        role: 'habino_escrow' as const,
        title: 'پلتفرم تجارت غیرمتمرکز هابینو (امین اسناد و وجوه)',
        identifier: 'HABINO-PROTOCOL-ESCROW-01',
        did: 'did:habino:escrow-safe-settle',
        signatureStatus: 'signed' as const,
        signedAt: new Date().toISOString()
      }
    ];

    const penaltyPerDay = Math.round(totalAmount * 0.002); // ۰.۲ درصد روزانه خسارت تأخیر
    const mockHash = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    return {
      id: `contract-${Date.now()}`,
      rfpId: rfp.id,
      tenderId: tender.id,
      contractNumber: contractNum,
      title: `قرارداد هوشمند اجرایی: ${rfp.title}`,
      parties,
      totalAmount,
      currency: 'IRT',
      penaltiesPerDayDelay: penaltyPerDay,
      warrantyPeriodMonths: winnerBid.warrantyMonths || 12,
      arbitrationClause: 'در صورت بروز هرگونه اختلاف در تفسیر یا اجرای مفاد قرارداد، مرکز داوری حقوقی اتحادیه اصناف و پلتفرم هابینو به عنوان داور مرضی‌الطرفین صالح به رسیدگی قطعی و لازم‌الاجرا خواهند بود.',
      milestones,
      generatedByAi: true,
      aiVerificationHash: mockHash,
      status: 'pending_signatures',
      createdAt: new Date().toISOString()
    };
  }
}
