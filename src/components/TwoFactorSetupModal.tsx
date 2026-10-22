import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Download,
} from 'lucide-react';
import { generateTotpSecret, getTotpAuthUri, verifyTOTP } from '../lib/totp';
import { VaultSettings } from '../types';
import { getTheme, getAccent } from '../lib/theme';
import { confirmDialog } from './DialogHost';
import { tr } from '../lib/i18n';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSecret: string;
  onSave2FA: (secret: string, backupCodes: string[]) => void;
  onDisable2FA: () => void;
  isEnabled: boolean;
  settings?: VaultSettings;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  currentSecret,
  onSave2FA,
  onDisable2FA,
  isEnabled,
  settings,
}) => {
  if (!isOpen) return null;

  const activeTheme = getTheme(settings?.theme);
  const activeAccent = getAccent(settings?.accentColor, getTheme(settings?.theme).isLight);

  const [secret, setSecret] = useState(currentSecret || generateTotpSecret());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [userCodeInput, setUserCodeInput] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Generate QR Code data URL & Backup Codes on mount / secret change
  useEffect(() => {
    if (secret) {
      const uri = getTotpAuthUri(secret, 'usuario@cofre.local', 'VaultSecure');
      const darkColor = activeTheme.isLight ? '#0f172a' : (settings?.accentColor === 'emerald' || !settings?.accentColor ? '#10b981' : '#3b82f6');
      const lightColor = activeTheme.isLight ? '#ffffff' : '#020617';

      QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: darkColor, light: lightColor } })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error(err));

      // Generate 6 backup codes
      const codes = [];
      for (let i = 0; i < 6; i++) {
        codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
      }
      setBackupCodes(codes);
    }
  }, [secret, settings?.theme, settings?.accentColor]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userCodeInput.length !== 6) return;

    setErrorMsg('');
    const valid = await verifyTOTP(secret, userCodeInput);

    if (valid) {
      setTestSuccess(true);
      onSave2FA(secret, backupCodes);
    } else {
      setErrorMsg(tr("Código incorreto. Certifique-se que o horário do dispositivo esteja sincronizado."));
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleRegenerateSecret = () => {
    setSecret(generateTotpSecret());
    setTestSuccess(false);
    setUserCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className={`w-full max-w-lg ${activeTheme.bgCard} border ${activeTheme.borderMain} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${activeTheme.depthShadow}`}>
        
        {/* Header */}
        <div className={`p-6 border-b ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} flex items-center justify-center`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${activeTheme.textPrimary}`}>{tr("Google Authenticator (2FA)")}</h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>{tr("Autenticação em duas etapas TOTP (RFC 6238)")}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} border ${activeTheme.borderMain} transition-colors cursor-pointer`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Status Badge */}
          <div className={`flex items-center justify-between p-3 ${activeTheme.bgCardInner} rounded-2xl border ${activeTheme.borderInner} text-xs`}>
            <span className={activeTheme.textMuted}>{tr("Status da Autenticação de 2 Fatores:")}</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full border ${
                isEnabled
                  ? `${activeAccent.badgeBg} ${activeAccent.textAccent} ${activeAccent.borderAccent}`
                  : `${activeTheme.bgInput} ${activeTheme.textMuted} ${activeTheme.borderMain}`
              }`}
            >
              {isEnabled ? tr("2FA ATIVADO") : tr("2FA DESATIVADO")}
            </span>
          </div>

          {errorMsg && (
            <div className={`p-3 ${activeTheme.isLight ? 'bg-red-100 border-red-300 text-red-900' : 'bg-red-950/60 border-red-800 text-red-200'} border rounded-xl text-xs flex items-center gap-2`}>
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* QR Code and Secret display */}
          <div className={`flex flex-col sm:flex-row items-center gap-5 ${activeTheme.bgCardInner} p-4 rounded-2xl border ${activeTheme.borderInner}`}>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt={tr("QR Code Google Authenticator")}
                className={`w-36 h-36 rounded-xl border ${activeTheme.borderMain} shadow-md shrink-0`}
              />
            ) : (
              <div className={`w-36 h-36 rounded-xl ${activeTheme.bgInput} border ${activeTheme.borderMain} flex items-center justify-center ${activeTheme.textMuted}`}>
                {tr("Carregando...")}
              </div>
            )}

            <div className={`space-y-2 text-xs ${activeTheme.textSecondary} min-w-0 flex-1`}>
              <h4 className={`font-semibold ${activeTheme.textPrimary}`}>{tr("1. Escaneie no aplicativo")}</h4>
              <p className={`text-[11px] ${activeTheme.textMuted}`}>
                {tr("Abra o Google Authenticator ou Authy no seu celular e escaneie a imagem QR acima.")}
              </p>

              <div className="pt-1">
                <span className={`text-xs ${activeTheme.textMuted} block`}>{tr("Ou digite o código manualmente:")}</span>
                <div className={`flex items-center justify-between ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-lg p-2 font-mono ${activeAccent.textAccent} text-xs mt-1`}>
                  <span className="truncate">{secret}</span>
                  <button onClick={handleCopySecret} className={`${activeTheme.textMuted} hover:${activeAccent.textAccent} p-1 shrink-0 ml-2 cursor-pointer`}>
                    {copiedSecret ? <Check className={`w-3.5 h-3.5 ${activeAccent.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyCode} className="space-y-3 pt-2">
            <h4 className={`text-xs font-semibold ${activeTheme.textPrimary}`}>{tr("2. Digite o código de 6 dígitos para testar")}</h4>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={userCodeInput}
                onChange={e => setUserCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={`flex-1 ${activeTheme.bgInput} border ${activeTheme.borderMain} rounded-xl px-3.5 py-2.5 text-center text-lg tracking-[0.4em] font-mono ${activeAccent.textAccent} placeholder:${activeTheme.textMuted} focus:outline-none ${activeAccent.ringAccent}`}
              />
              <button
                type="submit"
                disabled={userCodeInput.length !== 6}
                className={`px-4 py-3 ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shrink-0 ${activeAccent.shadowAccent} cursor-pointer`}
              >
                {tr("Validar Código")}
              </button>
            </div>
          </form>

          {/* SUCCESS BANNER & BACKUP CODES */}
          {testSuccess && (
            <div className={`p-4 ${activeAccent.badgeBg} border ${activeAccent.borderAccent} rounded-2xl space-y-3 text-xs`}>
              <div className={`flex items-center gap-2 ${activeAccent.textAccent} font-semibold`}>
                <CheckCircle2 className={`w-5 h-5 ${activeAccent.textAccent}`} />
                <span>{tr("Google Authenticator Validado e Ativado com Sucesso!")}</span>
              </div>

              <div className="space-y-1">
                <span className={`${activeTheme.textPrimary} font-semibold`}>{tr("Códigos de Emergência / Backup:")}</span>
                <p className={`text-[11px] ${activeTheme.textMuted}`}>
                  {tr("Guarde estes códigos em local seguro. Eles permitem o acesso caso perca o celular:")}
                </p>
                <div className={`grid grid-cols-3 gap-2 font-mono text-xs ${activeAccent.textAccent} ${activeTheme.bgInput} p-2.5 rounded-xl border ${activeTheme.borderMain}`}>
                  {backupCodes.map((code, idx) => (
                    <span key={idx} className="text-center">{code}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex items-center justify-between`}>
          {isEnabled ? (
            <button
              onClick={async () => {
                if (await confirmDialog({ title: tr("Desativar a verificação em duas etapas?"), message: tr("O cofre passará a abrir só com a senha mestra."), confirmLabel: tr("Desativar"), danger: true })) {
                  onDisable2FA();
                  onClose();
                }
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              {tr("Desativar 2FA")}
            </button>
          ) : (
            <button
              onClick={handleRegenerateSecret}
              className={`text-xs ${activeTheme.textMuted} hover:${activeTheme.textPrimary} flex items-center gap-1 cursor-pointer`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> {tr("Gerar Novo Chaveiro")}
            </button>
          )}

          <button
            onClick={onClose}
            className={`px-5 py-2 ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textPrimary} border ${activeTheme.borderMain} text-xs font-semibold rounded-xl transition cursor-pointer`}
          >
            {tr("Concluído")}
          </button>
        </div>

      </div>
    </div>
  );
};
