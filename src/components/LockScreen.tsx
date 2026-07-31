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
} from 'lucide-react';
import { AuthSession, VaultSettings } from '../types';
import { verifyMasterPassword, initializeNewVault, saveEncryptedVaultItems } from '../lib/storage';
import { verifyTOTP, getTotpRemainingSeconds } from '../lib/totp';
import { performCertSignatureChallenge, generateTestDigitalCert } from '../lib/pki';
import { calculatePasswordStrength, deriveMasterKey, decryptVaultData, base64ToBuffer } from '../lib/crypto';
import { getAccent } from '../lib/theme';
import { ExportedVaultItem, groupItemsByVault } from '../lib/backup';

interface LockScreenProps {
  session: AuthSession;
  settings: VaultSettings;
  onSuccessUnlock: (masterKey: CryptoKey, salt: Uint8Array, isDuress?: boolean, isFirstTimeSetup?: boolean) => void;
  onSessionUpdate: (updater: (prev: AuthSession) => AuthSession) => void;
  onResetVault: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  session,
  settings,
  onSuccessUnlock,
  onSessionUpdate,
  onResetVault,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpInput, setTotpInput] = useState('');
  const [totpCountdown, setTotpCountdown] = useState(getTotpRemainingSeconds());
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(!session.isVaultInitialized);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Initialization Form State
  const [initMode, setInitMode] = useState<'create' | 'restore'>('create');
  const [initUserName, setInitUserName] = useState('');
  const [initMasterPass, setInitMasterPass] = useState('');
  const [initConfirmPass, setInitConfirmPass] = useState('');
  const [enable2FAInInit, setEnable2FAInInit] = useState(false);
  const [enableCertInInit, setEnableCertInInit] = useState(false);

  // Restore-from-file Form State
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
        if (res.isDuress) {
          onSuccessUnlock(res.masterKey, res.salt, true);
          return;
        }

        onSessionUpdate(prev => ({
          ...prev,
          masterKey: res.masterKey,
          salt: res.salt,
          passedMasterPass: true,
          failedAttempts: 0,
        }));

        // Determine next step based on settings
        if (settings.require2FA && settings.totpSecret) {
          onSessionUpdate(prev => ({ ...prev, step: 'totp_2fa' }));
        } else if (settings.requireDigitalCert && settings.digitalCertificates.length > 0) {
          onSessionUpdate(prev => ({ ...prev, step: 'digital_cert' }));
        } else {
          onSuccessUnlock(res.masterKey, res.salt);
        }
      } else {
        const nextFailed = session.failedAttempts + 1;
        onSessionUpdate(prev => ({ ...prev, failedAttempts: nextFailed }));

        if (settings.selfDestructAttempts > 0 && nextFailed >= settings.selfDestructAttempts) {
          setErrorMsg('Número máximo de tentativas excedido. O cofre foi bloqueado com segurança.');
          onResetVault();
        } else {
          const remaining = settings.selfDestructAttempts > 0 
            ? ` (${settings.selfDestructAttempts - nextFailed} tentativas restantes)` 
            : '';
          setErrorMsg(`Senha Mestra incorreta. Tente novamente.${remaining}`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao validar a Senha Mestra.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Authenticator TOTP Submission
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpInput.trim() || totpInput.length !== 6) {
      setErrorMsg('Digite um código de 6 dígitos válido do Google Authenticator.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const isTotpValid = await verifyTOTP(settings.totpSecret, totpInput);

      if (isTotpValid) {
        onSessionUpdate(prev => ({ ...prev, passedTotp: true }));

        if (settings.requireDigitalCert && settings.digitalCertificates.length > 0) {
          onSessionUpdate(prev => ({ ...prev, step: 'digital_cert' }));
        } else if (session.masterKey && session.salt) {
          onSuccessUnlock(session.masterKey, session.salt);
        }
      } else {
        setErrorMsg('Código do Google Authenticator inválido ou expirado.');
      }
    } catch (err: any) {
      setErrorMsg('Erro ao verificar o código de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Digital Certificate Challenge
  const handleCertVerification = async () => {
    if (!settings.digitalCertificates || settings.digitalCertificates.length === 0) {
      setErrorMsg('Nenhum certificado digital cadastrado.');
      return;
    }

    const cert = settings.digitalCertificates[selectedCertIndex] || settings.digitalCertificates[0];
    setIsLoading(true);
    setErrorMsg('');
    setCertChallengeStatus('Assinando e validando o desafio criptográfico do certificado...');

    try {
      const result = await performCertSignatureChallenge(cert);

      if (result.success) {
        setCertChallengeStatus('Certificado Digital validado com sucesso!');
        onSessionUpdate(prev => ({ ...prev, passedCert: true }));

        if (session.masterKey && session.salt) {
          setTimeout(() => {
            onSuccessUnlock(session.masterKey!, session.salt!);
          }, 600);
        }
      } else {
        setErrorMsg(result.errorMessage || 'Falha na validação da assinatura digital do certificado.');
        setCertChallengeStatus('Falha na autenticação do certificado');
      }
    } catch (err: any) {
      setErrorMsg('Erro ao processar certificado digital.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize First-Time Vault
  const handleInitVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initMasterPass.length < 8) {
      setErrorMsg('A Senha Mestra deve ter pelo menos 8 caracteres.');
      return;
    }
    if (initMasterPass !== initConfirmPass) {
      setErrorMsg('As senhas digitadas não coincidem.');
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
      setErrorMsg('Erro ao criar o cofre criptografado.');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore an existing .vault backup onto a fresh device instead of creating an empty vault —
  // avoids redoing registration when the user already has an account elsewhere.
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      setErrorMsg('Selecione um arquivo .vault para restaurar.');
      return;
    }
    if (!restorePassword.trim()) {
      setErrorMsg('Digite a Senha Mestra usada para criar o backup.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);

      let restoredItems: ExportedVaultItem[];
      if (parsed.ciphertext && parsed.iv && parsed.salt) {
        const fileSalt = base64ToBuffer(parsed.salt);
        const fileKey = await deriveMasterKey(restorePassword, fileSalt);
        restoredItems = await decryptVaultData<ExportedVaultItem[]>(parsed, fileKey);
      } else if (Array.isArray(parsed)) {
        restoredItems = parsed;
      } else {
        throw new Error('Formato de arquivo não reconhecido.');
      }

      // A backup exported with "Todos os Cofres" tags each item with the vault it
      // came from — split it back out instead of dumping everything into Pessoal.
      const groupedByVault = groupItemsByVault(restoredItems, 'pessoal');
      const pessoalItems = groupedByVault['pessoal'] || [];

      const res = await initializeNewVault(
        restorePassword,
        { userName: initUserName.trim() || 'Seu Nome' },
        pessoalItems
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
      setErrorMsg('Falha ao restaurar o backup. Verifique se a Senha Mestra e o arquivo .vault selecionado estão corretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const passStrength = calculatePasswordStrength(initMasterPass);
  const accent = getAccent(settings?.accentColor);

  return (
    <div className="min-h-screen bg-[#F5F3EF] dark:bg-[#080B11] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none transition-colors duration-500">
      
      {/* GOOGLE LABS ANIMATED ORGANIC BLOBS BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob 1 - Amber / Gold (Top Left) */}
        <motion.div
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -50, 30, 0],
            rotate: [0, 60, -30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-32 -left-20 w-[32rem] h-[32rem] opacity-75 dark:opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.5) 50%, transparent 80%)',
            borderRadius: '45% 55% 65% 35% / 55% 35% 65% 45%',
          }}
        />

        {/* Blob 2 - Electric Blue (Top Right) */}
        <motion.div
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 40, -40, 0],
            rotate: [0, -40, 35, 0],
            scale: [1, 0.88, 1.22, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-36 -right-28 w-[36rem] h-[36rem] opacity-75 dark:opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(96,165,250,0.5) 50%, transparent 80%)',
            borderRadius: '65% 35% 35% 65% / 65% 35% 65% 35%',
          }}
        />

        {/* Blob 3 - Vivid Pink / Magenta (Bottom Left) */}
        <motion.div
          animate={{
            x: [0, 45, -35, 0],
            y: [0, -45, 25, 0],
            rotate: [0, 35, -45, 0],
            scale: [1, 1.25, 0.92, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-36 -left-28 w-[34rem] h-[34rem] opacity-75 dark:opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(244,114,182,0.9) 0%, rgba(236,72,153,0.5) 50%, transparent 80%)',
            borderRadius: '50% 50% 35% 65% / 45% 55% 45% 55%',
          }}
        />

        {/* Blob 4 - Emerald / Mint Green (Bottom Right) */}
        <motion.div
          animate={{
            x: [0, -35, 30, 0],
            y: [0, 50, -30, 0],
            rotate: [0, -60, 40, 0],
            scale: [1, 0.9, 1.18, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-32 -right-24 w-[32rem] h-[32rem] opacity-75 dark:opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,0.9) 0%, rgba(16,185,129,0.5) 50%, transparent 80%)',
            borderRadius: '70% 30% 55% 45% / 35% 65% 35% 65%',
          }}
        />
      </div>

      {/* Main Lock Card - Soft Translucent Glassmorphism */}
      <div className="w-full max-w-md bg-white/75 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-3xl p-6 md:p-8 relative z-10 space-y-6 text-slate-800 dark:text-slate-100 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300">
        
        {/* Top Header Logo */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 ${accent.textAccent} shadow-md mb-1`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            VaultSecure
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5 font-mono">
            <Cpu className={`w-3.5 h-3.5 ${accent.textAccent}`} />
            Criptografia de Ponta a Ponta (AES-256-GCM)
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* INITIALIZATION MODE (First Time Setup) */}
        {isInitializing ? (
          <div className="space-y-4">
            {/* Create vs Restore Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <button
                type="button"
                onClick={() => setInitMode('create')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  initMode === 'create'
                    ? `${accent.bgBtn} text-white`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Criar Novo Cofre
              </button>
              <button
                type="button"
                onClick={() => setInitMode('restore')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  initMode === 'restore'
                    ? `${accent.bgBtn} text-white`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Restaurar de Arquivo .vault
              </button>
            </div>

            {initMode === 'create' ? (
          <form onSubmit={handleInitVaultSubmit} className="space-y-4">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-1">
              <span className={`font-semibold ${accent.textAccent} flex items-center gap-1.5`}>
                <Sparkles className="w-4 h-4" /> Criar Novo Cofre Seguro
              </span>
              <p className="text-slate-400 text-[11px]">
                Defina uma Senha Mestra forte. Ela será usada via PBKDF2 (250.000 iterações) para derivar a chave de descriptografia local no seu navegador.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Seu Nome (Titular do Cofre)</label>
              <input
                type="text"
                value={initUserName}
                onChange={e => setInitUserName(e.target.value)}
                placeholder="Ex: Seu Nome ou Empresa"
                className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nova Senha Mestra</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={initMasterPass}
                  onChange={e => setInitMasterPass(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Gauge */}
              {initMasterPass && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Força da Senha:</span>
                    <span className={`font-medium ${passStrength.color.split(' ')[0]}`}>
                      {passStrength.label} ({passStrength.entropy} bits)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passStrength.color.split(' ')[1]}`}
                      style={{ width: `${passStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirmar Senha Mestra</label>
              <input
                type="password"
                required
                value={initConfirmPass}
                onChange={e => setInitConfirmPass(e.target.value)}
                placeholder="Repita a senha mestra"
                className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
              />
            </div>

            {/* Optional Security Layers Options */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Camadas Adicionais de Acesso
              </span>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-slate-800/50 transition">
                <input
                  type="checkbox"
                  checked={enableCertInInit}
                  onChange={e => setEnableCertInInit(e.target.checked)}
                  className={`rounded border-slate-700 ${accent.textAccent} bg-slate-950 w-4 h-4`}
                />
                <div className="flex items-center gap-1.5">
                  <FileCheck className={`w-4 h-4 ${accent.textAccent}`} />
                  <span>Gerar Certificado Digital Dev (X.509 RSA-2048)</span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} text-white font-medium text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.98]`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Criando Cofre...
                </>
              ) : (
                <>
                  Inicializar e Acessar Cofre <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
            ) : (
          <form onSubmit={handleRestoreSubmit} className="space-y-4 animate-fade-in">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-1">
              <span className={`font-semibold ${accent.textAccent} flex items-center gap-1.5`}>
                <Upload className="w-4 h-4" /> Restaurar Cofre de Outro Dispositivo
              </span>
              <p className="text-slate-400 text-[11px]">
                Selecione o arquivo <strong>.vault</strong> exportado em outro computador ou celular e digite a mesma Senha Mestra usada lá. Não é necessário criar um cadastro novo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Seu Nome (Titular do Cofre)</label>
              <input
                type="text"
                value={initUserName}
                onChange={e => setInitUserName(e.target.value)}
                placeholder="Ex: Seu Nome ou Empresa"
                className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Arquivo de Backup (.vault)</label>
              <label className="flex flex-col items-center justify-center gap-1.5 p-5 bg-slate-950 border-2 border-dashed border-slate-700/80 rounded-xl cursor-pointer hover:border-slate-500 transition text-center">
                <Upload className={`w-5 h-5 ${accent.textAccent}`} />
                <span className="text-xs text-slate-300 font-medium px-2 truncate max-w-full">
                  {restoreFile ? restoreFile.name : 'Clique para selecionar o arquivo .vault'}
                </span>
                <input
                  type="file"
                  accept=".vault,.json"
                  className="hidden"
                  onChange={e => setRestoreFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Senha Mestra do Backup</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={restorePassword}
                  onChange={e => setRestorePassword(e.target.value)}
                  placeholder="A mesma senha usada no dispositivo original"
                  className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Se você definiu uma Senha Personalizada de Backup ao exportar, use ela em vez da Senha Mestra.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} text-white font-medium text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.98]`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Restaurando Cofre...
                </>
              ) : (
                <>
                  Restaurar e Acessar Cofre <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
            )}
          </div>
        ) : (
          /* STEP-BY-STEP UNLOCKING */
          <div className="space-y-5">
            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-2 pb-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  session.step === 'master_pass'
                    ? `${accent.badgeBg} ${accent.borderAccent} ${accent.textAccent} shadow-xs`
                    : session.passedMasterPass
                    ? 'bg-slate-200/70 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                1. Senha
              </div>

              {settings.require2FA && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    session.step === 'totp_2fa'
                      ? `${accent.badgeBg} ${accent.borderAccent} ${accent.textAccent} shadow-xs`
                      : session.passedTotp
                      ? 'bg-slate-200/70 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  2. 2FA (TOTP)
                </div>
              )}

              {settings.requireDigitalCert && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    session.step === 'digital_cert'
                      ? `${accent.badgeBg} ${accent.borderAccent} ${accent.textAccent} shadow-xs`
                      : session.passedCert
                      ? 'bg-slate-200/70 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {settings.require2FA ? '3.' : '2.'} Cert. Digital
                </div>
              )}
            </div>

            {/* STEP 1: MASTER PASSWORD */}
            {session.step === 'master_pass' && (
              <form onSubmit={handleMasterPassSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Digite a Senha Mestra</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Descriptografia Local</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••••••"
                      className={`w-full bg-white/60 dark:bg-slate-950/70 backdrop-blur-md border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none ${accent.ringAccent} focus:ring-2 transition shadow-inner`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 ${accent.bgBtn} ${accent.bgBtnHover} text-white font-bold text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verificando Chave...
                    </>
                  ) : (
                    <>
                      Desbloquear Cofre <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: GOOGLE AUTHENTICATOR (2FA TOTP) */}
            {session.step === 'totp_2fa' && (
              <form onSubmit={handleTotpSubmit} className="space-y-4 animate-fade-in">
                <div className="text-center space-y-1">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${accent.badgeBg} border ${accent.borderAccent} ${accent.textAccent} mb-1`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">Google Authenticator (2FA)</h3>
                  <p className="text-xs text-slate-400">
                    Insira o código de 6 dígitos do seu aplicativo autenticador.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      value={totpInput}
                      onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-3 text-center text-xl tracking-[0.5em] font-mono ${accent.textAccent} placeholder-slate-700 focus:outline-none ${accent.ringAccent} focus:ring-1 transition`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Tempo do código:</span>
                    <span className={`font-mono font-medium ${accent.textAccent} flex items-center gap-1`}>
                      <span className={`w-2 h-2 rounded-full ${accent.bgBtn} animate-pulse`} />
                      {totpCountdown}s
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpInput.length !== 6}
                  className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-50 text-white font-medium text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verificando 2FA...
                    </>
                  ) : (
                    <>
                      Confirmar Código 2FA <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: DIGITAL CERTIFICATE PKI VALIDATION */}
            {session.step === 'digital_cert' && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center space-y-1">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${accent.badgeBg} border ${accent.borderAccent} ${accent.textAccent} mb-1`}>
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">Autenticação por Certificado Digital</h3>
                  <p className="text-xs text-slate-400">
                    Selecione seu Certificado Digital ICP-Brasil / X.509 cadastrado para validar o desafio criptográfico.
                  </p>
                </div>

                {settings.digitalCertificates && settings.digitalCertificates.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Certificados Disponíveis:</label>
                      <select
                        value={selectedCertIndex}
                        onChange={e => setSelectedCertIndex(Number(e.target.value))}
                        className={`w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none ${accent.ringAccent}`}
                      >
                        {settings.digitalCertificates.map((c, idx) => (
                          <option key={c.id} value={idx}>
                            {c.name} ({c.serialNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cert Info Box */}
                    {settings.digitalCertificates[selectedCertIndex] && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-300 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subject:</span>
                          <span className={`${accent.textAccent} truncate max-w-[200px]`}>
                            {settings.digitalCertificates[selectedCertIndex].subject}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thumbprint:</span>
                          <span className="text-slate-400 truncate max-w-[200px]">
                            {settings.digitalCertificates[selectedCertIndex].thumbprint.slice(0, 16)}...
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={`text-[11px] ${accent.textAccent} text-center font-mono py-1`}>
                      {certChallengeStatus}
                    </div>

                    <button
                      type="button"
                      onClick={handleCertVerification}
                      disabled={isLoading}
                      className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} text-white font-medium text-sm rounded-xl ${accent.shadowAccent} flex items-center justify-center gap-2 transition`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verificando Assinatura...
                        </>
                      ) : (
                        <>
                          Validar Certificado Digital <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                    <p>Nenhum Certificado Digital foi encontrado nos registros.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info & Reset options */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Arquitetura Zero-Knowledge</span>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="hover:text-red-500 dark:hover:text-red-400 transition flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 hover:underline cursor-pointer"
            title="Apaga os dados criptografados do aplicativo neste dispositivo para recriar o cofre do zero"
          >
            <RefreshCw className="w-3 h-3 text-red-500 dark:text-red-400" />
            <span>Recriar Cofre</span>
          </button>
        </div>

      </div>

      {/* CONFIRMATION DIALOG FOR 'RECRIAR COFRE' */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-left font-mono">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">O que faz "Recriar Cofre"?</h3>
                <p className="text-[10px] text-slate-400">Ação irreversível no aplicativo</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                Ao <strong>Recriar o Cofre</strong>, todas as senhas, notas e certificados criptografados armazenados localmente neste dispositivo/aplicativo serão <span className="text-red-400 font-bold">permanentemente apagados</span>.
              </p>
              <p className="text-[11px] text-slate-400">
                Esta função é utilizada quando você esqueceu sua Senha Mestra ou deseja redefinir o app do zero como em um novo dispositivo.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetVault();
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition"
              >
                Sim, Apagar e Recriar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
