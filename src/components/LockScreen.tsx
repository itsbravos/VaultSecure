import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  QrCode,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Upload,
  Globe,
} from 'lucide-react';
import { AuthSession, VaultSettings } from '../types';
import {
  verifyMasterPassword,
  initializeNewVault,
  saveEncryptedVaultItems,
  decryptVaultSettings,
  saveDecryptedSettings,
  loadFailedAttempts,
  saveFailedAttempts,
} from '../lib/storage';
import { setLegacySyncKey } from '../lib/syncEngine';
import { verifyTOTP, getTotpRemainingSeconds } from '../lib/totp';
import { performCertSignatureChallenge, generateTestDigitalCert } from '../lib/pki';
import { calculatePasswordStrength, deriveMasterKey, decryptVaultData, base64ToBuffer, kdfIterationsOf } from '../lib/crypto';
import { ExportedVaultItem, groupItemsByVault } from '../lib/backup';
import { getAccent, getTheme, strengthTone } from '../lib/theme';
import { Guilloche } from './Guilloche';
import { tr, locale, getLang, LANGUAGES, Lang } from '../lib/i18n';

interface LockScreenProps {
  session: AuthSession;
  settings: VaultSettings;
  onSuccessUnlock: (masterKey: CryptoKey, salt: Uint8Array, isDuress?: boolean, isFirstTimeSetup?: boolean) => void;
  onSessionUpdate: (updater: (prev: AuthSession) => AuthSession) => void;
  onResetVault: () => void;
  onChangeLanguage?: (lang: Lang) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  session,
  settings: plainSettings,
  onSuccessUnlock,
  onSessionUpdate,
  onResetVault,
  onChangeLanguage,
}) => {
  // 2FA / certificate settings are encrypted: they only exist once the password is right
  const [unlockedSettings, setUnlockedSettings] = useState<VaultSettings | null>(null);
  const settings = unlockedSettings ?? plainSettings;
  // Remounted half-way through (e.g. language switch on the 2FA step): reopen them
  useEffect(() => {
    if (!unlockedSettings && session.step !== 'master_pass' && session.masterKey && session.salt) {
      decryptVaultSettings(session.masterKey, session.salt)
        .then(r => setUnlockedSettings(r.settings))
        .catch(() => {});
    }
  }, []);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpInput, setTotpInput] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [totpCountdown, setTotpCountdown] = useState(getTotpRemainingSeconds());
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!session.isVaultInitialized);
  // "Recriar cofre" wipes the vault while this screen stays mounted: follow the session
  useEffect(() => {
    setIsInitializing(!session.isVaultInitialized);
    if (!session.isVaultInitialized) {
      setPasswordInput('');
      setErrorMsg('');
    }
  }, [session.isVaultInitialized]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Initialization Form State
  const [initUserName, setInitUserName] = useState('');
  const [initMasterPass, setInitMasterPass] = useState('');
  const [initConfirmPass, setInitConfirmPass] = useState('');
  const [enable2FAInInit, setEnable2FAInInit] = useState(false);
  const [enableCertInInit, setEnableCertInInit] = useState(false);

  // First access can also restore a .vault exported on another device
  const [initMode, setInitMode] = useState<'create' | 'restore'>('create');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');

  // Digital Cert Challenge state
  const [certChallengeStatus, setCertChallengeStatus] = useState<string>('Pendente de verificação');
  const [selectedCertIndex, setSelectedCertIndex] = useState(0);

  // TOTP Live Countdown Effect
  useEffect(() => {
    if (session.step === 'totp_2fa') {
      const interval = setInterval(() => {
        setTotpCountdown(getTotpRemainingSeconds());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session.step]);

  // Handle Master Password Submit
  const handleMasterPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await verifyMasterPassword(passwordInput);

      if (res.valid && res.masterKey && res.salt) {
        saveFailedAttempts(0);
        if (res.isDuress) {
          onSuccessUnlock(res.masterKey, res.salt, true);
          return;
        }
        setLegacySyncKey(res.legacyKey ?? null);
        const { settings: full } = await decryptVaultSettings(res.masterKey, res.salt);
        setUnlockedSettings(full);

        onSessionUpdate(prev => ({
          ...prev,
          masterKey: res.masterKey,
          salt: res.salt,
          passedMasterPass: true,
          failedAttempts: 0,
        }));

        // Determine next step based on settings
        if (full.require2FA && full.totpSecret) {
          onSessionUpdate(prev => ({ ...prev, step: 'totp_2fa' }));
        } else if (full.requireDigitalCert && full.digitalCertificates.length > 0) {
          onSessionUpdate(prev => ({ ...prev, step: 'digital_cert' }));
        } else {
          onSuccessUnlock(res.masterKey, res.salt);
        }
      } else {
        // Read from storage, not the session: a page reload must not reset the count
        const nextFailed = loadFailedAttempts() + 1;
        saveFailedAttempts(nextFailed);
        onSessionUpdate(prev => ({ ...prev, failedAttempts: nextFailed }));

        if (settings.selfDestructAttempts > 0 && nextFailed >= settings.selfDestructAttempts) {
          setErrorMsg(tr("Número máximo de tentativas excedido. O cofre foi bloqueado com segurança."));
          onResetVault();
        } else {
          const remaining = settings.selfDestructAttempts > 0 
            ? ' ' + tr('({n} tentativas restantes)', { n: settings.selfDestructAttempts - nextFailed }) 
            : '';
          setErrorMsg(tr("Senha Mestra incorreta. Tente novamente.{p0}", { p0: remaining }));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || tr("Erro ao validar a Senha Mestra."));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Authenticator TOTP Submission
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useBackupCode ? !totpInput.trim() : totpInput.length !== 6) {
      setErrorMsg(tr("Digite um código de 6 dígitos válido do Google Authenticator."));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      let isTotpValid = false;
      if (useBackupCode) {
        // Each emergency code works once
        const code = totpInput.trim().toUpperCase();
        const remaining = settings.backupCodes.filter(c => c.toUpperCase() !== code);
        isTotpValid = remaining.length < settings.backupCodes.length;
        if (isTotpValid && session.masterKey && session.salt) {
          const updated = { ...settings, backupCodes: remaining };
          setUnlockedSettings(updated);
          await saveDecryptedSettings(updated, session.masterKey, session.salt);
        }
      } else {
        isTotpValid = await verifyTOTP(settings.totpSecret, totpInput);
      }

      if (isTotpValid) {
        onSessionUpdate(prev => ({ ...prev, passedTotp: true }));

        if (settings.requireDigitalCert && settings.digitalCertificates.length > 0) {
          onSessionUpdate(prev => ({ ...prev, step: 'digital_cert' }));
        } else if (session.masterKey && session.salt) {
          onSuccessUnlock(session.masterKey, session.salt);
        }
      } else {
        setErrorMsg(useBackupCode ? tr("Código de emergência inválido ou já usado.") : tr("Código do Google Authenticator inválido ou expirado."));
      }
    } catch (err: any) {
      setErrorMsg(tr("Erro ao verificar o código de autenticação."));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Digital Certificate Challenge
  const handleCertVerification = async () => {
    if (!settings.digitalCertificates || settings.digitalCertificates.length === 0) {
      setErrorMsg(tr("Nenhum certificado digital cadastrado."));
      return;
    }

    const cert = settings.digitalCertificates[selectedCertIndex] || settings.digitalCertificates[0];
    setIsLoading(true);
    setErrorMsg('');
    setCertChallengeStatus(tr("Assinando e validando o desafio criptográfico do certificado..."));

    try {
      const result = await performCertSignatureChallenge(cert);

      if (result.success) {
        setCertChallengeStatus(tr("Certificado Digital validado com sucesso!"));
        onSessionUpdate(prev => ({ ...prev, passedCert: true }));

        if (session.masterKey && session.salt) {
          setTimeout(() => {
            onSuccessUnlock(session.masterKey!, session.salt!);
          }, 600);
        }
      } else {
        setErrorMsg(result.errorMessage ? tr(result.errorMessage) : tr("Falha na validação da assinatura digital do certificado."));
        setCertChallengeStatus(tr("Falha na autenticação do certificado"));
      }
    } catch (err: any) {
      setErrorMsg(tr("Erro ao processar certificado digital."));
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize First-Time Vault
  const handleInitVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initMasterPass.length < 8) {
      setErrorMsg(tr("A Senha Mestra deve ter pelo menos 8 caracteres."));
      return;
    }
    if (initMasterPass !== initConfirmPass) {
      setErrorMsg(tr("As senhas digitadas não coincidem."));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Auto generate a test certificate if requested
      let certConfigs = [];
      if (enableCertInInit) {
        const testCert = await generateTestDigitalCert();
        certConfigs.push(testCert);
      }

      const res = await initializeNewVault(initMasterPass, {
        userName: initUserName.trim() || 'Seu Nome',
        language: getLang(),
        require2FA: enable2FAInInit,
        requireDigitalCert: enableCertInInit,
        digitalCertificates: certConfigs,
      });

      onSessionUpdate(prev => ({
        ...prev,
        isVaultInitialized: true,
        masterKey: res.masterKey,
        salt: res.salt,
        passedMasterPass: true,
        passedTotp: !enable2FAInInit,
        passedCert: true,
      }));

      onSuccessUnlock(res.masterKey, res.salt, false, true);
    } catch (err: any) {
      setErrorMsg(tr("Erro ao criar o cofre criptografado."));
    } finally {
      setIsLoading(false);
    }
  };

  // Restore an existing .vault backup onto a fresh device instead of creating an empty vault —
  // avoids redoing registration when the user already has an account elsewhere.
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      setErrorMsg(tr("Selecione um arquivo .vault para restaurar."));
      return;
    }
    if (!restorePassword.trim()) {
      setErrorMsg(tr("Digite a senha mestra usada para criar o backup."));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const parsed = JSON.parse(await restoreFile.text());

      let restoredItems: ExportedVaultItem[];
      if (parsed.ciphertext && parsed.iv && parsed.salt) {
        const fileKey = await deriveMasterKey(restorePassword, base64ToBuffer(parsed.salt), kdfIterationsOf(parsed));
        restoredItems = await decryptVaultData<ExportedVaultItem[]>(parsed, fileKey);
      } else if (Array.isArray(parsed)) {
        restoredItems = parsed;
      } else {
        throw new Error(tr("Formato de arquivo não reconhecido."));
      }

      // A backup exported with "Todos os Cofres" tags each item with the vault it
      // came from — split it back out instead of dumping everything into Pessoal.
      const groupedByVault = groupItemsByVault(restoredItems, 'pessoal');

      const res = await initializeNewVault(
        restorePassword,
        { userName: initUserName.trim() || 'Seu Nome', language: getLang() },
        groupedByVault['pessoal'] || []
      );

      await Promise.all(
        Object.entries(groupedByVault)
          .filter(([vaultId]) => vaultId !== 'pessoal')
          .map(([vaultId, groupItems]) => saveEncryptedVaultItems(groupItems, res.masterKey, res.salt, vaultId))
      );

      onSessionUpdate(prev => ({
        ...prev,
        isVaultInitialized: true,
        masterKey: res.masterKey,
        salt: res.salt,
        passedMasterPass: true,
        passedTotp: true,
        passedCert: true,
      }));

      onSuccessUnlock(res.masterKey, res.salt, false, false);
    } catch (err: any) {
      setErrorMsg(tr("Não foi possível restaurar. Confira se o arquivo .vault e a senha mestra estão corretos."));
    } finally {
      setIsLoading(false);
    }
  };

  const passStrength = calculatePasswordStrength(initMasterPass);
  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  // Lock screen palette: Tinta keeps its engraved-ink look; every other theme
  // (Areia, Papel, Noturno) is built from that theme's own tokens.
  const L = theme.isLight
    ? {
        bg: theme.bgMain, card: theme.bgCard, input: theme.bgInput, raised: theme.bgCardInner,
        hover: theme.hoverBg, hoverText: 'hover:text-stone-900',
        border: theme.borderMain, borderStrong: 'border-stone-900/20',
        track: 'bg-stone-900/10', trackStrong: 'bg-stone-900/20',
        title: theme.textPrimary, text: theme.textPrimary, text2: theme.textSecondary, text3: theme.textSecondary,
        muted: theme.textMuted, muted2: theme.textMuted, faint: 'text-stone-400', placeholder: 'placeholder-stone-400',
        dangerSoft: 'text-red-700', danger: 'text-red-600', hoverDanger: 'hover:text-red-600',
        rosette: '#CDBF9F',
      }
    : settings?.theme === 'slate'
    ? {
        bg: theme.bgMain, card: theme.bgCard, input: theme.bgInput, raised: theme.bgCardInner,
        hover: theme.hoverBg, hoverText: 'hover:text-slate-100',
        border: theme.borderMain, borderStrong: 'border-slate-400/25',
        track: 'bg-slate-400/15', trackStrong: 'bg-slate-400/25',
        title: theme.textPrimary, text: theme.textPrimary, text2: theme.textSecondary, text3: theme.textSecondary,
        muted: theme.textMuted, muted2: theme.textMuted, faint: 'text-slate-500', placeholder: 'placeholder-slate-500',
        dangerSoft: 'text-red-300', danger: 'text-red-400', hoverDanger: 'hover:text-red-400',
        rosette: '#334155',
      }
    : {
        bg: 'bg-[#0E1F24]', card: 'bg-[#13282E]/85', input: 'bg-[#0B1A1E]', raised: 'bg-[#183238]',
        hover: 'hover:bg-[#1D3A41]', hoverText: 'hover:text-[#D3E0DC]',
        border: 'border-[#2C4A50]', borderStrong: 'border-[#3D5F65]',
        track: 'bg-[#2C4A50]', trackStrong: 'bg-[#3D5F65]',
        title: 'text-[#F2F6F4]', text: 'text-[#E6EFEC]', text2: 'text-[#D3E0DC]', text3: 'text-[#B9CBC6]',
        muted: 'text-[#86A19B]', muted2: 'text-[#6E8A85]', faint: 'text-[#4A6A6E]', placeholder: 'placeholder-[#4A6A6E]',
        dangerSoft: 'text-red-300', danger: 'text-red-400', hoverDanger: 'hover:text-red-400',
        rosette: '#3D5F65',
      };

  const inputCls = `w-full ${L.input} border ${L.border} rounded-xl px-3.5 py-3 text-sm ${L.text} ${L.placeholder} focus:outline-none focus:ring-2 ${accent.ringAccent} focus:border-transparent transition`;
  const labelCls = `text-[13px] font-medium ${L.text3}`;

  const steps = [
    { key: 'master_pass', label: tr("Senha"), icon: KeyRound, show: true, passed: session.passedMasterPass },
    { key: 'totp_2fa', label: tr("2FA"), icon: QrCode, show: settings.require2FA, passed: session.passedTotp },
    { key: 'digital_cert', label: tr("Certificado"), icon: FileCheck, show: settings.requireDigitalCert, passed: session.passedCert },
  ].filter(s => s.show);

  return (
    <div className={`min-h-screen ${L.bg} ${L.text} flex flex-col justify-center items-center p-4 relative overflow-hidden select-none antialiased`}>

      {/* Backdrop: a large engraved rosette, barely visible, like security paper */}
      <Guilloche
        size={1100}
        color={L.rosette}
        strokeWidth={0.1}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Seal: the rosette turns while the key is being derived */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative w-[132px] h-[132px] mb-5">
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: isLoading ? 2.5 : 90, repeat: Infinity, ease: 'linear' }}
            >
              <Guilloche size={132} color={accent.colorHex} strokeWidth={0.3} />
            </motion.div>
            <div className={`absolute inset-[38px] rounded-full ${L.bg} border ${L.border} flex items-center justify-center`}>
              {session.isUnlocked ? (
                <CheckCircle2 className={`w-6 h-6 ${accent.textAccent}`} />
              ) : (
                <Lock className={`w-6 h-6 ${accent.textAccent}`} strokeWidth={1.75} />
              )}
            </div>
          </div>
          <h1 className={`text-[32px] leading-none font-extrabold tracking-[-0.03em] ${L.title}`}>
            {tr("VaultSecure")}
          </h1>
          <p className={`text-[15px] ${L.muted} mt-2.5`}>
            {isInitializing
              ? tr("Crie seu cofre. Tudo fica criptografado neste dispositivo.")
              : session.step === 'totp_2fa' ? tr("Confirme que é você com o código do autenticador.") : session.step === 'digital_cert' ? tr("Último passo: valide seu certificado digital.") : tr("Digite sua senha mestra para abrir o cofre.")}
          </p>
        </div>

        {/* Card */}
        <div className={`${L.card} backdrop-blur-xl border ${L.border} rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_-30px_rgba(0,0,0,0.9)] space-y-5`}>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className={`p-3 bg-red-500/10 border border-red-500/25 rounded-xl ${L.dangerSoft} text-[13px] flex items-start gap-2.5 animate-shake`}>
              <AlertTriangle className={`w-4 h-4 ${L.danger} shrink-0 mt-0.5`} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* INITIALIZATION MODE (First Time Setup) */}
          {isInitializing ? (
            <div className="space-y-5">
            {/* Create a new vault, or restore one exported on another device */}
            <div role="tablist" aria-label={tr("Como começar")} className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${L.border}`}>
              {([['create', 'Criar cofre'], ['restore', 'Restaurar backup']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={initMode === mode}
                  onClick={() => {
                    setInitMode(mode);
                    setErrorMsg('');
                  }}
                  className={`h-9 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                    initMode === mode ? `${L.raised} ${L.text}` : `${L.muted} ${L.hoverText}`
                  }`}
                >
                  {tr(label)}
                </button>
              ))}
            </div>

            {initMode === 'restore' ? (
              <form onSubmit={handleRestoreSubmit} className="space-y-4 animate-fade-in">
                <p className={`text-[13px] ${L.muted} leading-relaxed`}>
                  {tr("Use o arquivo")} <strong className={`${L.text2} font-medium`}>.vault</strong> {tr("exportado em outro aparelho e a mesma senha mestra usada lá.")}
                </p>
                <div className="space-y-1.5">
                  <label className={labelCls}>{tr("Seu nome")}</label>
                  <input
                    type="text"
                    value={initUserName}
                    onChange={e => setInitUserName(e.target.value)}
                    placeholder={tr("Ex: Seu nome ou empresa")}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className={labelCls}>{tr("Arquivo de backup")}</span>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border border-dashed ${L.borderStrong} ${L.hover} cursor-pointer transition-colors`}>
                    <Upload className={`w-5 h-5 shrink-0 ${accent.textAccent}`} />
                    <span className={`text-[13px] ${L.text3} truncate`}>
                      {restoreFile ? restoreFile.name : tr("Escolher arquivo .vault")}
                    </span>
                    <input
                      type="file"
                      accept=".vault,.json"
                      className="sr-only"
                      onChange={e => setRestoreFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>{tr("Senha mestra do backup")}</label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={e => setRestorePassword(e.target.value)}
                    placeholder={tr("A senha usada no outro aparelho")}
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-60 text-white font-semibold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {tr("Restaurando…")}
                    </>
                  ) : (
                    <>
                      {tr("Restaurar cofre")} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
            <form onSubmit={handleInitVaultSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelCls}>{tr("Seu nome")}</label>
                <input
                  type="text"
                  value={initUserName}
                  onChange={e => setInitUserName(e.target.value)}
                  placeholder={tr("Ex: Seu nome ou empresa")}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>{tr("Senha mestra")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={initMasterPass}
                    onChange={e => setInitMasterPass(e.target.value)}
                    placeholder={tr("Mínimo de 8 caracteres")}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${L.muted2} ${L.hoverText} ${L.hover} transition`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Gauge */}
                {initMasterPass && (
                  <div className="space-y-1.5 pt-1.5">
                    <div className={`h-1 w-full ${L.track} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${passStrength.color.split(' ')[1]}`}
                        style={{ width: `${passStrength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={`${L.muted2}`}>{tr("Força")}</span>
                      <span className={`font-medium ${strengthTone(passStrength.score, theme.isLight)}`}>
                        {passStrength.label} · {passStrength.entropy} {tr("bits")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>{tr("Confirmar senha mestra")}</label>
                <input
                  type="password"
                  required
                  value={initConfirmPass}
                  onChange={e => setInitConfirmPass(e.target.value)}
                  placeholder={tr("Repita a senha mestra")}
                  className={inputCls}
                />
              </div>

              <label className={`flex items-start gap-3 text-[13px] ${L.text3} cursor-pointer p-3 rounded-xl border ${L.border} ${L.hover} transition`}>
                <input
                  type="checkbox"
                  checked={enableCertInInit}
                  onChange={e => setEnableCertInInit(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded"
                  style={{ accentColor: accent.colorHex }}
                />
                <div>
                  <span className={`font-medium ${L.text2} flex items-center gap-1.5`}>
                    <FileCheck className={`w-4 h-4 ${accent.textAccent}`} /> {tr("Certificado digital")}
                  </span>
                  <span className={`text-xs ${L.muted2}`}>{tr("Gera um certificado X.509 RSA-2048 como camada extra de acesso.")}</span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-60 text-white font-semibold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> {tr("Criando cofre…")}
                  </>
                ) : (
                  <>
                    {tr("Criar cofre")} <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className={`text-xs ${L.muted2} leading-relaxed text-center`}>
                {tr("Sua senha mestra deriva a chave via PBKDF2 (600.000 iterações). Não há como recuperá-la — guarde-a bem.")}
              </p>
            </form>
            )}
            </div>
          ) : (
            /* STEP-BY-STEP UNLOCKING */
            <div className="space-y-5">
              {/* Step Indicators */}
              {steps.length > 1 && (
                <div className="flex items-center gap-2">
                  {steps.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = session.step === s.key;
                    return (
                      <React.Fragment key={s.key}>
                        {idx > 0 && <div className={`flex-1 h-px ${s.passed || isActive ? `${L.trackStrong}` : `${L.track}`}`} />}
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            isActive
                              ? `${accent.badgeBg} ${accent.borderAccent} ${accent.badgeText}`
                              : s.passed
                              ? `${L.borderStrong} ${L.text3}`
                              : `${L.border} ${L.faint}`
                          }`}
                        >
                          {s.passed && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                          {s.label}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* STEP 1: MASTER PASSWORD */}
              {session.step === 'master_pass' && (
                <form onSubmit={handleMasterPassSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={labelCls}>{tr("Senha mestra")}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder={tr("Digite sua senha mestra")}
                        className={`${inputCls} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${L.muted2} ${L.hoverText} ${L.hover} transition`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-60 text-white font-semibold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> {tr("Derivando chave…")}
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> {tr("Desbloquear")}
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: GOOGLE AUTHENTICATOR (2FA TOTP) */}
              {session.step === 'totp_2fa' && (
                <form onSubmit={handleTotpSubmit} className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <h3 className={`text-[15px] font-semibold ${L.text}`}>{tr("Verificação em duas etapas")}</h3>
                    <p className={`text-[13px] ${L.muted}`}>
                      {useBackupCode
                        ? tr("Insira um dos códigos de emergência que você guardou ao ativar o 2FA.")
                        : tr("Insira o código de 6 dígitos do seu app autenticador.")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {useBackupCode ? (
                      <input
                        type="text"
                        maxLength={16}
                        autoFocus
                        autoComplete="off"
                        value={totpInput}
                        onChange={e => setTotpInput(e.target.value.replace(/[^A-Za-z0-9-]/g, ''))}
                        placeholder="XXXXX-XXXXX"
                        className={`${inputCls} py-3.5 text-center text-xl tracking-[0.2em] font-mono uppercase ${L.title} ${L.placeholder}`}
                      />
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoFocus
                        value={totpInput}
                        onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className={`${inputCls} py-3.5 text-center text-2xl tracking-[0.6em] font-mono ${L.title} ${L.placeholder}`}
                      />
                    )}

                    <div className={`flex items-center gap-2 text-xs ${L.muted2}`}>
                      <div className={`flex-1 h-1 rounded-full ${L.track} overflow-hidden`}>
                        <div
                          className={`h-full ${accent.bgBtn} transition-all duration-1000 ease-linear`}
                          style={{ width: `${(totpCountdown / 30) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums w-7 text-right">{totpCountdown}s</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || (useBackupCode ? !totpInput.trim() : totpInput.length !== 6)}
                    className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition cursor-pointer`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> {tr("Verificando…")}
                      </>
                    ) : (
                      <>
                        {tr("Confirmar código")} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {settings.backupCodes?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseBackupCode(v => !v);
                        setTotpInput('');
                        setErrorMsg('');
                      }}
                      className={`w-full text-center text-xs ${L.muted} hover:underline cursor-pointer`}
                    >
                      {useBackupCode ? tr("Usar o app autenticador") : tr("Perdeu o celular? Usar código de emergência")}
                    </button>
                  )}
                </form>
              )}

              {/* STEP 3: DIGITAL CERTIFICATE PKI VALIDATION */}
              {session.step === 'digital_cert' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <h3 className={`text-[15px] font-semibold ${L.text}`}>{tr("Certificado digital")}</h3>
                    <p className={`text-[13px] ${L.muted}`}>
                      {tr("Selecione seu certificado ICP-Brasil / X.509 para assinar o desafio criptográfico.")}
                    </p>
                  </div>

                  {settings.digitalCertificates && settings.digitalCertificates.length > 0 ? (
                    <form
                      className="space-y-3"
                      onSubmit={e => {
                        e.preventDefault();
                        if (!isLoading) handleCertVerification();
                      }}
                    >
                      {/* Certificate picker: radio cards instead of the OS-styled <select> */}
                      <div role="radiogroup" aria-label={tr("Certificados disponíveis")} className="space-y-2 max-h-56 overflow-y-auto">
                        {settings.digitalCertificates.map((c, idx) => {
                          const isSelected = idx === selectedCertIndex;
                          const cn = c.subject.match(/CN=([^,]+)/)?.[1] || c.name;
                          return (
                            <label
                              key={c.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                isSelected ? `${accent.borderAccent} ${accent.badgeBg}` : `${L.border} ${L.hover}`
                              }`}
                            >
                              <input
                                type="radio"
                                name="cert"
                                checked={isSelected}
                                onChange={() => setSelectedCertIndex(idx)}
                                onKeyDown={e => {
                                  // Radios don't submit on Enter by default; make it behave like the password field
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget.form?.requestSubmit();
                                  }
                                }}
                                autoFocus={isSelected}
                                className="mt-1 w-4 h-4 shrink-0"
                                style={{ accentColor: accent.colorHex }}
                              />
                              <span className="min-w-0 flex-1">
                                <span className={`block text-sm font-medium ${L.text} truncate`}>{cn}</span>
                                <span className={`block text-xs ${L.muted} truncate`}>
                                  {c.keyType}{tr(", válido até")} {new Date(c.validTo).toLocaleDateString(locale())}
                                </span>
                                <span className={`block text-xs ${L.muted2} font-mono truncate mt-0.5`} title={c.thumbprint}>
                                  {c.thumbprint.slice(0, 20)}…
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {certChallengeStatus !== 'Pendente de verificação' && (
                        <p className={`text-xs ${accent.textAccent}`} role="status">
                          {certChallengeStatus}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-60 text-white font-semibold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition cursor-pointer`}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> {tr("Verificando assinatura…")}
                          </>
                        ) : (
                          <>
                            {tr("Validar certificado")} <CheckCircle2 className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className={`text-center p-4 rounded-xl border ${L.border} text-[13px] ${L.muted}`}>
                      {tr("Nenhum certificado digital foi encontrado.")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info & Reset options */}
        {/* Two deliberate centered rows: what protects you, then the two actions */}
        <div className={`mt-5 flex flex-col items-center gap-2.5 text-xs ${L.muted2}`}>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{tr("Criptografado neste dispositivo (AES-256)")}</span>
          </div>
          <a
            href="https://github.com/itsbravos/VaultSecure"
            target="_blank"
            rel="noreferrer"
            className={`text-center ${L.hoverText} transition`}
          >
            {tr("Projeto open source, sem auditoria de segurança independente")}
          </a>

          <div className={`flex items-center gap-3 ${L.muted}`}>
            {onChangeLanguage && (
              <button
                type="button"
                onClick={() => onChangeLanguage(getLang() === 'en' ? 'pt' : 'en')}
                className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${L.hoverText} transition cursor-pointer`}
                title={tr("Idioma")}
              >
                <Globe className="w-3.5 h-3.5" />
                {LANGUAGES.find(l => l.id !== getLang())?.label}
              </button>
            )}
            {onChangeLanguage && <span aria-hidden className={`w-px h-3 ${L.track}`} />}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className={`whitespace-nowrap shrink-0 ${L.hoverDanger} transition cursor-pointer`}
              title={tr("Apaga os dados criptografados do aplicativo neste dispositivo para recriar o cofre do zero")}
            >
              {tr("Recriar cofre")}
            </button>
          </div>
        </div>
      </motion.div>

      {/* CONFIRMATION DIALOG FOR 'RECRIAR COFRE' */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
          <div className={`w-full max-w-sm ${L.card} border ${L.border} rounded-2xl p-6 shadow-2xl space-y-4 text-left animate-slide-up`}>
            <div className={`w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center ${L.danger}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className={`text-base font-semibold ${L.text}`}>{tr("Recriar o cofre?")}</h3>
              <p className={`text-[13px] ${L.muted} leading-relaxed`}>
                {tr("Todas as senhas, notas e certificados armazenados neste dispositivo serão")} <span className={`${L.danger} font-medium`}>{tr("apagados permanentemente")}</span>. Use isto apenas se esqueceu a senha mestra ou quer começar do zero.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className={`flex-1 py-2.5 ${L.raised} ${L.hover} ${L.text2} text-sm font-medium rounded-xl border ${L.border} transition cursor-pointer`}
              >
                {tr("Cancelar")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetVault();
                }}
                className={`flex-1 py-2.5 bg-red-600 hover:bg-red-500 ${L.title} text-sm font-semibold rounded-xl transition cursor-pointer`}
              >
                {tr("Apagar e recriar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
