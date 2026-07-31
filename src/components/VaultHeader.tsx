import React from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  Plus,
  Sparkles,
  Monitor,
  Menu,
} from 'lucide-react';
import { VaultSettings, SecurityReport } from '../types';
import { getTheme, getAccent } from '../lib/theme';

interface VaultHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddItemModal: () => void;
  onOpenGeneratorModal: () => void;
  onLockVault: () => void;
  autoLockTimeRemaining: number; // in seconds
  settings: VaultSettings;
  securityReport: SecurityReport;
  itemCount: number;
  onOpenAutoFillModal?: () => void;
  activeVaultId?: string;
  onOpenMobileMenu?: () => void;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddItemModal,
  onOpenGeneratorModal,
  onLockVault,
  settings,
  onOpenAutoFillModal,
  activeVaultId = 'pessoal',
  onOpenMobileMenu,
}) => {
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);

  const getVaultBadge = () => {
    switch (activeVaultId) {
      case 'trabalho':
        return { label: 'Cofre de Trabalho', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'compartilhado':
        return { label: 'Cofre Compartilhado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      default:
        return { label: 'Cofre Pessoal', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    }
  };

  const vaultBadge = getVaultBadge();

  return (
    <header className={`h-16 border-b ${theme.borderMain} px-3 sm:px-4 lg:px-6 flex items-center justify-between ${theme.bgHeader} shrink-0 z-30 transition-colors`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Menu Toggle — opens the off-canvas sidebar drawer */}
        <button
          onClick={onOpenMobileMenu}
          className={`lg:hidden p-2 -ml-1 rounded-lg ${theme.hoverBg} ${theme.textSecondary} shrink-0`}
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={`w-9 h-9 ${accent.bgBtn} rounded-xl flex items-center justify-center text-white ${accent.shadowAccent} shrink-0 transition-all`}>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className={`text-base sm:text-lg font-bold tracking-tight ${theme.textPrimary} flex items-center gap-2 truncate`}>
            <span>VaultSecure</span>
            <span className={`${theme.textMuted} font-normal text-xs font-mono hidden lg:inline`}>v4.2</span>
          </h1>

          {/* Active Vault Header Indicator */}
          <span className={`hidden lg:inline px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${vaultBadge.color} shadow-xs shrink-0`}>
            {vaultBadge.label}
          </span>
        </div>
      </div>

      {/* Right User & Badges Controls */}
      <div className="flex items-center gap-3 lg:gap-5">
        {/* MFA Verified Pill */}
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1 ${accent.badgeBg} border ${accent.borderAccent} rounded-full`}>
          <div className={`w-2 h-2 ${accent.bgBtn} rounded-full animate-pulse`} />
          <span className={`text-[11px] font-semibold ${accent.badgeText} uppercase tracking-wider font-mono`}>
            {settings.require2FA ? 'MFA Verified' : 'AES-256 Encrypted'}
          </span>
        </div>

        {/* New Item Button */}
        <button
          onClick={onOpenAddItemModal}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} text-xs font-semibold text-white transition-all ${accent.shadowAccent} shrink-0 whitespace-nowrap`}
          title="Nova Credencial"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Nova Credencial</span>
        </button>

        {/* Quick Password Generator */}
        <button
          onClick={onOpenGeneratorModal}
          className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${theme.bgCardInner} ${theme.hoverBg} ${theme.textSecondary} border ${theme.borderMain} transition-colors text-xs font-medium whitespace-nowrap shrink-0`}
          title="Gerar Senha Aleatória"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Gerar Senha</span>
        </button>

        {/* Auto-Fill Detector Companion Button */}
        {onOpenAutoFillModal && (
          <button
            onClick={onOpenAutoFillModal}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors text-xs font-medium font-mono whitespace-nowrap shrink-0`}
            title="Assistente de Auto-Preenchimento no Navegador"
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Auto-Fill</span>
          </button>
        )}

        {/* Lock Action Button */}
        <button
          onClick={onLockVault}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${theme.bgCardInner} hover:bg-red-500/10 hover:border-red-500/50 ${theme.textSecondary} hover:text-red-500 border ${theme.borderMain} transition-colors text-xs font-medium whitespace-nowrap shrink-0`}
          title="Bloquear Cofre"
        >
          <Lock className={`w-3.5 h-3.5 ${accent.textAccent}`} />
          <span className="hidden sm:inline">Bloquear</span>
        </button>

        {/* User Badge */}
        {(() => {
          const userName = settings.userName || 'Seu Nome';
          const initials = userName
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'SN';

          return (
            <div className={`flex items-center gap-2.5 pl-2 border-l ${theme.borderMain}`}>
              <div className="text-right hidden xl:block">
                <p className={`text-xs font-semibold ${theme.textPrimary}`}>{userName}</p>
                <p className={`text-[9px] ${theme.textMuted} uppercase tracking-wider font-mono`}>
                  {settings.requireDigitalCert ? 'Certificado Digital Válido' : 'Usuário Autenticado'}
                </p>
              </div>
              <div
                className={`w-9 h-9 rounded-full ${theme.bgCardInner} border ${theme.borderMain} flex items-center justify-center text-xs font-bold ${accent.textAccent} shadow-sm`}
                title={userName}
              >
                {initials}
              </div>
            </div>
          );
        })()}
      </div>
    </header>
  );
};
