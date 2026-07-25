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
import { ACCENT_COLORS, AccentColor, ThemeMode, THEMES, getAccent, getTheme } from '../lib/theme';

interface SettingsViewProps {
  settings: VaultSettings;
  onSaveSettings: (newSettings: VaultSettings) => void;
  onOpen2FAWizard: () => void;
  onOpenCertWizard: () => void;
  onChangeMasterPassword?: () => void;
  onLockVault?: () => void;
  onOpenAutoFillModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onOpen2FAWizard,
  onOpenCertWizard,
  onChangeMasterPassword,
  onLockVault,
  onOpenAutoFillModal,
}) => {
  const [localSettings, setLocalSettings] = useState<VaultSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [duressInput, setDuressInput] = useState('');
  const [showDuressInput, setShowDuressInput] = useState(false);

  const activeTheme = getTheme(localSettings.theme);
  const activeAccent = getAccent(localSettings.accentColor, activeTheme.isLight);

  const handleSave = async () => {
    let updatedSettings = { ...localSettings };

    if (duressInput.trim()) {
      const hash = await import('../lib/crypto').then(m => m.hashSha256(duressInput.trim()));
      updatedSettings.duressPasswordHash = hash;
      updatedSettings.duressEnabled = true;
    }

    onSaveSettings(updatedSettings);
    setLocalSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner Header */}
      <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 ${activeTheme.depthShadow} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${activeAccent.bgBtn} text-white flex items-center justify-center ${activeAccent.shadowAccent} shrink-0`}>
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${activeTheme.textPrimary} tracking-tight`}>Configurações Gerais & Temas do Cofre</h2>
            <p className={`text-xs ${activeTheme.textMuted} font-mono`}>Personalização Visual, Segurança de Acesso e Políticas Locais</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${activeAccent.shadowAccent}`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Configurações Salvas!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. SELEÇÃO DE TEMA DE CORES E APARÊNCIA */}
        <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 space-y-5 ${activeTheme.depthShadow} transition-colors`}>
          <div className={`flex items-center gap-2 border-b ${activeTheme.borderInner} pb-3`}>
            <Palette className={`w-4 h-4 ${activeAccent.textAccent}`} />
            <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>Cor Principal dos Botões</h3>
          </div>

          <p className={`text-xs ${activeTheme.textMuted} font-mono`}>
            Escolha a cor de destaque para os botões e destaques da interface:
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
                    const updated = { ...localSettings, accentColor: key };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? `border-emerald-500 ${activeTheme.bgCardInner} ring-2 ring-emerald-500/30 font-bold shadow-md scale-105`
                      : `${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.hoverBg}`
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shadow-md"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className={`text-[11px] font-mono ${activeTheme.textPrimary} font-medium`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* BACKGROUND THEME SELECTOR */}
          <div className={`pt-4 border-t ${activeTheme.borderInner} space-y-3`}>
            <label className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5 font-mono`}>
              <Moon className="w-4 h-4 text-cyan-400" /> Tema de Fundo do Aplicativo
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'dark', label: 'Preto Luxo', bg: 'bg-[#070707]', border: 'border-gray-800' },
                { id: 'slate', label: 'Cinza Grafite', bg: 'bg-[#0F172A]', border: 'border-slate-700' },
                { id: 'beige', label: 'Bege Areia', bg: 'bg-[#FAF6F0]', border: 'border-stone-300' },
                { id: 'light', label: 'Branco Neve', bg: 'bg-[#F8FAFC]', border: 'border-slate-300' },
              ].map((th) => {
                const isSelected = (localSettings.theme || 'dark') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      const updated = { ...localSettings, theme: th.id as ThemeMode };
                      setLocalSettings(updated);
                      onSaveSettings(updated);
                    }}
                    className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 font-bold'
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
            <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>Perfil do Proprietário</h3>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5 font-mono`}>
              Nome de Usuário (Titular)
            </label>
            <input
              type="text"
              value={localSettings.userName || ''}
              onChange={e => setLocalSettings({ ...localSettings, userName: e.target.value })}
              placeholder="Ex: Seu Nome / Empresa..."
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} font-mono ${activeTheme.inputDepth}`}
            />
            <span className={`text-[10px] ${activeTheme.textMuted} font-mono block`}>
              Nome impresso no topo do aplicativo e em relatórios criptográficos.
            </span>
          </div>

          {/* AUTO-LOCK TIMER */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Clock className={`w-4 h-4 ${activeAccent.textAccent}`} /> Auto-Bloqueio por Inatividade
            </label>
            <select
              value={localSettings.autoLockMinutes}
              onChange={e => setLocalSettings({ ...localSettings, autoLockMinutes: Number(e.target.value) })}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} font-mono ${activeTheme.inputDepth}`}
            >
              <option value={1}>1 minuto (Máxima Segurança)</option>
              <option value={5}>5 minutos (Recomendado)</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={0}>Nunca bloquear (Não recomendado)</option>
            </select>
          </div>

          {/* CLIPBOARD CLEAR TIMER */}
          <div className={`space-y-2 pt-2 border-t ${activeTheme.borderInner}`}>
            <label className={`text-xs font-semibold ${activeTheme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Lock className="w-4 h-4 text-indigo-400" /> Limpeza Automática do Copiar/Colar
            </label>
            <select
              value={localSettings.clipboardClearSeconds}
              onChange={e => setLocalSettings({ ...localSettings, clipboardClearSeconds: Number(e.target.value) })}
              className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl p-3 text-xs ${activeTheme.textPrimary} focus:outline-none ${activeAccent.ringAccent} ${activeAccent.borderAccent} font-mono ${activeTheme.inputDepth}`}
            >
              <option value={10}>10 segundos</option>
              <option value={20}>20 segundos (Padrão)</option>
              <option value={30}>30 segundos</option>
              <option value={60}>60 segundos</option>
            </select>
          </div>

        </div>

      </div>

      {/* 3. SEGURANÇA AVANÇADA (2FA, PKI, AUTODESTRUIÇÃO) */}
      <div className={`${activeTheme.bgCard} ${activeTheme.borderMain} border rounded-2xl p-6 space-y-6 ${activeTheme.depthShadow} transition-colors`}>
        <div className={`flex items-center gap-2 border-b ${activeTheme.borderInner} pb-3`}>
          <ShieldAlert className={`w-4 h-4 ${activeAccent.textAccent}`} />
          <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>Autenticação de Segundo Fator & Políticas Criptográficas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 2FA BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activeAccent.textAccent} flex items-center gap-1.5`}>
                  <QrCode className="w-4 h-4" /> 2FA (TOTP)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  localSettings.require2FA ? `${activeAccent.badgeBg} ${activeAccent.badgeText} ${activeAccent.borderAccent}` : `${activeTheme.bgInput} ${activeTheme.textMuted} ${activeTheme.borderMain}`
                }`}>
                  {localSettings.require2FA ? 'Ativado' : 'Inativo'}
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>Exige código do Google Authenticator para abrir o cofre.</p>
            </div>
            <button
              type="button"
              onClick={onOpen2FAWizard}
              className={`w-full py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors`}
            >
              {localSettings.require2FA ? 'Configurar / Alterar 2FA' : 'Ativar 2FA de Dois Fatores'}
            </button>
          </div>

          {/* CERTIFICATES BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-500 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" /> Certificados PKI
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${activeTheme.bgInput} ${activeTheme.textMuted} border ${activeTheme.borderMain}`}>
                  {localSettings.digitalCertificates?.length || 0} Ativos
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>Assinaturas e par de chaves RSA 2048/X.509 para acessos corporativos.</p>
            </div>
            <button
              type="button"
              onClick={onOpenCertWizard}
              className={`w-full py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors`}
            >
              Gerenciar Chaves PKI
            </button>
          </div>

          {/* MASTER PASS BOX */}
          <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner flex flex-col justify-between`}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> Senha Mestra
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>Criptografia PBKDF2 com 250.000 iterações e AES-256-GCM.</p>
            </div>
            <div className="space-y-2 pt-1">
              {onChangeMasterPassword && (
                <button
                  type="button"
                  onClick={onChangeMasterPassword}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold rounded-lg text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Alterar Senha Mestra</span>
                </button>
              )}
              {onLockVault && (
                <button
                  type="button"
                  onClick={onLockVault}
                  className={`w-full py-1.5 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textMuted} hover:${activeTheme.textPrimary} rounded-lg text-xs font-semibold border ${activeTheme.borderMain} transition-colors flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Cofre Agora</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* 4. ASSISTENTE EM SEGUNDO PLANO (DESKTOP & AUTO-FILL) */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${activeAccent.textAccent} flex items-center gap-1.5`}>
                  <Monitor className="w-4 h-4" /> Assistente de Auto-Preenchimento Automático
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${localSettings.enableAutoFillCompanion !== false ? `${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent}` : `${activeTheme.bgInput} ${activeTheme.textMuted} border ${activeTheme.borderMain}`}`}>
                  {localSettings.enableAutoFillCompanion !== false ? 'Monitor Ativo' : 'Desativado'}
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                Identifica formulários de login na tela do seu computador/navegador e solicita confirmação para preencher dados.
              </p>
            </div>

            {onOpenAutoFillModal && (
              <button
                type="button"
                onClick={onOpenAutoFillModal}
                className={`px-4 py-2 ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white font-bold text-xs rounded-xl ${activeAccent.shadowAccent} flex items-center gap-1.5 shrink-0`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Testar Simulador de Auto-Fill</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-800/40 text-xs">
            <button
              type="button"
              onClick={() => {
                const updated = { ...localSettings, enableAutoFillCompanion: !(localSettings.enableAutoFillCompanion !== false) };
                setLocalSettings(updated);
                onSaveSettings(updated);
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-gray-800/30 transition-colors cursor-pointer text-left`}
            >
              <span className={activeTheme.textSecondary}>Ativar Monitor de Formulários no Navegador</span>
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                (localSettings.enableAutoFillCompanion !== false)
                  ? `${activeAccent.bgBtn} border-transparent text-white`
                  : `border-gray-600 ${activeTheme.bgCard}`
              }`}>
                {(localSettings.enableAutoFillCompanion !== false) && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const updated = { ...localSettings, autoFillAskMasterPass: !(localSettings.autoFillAskMasterPass ?? true) };
                setLocalSettings(updated);
                onSaveSettings(updated);
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-gray-800/30 transition-colors cursor-pointer text-left`}
            >
              <span className={activeTheme.textSecondary}>Exigir Autenticação Mestra para Preencher</span>
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                (localSettings.autoFillAskMasterPass ?? true)
                  ? `${activeAccent.bgBtn} border-transparent text-white`
                  : `border-gray-600 ${activeTheme.bgCard}`
              }`}>
                {(localSettings.autoFillAskMasterPass ?? true) && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>
        </div>

        {/* 5. PRIVACIDADE DE REDE & BUSCA DE FAVICONS */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner`}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${activeAccent.textAccent} flex items-center gap-1.5`}>
                  <Globe className="w-4 h-4" /> Buscar Ícones de Sites Online (Favicons)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${localSettings.enableOnlineFavicons !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                  {localSettings.enableOnlineFavicons !== false ? 'Ativo' : 'Desativado (100% Offline)'}
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                Carrega a imagem oficial do logo dos sites (ex: Google, Outlook, GitHub). Nenhum e-mail ou senha é enviado na requisição.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const updated = { ...localSettings, enableOnlineFavicons: !(localSettings.enableOnlineFavicons !== false) };
                setLocalSettings(updated);
                onSaveSettings(updated);
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-gray-800/30 transition-colors cursor-pointer text-left shrink-0 gap-2`}
            >
              <span className={`text-xs font-semibold ${activeTheme.textPrimary}`}>
                {localSettings.enableOnlineFavicons !== false ? 'Desativar Requisições' : 'Ativar Requisições'}
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
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner`}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-amber-400" /> Modo Duress (Senha Mestra de Coação)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${localSettings.duressEnabled ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                  {localSettings.duressEnabled ? 'Ativo' : 'Não Configurado'}
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                Uma senha mestra alternativa que, quando digitada na tela de login, abre um cofre de fachada com dados fictícios inofensivos.
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <label className={`text-[10px] uppercase font-bold ${activeTheme.textMuted}`}>Definir / Alterar Senha de Coação</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showDuressInput ? 'text' : 'password'}
                  value={duressInput}
                  onChange={e => setDuressInput(e.target.value)}
                  placeholder="Digite a senha mestra alternativa de coação..."
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
                    const updated = { ...localSettings, duressEnabled: false, duressPasswordHash: undefined };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                    setDuressInput('');
                  }}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition cursor-pointer shrink-0"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 7. SINCRONIZAÇÃO SEM SERVIDOR (SYNCTHING / PASTA COMPARTILHADA) */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} space-y-3 font-mono shadow-inner`}>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <FolderSync className="w-4 h-4 text-indigo-400" />
            <span>Sincronização Local Multi-dispositivo (Syncthing / Local Folder)</span>
          </div>
          <p className={`text-[11px] ${activeTheme.textSecondary} leading-relaxed`}>
            O VaultSecure funciona 100% sem servidor central. Para manter seus cofres sincronizados no computador e no celular sem nuvem pública:
          </p>
          <ul className={`text-[11px] ${activeTheme.textMuted} space-y-1 list-disc pl-4`}>
            <li>Use o aplicativo gratuito <strong>Syncthing</strong>, Nextcloud local ou uma pasta sincronizada.</li>
            <li>Exporte o backup em <strong>.vault.json</strong> na aba "Backup / Restauração" para a pasta sincronizada.</li>
            <li>No outro dispositivo, abra o arquivo <strong>.vault.json</strong> para importar com sua senha mestra.</li>
          </ul>
        </div>

        {/* MOBILE & ANDROID INSTALLATION HINT */}
        <div className={`p-4 ${activeTheme.bgCardInner} rounded-xl border ${activeTheme.borderInner} space-y-2.5 font-mono`}>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-500">
            <Smartphone className="w-4 h-4 text-cyan-500" />
            <span>Instalação no Celular Android (Direto do GitHub)</span>
          </div>
          <p className={`text-[11px] ${activeTheme.textSecondary} leading-relaxed`}>
            Como você está utilizando o repositório do GitHub, você pode ativar o <strong className={activeTheme.textPrimary}>GitHub Pages</strong> (Settings &gt; Pages) no seu repositório ou abrir o IP local no navegador do seu Android. Depois acesse pelo Chrome, toque nos <strong className={`${activeAccent.textAccent} font-bold`}>⋮ (3 pontinhos)</strong> e selecione <strong className={`${activeAccent.textAccent} font-semibold`}>"Instalar aplicativo"</strong> para salvar na tela inicial com suporte offline!
          </p>
        </div>

      </div>

    </div>
  );
};
