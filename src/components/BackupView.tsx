import React, { useEffect, useMemo, useState } from 'react';
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
  ListChecks,
  Check,
} from 'lucide-react';
import { VaultItem, VaultSettings } from '../types';
import {
  encryptVaultData,
  decryptVaultData,
  getRandomBytes,
  deriveMasterKey,
  base64ToBuffer,
  kdfIterationsOf,
} from '../lib/crypto';
import { loadEncryptedVaultItems, saveEncryptedVaultItems, recordDeletion } from '../lib/storage';
import { getAccent, getTheme } from '../lib/theme';
import { confirmDialog } from './DialogHost';
import { PageHeader } from './PageHeader';
import { VAULTS } from '../lib/vaults';
import {
  ExportScope,
  ExportedVaultItem,
  ScopedVaultItem,
  loadItemsForScope,
  toExportedItems,
  groupItemsByVault,
  mergeItemsById,
} from '../lib/backup';
import { tr } from '../lib/i18n';

interface BackupViewProps {
  items: VaultItem[];
  activeVaultId: string;
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  onImportItems: (newItems: VaultItem[]) => void;
  settings?: VaultSettings;
  onOpenBrowserImport?: () => void;
  onAfterImport?: () => void; // e.g. kick off folder sync
}

const SCOPE_OPTIONS = (): { id: ExportScope; label: string }[] => [
  ...VAULTS.map(v => ({ id: v.id as ExportScope, label: tr(v.name) })),
  { id: 'all', label: tr("Todos os Cofres") },
];

export const BackupView: React.FC<BackupViewProps> = ({
  items,
  activeVaultId,
  masterKey,
  salt,
  onImportItems,
  settings,
  onOpenBrowserImport,
  onAfterImport,
}) => {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Export scope: which vault(s) to pull items from, and an optional manual selection within them.
  const [exportScope, setExportScope] = useState<ExportScope>(activeVaultId);
  const [scopedItems, setScopedItems] = useState<ScopedVaultItem[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!masterKey) return;
    let cancelled = false;
    setIsLoadingScope(true);
    loadItemsForScope(exportScope, masterKey, activeVaultId, items)
      .then(loaded => {
        if (cancelled) return;
        setScopedItems(loaded);
        setSelectedIds(new Set(loaded.map(i => i.id)));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingScope(false);
      });
    return () => {
      cancelled = true;
    };
    // items is intentionally included: when the active vault's live items change
    // (switching vaults, adding/importing items), the 'all' scope must recompute
    // instead of keeping a stale snapshot tagged under the previous vault.
  }, [exportScope, masterKey, activeVaultId, items]);

  const itemsToExport = useMemo(() => {
    const chosen = selectionMode ? scopedItems.filter(i => selectedIds.has(i.id)) : scopedItems;
    return toExportedItems(chosen);
  }, [scopedItems, selectionMode, selectedIds]);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  // Export Encrypted JSON file (.vault)
  const handleExportEncrypted = async () => {
    if (!masterKey || !salt || itemsToExport.length === 0) return;

    try {
      let exportKey = masterKey;
      let exportSalt = salt;

      if (backupPassphrase.trim()) {
        exportSalt = getRandomBytes(16);
        exportKey = await deriveMasterKey(backupPassphrase, exportSalt);
      }

      const encryptedPayload = await encryptVaultData(
        itemsToExport,
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
  const handleExportPlaintext = async () => {
    if (itemsToExport.length === 0) return;
    if (
      !(await confirmDialog({
        title: tr("Exportar sem criptografia?"),
        message: tr("O arquivo JSON terá todas as suas senhas em texto legível. Qualquer pessoa com acesso a ele poderá lê-las."),
        confirmLabel: tr("Exportar mesmo assim"),
        danger: true,
      }))
    ) {
      return;
    }

    const jsonString = JSON.stringify(itemsToExport, null, 2);
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

  // Splits the imported items back into their original vaults (Pessoal/Trabalho/
  // Compartilhado) instead of dumping everything into whichever vault is active,
  // and either merges with or replaces each vault's existing items per importMode.
  const applyImportedItems = async (rawItems: ExportedVaultItem[]) => {
    if (!masterKey || !salt) return;

    if (
      importMode === 'replace' &&
      !(await confirmDialog({
        title: tr("Substituir os itens dos cofres?"),
        message: tr("Todos os itens já cadastrados em cada cofre afetado serão apagados antes de importar o backup. Isso não pode ser desfeito."),
        confirmLabel: tr("Substituir"),
        danger: true,
      }))
    ) {
      return;
    }

    const groups = groupItemsByVault(rawItems, activeVaultId);
    let total = 0;
    const summary: string[] = [];

    for (const [vaultId, groupItems] of Object.entries(groups)) {
      total += groupItems.length;
      const vaultName = VAULTS.find(v => v.id === vaultId)?.name || vaultId;
      summary.push(`${groupItems.length} em ${vaultName}`);

      const current = vaultId === activeVaultId ? items : await loadEncryptedVaultItems(masterKey, vaultId);
      const finalList = importMode === 'replace' ? groupItems : mergeItemsById(current, groupItems);
      if (importMode === 'replace') {
        // Record what "replace" removed, so folder sync deletes it on other devices
        // instead of syncing it back
        const kept = new Set(finalList.map(i => i.id));
        current.filter(i => !kept.has(i.id)).forEach(i => recordDeletion(vaultId, i.id));
      }
      if (vaultId === activeVaultId) {
        onImportItems(finalList);
      } else {
        await saveEncryptedVaultItems(finalList, masterKey, salt, vaultId);
      }
    }
    onAfterImport?.();

    setImportStatus(tr("Sucesso! {p0} itens restaurados ({p1}).", { p0: total, p1: summary.join(', ') }));
  };

  // Handle Import File
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus(tr("Lendo arquivo de backup..."));

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.ciphertext && parsed.iv && parsed.salt) {
          if (!importPassphrase.trim()) {
            setImportError(
              tr("Digite a senha do arquivo de backup antes de selecioná-lo. Use a Senha Mestra do dispositivo onde o backup foi criado, ou a Senha Personalizada de Backup, se você definiu uma na exportação.")
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
            const fileSalt = base64ToBuffer(parsed.salt);
            const importKey = await deriveMasterKey(importPassphrase, fileSalt, kdfIterationsOf(parsed));

            const decryptedItems = await decryptVaultData<ExportedVaultItem[]>(parsed, importKey);
            await applyImportedItems(decryptedItems);
            setImportPassphrase('');
          } catch (err) {
            setImportError(
              tr("Falha ao descriptografar. Verifique se a senha digitada é a Senha Mestra do dispositivo original (ou a Senha Personalizada de Backup usada na exportação).")
            );
            setImportStatus(null);
          }
        } else if (Array.isArray(parsed)) {
          await applyImportedItems(parsed as ExportedVaultItem[]);
        } else {
          setImportError(
            tr("Formato de arquivo inválido. Selecione um arquivo .vault ou .json válido.")
          );
          setImportStatus(null);
        }
      } catch (err) {
        setImportError(
          tr("Erro na leitura do arquivo. Certifique-se de que é um JSON válido.")
        );
        setImportStatus(null);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <PageHeader
        theme={theme}
        title={tr("Backup")}
        description={tr("Exporte um arquivo criptografado de um cofre (ou de todos) e restaure em outro dispositivo.")}
      />

      {onOpenBrowserImport && (
        <section className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border ${theme.borderMain} ${theme.bgCard}`}>
          <div className={`w-11 h-11 rounded-xl border ${theme.borderInner} ${theme.bgCardInner} ${accent.textAccent} flex items-center justify-center shrink-0`}>
            <Upload className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-[15px] font-semibold ${theme.textPrimary}`}>{tr("Importar senhas do navegador")}</h3>
            <p className={`text-[13px] ${theme.textMuted} mt-0.5`}>
              {tr("Traga as senhas salvas no Chrome, Edge, Firefox ou Safari. Você revisa tudo antes de importar.")}
            </p>
          </div>
          <button
            onClick={onOpenBrowserImport}
            className={`shrink-0 h-10 px-4 rounded-xl ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-sm font-semibold cursor-pointer`}
          >
            {tr("Começar")}
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT SECTION */}
        <div
          className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-5 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center gap-2 border-b ${theme.borderInner} pb-3`}>
            <Download className={`w-4 h-4 ${accent.textAccent}`} />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              {tr("Exportar Backup Criptografado")}
            </h3>
          </div>

          <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
            {tr("Gera um arquivo")} <strong>.vault</strong> {tr("fortemente protegido com a sua Senha Mestra (ou uma senha personalizada de backup). Você pode transferir este arquivo com total segurança entre computadores e celulares.")}
          </p>

          {/* Vault Scope Selector */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary}`}>
              {tr("Cofre a Exportar")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS().map(opt => {
                const isActive = exportScope === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportScope(opt.id)}
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                      isActive ? `${theme.bgCardInner} ${accent.borderAccent}` : `${theme.bgCardInner} ${theme.borderInner}`
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-sm border transition-all shrink-0"
                      style={{
                        backgroundColor: isActive ? accent.colorHex : 'transparent',
                        borderColor: isActive ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                      }}
                    />
                    <span className={isActive ? `${theme.textPrimary} font-bold` : theme.textSecondary}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Item Selection */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectionMode(!selectionMode)}
              className="w-full flex items-center gap-2.5 text-xs cursor-pointer select-none text-left"
            >
              <div
                className="w-4 h-4 rounded-sm border transition-all shrink-0"
                style={{
                  backgroundColor: selectionMode ? accent.colorHex : 'transparent',
                  borderColor: selectionMode ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                }}
              />
              <span className={`flex items-center gap-1.5 ${theme.textSecondary}`}>
                <ListChecks className={`w-3.5 h-3.5 ${accent.textAccent}`} />
                {tr("Selecionar itens específicos (em vez de exportar todos do escopo)")}
              </span>
            </button>

            {selectionMode && (
              <div className={`max-h-56 overflow-y-auto rounded-xl border ${theme.borderMain} ${theme.bgCardInner} divide-y ${theme.borderInner}`}>
                {isLoadingScope ? (
                  <p className={`p-3 text-[11px] ${theme.textMuted}`}>{tr("Carregando itens do cofre...")}</p>
                ) : scopedItems.length === 0 ? (
                  <p className={`p-3 text-[11px] ${theme.textMuted}`}>{tr("Nenhum item neste escopo.")}</p>
                ) : (
                  scopedItems.map(item => {
                    const isChecked = selectedIds.has(item.id);
                    return (
                      <button
                        type="button"
                        key={`${item.sourceVaultId}-${item.id}`}
                        onClick={() => toggleSelected(item.id)}
                        className="w-full flex items-center gap-2.5 p-2.5 text-xs cursor-pointer hover:bg-black/10 text-left"
                      >
                        <div
                          className="w-4 h-4 rounded-sm border transition-all shrink-0"
                          style={{
                            backgroundColor: isChecked ? accent.colorHex : 'transparent',
                            borderColor: isChecked ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                          }}
                        />
                        <span className={`truncate ${theme.textPrimary}`}>{item.title}</span>
                        {exportScope === 'all' && (
                          <span className={`ml-auto shrink-0 text-xs ${theme.textMuted}`}>
                            {VAULTS.find(v => v.id === item.sourceVaultId)?.name}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <p className={`text-[11px] ${theme.textMuted} flex items-center gap-1.5`}>
              <Check className={`w-3.5 h-3.5 ${accent.textAccent}`} />
              {itemsToExport.length} {itemsToExport.length === 1 ? tr("item será exportado") : tr("itens serão exportados")}
            </p>
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1.5`}>
              <Lock className={`w-3.5 h-3.5 ${accent.textAccent}`} /> {tr("Senha Personalizada de Backup (Opcional)")}
            </label>
            <input
              type="password"
              value={backupPassphrase}
              onChange={e => setBackupPassphrase(e.target.value)}
              placeholder={tr("Deixe em branco para usar sua Senha Mestra...")}
              className={`w-full ${theme.bgInput} border ${theme.borderMain} rounded-xl p-3 text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent} ${theme.inputDepth}`}
            />
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleExportEncrypted}
              disabled={itemsToExport.length === 0}
              className={`w-full py-3 ${accent.bgBtn} ${accent.bgBtnHover} disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg transition-colors flex items-center justify-center gap-2`}
            >
              <FileJson className="w-4 h-4" />
              <span>{tr("Baixar Arquivo Criptografado (.vault)")}</span>
            </button>

            <button
              onClick={handleExportPlaintext}
              disabled={itemsToExport.length === 0}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-500 rounded-xl text-xs font-semibold border border-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>{tr("Exportar em Texto Claro (Inseguro - JSON)")}</span>
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
              {tr("Restaurar / Importar Cofre")}
            </h3>
          </div>

          <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
            {tr("Selecione um arquivo")} <strong>.vault</strong> {tr("criado anteriormente neste ou em outro dispositivo para mesclar e restaurar suas credenciais.")}
          </p>

          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary} flex items-center gap-1.5`}>
              <Lock className={`w-3.5 h-3.5 ${accent.textAccent}`} /> {tr("Senha do Arquivo de Backup")}
            </label>
            <input
              type="password"
              value={importPassphrase}
              onChange={e => setImportPassphrase(e.target.value)}
              placeholder={tr("Senha Mestra de origem ou Senha Personalizada usada no export...")}
              className={`w-full ${theme.bgInput} border ${theme.borderMain} rounded-xl p-3 text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none ${accent.ringAccent} ${accent.borderAccent} ${theme.inputDepth}`}
            />
            <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
              {tr("Se o backup foi criado em outro computador com a Senha Mestra dele, digite")} <strong>{tr("essa")}</strong> {tr("senha aqui (não a deste dispositivo). Se você definiu uma Senha Personalizada de Backup ao exportar, use ela.")}
            </p>
          </div>

          {/* Merge vs Replace */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${theme.textSecondary}`}>
              {tr("Ao Importar")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                  importMode === 'merge' ? `${theme.bgCardInner} ${accent.borderAccent}` : `${theme.bgCardInner} ${theme.borderInner}`
                }`}
              >
                <div
                  className="w-4 h-4 rounded-sm border transition-all shrink-0"
                  style={{
                    backgroundColor: importMode === 'merge' ? accent.colorHex : 'transparent',
                    borderColor: importMode === 'merge' ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                  }}
                />
                <span className={importMode === 'merge' ? `${theme.textPrimary} font-bold` : theme.textSecondary}>
                  {tr("Mesclar (manter existentes e adicionar novos)")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                  importMode === 'replace' ? `${theme.bgCardInner} border-red-500` : `${theme.bgCardInner} ${theme.borderInner}`
                }`}
              >
                <div
                  className="w-4 h-4 rounded-sm border transition-all shrink-0"
                  style={{
                    backgroundColor: importMode === 'replace' ? '#EF4444' : 'transparent',
                    borderColor: importMode === 'replace' ? '#EF4444' : theme.isLight ? '#9CA3AF' : '#4B5563',
                  }}
                />
                <span className={importMode === 'replace' ? `${theme.textPrimary} font-bold` : theme.textSecondary}>
                  {tr("Substituir (apaga o que já existe)")}
                </span>
              </button>
            </div>
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
                {tr("Clique para selecionar o arquivo .vault ou .json")}
              </p>
              <p className={`text-xs ${theme.textMuted} mt-1`}>
                {tr("Suporta backups criptografados do VaultSecure")}
              </p>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
