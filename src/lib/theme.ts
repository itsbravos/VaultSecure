export type AccentColor = 'emerald' | 'cyan' | 'blue' | 'purple' | 'amber' | 'red';
export type ThemeMode = 'dark' | 'slate' | 'beige' | 'light';

export interface AccentTheme {
  name: string;
  id: AccentColor;
  colorHex: string;
  bgBtn: string;
  bgBtnHover: string;
  textAccent: string;
  borderAccent: string;
  shadowAccent: string;
  ringAccent: string;
  badgeBg: string;
  badgeText: string;
}

export const ACCENT_COLORS: Record<AccentColor, AccentTheme> = {
  emerald: {
    name: 'Verde Esmeralda',
    id: 'emerald',
    colorHex: '#10B981',
    bgBtn: 'bg-emerald-600',
    bgBtnHover: 'hover:bg-emerald-500',
    textAccent: 'text-emerald-400',
    borderAccent: 'border-emerald-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(16,185,129,0.3)]',
    ringAccent: 'focus:ring-emerald-500',
    badgeBg: 'bg-emerald-950/80',
    badgeText: 'text-emerald-400',
  },
  cyan: {
    name: 'Ciano Cibernético',
    id: 'cyan',
    colorHex: '#06B6D4',
    bgBtn: 'bg-cyan-600',
    bgBtnHover: 'hover:bg-cyan-500',
    textAccent: 'text-cyan-400',
    borderAccent: 'border-cyan-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(6,182,212,0.3)]',
    ringAccent: 'focus:ring-cyan-500',
    badgeBg: 'bg-cyan-950/80',
    badgeText: 'text-cyan-400',
  },
  blue: {
    name: 'Azul Elétrico',
    id: 'blue',
    colorHex: '#3B82F6',
    bgBtn: 'bg-blue-600',
    bgBtnHover: 'hover:bg-blue-500',
    textAccent: 'text-blue-400',
    borderAccent: 'border-blue-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(59,130,246,0.3)]',
    ringAccent: 'focus:ring-blue-500',
    badgeBg: 'bg-blue-950/80',
    badgeText: 'text-blue-400',
  },
  purple: {
    name: 'Roxo Neon',
    id: 'purple',
    colorHex: '#8B5CF6',
    bgBtn: 'bg-purple-600',
    bgBtnHover: 'hover:bg-purple-500',
    textAccent: 'text-purple-400',
    borderAccent: 'border-purple-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(139,92,246,0.3)]',
    ringAccent: 'focus:ring-purple-500',
    badgeBg: 'bg-purple-950/80',
    badgeText: 'text-purple-400',
  },
  amber: {
    name: 'Âmbar Dourado',
    id: 'amber',
    colorHex: '#F59E0B',
    bgBtn: 'bg-amber-600',
    bgBtnHover: 'hover:bg-amber-500',
    textAccent: 'text-amber-400',
    borderAccent: 'border-amber-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(245,158,11,0.3)]',
    ringAccent: 'focus:ring-amber-500',
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-400',
  },
  red: {
    name: 'Vermelho Rubi',
    id: 'red',
    colorHex: '#EF4444',
    bgBtn: 'bg-red-600',
    bgBtnHover: 'hover:bg-red-500',
    textAccent: 'text-red-400',
    borderAccent: 'border-red-500/50',
    shadowAccent: 'shadow-[0_4px_14px_rgba(239,68,68,0.3)]',
    ringAccent: 'focus:ring-red-500',
    badgeBg: 'bg-red-950/80',
    badgeText: 'text-red-400',
  },
};

export const getAccent = (accent?: AccentColor, isLight?: boolean): AccentTheme => {
  const base = ACCENT_COLORS[accent || 'emerald'] || ACCENT_COLORS.emerald;
  if (!isLight) return base;

  switch (accent) {
    case 'cyan':
      return {
        ...base,
        textAccent: 'text-cyan-700',
        borderAccent: 'border-cyan-300',
        badgeBg: 'bg-cyan-100/90',
        badgeText: 'text-cyan-950',
      };
    case 'blue':
      return {
        ...base,
        textAccent: 'text-blue-700',
        borderAccent: 'border-blue-300',
        badgeBg: 'bg-blue-100/90',
        badgeText: 'text-blue-950',
      };
    case 'purple':
      return {
        ...base,
        textAccent: 'text-purple-700',
        borderAccent: 'border-purple-300',
        badgeBg: 'bg-purple-100/90',
        badgeText: 'text-purple-950',
      };
    case 'amber':
      return {
        ...base,
        textAccent: 'text-amber-800',
        borderAccent: 'border-amber-300',
        badgeBg: 'bg-amber-100/90',
        badgeText: 'text-amber-950',
      };
    case 'red':
      return {
        ...base,
        textAccent: 'text-red-700',
        borderAccent: 'border-red-300',
        badgeBg: 'bg-red-100/90',
        badgeText: 'text-red-950',
      };
    case 'emerald':
    default:
      return {
        ...base,
        textAccent: 'text-emerald-700',
        borderAccent: 'border-emerald-300',
        badgeBg: 'bg-emerald-100/90',
        badgeText: 'text-emerald-950',
      };
  }
};

export interface ThemeStyles {
  isLight: boolean;
  bgApp: string;
  bgMain: string;
  bgHeader: string;
  bgFooter: string;
  bgSidebar: string;
  bgCard: string;
  bgCardInner: string;
  bgInput: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderMain: string;
  borderInner: string;
  hoverBg: string;
  depthShadow: string;
  inputDepth: string;
}

export const THEMES: Record<ThemeMode, ThemeStyles> = {
  dark: {
    isLight: false,
    bgApp: 'bg-[#070707] text-gray-100',
    bgMain: 'bg-[#070707]',
    bgHeader: 'bg-[#0F0F0F]',
    bgFooter: 'bg-[#080808]',
    bgSidebar: 'bg-[#0A0A0A]',
    bgCard: 'bg-[#0F0F0F]',
    bgCardInner: 'bg-[#080808]',
    bgInput: 'bg-[#050505]',
    textPrimary: 'text-gray-100',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-400',
    borderMain: 'border-gray-800',
    borderInner: 'border-gray-800/80',
    hoverBg: 'hover:bg-gray-800/60',
    depthShadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.05)] border-t border-t-gray-700/40',
    inputDepth: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-gray-800 border-t-gray-900',
  },
  slate: {
    isLight: false,
    bgApp: 'bg-[#0F172A] text-slate-100',
    bgMain: 'bg-[#0F172A]',
    bgHeader: 'bg-[#1E293B]',
    bgFooter: 'bg-[#0F172A]',
    bgSidebar: 'bg-[#1E293B]',
    bgCard: 'bg-[#1E293B]',
    bgCardInner: 'bg-[#0F172A]',
    bgInput: 'bg-[#0F172A]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    borderMain: 'border-slate-700',
    borderInner: 'border-slate-700/80',
    hoverBg: 'hover:bg-slate-700/50',
    depthShadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.05)] border-t border-t-slate-600/50',
    inputDepth: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] border border-slate-700 border-t-slate-900',
  },
  beige: {
    isLight: true,
    bgApp: 'bg-[#FAF6F0] text-stone-900',
    bgMain: 'bg-[#FAF6F0]',
    bgHeader: 'bg-[#EFEAE2]',
    bgFooter: 'bg-[#E8E2D8]',
    bgSidebar: 'bg-[#EFEAE2]',
    bgCard: 'bg-[#FFFFFF]',
    bgCardInner: 'bg-[#F5F0E6]',
    bgInput: 'bg-[#FAF6F0]',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-800',
    textMuted: 'text-stone-600',
    borderMain: 'border-stone-300',
    borderInner: 'border-stone-300/80',
    hoverBg: 'hover:bg-stone-200/60',
    depthShadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.08),_0_1px_3px_rgba(0,0,0,0.05)] border border-stone-300/80',
    inputDepth: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] border border-stone-300 text-stone-900',
  },
  light: {
    isLight: true,
    bgApp: 'bg-[#F8FAFC] text-slate-900',
    bgMain: 'bg-[#F8FAFC]',
    bgHeader: 'bg-[#FFFFFF]',
    bgFooter: 'bg-[#F1F5F9]',
    bgSidebar: 'bg-[#FFFFFF]',
    bgCard: 'bg-[#FFFFFF]',
    bgCardInner: 'bg-[#F8FAFC]',
    bgInput: 'bg-[#F1F5F9]',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-800',
    textMuted: 'text-slate-600',
    borderMain: 'border-slate-200',
    borderInner: 'border-slate-300',
    hoverBg: 'hover:bg-slate-100',
    depthShadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.06),_0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200',
    inputDepth: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-slate-300 text-slate-900',
  },
};

export const getTheme = (themeMode?: ThemeMode): ThemeStyles => {
  return THEMES[themeMode || 'dark'] || THEMES.dark;
};
