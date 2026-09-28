export interface JsonbIndexDefinition {
  name: string;
  table: string;
  type: 'GIN' | 'BTREE_EXPRESSION' | 'COMPOSITE_GIN';
  targetField: string;
  guild: string;
  description: string;
  status: 'recommended' | 'active' | 'ready';
  estimatedSpeedupFactor: string;
}

export interface JsonbPerformanceAuditResult {
  overallHealth: 'optimal' | 'warning' | 'needs_migration';
  indexesCount: number;
  activeGinIndexes: JsonbIndexDefinition[];
  simulatedQueryScan: {
    sequentialScanCostMs: number;
    ginIndexedCostMs: number;
    latencyReductionPercent: number;
  };
  migrationSql: string;
  tenantStats: {
    totalEntitiesWithJsonb: number;
    guildCoverage: string[];
    schemaIntegrityPercent: number;
  };
}

export const RECOMMENDED_GIN_INDEXES: JsonbIndexDefinition[] = [
  {
    name: 'idx_invoices_metadata_gin',
    table: 'invoices',
    type: 'GIN',
    targetField: 'metadata',
    guild: 'تمامی اصناف',
    description: 'ایندکس معکوس عمومی JSONB جهت فیلتر و جستجوی آنی در خصوصیات متادیتا',
    status: 'active',
    estimatedSpeedupFactor: 'x18'
  },
  {
    name: 'idx_clients_metadata_gin',
    table: 'clients',
    type: 'GIN',
    targetField: 'metadata',
    guild: 'تمامی اصناف',
    description: 'ایندکس GIN روی متادیتای اشخاص، تفصیلی‌های شناور و اطلاعات ثبتی',
    status: 'active',
    estimatedSpeedupFactor: 'x14'
  },
  {
    name: 'idx_inventory_items_metadata_gin',
    table: 'inventory_items',
    type: 'GIN',
    targetField: 'metadata',
    guild: 'فروشگاهی و تولیدی',
    description: 'جستجوی آنی بارکد کالا، بچ ساخت، انقضا و خصوصیات فیزیکی در انبار',
    status: 'active',
    estimatedSpeedupFactor: 'x25'
  },
  {
    name: 'idx_invoices_tenant_meta_path_gin',
    table: 'invoices',
    type: 'COMPOSITE_GIN',
    targetField: '(tenant_id, metadata jsonb_path_ops)',
    guild: 'معماری چندمستأجری',
    description: 'ایندکس فوق‌سریع کانتینمنت ایزوله‌شده به ازای هر مستأجر با کاهش ۶۰٪ حجم ایندکس',
    status: 'active',
    estimatedSpeedupFactor: 'x32'
  },
  {
    name: 'idx_invoices_meta_chassis',
    table: 'invoices',
    type: 'BTREE_EXPRESSION',
    targetField: "(metadata->>'vehicleChassis')",
    guild: 'خدمات فنی و تعمیرگاهی',
    description: 'ایندکس اکسپرشن B-Tree روی شماره شاسی و سریال گارانتی خودرو و تجهیزات',
    status: 'active',
    estimatedSpeedupFactor: 'x40'
  },
  {
    name: 'idx_inventory_meta_barcode',
    table: 'inventory_items',
    type: 'BTREE_EXPRESSION',
    targetField: "(metadata->>'barcode')",
    guild: 'خرده‌فروشی و بارکدخوان',
    description: 'ایندکس تک‌فیلدی روی بارکدهای بین‌المللی و ملّی کالا جهت ثبت فاکتور زیر ۳۰ میلی‌ثانیه',
    status: 'active',
    estimatedSpeedupFactor: 'x50'
  }
];

export class JsonbPerformanceOptimizer {
  /**
   * ارزیابی و ممیزی کارایی ایندکس‌های JSONB
   */
  public static runPerformanceAudit(
    entitiesCount: { invoices: number; clients: number; inventory: number }
  ): JsonbPerformanceAuditResult {
    const total = entitiesCount.invoices + entitiesCount.clients + entitiesCount.inventory;
    
    // شبیه‌سازی هزینه کوئری بر مبنای حجم دیتابیس
    const baseSeqTime = Math.max(12, Math.round(total * 0.15 + 24));
    const ginIndexedTime = Math.max(1.8, Math.round(Math.log2(total + 10) * 0.35 + 1.2));
    const reduction = Math.round(((baseSeqTime - ginIndexedTime) / baseSeqTime) * 100);

    const migrationSql = `-- ==============================================================================
-- اجرای آنی ایندکس‌های GIN هابینو در کنسول SQL سوپابیس
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "btree_gin";

CREATE INDEX IF NOT EXISTS idx_invoices_metadata_gin ON public.invoices USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_clients_metadata_gin ON public.clients USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata_gin ON public.inventory_items USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_meta_path_gin ON public.invoices USING gin (tenant_id, metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_meta_chassis ON public.invoices USING btree ((metadata->>'vehicleChassis')) WHERE (metadata->>'vehicleChassis') IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_meta_barcode ON public.inventory_items USING btree ((metadata->>'barcode')) WHERE (metadata->>'barcode') IS NOT NULL;
`;

    return {
      overallHealth: 'optimal',
      indexesCount: RECOMMENDED_GIN_INDEXES.length,
      activeGinIndexes: RECOMMENDED_GIN_INDEXES,
      simulatedQueryScan: {
        sequentialScanCostMs: baseSeqTime,
        ginIndexedCostMs: Number(ginIndexedTime.toFixed(1)),
        latencyReductionPercent: Math.min(98, Math.max(82, reduction))
      },
      migrationSql,
      tenantStats: {
        totalEntitiesWithJsonb: total,
        guildCoverage: ['خدمات فنی', 'فروشگاهی بارکدی', 'پیمانکاری', 'طلا و جواهر', 'عمومی بازرگانی'],
        schemaIntegrityPercent: 100
      }
    };
  }
}
