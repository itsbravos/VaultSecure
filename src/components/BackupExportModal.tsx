import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Upload,
  X,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  FileJson,
  ListChecks,
} from 'lucide-react';
import { VaultItem } from '../types';
import { encryptVaultData, decryptVaultData, getRandomBytes, deriveMasterKey, base64ToBuffer } from '../lib/crypto';
import { loadEncryptedVaultItems, saveEncryptedVaultItems } from '../lib/storage';
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

interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  activeVaultId: string;
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  onImportItems: (newItems: VaultItem[]) => void;
}

const SCOPE_OPTIONS: { id: ExportScope; label: string }[] = [
  ...VAULTS.map(v => ({ id: v.id as ExportScope, label: v.name })),
  { id: 'all', label: 'Todos os Cofres' },
];

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  items,
  activeVaultId,
  masterKey,
  salt,
  onImportItems,
}) => {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const [exportScope, setExportScope] = useState<ExportScope>(activeVaultId);
  const [scopedItems, setScopedItems] = useState<ScopedVaultItem[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !masterKey) return;
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
  }, [isOpen, exportScope, masterKey, activeVaultId, items]);

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

  if (!isOpen) return null;

  // Export Encrypted JSON file
  const handleExportEncrypted = async () => {
    if (!masterKey || !salt || itemsToExport.length === 0) return;

    try {
      let exportKey = masterKey;
      let exportSalt = salt;

      if (backupPassphrase.trim()) {
        exportSalt = getRandomBytes(16);
        exportKey = await deriveMasterKey(backupPassphrase, exportSalt);
      }

      const encryptedPayload = await encryptVaultData(itemsToExport, exportKey, exportSalt);
      const jsonString = JSON.stringify(encryptedPayload, null, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VaultSecure_Backup_${new Date().toISOString().split('T')[0]}.vault`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Export Plaintext JSON file
  const handleExportPlaintext = () => {
    if (itemsToExport.length === 0) return;
    if (!confirm('ATENÇÃO: A exportação em texto claro não possui criptografia! Qualquer pessoa poderá ler suas senhas. Deseja continuar?')) {
      return;
    }

    const jsonString = JSON.stringify(itemsToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VaultSecure_SENHAS_DESCRIPTOGRAFADAS_${new Date().toISOString().split('T')[0]}.json`;
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
      !confirm(
        'ATENÇÃO: o modo "Substituir" vai apagar todos os itens já cadastrados em cada cofre afetado antes de importar o backup. Esta ação não pode ser desfeita. Deseja continuar?'
      )
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

      if (vaultId === activeVaultId) {
        const finalList = importMode === 'replace' ? groupItems : mergeItemsById(items, groupItems);
        onImportItems(finalList);
      } else {
        const base = importMode === 'replace' ? [] : await loadEncryptedVaultItems(masterKey, vaultId);
        const finalList = importMode === 'replace' ? groupItems : mergeItemsById(base, groupItems);
        await saveEncryptedVaultItems(finalList, masterKey, salt, vaultId);
      }
    }

    setImportStatus(`Sucesso! ${total} itens restaurados (${summary.join(', ')}).`);
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

        // Check if encrypted payload or plaintext array
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
            const fileSalt = base64ToBuffer(parsed.salt);
            const importKey = await deriveMasterKey(importPassphrase, fileSalt);

            const decryptedItems = await decryptVaultData<ExportedVaultItem[]>(parsed, importKey);
            await applyImportedItems(decryptedItems);
            setImportPassphrase('');
          } catch (err) {
            setImportError('Falha ao descriptografar o backup. A senha de backup informada pode estar incorreta.');
            setImportStatus(null);
          }
        } else if (Array.isArray(parsed)) {
          await applyImportedItems(parsed as ExportedVaultItem[]);
        } else {
          setImportError('Formato de arquivo não reconhecido.');
          setImportStatus(null);
        }
      } catch (err) {
        setImportError('Erro ao ler o arquivo de backup.');
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-indigo-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Backup e Exportação do Cofre</h3>
              <p className="text-xs text-slate-400 font-mono">Exportação Zero-Knowledge protegida</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Export Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono">
              Exportar Registros ({itemsToExport.length} itens)
            </h4>

            {/* Vault Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Cofre a Exportar</label>
              <div className="grid grid-cols-2 gap-2">
                {SCOPE_OPTIONS.map(opt => {
                  const isActive = exportScope === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportScope(opt.id)}
                      className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                        isActive ? 'bg-slate-950 border-indigo-500' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-sm border transition-all shrink-0"
                        style={{
                          backgroundColor: isActive ? '#6366F1' : 'transparent',
                          borderColor: isActive ? '#6366F1' : '#4B5563',
                        }}
                      />
                      <span className={isActive ? 'text-slate-100 font-bold' : 'text-slate-400'}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Item Selection */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectionMode}
                  onChange={e => setSelectionMode(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-500 bg-slate-950 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
                  Selecionar itens específicos
                </span>
              </label>

              {selectionMode && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800">
                  {isLoadingScope ? (
                    <p className="p-3 text-[11px] text-slate-500 font-mono">Carregando itens do cofre...</p>
                  ) : scopedItems.length === 0 ? (
                    <p className="p-3 text-[11px] text-slate-500 font-mono">Nenhum item neste escopo.</p>
                  ) : (
                    scopedItems.map(item => (
                      <label
                        key={`${item.sourceVaultId}-${item.id}`}
                        className="flex items-center gap-2.5 p-2.5 text-xs cursor-pointer hover:bg-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="rounded border-slate-700 text-indigo-500 bg-slate-950 w-4 h-4 shrink-0"
                        />
                        <span className="truncate text-slate-200">{item.title}</span>
                        {exportScope === 'all' && (
                          <span className="ml-auto shrink-0 text-[10px] font-mono text-slate-500">
                            {VAULTS.find(v => v.id === item.sourceVaultId)?.name}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Senha Customizada de Backup (Opcional)
              </label>
              <input
                type="password"
                value={backupPassphrase}
                onChange={e => setBackupPassphrase(e.target.value)}
                placeholder="Se deixada em branco, usa a Senha Mestra atual"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportEncrypted}
                disabled={itemsToExport.length === 0}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
              >
                <Lock className="w-4 h-4" />
                <span>Exportar .VAULT Criptografado</span>
              </button>

              <button
                onClick={handleExportPlaintext}
                disabled={itemsToExport.length === 0}
                className="p-3 bg-slate-950 hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <FileJson className="w-4 h-4 text-slate-500" />
                <span>Exportar JSON (Descriptografado)</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono">
              Restaurar ou Importar Cofre
            </h4>

            {importStatus && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">Senha do Arquivo de Backup</label>
              <input
                type="password"
                value={importPassphrase}
                onChange={e => setImportPassphrase(e.target.value)}
                placeholder="Senha Mestra de origem ou Senha Personalizada usada no export..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Se o backup foi criado em outro computador, digite a Senha Mestra <strong>de lá</strong> (não a deste dispositivo).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                  importMode === 'merge' ? 'bg-slate-950 border-indigo-500' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-sm border transition-all shrink-0"
                  style={{
                    backgroundColor: importMode === 'merge' ? '#6366F1' : 'transparent',
                    borderColor: importMode === 'merge' ? '#6366F1' : '#4B5563',
                  }}
                />
                <span className={importMode === 'merge' ? 'text-slate-100 font-bold' : 'text-slate-400'}>
                  Mesclar (manter existentes)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                  importMode === 'replace' ? 'bg-slate-950 border-red-500' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-sm border transition-all shrink-0"
                  style={{
                    backgroundColor: importMode === 'replace' ? '#EF4444' : 'transparent',
                    borderColor: importMode === 'replace' ? '#EF4444' : '#4B5563',
                  }}
                />
                <span className={importMode === 'replace' ? 'text-slate-100 font-bold' : 'text-slate-400'}>
                  Substituir (apaga o que existe)
                </span>
              </button>
            </div>

            <label className="p-6 bg-slate-950 hover:bg-slate-800/60 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
              <Upload className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">
                Clique ou arraste um arquivo de backup (.vault / .json)
              </span>
              <span className="text-[11px] text-slate-500">
                Se o arquivo for criptografado, preencha a senha acima antes de selecionar.
              </span>
              <input
                type="file"
                accept=".vault,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
