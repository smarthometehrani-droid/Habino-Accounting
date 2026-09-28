import { agentEventBus } from './eventBus';
import { sanitizeAgentInput, sanitizeTenantId } from './securitySanitizer';

/* ========================================================================= */
/* TYPES & INTERFACES FOR THE 5-AGENT ARCHITECTURE                         */
/* ========================================================================= */

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnomalyStatus = 'OPEN' | 'INVESTIGATING' | 'DISPATCHED' | 'RESOLVED';

export interface DiagnosticEvent {
  id: string;
  component: string;
  errorMessage: string;
  stackTrace?: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  tenantId: string;
  dispatchedToCoder?: boolean;
  coderTicketId?: string;
  suggestedFix?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  resolvedAt?: string;
}

export type IdeaCategory = 'FEATURE' | 'SECURITY' | 'ACCOUNTING' | 'AI' | 'DEVOPS' | 'PERSIAN_UX';
export type IdeaStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_ROADMAP';

export interface IdeaProposal {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  targetPersona: string;
  businessImpact: 'Low' | 'Medium' | 'High' | 'Strategic';
  status: IdeaStatus;
  priority: 'P0' | 'P1' | 'P2';
  rejectionReason?: string;
  roadmapItemId?: string;
  proposedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RoadmapLifecycleStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface AgentRoadmapItem {
  id: string;
  title: string;
  description: string;
  phase: string;
  category: string;
  status: RoadmapLifecycleStatus;
  priority: 'P0' | 'P1' | 'P2';
  sourceIdeaId?: string;
  estimatedEffortDays: number;
  technicalLead: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemNeed {
  id: string;
  area: string;
  title: string;
  justification: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'IDENTIFIED' | 'REFERRED_TO_IDEA' | 'IMPLEMENTED';
  targetAgent: string;
  referredIdeaId?: string;
  identifiedAt: string;
}

export interface ConvergenceGap {
  id: string;
  component: string;
  demoState: string;
  roadmapTarget: string;
  gapType: 'MISSING_FEATURE' | 'SCHEMA_DISCREPANCY' | 'SECURITY_GAP' | 'PERFORMANCE_GAP';
  severity: 'P0' | 'P1' | 'P2';
  status: 'OPEN' | 'REFERRED' | 'RESOLVED';
  targetAgent: string;
  recommendation: string;
  createdAt: string;
}

export interface ConvergenceReport {
  id: string;
  evaluatedAt: string;
  convergenceScore: number; // 0 - 100
  totalGapsCount: number;
  criticalGapsCount: number;
  summary: string;
  recommendations: string[];
}

export interface RoadmapIngestionReport {
  id: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  itemCount: number;
  extractedItems: Array<{
    id: string;
    title: string;
    description: string;
    phase: string;
    priority: 'P0' | 'P1' | 'P2';
    status: RoadmapLifecycleStatus;
  }>;
  evaluationNotes: string;
  status: 'EVALUATED' | 'INJECTED' | 'REJECTED';
  evaluatedAt: string;
}

export interface DocumentationItem {
  id: string;
  title: string;
  type: 'OPENAPI_SPEC' | 'ARCHITECTURE_DECISION' | 'SCHEMA_REFERENCE' | 'AGENT_MANUAL';
  version: string;
  summary: string;
  content: string;
  updatedAt: string;
}

/* ========================================================================= */
/* IN-MEMORY LIVE STORES                                                     */
/* ========================================================================= */

export const liveDiagnosticStore: Map<string, DiagnosticEvent> = new Map();
export const liveIdeaStore: Map<string, IdeaProposal> = new Map();
export const liveRoadmapStore: Map<string, AgentRoadmapItem> = new Map();
export const liveSystemNeedsStore: Map<string, SystemNeed> = new Map();
export const liveConvergenceGapsStore: Map<string, ConvergenceGap> = new Map();
export let latestConvergenceReport: ConvergenceReport | null = null;
export const liveRoadmapIngestionStore: Map<string, RoadmapIngestionReport> = new Map();
export const liveDocumentationStore: DocumentationItem[] = [];

/* ========================================================================= */
/* 1. DIAGNOSTIC AGENT                                                       */
/* ========================================================================= */

export class DiagnosticAgent {
  public static async ingestException(params: {
    component: string;
    errorMessage: string;
    stackTrace?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
  }): Promise<DiagnosticEvent> {
    const id = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tenantId = sanitizeTenantId(params.tenantId);
    const component = sanitizeAgentInput(params.component);
    const errorMessage = sanitizeAgentInput(params.errorMessage);

    // Analyze severity automatically
    let severity: AnomalySeverity = 'LOW';
    if (errorMessage.toLowerCase().includes('database') || errorMessage.toLowerCase().includes('reconciliation') || errorMessage.toLowerCase().includes('balance')) {
      severity = 'CRITICAL';
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('auth')) {
      severity = 'HIGH';
    } else if (errorMessage.toLowerCase().includes('warning') || errorMessage.toLowerCase().includes('fallback')) {
      severity = 'MEDIUM';
    }

    const event: DiagnosticEvent = {
      id,
      component,
      errorMessage,
      stackTrace: params.stackTrace,
      severity,
      status: 'OPEN',
      tenantId,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString()
    };

    liveDiagnosticStore.set(id, event);

    // Broadcast on EventBus
    agentEventBus.publish(
      'DiagnosticAgent',
      'ANOMALY_DETECTED',
      { eventId: id, component, severity, errorMessage },
      severity === 'CRITICAL' ? 'BROADCAST' : 'CoderAgent',
      severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      tenantId
    );

    return event;
  }

  public static async dispatchToCoder(eventId: string, customNotes?: string): Promise<{ ticketId: string; status: string; notes?: string }> {
    const item = liveDiagnosticStore.get(eventId);
    if (!item) {
      throw new Error(`خطای تشخیصی با شناسه ${eventId} یافت نشد.`);
    }

    const ticketId = `TICK-${Date.now().toString().slice(-6)}`;
    item.status = 'DISPATCHED';
    item.dispatchedToCoder = true;
    item.coderTicketId = ticketId;
    item.suggestedFix = customNotes || 'بررسی ردیف‌های یتیم دیتابیس و اعتبارسنجی تراز دفتر روزنامه.';

    agentEventBus.publish(
      'DiagnosticAgent',
      'DISPATCHED_TO_CODER',
      { eventId, ticketId, component: item.component, notes: customNotes },
      'CoderAgent',
      'INFO',
      item.tenantId
    );

    return { ticketId, status: 'DISPATCHED', notes: customNotes };
  }
}

/* ========================================================================= */
/* 2. IDEA AGENT                                                             */
/* ========================================================================= */

export class IdeaAgent {
  public static async proposeFeature(params: {
    title: string;
    description: string;
    category?: string;
    targetPersona?: string;
    businessImpact?: 'Low' | 'Medium' | 'High' | 'Strategic';
  }): Promise<IdeaProposal> {
    const id = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const title = sanitizeAgentInput(params.title);
    const description = sanitizeAgentInput(params.description);

    const idea: IdeaProposal = {
      id,
      title,
      description,
      category: (params.category as IdeaCategory) || 'FEATURE',
      targetPersona: sanitizeAgentInput(params.targetPersona || 'ارائه‌دهندگان خدمات و فریلنسرها'),
      businessImpact: params.businessImpact || 'High',
      status: 'PROPOSED',
      priority: params.businessImpact === 'Strategic' ? 'P0' : 'P1',
      proposedBy: 'IdeaAgent / Synapse AI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    liveIdeaStore.set(id, idea);

    agentEventBus.publish(
      'IdeaAgent',
      'IDEA_PROPOSED',
      { ideaId: id, title, category: idea.category, impact: idea.businessImpact },
      'RoadmapAgent',
      'INFO'
    );

    return idea;
  }

  public static async approveIdea(ideaId: string, priority: 'P0' | 'P1' | 'P2'): Promise<{ success: boolean; idea: IdeaProposal; roadmapItemId: string }> {
    const idea = liveIdeaStore.get(ideaId);
    if (!idea) {
      throw new Error('ایده مورد نظر یافت نشد.');
    }

    const roadmapItemId = `rm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    idea.status = 'APPROVED';
    idea.priority = priority;
    idea.roadmapItemId = roadmapItemId;
    idea.updatedAt = new Date().toISOString();

    // Create item in live roadmap
    const roadmapItem: AgentRoadmapItem = {
      id: roadmapItemId,
      title: idea.title,
      description: idea.description,
      phase: 'فاز ۵: تاب‌آوری، رشد محلی و تسویه غیرمتمرکز',
      category: idea.category,
      status: 'PLANNED',
      priority,
      sourceIdeaId: ideaId,
      estimatedEffortDays: 5,
      technicalLead: 'معمار ارشد هابینو',
      tenantId: 'tenant-main',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    liveRoadmapStore.set(roadmapItemId, roadmapItem);

    agentEventBus.publish(
      'IdeaAgent',
      'IDEA_APPROVED_AND_QUEUED',
      { ideaId, roadmapItemId, title: idea.title, priority },
      'RoadmapAgent',
      'SUCCESS'
    );

    return { success: true, idea, roadmapItemId };
  }

  public static async rejectIdea(ideaId: string, reason: string): Promise<IdeaProposal> {
    const idea = liveIdeaStore.get(ideaId);
    if (!idea) {
      throw new Error('ایده مورد نظر یافت نشد.');
    }

    idea.status = 'REJECTED';
    idea.rejectionReason = sanitizeAgentInput(reason);
    idea.updatedAt = new Date().toISOString();

    agentEventBus.publish(
      'IdeaAgent',
      'IDEA_REJECTED',
      { ideaId, reason: idea.rejectionReason },
      'BROADCAST',
      'WARNING'
    );

    return idea;
  }
}

/* ========================================================================= */
/* 3. ROADMAP AGENT                                                          */
/* ========================================================================= */

export class RoadmapAgent {
  public static async transitionStatus(itemId: string, newStatus: RoadmapLifecycleStatus): Promise<AgentRoadmapItem | null> {
    const item = liveRoadmapStore.get(itemId);
    if (!item) return null;

    const oldStatus = item.status;
    item.status = newStatus;
    item.updatedAt = new Date().toISOString();

    agentEventBus.publish(
      'RoadmapAgent',
      'ROADMAP_STATUS_TRANSITION',
      { itemId, title: item.title, from: oldStatus, to: newStatus },
      'BROADCAST',
      'INFO'
    );

    return item;
  }
}

/* ========================================================================= */
/* 4. SYSTEM NEEDS EVALUATOR AGENT & CONVERGENCE ENGINE                     */
/* ========================================================================= */

export class NeedsEvaluatorAgent {
  public static async auditRoadmapAndIdentifyNeeds(): Promise<{ auditScore: number; identifiedCount: number; needs: SystemNeed[] }> {
    const evaluatedNeeds: SystemNeed[] = [
      {
        id: 'need-1',
        area: 'پشتیبانی آفلاین و PWA',
        title: 'سازوکار کش پیشرفته دیتابیس محلی (Dexie/IndexedDB) برای مناطق با پوشش ضعیف اینترنت',
        justification: 'کاربران صنف خدمات در زمان قطع اینترنت بین‌الملل باید بتوانند صدور فاکتور و ثبت کار را ادامه دهند.',
        urgency: 'Critical',
        status: 'IDENTIFIED',
        targetAgent: 'IdeaAgent',
        identifiedAt: new Date().toISOString()
      },
      {
        id: 'need-2',
        area: 'امنیت و لایسنسینگ',
        title: 'رمزنگاری نامتقارن کلیدهای فعال‌سازی بدون نیاز به اتصال دائم سرور',
        justification: 'کاهش ریسک تداخل یا جعل لایسنس‌های نرم‌افزار در استقرار مستقل.',
        urgency: 'High',
        status: 'IDENTIFIED',
        targetAgent: 'IdeaAgent',
        identifiedAt: new Date().toISOString()
      },
      {
        id: 'need-3',
        area: 'حسابداری خدماتی',
        title: 'محاسبه بهای تمام‌شده قراردادهای بلندمدت با برچسب پروژه',
        justification: 'انطباق دقیق با بند ۷ اصول ثبت سود پروژه در سیستم دوبل.',
        urgency: 'High',
        status: 'IDENTIFIED',
        targetAgent: 'IdeaAgent',
        identifiedAt: new Date().toISOString()
      }
    ];

    evaluatedNeeds.forEach(need => {
      liveSystemNeedsStore.set(need.id, need);
    });

    agentEventBus.publish(
      'NeedsEvaluatorAgent',
      'SYSTEM_NEEDS_AUDITED',
      { count: evaluatedNeeds.length, auditScore: 92 },
      'IdeaAgent',
      'INFO'
    );

    return { auditScore: 92, identifiedCount: evaluatedNeeds.length, needs: evaluatedNeeds };
  }

  public static async referNeedToIdeaAgent(needId: string): Promise<IdeaProposal> {
    const need = liveSystemNeedsStore.get(needId);
    if (!need) {
      throw new Error('نیاز سیستمی مورد نظر یافت نشد.');
    }

    const idea = await IdeaAgent.proposeFeature({
      title: need.title,
      description: need.justification,
      category: need.area.includes('حسابداری') ? 'ACCOUNTING' : need.area.includes('امنیت') ? 'SECURITY' : 'FEATURE',
      targetPersona: 'کسب‌وکارهای خدماتی هابینو',
      businessImpact: need.urgency === 'Critical' ? 'Strategic' : 'High'
    });

    need.status = 'REFERRED_TO_IDEA';
    need.referredIdeaId = idea.id;

    agentEventBus.publish(
      'NeedsEvaluatorAgent',
      'NEED_REFERRED_TO_IDEA',
      { needId, ideaId: idea.id, title: idea.title },
      'IdeaAgent',
      'INFO'
    );

    return idea;
  }

  public static async auditAndAutoReferAll(): Promise<{ processedCount: number; referredIdeas: IdeaProposal[] }> {
    const unreferred = Array.from(liveSystemNeedsStore.values()).filter(n => n.status === 'IDENTIFIED');
    const ideas: IdeaProposal[] = [];

    for (const need of unreferred) {
      const idea = await this.referNeedToIdeaAgent(need.id);
      ideas.push(idea);
    }

    return { processedCount: ideas.length, referredIdeas: ideas };
  }

  public static async auditDemoRoadmapConvergence(): Promise<ConvergenceReport> {
    // Generate convergence gaps between Demo state and evolving Enterprise Roadmap
    const gaps: ConvergenceGap[] = [
      {
        id: 'gap-rls-multitenant',
        component: 'Database Security Policies',
        demoState: 'سیاست‌های باز عمومی (Public true/true)',
        roadmapTarget: 'ایزولاسیون کامل داده‌ها بر اساس tenant_id و current_setting',
        gapType: 'SECURITY_GAP',
        severity: 'P0',
        status: 'OPEN',
        targetAgent: 'CoderAgent',
        recommendation: 'پیاده‌سازی تابع current_tenant_id و بازنویسی RLS روی ۱۲ جدول اصلی.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'gap-orphan-reconciliation',
        component: 'Financial Reconciliation Engine',
        demoState: 'محاسبه در سطح کلاینت بدون Rollback سمت سرور',
        roadmapTarget: 'مکانیزم اتمیک اسناد و حذف زنجیره‌ای اسناد دوبل و چک‌ها',
        gapType: 'SCHEMA_DISCREPANCY',
        severity: 'P1',
        status: 'OPEN',
        targetAgent: 'CoderAgent',
        recommendation: 'ثبت تابع اعتبارسنجی ترازنامه و ممیزی اقلام یتیم در سرور.',
        createdAt: new Date().toISOString()
      }
    ];

    gaps.forEach(g => liveConvergenceGapsStore.set(g.id, g));

    latestConvergenceReport = {
      id: `rep-${Date.now()}`,
      evaluatedAt: new Date().toISOString(),
      convergenceScore: 94,
      totalGapsCount: gaps.length,
      criticalGapsCount: gaps.filter(g => g.severity === 'P0').length,
      summary: 'انطباق دمو با رودمپ در سطح عالی (۹۴٪) است. تنها شکاف امنیتی با اولویت بحرانی مربوط به خط‌مشی‌های RLS دیتابیس می‌باشد.',
      recommendations: [
        'اعمال RLS چندمستأجری سخت‌گیرانه روی کلیه جداول',
        'یکپارچه‌سازی لایسنس منیجر داخلی با کلاینت هابینو',
        'فعال‌سازی سرویس‌ورکر PWA در محیط پروداکشن'
      ]
    };

    agentEventBus.publish(
      'NeedsEvaluatorAgent',
      'CONVERGENCE_AUDITED',
      { score: 94, gapsCount: gaps.length },
      'BROADCAST',
      'INFO'
    );

    return latestConvergenceReport;
  }

  public static async referGapToTargetAgent(gapId: string): Promise<{ targetAgent: string; actionTaken: string; gap: ConvergenceGap }> {
    const gap = liveConvergenceGapsStore.get(gapId);
    if (!gap) throw new Error('شکاف همگرایی مورد نظر یافت نشد.');

    gap.status = 'REFERRED';

    agentEventBus.publish(
      'NeedsEvaluatorAgent',
      'CONVERGENCE_GAP_REFERRED',
      { gapId, component: gap.component, recommendation: gap.recommendation },
      (gap.targetAgent as any) || 'CoderAgent',
      gap.severity === 'P0' ? 'CRITICAL' : 'WARNING'
    );

    return {
      targetAgent: gap.targetAgent,
      actionTaken: `ارجاع شکاف ${gap.component} جهت اصلاح فنی فوری`,
      gap
    };
  }

  public static async referAllGapsToAgents(): Promise<{ referredCount: number; actions: string[] }> {
    const openGaps = Array.from(liveConvergenceGapsStore.values()).filter(g => g.status === 'OPEN');
    const actions: string[] = [];

    for (const g of openGaps) {
      const res = await this.referGapToTargetAgent(g.id);
      actions.push(res.actionTaken);
    }

    return { referredCount: openGaps.length, actions };
  }
}

/* ========================================================================= */
/* 5. ROADMAP INGESTION ENGINE                                               */
/* ========================================================================= */

export class RoadmapIngestionEngine {
  public static PRESETS = [
    {
      id: 'preset-saas-service-provider',
      title: 'رودمپ استاندارد صنف خدمات و شرکت‌های مهندسی',
      description: 'شامل مدیریت قرارداد، ساعات کارکرد، فاکتور دوره‌ای و لایسنس مستقل',
      industry: 'صنف خدمات و مشاوره',
      tags: ['SaaS', 'Time-Tracking', 'Recurring-Invoice', 'License'],
      itemCount: 4,
      samplePayload: {
        title: 'رودمپ استاندارد هابینو برای شرکت‌های خدماتی و پیمانکاری',
        industry: 'Service Providers & Freelancers',
        targetQuarter: '1404-Q3',
        milestones: [
          {
            id: 'srv-01',
            title: 'ماژول رهگیری ساعات کارکرد پرسنل و اتصال به صورتحساب پروژه‌ای',
            description: 'محاسبه بهای تمام شده دستمزد بر اساس نرخ ساعتی تکنسین‌ها و درج خودکار در فاکتور نهایی',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P0',
            status: 'PLANNED',
            estimatedDays: 4,
            iranianSaaSRelevanceScore: 98,
            recommendedTargetAgent: 'CoderAgent',
            technicalRationale: 'نیاز اساسی شرکت‌های خدماتی جهت پیشگیری از هدررفت منابع و محاسبه دقیق سود پروژه'
          },
          {
            id: 'srv-02',
            title: 'سیستم صدور فاکتور ادواری و اشتراک ماهانه با پیامک یادآوری',
            description: 'تولید اتوماتیک فاکتورهای دوره‌ای (ماهانه/سه‌ماهه) برای مشتریان قراردادهای پشتیبانی',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P1',
            status: 'PLANNED',
            estimatedDays: 3,
            iranianSaaSRelevanceScore: 95,
            recommendedTargetAgent: 'RoadmapAgent',
            technicalRationale: 'تثبیت جریان نقدینگی ماهانه و کاهش پیگیری‌های دستی حسابدار'
          },
          {
            id: 'srv-03',
            title: 'مدیریت پیش‌دریافت و تسویه مرحله‌ای قراردادها در دفاتر دوبل',
            description: 'ثبت اسناد دوبل برای پیش‌دریافت، بستانکاری کارفرما و شناسایی تدریجی درآمد با پیشرفت کار',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P0',
            status: 'PLANNED',
            estimatedDays: 3,
            iranianSaaSRelevanceScore: 99,
            recommendedTargetAgent: 'DiagnosticAgent',
            technicalRationale: 'انطباق کامل با استاندارد شماره ۹ حسابداری و جلوگیری از تداخل حساب پیش‌پرداخت'
          },
          {
            id: 'srv-04',
            title: 'قالب اختصاصی چاپ فاکتور رسمی خدمات با ریز دستمزد و متریال',
            description: 'تفکیک شفاف هزینه‌های اجرت، مصالح مصرفی، کسورات بیمه و مالیات تکلیفی',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P2',
            status: 'PLANNED',
            estimatedDays: 2,
            iranianSaaSRelevanceScore: 92,
            recommendedTargetAgent: 'CoderAgent',
            technicalRationale: 'ارائه فاکتور شفاف به کارفرمایان دولتی و خصوصی جهت تسریع در تایید امور مالی'
          }
        ]
      }
    },
    {
      id: 'preset-p2p-financial',
      title: 'رودمپ تسویه حساب غیرمتمرکز و تاب‌آوری آفلاین',
      description: 'شامل کش کلاینت، همگام‌سازی سوآپ و چک صیادی بدون وقفه در شرایط تحریم و قطعی',
      industry: 'فین‌تک و تاب‌آوری',
      tags: ['Offline-First', 'P2P', 'IndexedDB', 'Sayad-Check'],
      itemCount: 3,
      samplePayload: {
        title: 'رودمپ تاب‌آوری آفلاین و تبادل مالی مستقل از اینترنت بین‌الملل',
        industry: 'Resilient Fintech',
        targetQuarter: '1404-Q3',
        milestones: [
          {
            id: 'p2p-01',
            title: 'صف همگام‌سازی آفلاین دوطرفه (Outbox Pattern) با IndexedDB',
            description: 'امکان صدور چک، ثبت فاکتور و گردش حساب در حالت بدون اینترنت و ارسال اتمیک به سرور پس از اتصال',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P0',
            status: 'PLANNED',
            estimatedDays: 5,
            iranianSaaSRelevanceScore: 99,
            recommendedTargetAgent: 'CoderAgent',
            technicalRationale: 'تضمین تداوم کسب‌وکار در هنگام نوسان شبکه یا اختلالات سراسری اینترنت'
          },
          {
            id: 'p2p-02',
            title: 'استعلام دسته‌ای و محلی شناسه صیادی با مکانیزم کش امنیتی',
            description: 'بررسی وضعیت چک‌های دریافتی با ذخیره‌سازی موقت داده‌های تایید شده و اعتبارسنجی رمزنگاری',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P1',
            status: 'PLANNED',
            estimatedDays: 3,
            iranianSaaSRelevanceScore: 96,
            recommendedTargetAgent: 'RoadmapAgent',
            technicalRationale: 'سرعت بخشیدن به فرآیند پذیرش چک توسط فروشنده بدون نیاز به استعلام مکرر آنلاین'
          },
          {
            id: 'p2p-03',
            title: 'پشتیبان‌گیری محلی خودکار رمزنگاری شده (Daily Encrypted Vault)',
            description: 'تهیه فایل خروجی امن روزانه از کلیه جداول مالی با کلید خصوصی کاربر روی حافظه دستگاه',
            phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
            priority: 'P1',
            status: 'PLANNED',
            estimatedDays: 2,
            iranianSaaSRelevanceScore: 94,
            recommendedTargetAgent: 'DiagnosticAgent',
            technicalRationale: 'حاکمیت داده (Data Sovereignty) کامل برای مدیران بدون اتکا به سرورهای ثالث'
          }
        ]
      }
    }
  ];

  public static async evaluateRoadmapProposal(params: {
    fileName: string;
    fileType: string;
    rawContent: string;
    uploadedBy: string;
  }): Promise<RoadmapIngestionReport> {
    const id = `ingest-${Date.now()}`;
    let extractedItems: any[] = [];

    try {
      if (params.fileType === 'JSON' || params.rawContent.trim().startsWith('{') || params.rawContent.trim().startsWith('[')) {
        const parsed = JSON.parse(params.rawContent);
        const arrayItems = Array.isArray(parsed) ? parsed : (parsed.milestones || parsed.items || []);
        extractedItems = arrayItems.map((item: any, idx: number) => ({
          id: item.id || `ingest-item-${idx + 1}`,
          title: item.title || item.name || `آیتم واردشده شماره ${idx + 1}`,
          description: item.description || item.technicalRationale || 'توضیحات توسط ایجنت پردازش شد.',
          phase: item.phase || 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
          priority: item.priority || 'P1',
          status: (item.status || 'PLANNED') as RoadmapLifecycleStatus,
          estimatedDays: item.estimatedDays || 3,
          iranianSaaSRelevanceScore: item.iranianSaaSRelevanceScore || Math.floor(90 + Math.random() * 9),
          recommendedTargetAgent: item.recommendedTargetAgent || 'CoderAgent',
          dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
          technicalRationale: item.technicalRationale || item.description || 'انطباق با نیازمندی‌های بومی کسب‌وکار ایرانی'
        }));
      } else {
        // Parse line-by-line / Markdown
        const lines = params.rawContent.split('\n').filter(l => l.trim().length > 0);
        extractedItems = lines.slice(0, 10).map((line, idx) => ({
          id: `line-item-${idx + 1}`,
          title: line.replace(/^[#\-\*\d\.\s]+/, '').trim(),
          description: 'استخراج‌شده از مستند متنی نقشه راه',
          phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
          priority: 'P1',
          status: 'PLANNED' as RoadmapLifecycleStatus,
          estimatedDays: 3,
          iranianSaaSRelevanceScore: 92,
          recommendedTargetAgent: 'CoderAgent',
          dependencies: [],
          technicalRationale: 'تزریق مستقیم از متون تحلیلی نقشه راه'
        }));
      }
    } catch {
      extractedItems = [
        {
          id: 'fallback-item-1',
          title: params.fileName.replace(/\.[^/.]+$/, ''),
          description: 'محتوای خام دریافت و به عنوان تسک به نقشه راه اضافه شد.',
          phase: 'فاز ۵: توسعه اختصاصی',
          priority: 'P1',
          status: 'PLANNED' as RoadmapLifecycleStatus,
          estimatedDays: 3,
          iranianSaaSRelevanceScore: 88,
          recommendedTargetAgent: 'CoderAgent',
          dependencies: [],
          technicalRationale: 'ثبت به عنوان تسک اولیه جهت بازبینی تکمیلی'
        }
      ];
    }

    const report: any = {
      id,
      reportId: id,
      fileName: params.fileName,
      fileType: params.fileType,
      uploadedBy: params.uploadedBy,
      itemCount: extractedItems.length,
      extractedItems,
      overallSuitabilityScore: 96,
      evaluationNotes: `تعداد ${extractedItems.length} آیتم با موفقیت استخراج و با نیازمندی‌های فاز ۵ تطبیق داده شد.`,
      status: 'EVALUATED',
      evaluatedAt: new Date().toISOString()
    };

    liveRoadmapIngestionStore.set(id, report);

    agentEventBus.publish(
      'RoadmapAgent',
      'ROADMAP_INGEST_EVALUATED',
      { reportId: id, itemCount: extractedItems.length },
      'BROADCAST',
      'INFO'
    );

    return report;
  }

  public static async injectEvaluatedRoadmap(
    reportId: string,
    selectedItemIds: string[],
    supervisorNotes?: string
  ): Promise<{ injectedCount: number; injectedItems: AgentRoadmapItem[] }> {
    const report = liveRoadmapIngestionStore.get(reportId);
    if (!report) {
      throw new Error('گزارش واردسازی مورد نظر یافت نشد.');
    }

    const injected: AgentRoadmapItem[] = [];
    for (const extracted of report.extractedItems) {
      if (selectedItemIds.includes(extracted.id)) {
        const item: AgentRoadmapItem = {
          id: `injected-${Date.now()}-${extracted.id}`,
          title: extracted.title,
          description: extracted.description,
          phase: extracted.phase,
          category: 'PERSIAN_UX',
          status: extracted.status,
          priority: extracted.priority,
          estimatedEffortDays: 3,
          technicalLead: 'معمار هابینو',
          tenantId: 'tenant-main',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        liveRoadmapStore.set(item.id, item);
        injected.push(item);
      }
    }

    report.status = 'INJECTED';

    agentEventBus.publish(
      'RoadmapAgent',
      'ROADMAP_ITEMS_INJECTED',
      { count: injected.length, supervisorNotes },
      'BROADCAST',
      'SUCCESS'
    );

    return { injectedCount: injected.length, injectedItems: injected };
  }
}

/* ========================================================================= */
/* ORCHESTRATOR INITIALIZER                                                  */
/* ========================================================================= */

export function initializeMultiAgentOrchestrator() {
  // 1. Seed initial documentation store
  if (liveDocumentationStore.length === 0) {
    liveDocumentationStore.push(
      {
        id: 'doc-arch-01',
        title: 'Habino Multi-Tenant Financial Ledger Architecture',
        type: 'ARCHITECTURE_DECISION',
        version: '2.5.0',
        summary: 'مستند معماری دفاتر دوبل مالی، برچسب‌های پروژه، ایزولاسیون بر اساس tenant_id و پشتیبان‌گیری اتمیک',
        content: `اصول ده‌گانه حسابداری هابینو:
1. هیچ سندی بدون مخاطب ثبت نمی‌شود.
2. مبالغ بدهکار و بستانکار در دفتر روزنامه با یکدیگر در توازن کامل قرار دارند.
3. پروژه‌ها حساب کل مستقل ندارند بلکه برچسب‌های رهگیری هزینه‌کرد و سود هستند.
4. حذف سند منجر به Rollback زنجیره‌ای در کلیه دفاتر، اشخاص و چک‌ها می‌گردد.`,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-openapi-01',
        title: 'Habino Open Commerce & Agent API Specification',
        type: 'OPENAPI_SPEC',
        version: '1.2.0',
        summary: 'مشخصات تعاملی وب‌سرویس‌های ارکستراسیون ایجنت‌ها و جریان نقدی',
        content: `POST /api/agents/diagnostics/ingest
POST /api/agents/ideas/propose
POST /api/agents/roadmap/transition
GET /api/agents/live-stream (SSE)`,
        updatedAt: new Date().toISOString()
      }
    );
  }

  // 2. Seed initial roadmap items
  if (liveRoadmapStore.size === 0) {
    const initialItems: AgentRoadmapItem[] = [
      {
        id: 'rm-init-1',
        title: 'جداسازی داده‌ها با Row-Level Security بر اساس tenant_id',
        description: 'ایمن‌سازی لایه دیتابیس Supabase با پالیسی‌های سخت‌گیرانه برای هر کسب‌وکار',
        phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
        category: 'SECURITY',
        status: 'IN_PROGRESS',
        priority: 'P0',
        estimatedEffortDays: 3,
        technicalLead: 'مهندس فرید تهرانی / معمار ارشد',
        tenantId: 'tenant-main',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'rm-init-2',
        title: 'سیستم لایسنس مستقل هابینو (Offline Activation Keys)',
        description: 'امکان صدور و اعتبارسنجی شماره سریال‌های سازمانی بدون وابستگی به پلی استور',
        phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
        category: 'ACCOUNTING',
        status: 'COMPLETED',
        priority: 'P0',
        estimatedEffortDays: 2,
        technicalLead: 'معمار هابینو',
        tenantId: 'tenant-main',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'rm-init-3',
        title: 'داشبورد تحلیلی و عیب‌یابی بلادرنگ مغایرت دفاتر مالی',
        description: 'پایش مستمر فرمول (Income - Expense == Balance) و گزارش آنی ناترازی‌ها',
        phase: 'فاز ۵: رشد محلی و ایزولاسیون زیرساخت',
        category: 'AI',
        status: 'COMPLETED',
        priority: 'P1',
        estimatedEffortDays: 2,
        technicalLead: 'هوش مصنوعی سیناپس',
        tenantId: 'tenant-main',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    initialItems.forEach(item => liveRoadmapStore.set(item.id, item));
  }

  // 3. Trigger initial audit of system needs
  NeedsEvaluatorAgent.auditRoadmapAndIdentifyNeeds().catch(e => {
    console.error('[Orchestrator] Error during initial needs audit:', e);
  });
}
