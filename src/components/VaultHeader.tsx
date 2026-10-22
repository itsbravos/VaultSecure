import React from 'react';
import {
  ShieldCheck,
  Lock,
  Plus,
  Dices,
  Menu,
} from 'lucide-react';
import { VaultSettings, SecurityReport } from '../types';
import { getTheme, getAccent } from '../lib/theme';
import { Guilloche } from './Guilloche';
import { tr } from '../lib/i18n';

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
  activeVaultId?: string;
  onGoHome?: () => void;
  onOpenMobileNav?: () => void;
}

const VAULT_NAMES: Record<string, string> = {
  pessoal: 'Pessoal',
  trabalho: 'Trabalho',
  compartilhado: 'Compartilhado',
};

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  onOpenAddItemModal,
  onOpenGeneratorModal,
  onLockVault,
  settings,
  activeVaultId = 'pessoal',
  onGoHome,
  onOpenMobileNav,
}) => {
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);

  const iconBtn = `h-9 px-2.5 items-center gap-2 rounded-lg border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} transition-colors text-[13px] font-medium cursor-pointer`;

  const userName = settings.userName || 'Seu Nome';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SN';

  return (
    <header className={`h-16 border-b ${theme.borderMain} px-4 lg:px-6 flex items-center justify-between ${theme.bgHeader} shrink-0 z-30`}>
      {/* Wordmark + current vault */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className={`lg:hidden -ml-1 w-9 h-9 inline-flex items-center justify-center rounded-lg ${theme.textSecondary} ${theme.hoverBg} cursor-pointer`}
            title={tr("Abrir menu")}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative w-9 h-9 shrink-0 hidden sm:block">
          <Guilloche size={36} color={accent.colorHex} strokeWidth={0.9} className="absolute inset-0" />
          <div className={`absolute inset-[11px] rounded-full ${theme.bgMain}`} />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className={`text-[17px] font-extrabold tracking-[-0.02em] ${theme.textPrimary}`}>
            <button onClick={onGoHome} className="cursor-pointer hover:opacity-80" title={tr("Ir para o início")}>{tr("VaultSecure")}</button>
          </h1>
          <span className={`hidden sm:inline ${theme.textMuted} text-sm`}>/</span>
          <span className={`hidden sm:inline text-sm font-medium ${theme.textSecondary} truncate`}>
            {tr(VAULT_NAMES[activeVaultId] || "Pessoal")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`hidden md:inline-flex items-center gap-1.5 mr-2 text-[13px] ${theme.textMuted}`}
          title={settings.require2FA ? tr("Sessão verificada com 2FA") : tr("Itens criptografados com AES-256-GCM")}
        >
          <ShieldCheck className={`w-4 h-4 ${accent.textAccent}`} />
          {settings.require2FA ? tr("Verificado com 2FA") : tr("Criptografado")}
        </span>

        <button onClick={onOpenGeneratorModal} className={`hidden sm:inline-flex ${iconBtn}`} title={tr("Gerar senha")}>
          <Dices className="w-4 h-4" />
          <span className="hidden xl:inline">{tr("Gerar senha")}</span>
        </button>

        <button
          data-tour="lock"
          onClick={onLockVault}
          className={`inline-flex ${iconBtn} hover:text-red-400`}
          title={tr("Bloquear cofre")}
        >
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">{tr("Bloquear")}</span>
        </button>

        <button
          onClick={onOpenAddItemModal}
          className={`h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} text-[13px] font-semibold text-white transition-colors ${accent.shadowAccent} cursor-pointer`}
          title={tr("Nova credencial")}
          data-tour="new-item"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{tr("Nova credencial")}</span>
        </button>

        <div
          className={`ml-1 w-9 h-9 rounded-full border ${theme.borderMain} ${theme.bgCard} flex items-center justify-center text-xs font-bold ${theme.textSecondary}`}
          title={`${userName}${settings.requireDigitalCert ? ' (certificado digital válido)' : ''}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};
