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
    borderAccent: 'border-emerald-400/25',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(16,185,129,0.55)]',
    ringAccent: 'focus:ring-emerald-500/60',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
  },
  cyan: {
    name: 'Ciano Cibernético',
    id: 'cyan',
    colorHex: '#06B6D4',
    bgBtn: 'bg-cyan-600',
    bgBtnHover: 'hover:bg-cyan-500',
    textAccent: 'text-cyan-400',
    borderAccent: 'border-cyan-400/25',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(6,182,212,0.55)]',
    ringAccent: 'focus:ring-cyan-500/60',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-300',
  },
  blue: {
    name: 'Azul Elétrico',
    id: 'blue',
    colorHex: '#3B82F6',
    bgBtn: 'bg-blue-600',
    bgBtnHover: 'hover:bg-blue-500',
    textAccent: 'text-blue-400',
    borderAccent: 'border-blue-400/25',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(59,130,246,0.55)]',
    ringAccent: 'focus:ring-blue-500/60',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-300',
  },
  purple: {
    name: 'Roxo Neon',
    id: 'purple',
    colorHex: '#8B5CF6',
    bgBtn: 'bg-violet-600',
    bgBtnHover: 'hover:bg-violet-500',
    textAccent: 'text-violet-400',
    borderAccent: 'border-violet-400/25',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(139,92,246,0.55)]',
    ringAccent: 'focus:ring-violet-500/60',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-300',
  },
  amber: {
    name: 'Latão',
    id: 'amber',
    colorHex: '#C9A54C',
    bgBtn: 'bg-[#A8862F]',
    bgBtnHover: 'hover:bg-[#B8953B]',
    textAccent: 'text-[#D8B65C]',
    borderAccent: 'border-[#C9A54C]/30',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_-8px_rgba(201,165,76,0.5)]',
    ringAccent: 'focus:ring-[#C9A54C]/60',
    badgeBg: 'bg-[#C9A54C]/10',
    badgeText: 'text-[#E2C676]',
  },
  red: {
    name: 'Vermelho Rubi',
    id: 'red',
    colorHex: '#EF4444',
    bgBtn: 'bg-red-600',
    bgBtnHover: 'hover:bg-red-500',
    textAccent: 'text-red-400',
    borderAccent: 'border-red-400/25',
    shadowAccent: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(239,68,68,0.55)]',
    ringAccent: 'focus:ring-red-500/60',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-300',
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
        borderAccent: 'border-cyan-600/25',
        badgeBg: 'bg-cyan-600/10',
        badgeText: 'text-cyan-800',
      };
    case 'blue':
      return {
        ...base,
        textAccent: 'text-blue-700',
        borderAccent: 'border-blue-600/25',
        badgeBg: 'bg-blue-600/10',
        badgeText: 'text-blue-800',
      };
    case 'purple':
      return {
        ...base,
        textAccent: 'text-violet-700',
        borderAccent: 'border-violet-600/25',
        badgeBg: 'bg-violet-600/10',
        badgeText: 'text-violet-800',
      };
    case 'amber':
      // Brass on sand/paper: a deeper button so white text keeps its contrast
      return {
        ...base,
        bgBtn: 'bg-[#94741F]',
        bgBtnHover: 'hover:bg-[#A8862F]',
        textAccent: 'text-[#7D5F16]',
        borderAccent: 'border-[#A8862F]/35',
        badgeBg: 'bg-[#C9A54C]/15',
        badgeText: 'text-[#5E4710]',
      };
    case 'red':
      return {
        ...base,
        textAccent: 'text-red-700',
        borderAccent: 'border-red-600/25',
        badgeBg: 'bg-red-600/10',
        badgeText: 'text-red-800',
      };
    case 'emerald':
    default:
      return {
        ...base,
        textAccent: 'text-emerald-700',
        borderAccent: 'border-emerald-600/25',
        badgeBg: 'bg-emerald-600/10',
        badgeText: 'text-emerald-800',
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
  divideInner: string;
  hoverBg: string;
  depthShadow: string;
  inputDepth: string;
}

export const THEMES: Record<ThemeMode, ThemeStyles> = {
  // "Tinta": banknote intaglio ink — petrol green-blue surfaces with engraved hairlines.
  dark: {
    isLight: false,
    bgApp: 'bg-[#0E1F24] text-[#E6EFEC]',
    bgMain: 'bg-[#0E1F24]',
    bgHeader: 'bg-[#0E1F24]/90 backdrop-blur-xl',
    bgFooter: 'bg-[#0B1A1E]',
    bgSidebar: 'bg-[#0B1A1E]',
    bgCard: 'bg-[#13282E]',
    bgCardInner: 'bg-[#0F2227]',
    bgInput: 'bg-[#0B1A1E]',
    textPrimary: 'text-[#E6EFEC]',
    textSecondary: 'text-[#B9CBC6]',
    textMuted: 'text-[#86A19B]',
    borderMain: 'border-[#2C4A50]/70',
    borderInner: 'border-[#2C4A50]/50',
    divideInner: 'divide-[#2C4A50]/50',
    hoverBg: 'hover:bg-[#183238]',
    depthShadow: 'shadow-[inset_0_1px_0_rgba(230,239,236,0.04)]',
    inputDepth: 'border border-[#2C4A50] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]',
  },
  slate: {
    isLight: false,
    bgApp: 'bg-[#0B1120] text-slate-100',
    bgMain: 'bg-[#0B1120]',
    bgHeader: 'bg-[#0B1120]/85 backdrop-blur-xl',
    bgFooter: 'bg-[#0B1120]',
    bgSidebar: 'bg-[#0E1526]',
    bgCard: 'bg-[#131C2F]',
    bgCardInner: 'bg-[#0E1526]',
    bgInput: 'bg-[#0E1526]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    borderMain: 'border-slate-400/[0.12]',
    borderInner: 'border-slate-400/[0.09]',
    divideInner: 'divide-slate-400/[0.09]',
    hoverBg: 'hover:bg-slate-400/[0.07]',
    depthShadow: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_-18px_rgba(0,0,0,0.8)]',
    inputDepth: 'border border-slate-400/[0.14] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]',
  },
  beige: {
    isLight: true,
    bgApp: 'bg-[#F7F4EE] text-stone-900',
    bgMain: 'bg-[#F7F4EE]',
    bgHeader: 'bg-[#F7F4EE]/85 backdrop-blur-xl',
    bgFooter: 'bg-[#F7F4EE]',
    bgSidebar: 'bg-[#F1EDE4]',
    bgCard: 'bg-[#FFFDF9]',
    bgCardInner: 'bg-[#F4F0E8]',
    bgInput: 'bg-[#FFFDF9]',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-700',
    textMuted: 'text-stone-500',
    borderMain: 'border-stone-900/[0.09]',
    borderInner: 'border-stone-900/[0.07]',
    divideInner: 'divide-stone-900/[0.07]',
    hoverBg: 'hover:bg-stone-900/[0.04]',
    depthShadow: 'shadow-[0_1px_2px_rgba(41,37,36,0.05),0_8px_24px_-16px_rgba(41,37,36,0.18)]',
    inputDepth: 'border border-stone-900/[0.12] shadow-[inset_0_1px_2px_rgba(41,37,36,0.05)] text-stone-900',
  },
  // "Papel": cool mint-grey security paper printed in petrol ink.
  light: {
    isLight: true,
    bgApp: 'bg-[#E8EEEA] text-[#0E1F24]',
    bgMain: 'bg-[#E8EEEA]',
    bgHeader: 'bg-[#E8EEEA]/90 backdrop-blur-xl',
    bgFooter: 'bg-[#DFE7E2]',
    bgSidebar: 'bg-[#DFE7E2]',
    bgCard: 'bg-[#F4F7F5]',
    bgCardInner: 'bg-[#E8EEEA]',
    bgInput: 'bg-[#F4F7F5]',
    textPrimary: 'text-[#0E1F24]',
    textSecondary: 'text-[#28434A]',
    textMuted: 'text-[#5A7470]',
    borderMain: 'border-[#0E1F24]/[0.14]',
    borderInner: 'border-[#0E1F24]/[0.09]',
    divideInner: 'divide-[#0E1F24]/[0.09]',
    hoverBg: 'hover:bg-[#0E1F24]/[0.05]',
    depthShadow: 'shadow-[0_1px_0_rgba(14,31,36,0.06)]',
    inputDepth: 'border border-[#0E1F24]/[0.16] shadow-[inset_0_1px_2px_rgba(14,31,36,0.05)] text-[#0E1F24]',
  },
};

export const getTheme = (themeMode?: ThemeMode): ThemeStyles => {
  return THEMES[themeMode || 'dark'] || THEMES.dark;
};

// Status colors for password health. Dark themes use the engraved-ink tints;
// light themes need deeper values to keep text contrast on paper.
export interface SignalStyles {
  safeText: string;
  safeBg: string;
  warnText: string;
  warnBg: string;
  dangerText: string;
  dangerBg: string;
  safeHex: string;
  warnHex: string;
  dangerHex: string;
  trackBg: string;
}

export const getSignals = (isLight?: boolean): SignalStyles =>
  isLight
    ? {
        safeText: 'text-[#1F7A57]',
        safeBg: 'bg-[#1F7A57]',
        warnText: 'text-[#8A6A1C]',
        warnBg: 'bg-[#B8922F]',
        dangerText: 'text-[#B8361F]',
        dangerBg: 'bg-[#C8432C]',
        safeHex: '#2E8B66',
        warnHex: '#B8922F',
        dangerHex: '#C8432C',
        trackBg: 'bg-[#0E1F24]/10',
      }
    : {
        safeText: 'text-[#7FD1AE]',
        safeBg: 'bg-[#7FD1AE]',
        warnText: 'text-[#D8B65C]',
        warnBg: 'bg-[#C9A54C]',
        dangerText: 'text-[#EC7A66]',
        dangerBg: 'bg-[#E0533D]',
        safeHex: '#7FD1AE',
        warnHex: '#C9A54C',
        dangerHex: '#E0533D',
        trackBg: 'bg-[#2C4A50]',
      };

/** Text color for a password-strength score, legible on both ink and paper themes. */
export const strengthTone = (score: number, isLight?: boolean): string => {
  const s = getSignals(isLight);
  return score >= 70 ? s.safeText : score >= 50 ? s.warnText : s.dangerText;
};
