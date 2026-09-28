import { DesignTokens, ColorTokens, TypographyTokens, SpacingAndShapeTokens } from '../types';

export type { DesignTokens, ColorTokens, TypographyTokens, SpacingAndShapeTokens };

export const DEFAULT_DESIGN_TOKENS: Record<string, DesignTokens> = {
  electronic: {
    id: 'electronic',
    name: 'تجهیزات و خدمات دیجیتال',
    colors: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      border: '#e2e8f0',
      accent: '#38bdf8'
    },
    typography: {
      fontFamily: 'Vazirmatn',
      fontSizeBase: '16px',
      headingScale: 1.25
    },
    spacing: {
      paddingBase: '16px',
      borderRadius: '12px'
    }
  },
  services: {
    id: 'services',
    name: 'شرکت‌های خدماتی و مشاوره',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#064e3b',
      border: '#d1fae5',
      accent: '#34d399'
    },
    typography: {
      fontFamily: 'Vazirmatn',
      fontSizeBase: '16px',
      headingScale: 1.3
    },
    spacing: {
      paddingBase: '16px',
      borderRadius: '10px'
    }
  },
  boutique: {
    id: 'boutique',
    name: 'بوتیک و فروشگاه لوکس',
    colors: {
      primary: '#d97706',
      secondary: '#f59e0b',
      background: '#fffbeb',
      surface: '#ffffff',
      text: '#78350f',
      border: '#fde68a',
      accent: '#fbbf24'
    },
    typography: {
      fontFamily: 'Vazirmatn',
      fontSizeBase: '16px',
      headingScale: 1.33
    },
    spacing: {
      paddingBase: '18px',
      borderRadius: '16px'
    }
  }
};
