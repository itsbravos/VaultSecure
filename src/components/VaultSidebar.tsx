import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Key,
  CreditCard,
  FileText,
  FileCheck,
  Code2,
  Star,
  Settings,
  Download,
  Layers,
  FolderPlus,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  HardDrive,
  Dices,
  ChevronDown,
  Check,
  Shield,
  Briefcase,
  Users,
  House,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ItemCategory, VaultSettings, SecurityReport } from '../types';
import { getAccent, getTheme, getSignals } from '../lib/theme';
import type { AppView } from './HomeView';
import { tr } from '../lib/i18n';

const VAULTS = () => [
  {
    id: 'pessoal',
    name: tr("Pessoal"),
    desc: tr("Suas contas"),
    icon: Shield,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'trabalho',
    name: tr("Trabalho"),
    desc: tr("Acessos da empresa"),
    icon: Briefcase,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'compartilhado',
    name: tr("Compartilhado"),
    desc: tr("Dados da equipe"),
    icon: Users,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
];

interface VaultSidebarProps {
  activeCategory: ItemCategory | 'all' | 'favorites';
  onSelectCategory: (cat: ItemCategory | 'all' | 'favorites') => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  categoryCounts: Record<string, number>;
  securityReport: SecurityReport;
  settings: VaultSettings;
  onOpenCategoryManager?: () => void;
  onOpenAddItemModal?: () => void;
  activeVaultId?: string;
  onChangeVault?: (vaultId: string) => void;
  onOpenOnboarding?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  activeCategory,
  onSelectCategory: selectCategory,
  activeView,
  onSelectView: selectView,
  categoryCounts,
  securityReport,
  settings,
  onOpenCategoryManager,
  onOpenAddItemModal,
  activeVaultId = 'pessoal',
  onChangeVault,
  onOpenOnboarding,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [collapsedPref, setIsCollapsed] = useState(false);
  // The icon-only mode is a desktop column; the phone drawer always shows labels
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const isCollapsed = isDesktop && collapsedPref;

  // On small screens the sidebar is a drawer: picking a destination closes it
  const onSelectView: typeof selectView = view => {
    selectView(view);
    onCloseMobile?.();
  };
  const onSelectCategory: typeof selectCategory = cat => {
    selectCategory(cat);
    onCloseMobile?.();
  };
  const [isVaultMenuOpen, setIsVaultMenuOpen] = useState(false);
  const [collapsedMenuPos, setCollapsedMenuPos] = useState<{ top: number; left: number } | null>(null);

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  const currentVault = VAULTS().find(v => v.id === activeVaultId) || VAULTS()[0];
  const CurrentIcon = currentVault.icon;

  const categories = [
    { id: 'all', label: tr("Todos os itens"), icon: Layers, count: categoryCounts.all || 0 },
    { id: 'favorites', label: tr("Favoritos"), icon: Star, count: categoryCounts.favorites || 0 },
    { id: 'login', label: tr("Logins"), icon: Key, count: categoryCounts.login || 0 },
    { id: 'card', label: tr("Cartões"), icon: CreditCard, count: categoryCounts.card || 0 },
    { id: 'note', label: tr("Notas seguras"), icon: FileText, count: categoryCounts.note || 0 },
    { id: 'certificate', label: tr("Certificados"), icon: FileCheck, count: categoryCounts.certificate || 0 },
    { id: 'api_key', label: tr("Chaves API e SSH"), icon: Code2, count: categoryCounts.api_key || 0 },
    ...(settings.customCategories || []).map(cc => ({
      id: cc.id,
      label: cc.name,
      icon: FolderPlus,
      count: categoryCounts[cc.id] || 0,
    })),
  ];

  // Dynamic LocalStorage usage calculation
  const storageStats = useMemo(() => {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          bytes += (key.length + val.length) * 2;
        }
      }
    } catch (e) {
      bytes = 4000;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB limit
    const percentage = Math.max(1, Math.min(100, Math.round((bytes / maxBytes) * 100)));

    let formattedUsed = '';
    if (bytes < 1024) {
      formattedUsed = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      formattedUsed = `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      formattedUsed = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return {
      usedText: formattedUsed,
      totalText: '5.0 MB',
      percentage,
    };
  }, [categoryCounts]);

  const navItem = (isSelected: boolean) =>
    `group w-full relative flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13.5px] transition-colors cursor-pointer ${
      isSelected
        ? `${theme.isLight ? 'bg-[#0E1F24]/[0.07]' : 'bg-[#183238]'} ${theme.textPrimary} font-semibold`
        : `${theme.textSecondary} ${theme.hoverBg}`
    } ${isCollapsed ? 'justify-center' : ''}`;

  // Engraved accent bar marking the current destination
  const activeBar = (isSelected: boolean) =>
    isSelected ? <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r ${accent.bgBtn}`} /> : null;

  const sectionLabel = (label: string) =>
    !isCollapsed && <p className={`px-2.5 pt-4 pb-1.5 text-xs font-medium ${theme.textMuted}`}>{label}</p>;

  const tools = [
    { id: 'generator' as const, label: tr("Gerador de senhas"), icon: Dices },
    { id: 'certificates' as const, label: tr("Gerenciar certificados"), icon: FileCheck, dot: Boolean(settings.digitalCertificates?.length) },
    { id: 'backup' as const, label: tr("Backup"), icon: Download },
    { id: 'settings' as const, label: tr("Configurações"), icon: Settings },
  ];

  const signal = getSignals(theme.isLight);
  const scoreTone = securityReport.score >= 80 ? signal.safeText : securityReport.score >= 50 ? signal.warnText : signal.dangerText;

  return (
    <>
    {isMobileOpen && (
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden animate-fade-in" onClick={onCloseMobile} />
    )}
    <aside
      className={`border-r ${theme.borderMain} flex flex-col ${theme.bgSidebar} shrink-0 overflow-y-auto
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none lg:h-full lg:transition-[width] ${
        isCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}
    >
      {/* Vault switcher */}
      <div data-tour="vault-switcher" className={`p-3 border-b ${theme.borderInner} flex items-center gap-1 ${isCollapsed ? 'lg:flex-col lg:gap-2' : ''}`}>
        {isCollapsed && (
          <>
            <button
              type="button"
              onClick={e => {
                // The aside scrolls (overflow), so the menu is fixed-positioned next to the button
                const r = e.currentTarget.getBoundingClientRect();
                setCollapsedMenuPos({ top: r.top, left: r.right + 8 });
                setIsVaultMenuOpen(!isVaultMenuOpen);
              }}
              className={`hidden lg:flex order-2 w-10 h-10 rounded-lg border ${theme.borderMain} ${theme.bgCard} items-center justify-center ${theme.textSecondary} ${theme.hoverBg} cursor-pointer`}
              title={tr("Cofre: {p0} (clique para trocar)", { p0: currentVault.name })}
              aria-haspopup="menu"
              aria-expanded={isVaultMenuOpen}
            >
              <CurrentIcon className="w-4 h-4" />
            </button>
            {/* Portal: the aside has a transform + overflow, which would clip a fixed menu */}
            {createPortal(
            <AnimatePresence>
              {isVaultMenuOpen && collapsedMenuPos && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsVaultMenuOpen(false)} />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    style={{ top: collapsedMenuPos.top, left: collapsedMenuPos.left }}
                    className={`fixed z-50 w-60 p-1 rounded-xl border ${theme.borderMain} ${theme.bgCard} shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]`}
                  >
                    <p className={`px-2 pt-1.5 pb-1 text-xs font-medium ${theme.textMuted}`}>{tr("Trocar de cofre")}</p>
                    {VAULTS().map(v => {
                      const IconComp = v.icon;
                      return (
                        <button
                          key={v.id}
                          role="menuitemradio"
                          aria-checked={v.id === activeVaultId}
                          type="button"
                          onClick={() => {
                            onChangeVault?.(v.id);
                            setIsVaultMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left cursor-pointer ${theme.hoverBg}`}
                        >
                          <IconComp className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-medium ${theme.textPrimary} truncate`}>{v.name}</p>
                            <p className={`text-xs ${theme.textMuted} truncate`}>{v.desc}</p>
                          </div>
                          {v.id === activeVaultId && <Check className={`w-4 h-4 shrink-0 ${accent.textAccent}`} />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
            )}
          </>
        )}
        {!isCollapsed && (
          <div className="relative flex-1 min-w-0 z-20">
            <button
              type="button"
              onClick={() => setIsVaultMenuOpen(!isVaultMenuOpen)}
              className={`w-full flex items-center gap-2.5 h-11 px-2 rounded-lg ${theme.hoverBg} transition-colors cursor-pointer text-left`}
            >
              <div className={`w-7 h-7 rounded-md border ${theme.borderMain} ${theme.bgCard} flex items-center justify-center shrink-0 ${theme.textSecondary}`}>
                <CurrentIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[13.5px] font-semibold ${theme.textPrimary} truncate leading-tight`}>{currentVault.name}</p>
                <p className={`text-xs ${theme.textMuted} truncate leading-tight`}>{currentVault.desc}</p>
              </div>
              <ChevronDown className={`w-4 h-4 ${theme.textMuted} transition-transform shrink-0 ${isVaultMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isVaultMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsVaultMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute left-0 right-0 top-full mt-1 z-40 p-1 rounded-xl border ${theme.borderMain} ${theme.bgCard} shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)]`}
                  >
                    {VAULTS().map(v => {
                      const IconComp = v.icon;
                      const isSelected = v.id === activeVaultId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            onChangeVault?.(v.id);
                            setIsVaultMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left cursor-pointer ${theme.hoverBg}`}
                        >
                          <IconComp className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-medium ${theme.textPrimary} truncate`}>{v.name}</p>
                            <p className={`text-xs ${theme.textMuted} truncate`}>{v.desc}</p>
                          </div>
                          {isSelected && <Check className={`w-4 h-4 shrink-0 ${accent.textAccent}`} />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex order-1 w-8 h-8 shrink-0 rounded-lg items-center justify-center ${theme.textMuted} ${theme.hoverBg} transition-colors cursor-pointer ${isCollapsed ? 'mx-auto' : ''}`}
          title={isCollapsed ? tr("Expandir menu") : tr("Recolher menu")}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 pb-3">
        {/* Home + health */}
        <div className="pt-3 space-y-px">
          <button
            onClick={() => onSelectView('home')}
            className={navItem(activeView === 'home')}
            title={tr("Início")}
          >
            {activeBar(activeView === 'home')}
            <House className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="flex-1 text-left">{tr("Início")}</span>}
          </button>
          <button
            data-tour="nav-health"
            onClick={() => onSelectView('audit')}
            className={navItem(activeView === 'audit')}
            title={tr("Saúde do cofre")}
          >
            {activeBar(activeView === 'audit')}
            <PieChart className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{tr("Saúde do cofre")}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${scoreTone}`}>{securityReport.score}</span>
              </>
            )}
          </button>
        </div>

        {/* Categories */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between pr-1">
            {sectionLabel(tr('Itens'))}
            {onOpenCategoryManager && (
              <button
                onClick={onOpenCategoryManager}
                className={`mt-3 p-1 rounded-md ${theme.textMuted} ${theme.hoverBg} cursor-pointer`}
                title={tr("Gerenciar categorias")}
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className={`my-3 border-t ${theme.borderInner}`} />
        )}

        <div className="space-y-px">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeView === 'items' && activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                data-tour={cat.id === 'all' ? 'nav-items' : undefined}
                onClick={() => {
                  onSelectView('items');
                  onSelectCategory(cat.id as any);
                }}
                className={navItem(isSelected)}
                title={cat.label}
              >
                {activeBar(isSelected)}
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{cat.label}</span>
                    <span className={`text-xs tabular-nums ${theme.textMuted}`}>{cat.count || ''}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Tools */}
        {isCollapsed ? <div className={`my-3 border-t ${theme.borderInner}`} /> : sectionLabel(tr('Ferramentas'))}
        <div className="space-y-px">
          {tools.map(t => {
            const Icon = t.icon;
            const isSelected = activeView === t.id;
            return (
              <button key={t.id} data-tour={`nav-${t.id}`} onClick={() => onSelectView(t.id)} className={navItem(isSelected)} title={t.label}>
                {activeBar(isSelected)}
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="flex-1 text-left">{t.label}</span>}
                {!isCollapsed && t.dot && <span className={`w-1.5 h-1.5 rounded-full ${accent.bgBtn}`} title={tr("Certificado cadastrado")} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Storage + how-it-works */}
      <div className={`p-3 border-t ${theme.borderInner}`}>
        {!isCollapsed ? (
          <div className="px-1.5 space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className={theme.textMuted}>{tr("Armazenamento local")}</span>
              <span className={`${theme.textSecondary} tabular-nums`}>{storageStats.usedText}</span>
            </div>
            <div className={`h-1 w-full rounded-full overflow-hidden ${theme.isLight ? 'bg-[#0E1F24]/10' : 'bg-[#2C4A50]/60'}`}>
              <div className={`h-full ${accent.bgBtn} rounded-full`} style={{ width: `${Math.max(2, storageStats.percentage)}%` }} />
            </div>
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className={`pt-1 text-xs ${theme.textMuted} hover:underline underline-offset-2 cursor-pointer flex items-center gap-1.5`}
              >
                <Shield className="w-3.5 h-3.5" />
                {tr("Como sua senha é protegida")}
              </button>
            )}
          </div>
        ) : (
          <div
            className={`flex justify-center ${theme.textMuted}`}
            title={tr("Armazenamento local: {p0} de {p1}", { p0: storageStats.usedText, p1: storageStats.totalText })}
          >
            <HardDrive className="w-4 h-4" />
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
