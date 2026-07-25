import React, { useMemo, useState } from 'react';
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
  Sparkles,
  ChevronDown,
  Check,
  Shield,
  Briefcase,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ItemCategory, VaultSettings, SecurityReport } from '../types';
import { getAccent, getTheme } from '../lib/theme';

const VAULTS = [
  {
    id: 'pessoal',
    name: 'Cofre Pessoal',
    desc: 'Contas & senhas individuais',
    icon: Shield,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'trabalho',
    name: 'Cofre de Trabalho',
    desc: 'Empresa & acessos corporativos',
    icon: Briefcase,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'compartilhado',
    name: 'Cofre Compartilhado',
    desc: 'Chaves & dados de equipe',
    icon: Users,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
];

interface VaultSidebarProps {
  activeCategory: ItemCategory | 'all' | 'favorites';
  onSelectCategory: (cat: ItemCategory | 'all' | 'favorites') => void;
  activeView: 'items' | 'generator' | 'audit' | 'settings' | 'certificates' | 'backup';
  onSelectView: (view: 'items' | 'generator' | 'audit' | 'settings' | 'certificates' | 'backup') => void;
  categoryCounts: Record<string, number>;
  securityReport: SecurityReport;
  settings: VaultSettings;
  onOpenCategoryManager?: () => void;
  onOpenAddItemModal?: () => void;
  activeVaultId?: string;
  onChangeVault?: (vaultId: string) => void;
  onOpenOnboarding?: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  activeCategory,
  onSelectCategory,
  activeView,
  onSelectView,
  categoryCounts,
  securityReport,
  settings,
  onOpenCategoryManager,
  onOpenAddItemModal,
  activeVaultId = 'pessoal',
  onChangeVault,
  onOpenOnboarding,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVaultMenuOpen, setIsVaultMenuOpen] = useState(false);

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  const currentVault = VAULTS.find(v => v.id === activeVaultId) || VAULTS[0];
  const CurrentIcon = currentVault.icon;

  const categories = [
    { id: 'all', label: 'Todos os Itens', icon: Layers, count: categoryCounts.all || 0 },
    { id: 'favorites', label: 'Favoritos', icon: Star, count: categoryCounts.favorites || 0 },
    { id: 'login', label: 'Emails e Logins', icon: Key, count: categoryCounts.login || 0 },
    { id: 'card', label: 'Cartões de Crédito', icon: CreditCard, count: categoryCounts.card || 0 },
    { id: 'note', label: 'Notas Seguras', icon: FileText, count: categoryCounts.note || 0 },
    { id: 'certificate', label: 'Certificados Digitais', icon: FileCheck, count: categoryCounts.certificate || 0 },
    { id: 'api_key', label: 'Chaves API e SSH', icon: Code2, count: categoryCounts.api_key || 0 },
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

  const activeItemStyle = `${accent.badgeBg} ${accent.badgeText} font-bold border ${accent.borderAccent} shadow-sm`;

  const inactiveItemStyle = `${theme.textMuted} ${theme.hoverBg} hover:${theme.textPrimary}`;

  return (
    <motion.aside
      layout
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`border-r ${theme.borderMain} flex flex-col p-3 gap-3 ${theme.bgSidebar} shrink-0 justify-between h-full max-h-screen overflow-y-auto custom-scrollbar transition-all duration-300 ${
        isCollapsed ? 'w-16 lg:w-20' : 'w-full lg:w-64'
      }`}
    >
      {/* Upper Section */}
      <div className="space-y-3">
        
        {/* Sleek Sidebar Toggle Header */}
        <div className={`flex items-center justify-between pb-1 border-b ${theme.borderInner}`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <span className={`text-[10px] font-mono font-bold uppercase ${theme.textMuted} tracking-wider`}>
                Menu Principal
              </span>
              <button
                onClick={() => setIsCollapsed(true)}
                className={`p-1.5 rounded-lg ${theme.hoverBg} ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
                title="Recolher Menu Lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className={`w-10 h-10 mx-auto rounded-xl ${theme.bgCardInner} border ${theme.borderMain} flex items-center justify-center ${accent.textAccent} hover:scale-105 transition-all shadow-sm cursor-pointer`}
              title="Expandir Menu Lateral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* MULTI-VAULT SELECTOR & ONBOARDING */}
        {!isCollapsed && (
          <div className="space-y-2">
            {/* Vault Switcher Custom Dropdown */}
            <div className="relative font-mono z-20">
              <div className={`p-2 rounded-xl border ${theme.borderInner} ${theme.bgCardInner} space-y-1.5`}>
                <label className={`text-[9px] uppercase font-bold ${theme.textMuted} tracking-wider block`}>
                  Cofre Ativo
                </label>

                <button
                  type="button"
                  onClick={() => setIsVaultMenuOpen(!isVaultMenuOpen)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border ${theme.borderMain} ${theme.bgInput} ${theme.hoverBg} transition-all cursor-pointer text-left shadow-sm`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-6 h-6 rounded-lg ${currentVault.color} border flex items-center justify-center shrink-0`}>
                      <CurrentIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-bold ${theme.textPrimary} truncate`}>
                      {currentVault.name}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 ${theme.textMuted} transition-transform duration-200 shrink-0 ${isVaultMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Floating Custom Dropdown Popup */}
              <AnimatePresence>
                {isVaultMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsVaultMenuOpen(false)}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute left-0 right-0 top-full mt-1.5 z-40 p-1.5 rounded-2xl border ${theme.borderMain} ${theme.bgCard} shadow-2xl backdrop-blur-xl space-y-1`}
                    >
                      {VAULTS.map((v) => {
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
                            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                              isSelected
                                ? `${accent.badgeBg} ${accent.borderAccent}`
                                : `border-transparent ${theme.hoverBg}`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className={`w-7 h-7 rounded-lg ${v.color} border flex items-center justify-center shrink-0`}>
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <p className={`text-xs font-bold ${theme.textPrimary} truncate`}>
                                  {v.name}
                                </p>
                                <p className={`text-[9px] ${theme.textMuted} truncate`}>
                                  {v.desc}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className={`w-5 h-5 rounded-md ${accent.bgBtn} text-white flex items-center justify-center shrink-0 ml-1 shadow-sm`}>
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Zero-Knowledge Tutorial Button */}
            {onOpenOnboarding && (
              <button
                type="button"
                onClick={onOpenOnboarding}
                className={`w-full p-2 rounded-xl border ${accent.borderAccent} ${accent.badgeBg} ${accent.textAccent} hover:underline text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Manual Zero-Knowledge</span>
              </button>
            )}
          </div>
        )}

        {/* Main Action Button */}
        <motion.div layout>
          <button
            onClick={() => {
              onSelectView('items');
              onSelectCategory('all');
              if (onOpenAddItemModal) {
                onOpenAddItemModal();
              }
            }}
            className={`w-full ${accent.bgBtn} ${accent.bgBtnHover} text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${accent.shadowAccent} text-xs cursor-pointer`}
            title="Nova Credencial"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Nova Credencial</span>}
          </button>
        </motion.div>

        {/* DASHBOARD DE SEGURANÇA */}
        <div className={`pt-2 border-t ${theme.borderInner}`}>
          {!isCollapsed && (
            <p className={`px-2 text-[10px] uppercase font-bold ${theme.textMuted} tracking-wider mb-1 font-mono`}>
              Dashboard
            </p>
          )}

          <button
            onClick={() => onSelectView('audit')}
            className={`w-full relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeView === 'audit' ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
            }`}
            title="Dashboard de Saúde do Cofre"
          >
            <div className="relative z-10 flex items-center gap-2.5 mx-auto lg:mx-0">
              <PieChart className={`w-4 h-4 shrink-0 ${accent.textAccent}`} />
              {!isCollapsed && <span>Dashboard de Saúde</span>}
            </div>
            {!isCollapsed && (
              <span className={`relative z-10 text-[10px] font-mono font-bold ${accent.badgeText} ${accent.badgeBg} px-1.5 py-0.5 rounded border ${accent.borderAccent}`}>
                {securityReport.score}%
              </span>
            )}
          </button>
        </div>

        {/* Categories Navigation */}
        <div className={`space-y-0.5 pt-2 border-t ${theme.borderInner}`}>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 mb-1">
              <p className={`text-[10px] uppercase font-bold ${theme.textMuted} tracking-wider font-mono`}>
                Categorias
              </p>
              {onOpenCategoryManager && (
                <button
                  onClick={onOpenCategoryManager}
                  className={`text-[10px] font-mono ${accent.textAccent} hover:opacity-80 flex items-center gap-1 font-semibold cursor-pointer`}
                  title="Gerenciar Categorias Customizadas"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeView === 'items' && activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectView('items');
                  onSelectCategory(cat.id as any);
                }}
                className={`w-full relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
                }`}
                title={cat.label}
              >
                <div className="relative z-10 flex items-center gap-2.5 mx-auto lg:mx-0">
                  <Icon className={`w-4 h-4 shrink-0 ${cat.color || (isSelected ? accent.textAccent : theme.textMuted)}`} />
                  {!isCollapsed && <span>{cat.label}</span>}
                </div>
                {!isCollapsed && (
                  <span
                    className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? theme.isLight ? 'bg-white/90 font-bold border border-stone-300 text-stone-900 shadow-xs' : 'bg-black/50 font-bold border border-gray-700 text-white'
                        : `${theme.bgInput} ${theme.textMuted}`
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tools Section */}
        <div className={`space-y-0.5 pt-2 border-t ${theme.borderInner}`}>
          {!isCollapsed && (
            <p className={`px-2 text-[10px] uppercase font-bold ${theme.textMuted} tracking-wider mb-1 font-mono`}>
              Ferramentas
            </p>
          )}

          {/* Generator */}
          <button
            onClick={() => onSelectView('generator')}
            className={`w-full relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeView === 'generator' ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
            }`}
            title="Gerador de Senhas"
          >
            <Sparkles className={`relative z-10 w-4 h-4 ${activeView === 'generator' ? accent.textAccent : theme.textMuted} shrink-0 mx-auto lg:mx-0`} />
            {!isCollapsed && <span className="relative z-10">Gerador de Senhas</span>}
          </button>

          {/* Digital Certificates */}
          <button
            onClick={() => onSelectView('certificates')}
            className={`w-full relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeView === 'certificates' ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
            }`}
            title="Certificados Digitais"
          >
            <div className="relative z-10 flex items-center gap-2.5 mx-auto lg:mx-0">
              <FileCheck className={`w-4 h-4 ${activeView === 'certificates' ? accent.textAccent : theme.textMuted} shrink-0`} />
              {!isCollapsed && <span>Certificados PKI</span>}
            </div>
            {!isCollapsed && settings.digitalCertificates && settings.digitalCertificates.length > 0 && (
              <span className="relative z-10 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          {/* Backup */}
          <button
            onClick={() => onSelectView('backup')}
            className={`w-full relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeView === 'backup' ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
            }`}
            title="Backup e Exportação"
          >
            <Download className={`relative z-10 w-4 h-4 ${activeView === 'backup' ? accent.textAccent : theme.textMuted} shrink-0 mx-auto lg:mx-0`} />
            {!isCollapsed && <span className="relative z-10">Backup e Exportação</span>}
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectView('settings')}
            className={`w-full relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeView === 'settings' ? activeItemStyle : `${inactiveItemStyle} border border-transparent`
            }`}
            title="Configurações"
          >
            <Settings className={`relative z-10 w-4 h-4 ${activeView === 'settings' ? accent.textAccent : theme.textMuted} shrink-0 mx-auto lg:mx-0`} />
            {!isCollapsed && <span className="relative z-10">Configurações</span>}
          </button>
        </div>

      </div>

      {/* Storage Progress Widget - Always visible & nicely styled */}
      <motion.div layout className={`pt-2 border-t ${theme.borderInner}`}>
        {!isCollapsed ? (
          <div className={`p-3 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-1.5 font-mono shadow-sm`}>
            <div className="flex justify-between items-center text-[10px] uppercase font-bold">
              <span className={theme.textMuted}>Memória Local</span>
              <span className={`${accent.textAccent} text-[10px] font-bold`}>
                {storageStats.percentage}%
              </span>
            </div>
            <div className={`h-1.5 w-full ${theme.bgInput} rounded-full overflow-hidden border ${theme.borderInner}`}>
              <div
                className={`h-full ${accent.bgBtn} rounded-full transition-all duration-300`}
                style={{ width: `${Math.max(2, storageStats.percentage)}%` }}
              />
            </div>
            <p className={`text-[10px] ${theme.textMuted} pt-0.5`}>
              {storageStats.usedText} de {storageStats.totalText}
            </p>
          </div>
        ) : (
          <div
            className={`flex flex-col items-center justify-center p-2 rounded-xl ${theme.bgCardInner} border ${theme.borderInner}`}
            title={`Memória Local: ${storageStats.usedText} / ${storageStats.totalText} (${storageStats.percentage}% usado)`}
          >
            <HardDrive className={`w-4 h-4 ${accent.textAccent} mb-0.5`} />
            <span className={`text-[9px] font-mono font-bold ${theme.textMuted}`}>
              {storageStats.percentage}%
            </span>
          </div>
        )}
      </motion.div>

    </motion.aside>
  );
};

