import React, { useState } from 'react';
import {
  Download,
  Upload,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileJson,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { VaultItem, VaultSettings } from '../types';
import {
  encryptVaultData,
  decryptVaultData,
  getRandomBytes,
  deriveMasterKey,
} from '../lib/crypto';
import { getAccent, getTheme } from '../lib/theme';

interface BackupViewProps {
  items: VaultItem[];
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  onImportItems: (newItems: VaultItem[]) => void;
  settings?: VaultSettings;
}

export const BackupView: React.FC<BackupViewProps> = ({
  items,
  masterKey,
  salt,
  onImportItems,
  settings,
}) => {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const accent = getAccent(settings?.accentColor);
  const theme = getTheme(settings?.theme);

  // Export Encrypted JSON file (.vault)
  const handleExportEncrypted = async () => {
    if (!masterKey || !salt) return;

    try {
      let exportKey = masterKey;
      let exportSalt = salt;

      if (backupPassphrase.trim()) {
        exportSalt = getRandomBytes(16);
        exportKey = await deriveMasterKey(backupPassphrase, exportSalt);
      }

      const encryptedPayload = await encryptVaultData(
        items,
        exportKey,
        exportSalt
      );
      const jsonString = JSON.stringify(encryptedPayload, null, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VaultSecure_Backup_${
        new Date().toISOString().split('T')[0]
      }.vault`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Export Plaintext JSON file
  const handleExportPlaintext = () => {
    if (
      !confirm(
        'ATENÇÃO: A exportação em texto claro não possui criptografia! Qualquer pessoa poderá ler suas senhas. Deseja continuar?'
      )
    ) {
      return;
    }

    const jsonString = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VaultSecure_SENHAS_DESCRIPTOGRAFADAS_${
      new Date().toISOString().split('T')[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Import File
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus('Lendo arquivo de backup...');

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.ciphertext && parsed.iv && parsed.salt) {
          if (!importPassphrase.trim()) {
            setImportError(
              'Digite a senha do arquivo de backup antes de selecioná-lo. Use a Senha Mestra do dispositivo onde o backup foi criado, ou a Senha Personalizada de Backup, se você definiu uma na exportação.'
            );
            setImportStatus(null);
            e.target.value = '';
            return;
          }

          try {
            // Always derive the key from the salt embedded in the file itself,
            // never from the current device's live session key — the salt is
            // unique per installation, so reusing the local masterKey would
            // fail even when the master passwords match across devices.
            const fileSalt = new Uint8Array(
              atob(parsed.salt)
                .split('')
                .map(c => c.charCodeAt(0))
            );
            const importKey = await deriveMasterKey(
              importPassphrase,
              fileSalt
            );

            const decryptedItems = (await decryptVaultData(
              parsed,
              importKey
            )) as VaultItem[];
            onImportItems(decryptedItems);
            setImportPassphrase('');
            setImportStatus(
              `Sucesso! ${decryptedItems.length} registros restaurados no cofre.`
            );
          } catch (err) {
            setImportError(
              'Falha ao descriptografar. Verifique se a senha digitada é a Senha Mestra do dispositivo original (ou a Senha Personalizada de Backup usada na exportação).'
            );
            setImportStatus(null);
          }
        } else if (Array.isArray(parsed)) {
          onImportItems(parsed);
          setImportStatus(
            `Sucesso! ${parsed.length} itens importados do arquivo JSON.`
          );
        } else {
          setImportError(
            'Formato de arquivo inválido. Selecione um arquivo .vault ou .json válido.'
          );
          setImportStatus(null);
        }
      } catch (err) {
        setImportError(
          'Erro na leitura do arquivo. Certifique-se de que é um JSON válido.'
        );
        setImportStatus(null);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div
        className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 ${theme.depthShadow} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${accent.bgBtn} text-white flex items-center justify-center ${accent.shadowAccent} shrink-0`}
          >
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme.textPrimary} tracking-tight`}>
              Central de Backup & Exportação
            </h2>
            <p className={`text-xs ${theme.textMuted} font-mono`}>
              Portabilidade Local Total sem Servidores - Arquivos .vault Criptografados com AES-256
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg ${theme.bgCardInner} border ${theme.borderInner} ${theme.textSecondary}`}>
          <ShieldCheck className={`w-4 h-4 ${accent.textAccent}`} />
          <span>{items.length} Registros no Cofre</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT SECTION */}
        <div
          className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-5 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center gap-2 border-b ${theme.borderInner} pb-3`}>
            <Download className={`w-4 h-4 ${accent.textAccent}`} />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              Exportar Backup Criptografado
            </h3>
          </div>

          <p className={`text-xs ${theme.textMuted} font-mono leading-relaxed`}>
            Gera um arquivo <strong>.vault</strong> fortemente protegido com a sua Senha Mestra (ou uma senha personalizada de backup). Você pode transferir este arquivo com total segurança entre computadores e celulares.
          </p>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Lock className={`w-3.5 h-3.5 ${accent.textAccent}`} /> Senha Personalizada de Backup (Opcional)
            </label>
            <input
              type="password"
              value={backupPassphrase}
              onChange={e => setBackupPassphrase(e.target.value)}
              placeholder="Deixe em branco para usar sua Senha Mestra..."
              className={`w-full ${theme.bgInput} border ${theme.borderMain} rounded-xl p-3 text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent} font-mono ${theme.inputDepth}`}
            />
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleExportEncrypted}
              className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} text-white rounded-xl text-xs font-semibold shadow-lg transition-colors flex items-center justify-center gap-2`}
            >
              <FileJson className="w-4 h-4" />
              <span>Baixar Arquivo Criptografado (.vault)</span>
            </button>

            <button
              onClick={handleExportPlaintext}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-semibold border border-red-500/30 transition-colors flex items-center justify-center gap-2 font-mono"
            >
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Exportar em Texto Claro (Inseguro - JSON)</span>
            </button>
          </div>
        </div>

        {/* IMPORT SECTION */}
        <div
          className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-5 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center gap-2 border-b ${theme.borderInner} pb-3`}>
            <Upload className={`w-4 h-4 ${accent.textAccent}`} />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              Restaurar / Importar Cofre
            </h3>
          </div>

          <p className={`text-xs ${theme.textMuted} font-mono leading-relaxed`}>
            Selecione um arquivo <strong>.vault</strong> criado anteriormente neste ou em outro dispositivo para mesclar e restaurar suas credenciais.
          </p>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1.5 font-mono`}>
              <Lock className={`w-3.5 h-3.5 ${accent.textAccent}`} /> Senha do Arquivo de Backup
            </label>
            <input
              type="password"
              value={importPassphrase}
              onChange={e => setImportPassphrase(e.target.value)}
              placeholder="Senha Mestra de origem ou Senha Personalizada usada no export..."
              className={`w-full ${theme.bgInput} border ${theme.borderMain} rounded-xl p-3 text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent} font-mono ${theme.inputDepth}`}
            />
            <p className={`text-[10px] ${theme.textMuted} font-mono leading-relaxed`}>
              Se o backup foi criado em outro computador com a Senha Mestra dele, digite <strong>essa</strong> senha aqui (não a deste dispositivo). Se você definiu uma Senha Personalizada de Backup ao exportar, use ela.
            </p>
          </div>

          <div className={`p-6 ${theme.bgCardInner} border-2 border-dashed ${theme.borderInner} hover:border-emerald-500/60 rounded-xl text-center space-y-3 transition-colors relative shadow-inner`}>
            <input
              type="file"
              accept=".vault,.json"
              onChange={handleImportFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className={`w-10 h-10 rounded-xl ${theme.bgInput} ${theme.textPrimary} flex items-center justify-center mx-auto border ${theme.borderMain}`}>
              <Upload className={`w-5 h-5 ${accent.textAccent}`} />
            </div>
            <div>
              <p className={`text-xs font-semibold ${theme.textPrimary}`}>
                Clique para selecionar o arquivo .vault ou .json
              </p>
              <p className={`text-[10px] ${theme.textMuted} font-mono mt-1`}>
                Suporta backups criptografados do VaultSecure
              </p>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 rounded-xl text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
