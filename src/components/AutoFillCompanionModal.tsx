import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Key,
  Lock,
  X,
  CheckCircle2,
  ArrowRight,
  MousePointerClick,
  Monitor,
  Settings2,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VaultItem, VaultSettings } from '../types';
import { getAccent, getTheme } from '../lib/theme';

interface AutoFillCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: VaultItem[];
  settings: VaultSettings;
  onSaveSettings: (newSettings: VaultSettings) => void;
  onCopyText: (text: string, label: string) => void;
  isUnlocked: boolean;
  onUnlockVaultWithPassword?: (password: string) => boolean;
}

export const AutoFillCompanionModal: React.FC<AutoFillCompanionModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
  settings,
  onSaveSettings,
  onCopyText,
  isUnlocked,
  onUnlockVaultWithPassword,
}) => {
  if (!isOpen) return null;

  const activeTheme = getTheme(settings.theme);
  const activeAccent = getAccent(settings.accentColor);

  // Simulated target sites for testing form detection
  const sampleSites = [
    { name: 'GitHub', url: 'https://github.com/login', domain: 'github.com', category: 'login' },
    { name: 'Google Workspace', url: 'https://accounts.google.com/signin', domain: 'google.com', category: 'login' },
    { name: 'Banco Digital', url: 'https://ib.bancodigital.com.br/login', domain: 'bancodigital.com.br', category: 'login' },
    { name: 'AWS Cloud Console', url: 'https://console.aws.amazon.com', domain: 'aws.amazon.com', category: 'api_key' },
  ];

  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autofillStage, setAutofillStage] = useState<'detected' | 'authenticating' | 'filling' | 'success'>('detected');

  const currentSite = sampleSites[selectedSiteIndex];

  // Match vault items by domain or category
  const matchingItem = vaultItems.find(
    item =>
      (item.url && item.url.toLowerCase().includes(currentSite.domain)) ||
      (item.title && item.title.toLowerCase().includes(currentSite.name.toLowerCase()))
  ) || vaultItems[0] || null;

  const handleSimulateAutoFill = () => {
    if (!matchingItem) {
      alert('Nenhum registro encontrado no cofre para este site.');
      return;
    }

    // Check if master password required
    if (settings.autoFillAskMasterPass && !isUnlocked && onUnlockVaultWithPassword) {
      setAutofillStage('authenticating');
      return;
    }

    startFillingProcess();
  };

  const handleAuthenticateAndFill = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    if (onUnlockVaultWithPassword) {
      const ok = onUnlockVaultWithPassword(unlockPasswordInput);
      if (ok) {
        startFillingProcess();
      } else {
        setUnlockError('Senha mestra incorreta. Tente novamente.');
      }
    }
  };

  const startFillingProcess = () => {
    setAutofillStage('filling');
    setTimeout(() => {
      if (matchingItem) {
        if (matchingItem.username || matchingItem.email) {
          onCopyText(matchingItem.username || matchingItem.email!, 'Usuário Auto-Preenchido');
        }
        if (matchingItem.password) {
          onCopyText(matchingItem.password, 'Senha Auto-Preenchida');
        }
      }
      setAutofillStage('success');
    }, 1200);
  };

  const handleResetSimulation = () => {
    setAutofillStage('detected');
    setUnlockPasswordInput('');
    setUnlockError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full max-w-lg ${activeTheme.bgCard} border ${activeTheme.borderMain} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] ${activeTheme.depthShadow}`}
      >
        {/* Header Companion Bar */}
        <div className={`p-5 border-b ${activeTheme.borderMain} flex items-center justify-between ${activeTheme.bgCardInner} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} flex items-center justify-center shrink-0`}>
              <Monitor className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>Assistente de Auto-Preenchimento</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent}`}>
                  SEGUNDO PLANO ATIVO
                </span>
              </div>
              <p className={`text-[11px] ${activeTheme.textMuted} font-mono`}>
                Monitorando formulários de login na janela ativa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} transition-colors border ${activeTheme.borderMain}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Site Selector / Detector Simulation */}
          <div className="space-y-2">
            <label className={`text-xs font-bold ${activeTheme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Globe className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> Formulário Detectado no Navegador:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sampleSites.map((site, idx) => (
                <button
                  key={site.domain}
                  type="button"
                  onClick={() => {
                    setSelectedSiteIndex(idx);
                    handleResetSimulation();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all font-mono ${
                    selectedSiteIndex === idx
                      ? `${activeAccent.borderAccent} ${activeAccent.badgeBg} font-bold`
                      : `${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.hoverBg}`
                  }`}
                >
                  <p className={`text-xs ${selectedSiteIndex === idx ? activeAccent.textAccent : activeTheme.textPrimary} font-bold truncate`}>{site.name}</p>
                  <p className={`text-[10px] ${activeTheme.textMuted} truncate`}>{site.domain}</p>
                </button>
              ))}
            </div>
          </div>

          {/* SIMULATED DETECTED LOGIN CARD */}
          <div className={`p-4 rounded-2xl border ${activeTheme.borderInner} ${activeTheme.bgCardInner} space-y-4`}>
            <div className={`flex items-center justify-between border-b ${activeTheme.borderInner} pb-3`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${activeAccent.textAccent} bg-current animate-ping`} />
                <span className={`text-xs font-bold ${activeTheme.textPrimary} font-mono`}>
                  Formulário de Login Encontrado
                </span>
              </div>
              <span className={`text-[10px] font-mono ${activeTheme.textMuted}`}>{currentSite.domain}</span>
            </div>

            {/* STAGE 1: DETECTED - ASK FOR AUTOFILL */}
            {autofillStage === 'detected' && (
              <div className="space-y-4 animate-fade-in">
                {matchingItem ? (
                  <div className={`p-3 rounded-xl border ${activeTheme.borderMain} ${activeTheme.bgInput} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold font-mono uppercase ${activeAccent.textAccent}`}>
                        Credencial Correspondente no Cofre
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${activeAccent.textAccent}`}>100% Match</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${activeAccent.badgeBg} border ${activeAccent.borderAccent} flex items-center justify-center ${activeAccent.textAccent} font-bold text-xs`}>
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${activeTheme.textPrimary}`}>{matchingItem.title}</p>
                        <p className={`text-[11px] ${activeTheme.textMuted} font-mono`}>
                          {matchingItem.username || matchingItem.email || '••••••••'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} rounded-xl text-xs ${activeAccent.textAccent} font-mono`}>
                    Nenhuma credencial salva com o endereço {currentSite.domain}. Você pode cadastrar uma nova no cofre.
                  </div>
                )}

                <p className={`text-xs ${activeTheme.textSecondary} leading-relaxed`}>
                  O assistente identificou um formulário em <strong className={activeTheme.textPrimary}>{currentSite.name}</strong>. Toque abaixo para autenticar e preencher campos de usuário e senha automaticamente.
                </p>

                <button
                  type="button"
                  onClick={handleSimulateAutoFill}
                  disabled={!matchingItem}
                  className={`w-full py-3.5 ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} disabled:opacity-50 text-white font-bold text-xs rounded-xl ${activeAccent.shadowAccent} flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>PREENCHER E LOGAR AUTOMATICAMENTE</span>
                </button>
              </div>
            )}

            {/* STAGE 2: AUTHENTICATING MASTER PASS */}
            {autofillStage === 'authenticating' && (
              <form onSubmit={handleAuthenticateAndFill} className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className={`text-xs font-bold ${activeTheme.textPrimary} flex items-center gap-1.5`}>
                    <Lock className={`w-4 h-4 ${activeAccent.textAccent}`} /> Digite a Senha Mestra para Liberar Auto-Fill
                  </span>
                  <p className={`text-[11px] ${activeTheme.textMuted}`}>
                    Sua política de segurança exige confirmação antes de injetar credenciais em {currentSite.domain}.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={unlockPasswordInput}
                    onChange={e => setUnlockPasswordInput(e.target.value)}
                    placeholder="Sua Senha Mestra..."
                    className={`w-full ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-xs ${activeTheme.textPrimary} focus:outline-none ${activeAccent.ringAccent} font-mono`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${activeTheme.textMuted}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {unlockError && (
                  <p className="text-xs text-red-400 font-mono font-semibold">{unlockError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className={`flex-1 py-2.5 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} text-xs font-semibold rounded-xl border ${activeTheme.borderMain}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-2.5 ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold rounded-xl ${activeAccent.shadowAccent}`}
                  >
                    Confirmar & Preencher
                  </button>
                </div>
              </form>
            )}

            {/* STAGE 3: FILLING ANIMATION */}
            {autofillStage === 'filling' && (
              <div className="py-8 text-center space-y-3 animate-fade-in">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent} animate-spin`}>
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-bold ${activeTheme.textPrimary}`}>
                  Injetando Usuário e Senha Criptografados...
                </h4>
                <p className={`text-xs ${activeTheme.textMuted} font-mono`}>
                  Preenchendo #username e #password em {currentSite.domain}
                </p>
              </div>
            )}

            {/* STAGE 4: SUCCESS */}
            {autofillStage === 'success' && (
              <div className="py-4 text-center space-y-4 animate-fade-in">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent}`}>
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${activeTheme.textPrimary}`}>
                    Campos Preenchidos com Sucesso!
                  </h4>
                  <p className={`text-xs ${activeTheme.textMuted} font-mono mt-1`}>
                    As credenciais de {matchingItem?.title} foram inseridas e copiadas para a área de transferência.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className={`px-4 py-2 ${activeAccent.badgeBg} ${activeAccent.textAccent} border ${activeAccent.borderAccent} rounded-xl text-xs font-bold font-mono transition-colors hover:opacity-80`}
                >
                  Testar Outro Formulário
                </button>
              </div>
            )}
          </div>

          {/* COMPANION TOGGLE PREFERENCES */}
          <div className={`p-4 rounded-2xl border ${activeTheme.borderMain} ${activeTheme.bgCardInner} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className={`w-4 h-4 ${activeAccent.textAccent}`} />
                <span className={`text-xs font-bold ${activeTheme.textPrimary} font-mono`}>
                  Preferências do Assistente
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <button
                type="button"
                onClick={() =>
                  onSaveSettings({
                    ...settings,
                    autoFillAskMasterPass: !(settings.autoFillAskMasterPass ?? true),
                  })
                }
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-gray-800/30 transition-colors cursor-pointer text-left`}
              >
                <span className={activeTheme.textSecondary}>Exigir Senha Mestra antes do Preenchimento</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  (settings.autoFillAskMasterPass ?? true)
                    ? `${activeAccent.bgBtn} border-transparent text-white`
                    : `border-gray-600 ${activeTheme.bgCard}`
                }`}>
                  {(settings.autoFillAskMasterPass ?? true) && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSaveSettings({
                    ...settings,
                    autoFillAutoSubmit: !(settings.autoFillAutoSubmit ?? false),
                  })
                }
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgInput} hover:bg-gray-800/30 transition-colors cursor-pointer text-left`}
              >
                <span className={activeTheme.textSecondary}>Enviar Formulário Automaticamente após Preencher</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  (settings.autoFillAutoSubmit ?? false)
                    ? `${activeAccent.bgBtn} border-transparent text-white`
                    : `border-gray-600 ${activeTheme.bgCard}`
                }`}>
                  {(settings.autoFillAutoSubmit ?? false) && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex justify-between items-center shrink-0`}>
          <span className={`text-[11px] ${activeTheme.textMuted} font-mono flex items-center gap-1`}>
            <ShieldCheck className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> Proteção em Segundo Plano AES-256
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} text-xs font-semibold rounded-xl border ${activeTheme.borderMain}`}
          >
            Fechar Assistente
          </button>
        </div>
      </motion.div>
    </div>
  );
};
