import React, { useState } from 'react';
import {
  Settings,
  Lock,
  Clock,
  QrCode,
  FileCheck,
  ShieldAlert,
  KeyRound,
  Check,
  User,
  Smartphone,
  Palette,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Zap,
  Monitor,
  Globe,
  EyeOff,
  Eye,
  HardDrive,
  FolderSync,
} from 'lucide-react';
import { VaultSettings } from '../types';
import { ACCENT_COLORS, AccentColor, ThemeMode, THEMES, ThemeStyles, getAccent, getTheme } from '../lib/theme';
import { PageHeader } from './PageHeader';
import { SyncPanel } from './SyncPanel';
import type { VaultSync } from '../lib/useVaultSync';
import { tr, LANGUAGES, detectLang } from '../lib/i18n';

/** On/off status for a setting: green with a dot when on, neutral when off, legible in every theme. */
const StatusPill: React.FC<{ on: boolean; onLabel: string; offLabel: string; theme: ThemeStyles }> = ({ on, onLabel, offLabel, theme }) => {
  const onStyle = theme.isLight
    ? 'bg-[#1F7A57]/10 text-[#1F6B4D] border-[#1F7A57]/25'
    : 'bg-[#7FD1AE]/10 text-[#7FD1AE] border-[#7FD1AE]/25';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${
        on ? onStyle : `${theme.textMuted} ${theme.borderMain}`
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-current' : 'border border-current opacity-70'}`} />
      {on ? onLabel : offLabel}
    </span>
  );
};

interface SettingsViewProps {
  settings: VaultSettings;
  onSaveSettings: (newSettings: VaultSettings) => void;
  onOpen2FAWizard: () => void;
  onOpenCertWizard: () => void;
  onChangeMasterPassword?: () => void;
  onLockVault?: () => void;
  sync?: VaultSync;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onOpen2FAWizard,
  onOpenCertWizard,
  onChangeMasterPassword,
  onLockVault,
  sync,
}) => {
  // Only the fields the user changed live here. Everything else always reflects the
  // saved settings, so changes made elsewhere (e.g. enabling 2FA in the wizard) are
  // never overwritten by a stale copy when this page is saved.
  const [draft, setDraft] = useState<Partial<VaultSettings>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [duressInput, setDuressInput] = useState('');
  const [showDuressInput, setShowDuressInput] = useState(false);

  const localSettings: VaultSettings = { ...settings, ...draft };
  const setLocalSettings = (next: VaultSettings) => {
    const changed: Partial<VaultSettings> = {};
    (Object.keys(next) as (keyof VaultSettings)[]).forEach(key => {
      if (JSON.stringify(next[key]) !== JSON.stringify(settings[key])) {
        (changed as any)[key] = next[key];
      }
    });
    setDraft(changed);
  };

  // Instant-apply controls (color, theme, toggles) save straight to settings, so a draft
  // entry that now matches the saved value is no longer a pending change.
  const isDirty =
    (Object.keys(draft) as (keyof VaultSettings)[]).some(k => JSON.stringify(draft[k]) !== JSON.stringify(settings[k])) ||
    duressInput.trim().length > 0;

  const activeTheme = getTheme(localSettings.theme);
  const activeAccent = getAccent(localSettings.accentColor, activeTheme.isLight);

  const handleSave = async () => {
    let updatedSettings = { ...localSettings };

    if (duressInput.trim()) {
      // Stored only inside the encrypted settings; the unlock check uses a PBKDF2 verifier
      updatedSettings.duressPassword = duressInput.trim();
      updatedSettings.duressEnabled = true;
      setDuressInput('');
    }

    onSaveSettings(updatedSettings);
    setDraft({});
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleDiscard = () => {
    setDraft({});
    setDuressInput('');
  };

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      
      <PageHeader
        theme={activeTheme}
        title={tr("Configurações")}
        description={tr("Aparência, bloqueio automático e camadas extras de acesso.")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. SELEÇÃO DE TEMA DE CORES E APARÊNCIA */}
        <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 space-y-5 ${activeTheme.depthShadow} transition-colors`}>
          <div className={`flex items-center gap-2 border-b ${activeTheme.borderInner} pb-3`}>
            <Palette className={`w-4 h-4 ${activeAccent.textAccent}`} />
            <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>{tr("Cor Principal dos Botões")}</h3>
          </div>

          <p className={`text-xs ${activeTheme.textMuted}`}>
            {tr("Escolha a cor de destaque para os botões e destaques da interface:")}
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
              const item = ACCENT_COLORS[key];
              const isSelected = (localSettings.accentColor || 'emerald') === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const updated = { ...settings, accentColor: key };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  aria-pressed={isSelected}
                  style={isSelected ? { boxShadow: `0 0 0 2px ${item.colorHex}` } : undefined}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all min-w-0 ${
                    isSelected
                      ? `border-transparent ${activeTheme.bgCardInner} font-semibold`
                      : `${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.hoverBg}`
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shadow-md"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className={`text-[11px] ${activeTheme.textPrimary} font-medium`}>
                    {tr(item.name)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* LANGUAGE */}
          <div className={`pt-4 border-t ${activeTheme.borderInner} space-y-3`}>
            <label className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
              <Globe className={`w-4 h-4 ${activeAccent.textAccent}`} /> {tr("Idioma")}
            </label>
            <div role="radiogroup" aria-label={tr("Idioma")} className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(l => {
                const isSelected = (localSettings.language ?? detectLang()) === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSaveSettings({ ...settings, language: l.id })}
                    style={isSelected ? { boxShadow: `0 0 0 2px ${activeAccent.colorHex}` } : undefined}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all min-w-0 cursor-pointer ${
                      isSelected ? `border-transparent font-semibold ${activeTheme.textPrimary}` : `${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary}`
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BACKGROUND THEME SELECTOR */}
          <div className={`pt-4 border-t ${activeTheme.borderInner} space-y-3`}>
            <label className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
              <Moon className="w-4 h-4 text-cyan-400" /> {tr("Tema de Fundo do Aplicativo")}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'dark', label: tr("Tinta"), bg: 'bg-[#0E1F24]', border: 'border-[#2C4A50]' },
                { id: 'slate', label: tr("Noturno"), bg: 'bg-[#0B1120]', border: 'border-slate-700' },
                { id: 'beige', label: tr("Areia"), bg: 'bg-[#F7F4EE]', border: 'border-stone-300' },
                { id: 'light', label: tr("Papel"), bg: 'bg-[#E8EEEA]', border: 'border-[#0E1F24]/20' },
              ].map((th) => {
                const isSelected = (localSettings.theme || 'dark') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, theme: th.id as ThemeMode };
                      setLocalSettings(updated);
                      onSaveSettings(updated);
                    }}
                    aria-pressed={isSelected}
                    style={isSelected ? { boxShadow: `0 0 0 2px ${activeAccent.colorHex}` } : undefined}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all min-w-0 ${
                      isSelected
                        ? 'border-transparent font-semibold'
                        : `${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.hoverBg}`
                    }`}
                  >
                    <div className={`w-full h-5 rounded-md mb-1.5 ${th.bg} border ${th.border}`} />
                    <span className={`text-[11px] ${activeTheme.textPrimary}`}>{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* 2. IDENTIFICAÇÃO DO PROPRIETÁRIO DO COFRE */}
        <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 space-y-5 ${activeTheme.depthShadow} transition-colors`}>
          <div className={`flex items-center gap-2 border-b ${activeTheme.borderInner} pb-3`}>
            <User className={`w-4 h-4 ${activeAccent.textAccent}`} />
            <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>{tr("Perfil do Proprietário")}</h3>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5`}>
              {tr("Nome de Usuário (Titular)")}
            </label>
            <input
              type="text"
              value={localSettings.userName || ''}
              onChange={e => setLocalSettings({ ...localSettings, userName: e.target.value })}
              placeholder={tr("Ex: Seu Nome / Empresa...")}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} ${activeTheme.inputDepth}`}
            />
            <span className={`text-xs ${activeTheme.textMuted} block`}>
              {tr("Nome impresso no topo do aplicativo e em relatórios criptográficos.")}
            </span>
          </div>

          {/* AUTO-LOCK TIMER */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5`}>
              <Clock className={`w-4 h-4 ${activeAccent.textAccent}`} /> {tr("Auto-Bloqueio por Inatividade")}
            </label>
            <select
              value={localSettings.autoLockMinutes}
              onChange={e => setLocalSettings({ ...localSettings, autoLockMinutes: Number(e.target.value) })}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} ${activeTheme.inputDepth}`}
            >
              <option value={1}>{tr("1 minuto (Máxima Segurança)")}</option>
              <option value={5}>{tr("5 minutos (Recomendado)")}</option>
              <option value={15}>{tr("15 minutos")}</option>
              <option value={30}>{tr("30 minutos")}</option>
              <option value={0}>{tr("Nunca bloquear (Não recomendado)")}</option>
            </select>
          </div>

          {/* CLIPBOARD CLEAR TIMER */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5`}>
              <Lock className="w-4 h-4 text-indigo-400" /> {tr("Limpeza Automática do Copiar/Colar")}
            </label>
            <select
              value={localSettings.clipboardClearSeconds}
              onChange={e => setLocalSettings({ ...localSettings, clipboardClearSeconds: Number(e.target.value) })}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} ${activeTheme.inputDepth}`}
            >
              <option value={10}>{tr("10 segundos")}</option>
              <option value={20}>{tr("20 segundos (Padrão)")}</option>
              <option value={30}>{tr("30 segundos")}</option>
              <option value={60}>{tr("60 segundos")}</option>
            </select>
          </div>

        </div>

      </div>

      {/* 3. SEGURANÇA AVANÇADA (2FA, PKI, AUTODESTRUIÇÃO) */}
      <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 space-y-6 ${activeTheme.depthShadow} transition-colors`}>
        <div className={`flex items-center gap-2 border-b ${activeTheme.borderInner} pb-3`}>
          <ShieldAlert className={`w-4 h-4 ${activeAccent.textAccent}`} />
          <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>{tr("Verificação em duas etapas e políticas de acesso")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 2FA BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activeAccent.textAccent} flex items-center gap-1.5`}>
                  <QrCode className="w-4 h-4" /> {tr("2FA (TOTP)")}
                </span>
                <StatusPill on={!!localSettings.require2FA} onLabel={tr("Ativado")} offLabel={tr("Desativado")} theme={activeTheme} />
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>{tr("Exige código do Google Authenticator para abrir o cofre.")}</p>
            </div>
            <button
              type="button"
              onClick={onOpen2FAWizard}
              className={`w-full py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors`}
            >
              {localSettings.require2FA ? tr("Configurar / Alterar 2FA") : tr("Ativar 2FA de Dois Fatores")}
            </button>
          </div>

          {/* CERTIFICATES BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
                  <FileCheck className={`w-4 h-4 ${activeAccent.textAccent}`} /> {tr("Certificados PKI")}
                </span>
                <StatusPill
                  on={(localSettings.digitalCertificates?.length || 0) > 0}
                  onLabel={tr(localSettings.digitalCertificates?.length === 1 ? '{n} cadastrado' : '{n} cadastrados', { n: localSettings.digitalCertificates?.length })}
                  offLabel={tr("Nenhum")}
                  theme={activeTheme}
                />
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>{tr("Assinaturas e par de chaves RSA 2048/X.509 para acessos corporativos.")}</p>
            </div>
            <button
              type="button"
              onClick={onOpenCertWizard}
              className={`w-full py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors`}
            >
              {tr("Gerenciar Chaves PKI")}
            </button>
          </div>

          {/* MASTER PASS BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> {tr("Senha Mestra")}
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>{tr("Criptografia PBKDF2 com 600.000 iterações e AES-256-GCM.")}</p>
            </div>
            <div className="space-y-2 pt-1">
              {onChangeMasterPassword && (
                <button
                  type="button"
                  onClick={onChangeMasterPassword}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold rounded-lg text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{tr("Alterar Senha Mestra")}</span>
                </button>
              )}
              {onLockVault && (
                <button
                  type="button"
                  onClick={onLockVault}
                  className={`w-full py-1.5 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textMuted} hover:${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{tr("Bloquear Cofre Agora")}</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* 5. PRIVACIDADE DE REDE & BUSCA DE FAVICONS */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 shadow-inner`}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
                  <Globe className={`w-4 h-4 ${activeAccent.textAccent}`} /> {tr("Buscar ícones dos sites (favicons)")}
                </span>
                <StatusPill on={localSettings.enableOnlineFavicons !== false} onLabel={tr("Ativo")} offLabel={tr("Desativado (100% offline)")} theme={activeTheme} />
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                {tr("Carrega a imagem oficial do logo dos sites (ex: Google, Outlook, GitHub). Nenhum e-mail ou senha é enviado na requisição.")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const updated = { ...settings, enableOnlineFavicons: !(localSettings.enableOnlineFavicons !== false) };
                setLocalSettings(updated);
                onSaveSettings(updated);
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-[#183238]/30 transition-colors cursor-pointer text-left shrink-0 gap-2`}
            >
              <span className={`text-xs font-semibold ${activeTheme.textPrimary}`}>
                {localSettings.enableOnlineFavicons !== false ? tr("Desativar Requisições") : tr("Ativar Requisições")}
              </span>
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                (localSettings.enableOnlineFavicons !== false)
                  ? `${activeAccent.bgBtn} border-transparent text-white`
                  : `border-gray-600 ${activeTheme.bgCard}`
              }`}>
                {(localSettings.enableOnlineFavicons !== false) && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>
        </div>

        {/* 6. MODO DURESS / SENHA DE COAÇÃO */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 shadow-inner`}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
                  <EyeOff className={`w-4 h-4 ${activeAccent.textAccent}`} /> {tr("Modo coação (senha mestra alternativa)")}
                </span>
                <StatusPill on={!!localSettings.duressEnabled} onLabel={tr("Ativo")} offLabel={tr("Não configurado")} theme={activeTheme} />
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                {tr("Uma senha mestra alternativa que, quando digitada na tela de login, abre um cofre de fachada com dados fictícios inofensivos.")}
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <label className={`text-xs font-bold ${activeTheme.textMuted}`}>{tr("Definir / Alterar Senha de Coação")}</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showDuressInput ? 'text' : 'password'}
                  value={duressInput}
                  onChange={e => setDuressInput(e.target.value)}
                  placeholder={tr("Digite a senha mestra alternativa de coação...")}
                  className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-2.5 text-xs ${activeTheme.textPrimary} pr-10 focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowDuressInput(!showDuressInput)}
                  className={`absolute right-3 top-3 ${activeTheme.textMuted} hover:${activeTheme.textPrimary}`}
                >
                  {showDuressInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {localSettings.duressEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...settings, duressEnabled: false, duressPassword: undefined };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                    setDuressInput('');
                  }}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition cursor-pointer shrink-0"
                >
                  {tr("Remover")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 7. SINCRONIZAÇÃO ENTRE APARELHOS */}
        {sync && <SyncPanel sync={sync} theme={activeTheme} accent={activeAccent} />}

        {/* MOBILE & ANDROID INSTALLATION HINT */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-2.5`}>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-500">
            <Smartphone className="w-4 h-4 text-cyan-500" />
            <span>{tr("Instalação no Celular Android (Direto do GitHub)")}</span>
          </div>
          <p className={`text-[11px] ${activeTheme.textSecondary} leading-relaxed`}>
            {tr("Como você está utilizando o repositório do GitHub, você pode ativar o")} <strong className={activeTheme.textPrimary}>{tr("GitHub Pages")}</strong> {tr("(Settings > Pages) no seu repositório ou abrir o IP local no navegador do seu Android. Depois acesse pelo Chrome, toque nos")} <strong className={`${activeAccent.textAccent} font-bold`}>{tr("⋮ (3 pontinhos)")}</strong> {tr("e selecione")} <strong className={`${activeAccent.textAccent} font-semibold`}>{tr("\"Instalar aplicativo\"")}</strong> {tr("para salvar na tela inicial com suporte offline!")}
          </p>
        </div>

      </div>

      {/* Unsaved-changes bar: appears only when something differs from what's saved */}
      {(isDirty || savedSuccess) && (
        <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto w-full max-w-xl flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl border ${activeTheme.borderMain} ${activeTheme.bgCard} shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)] animate-slide-up`}>
            <p className={`text-[13px] flex-1 min-w-0 ${activeTheme.textSecondary}`}>
              {isDirty ? tr("Você tem alterações não salvas.") : tr("Configurações salvas.")}
            </p>
            {isDirty && (
              <>
                <button onClick={handleDiscard} className={`h-9 px-3 rounded-lg text-[13px] font-medium ${activeTheme.textSecondary} ${activeTheme.hoverBg} cursor-pointer`}>
                  {tr("Descartar")}
                </button>
                <button onClick={handleSave} className={`h-9 px-4 rounded-lg text-[13px] font-semibold text-white ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} cursor-pointer`}>
                  {tr("Salvar alterações")}
                </button>
              </>
            )}
            {!isDirty && <Check className={`w-4 h-4 mr-2 ${activeAccent.textAccent}`} />}
          </div>
        </div>
      )}
    </div>
  );
};
