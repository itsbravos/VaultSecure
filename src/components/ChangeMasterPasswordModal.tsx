import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { calculatePasswordStrength } from '../lib/crypto';
import { getAccent, getTheme } from '../lib/theme';
import { VaultSettings } from '../types';
import { tr } from '../lib/i18n';

interface ChangeMasterPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: (currentPass: string, newPass: string) => Promise<void>;
  settings?: VaultSettings;
}

export const ChangeMasterPasswordModal: React.FC<ChangeMasterPasswordModalProps> = ({
  isOpen,
  onClose,
  onChangePassword,
  settings,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  if (!isOpen) return null;

  const newPassScore = calculatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg(tr("Por favor, informe sua senha mestra atual."));
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg(tr("A nova senha mestra deve conter no mínimo 8 caracteres."));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(tr("A confirmação da nova senha não coincide."));
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg(tr("A nova senha não pode ser idêntica à senha atual."));
      return;
    }

    try {
      setIsSubmitting(true);
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || tr("Senha mestra atual incorreta. Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className={`w-full max-w-md ${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 shadow-2xl relative space-y-5 transition-colors`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C4A50]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0`}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme.textPrimary}`}>{tr("Alterar Senha Mestra")}</h3>
              <p className={`text-xs ${theme.textMuted}`}>{tr("Re-criptografa todo o cofre com nova chave")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.hoverBg} ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1`}>
              <Lock className="w-3.5 h-3.5 text-amber-500" /> {tr("Senha Mestra Atual")}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={tr("Sua senha mestra atual...")}
                className={`w-full pl-3 pr-10 py-2.5 ${theme.bgInput} border ${theme.borderMain} rounded-xl text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent}`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className={`absolute right-3 top-2.5 ${theme.textMuted} hover:${theme.textPrimary}`}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${accent.textAccent}`} /> {tr("Nova Senha Mestra")}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={tr("Mínimo 8 caracteres...")}
                className={`w-full pl-3 pr-10 py-2.5 ${theme.bgInput} border ${theme.borderMain} rounded-xl text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent}`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className={`absolute right-3 top-2.5 ${theme.textMuted} hover:${theme.textPrimary}`}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={theme.textMuted}>Entropia: {newPassScore.score}%</span>
                  <span className={newPassScore.score > 70 ? 'text-emerald-500 font-bold' : newPassScore.score > 40 ? 'text-amber-500 font-bold' : 'text-red-500 font-bold'}>
                    {tr(newPassScore.label)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#183238] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      newPassScore.score > 70 ? 'bg-emerald-500' : newPassScore.score > 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(10, newPassScore.score)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${accent.textAccent}`} /> {tr("Confirmar Nova Senha")}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={tr("Digite novamente a nova senha...")}
                className={`w-full pl-3 pr-10 py-2.5 ${theme.bgInput} border ${theme.borderMain} rounded-xl text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className={`absolute right-3 top-2.5 ${theme.textMuted} hover:${theme.textPrimary}`}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#2C4A50]/40">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${theme.textMuted} ${theme.hoverBg} transition-colors cursor-pointer`}
            >
              {tr("Cancelar")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 ${accent.bgBtn} ${accent.bgBtnHover} text-white font-bold text-xs rounded-xl ${accent.shadowAccent} flex items-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? tr("Atualizando Criptografia...") : tr("Salvar Nova Senha")}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
