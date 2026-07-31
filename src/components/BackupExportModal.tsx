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
import { encryptVaultData, decryptVaultData, getRandomBytes, deriveMasterKey } from '../lib/crypto';
import { VAULTS } from '../lib/vaults';
import { ExportScope, ScopedVaultItem, loadItemsForScope, stripScopeMetadata } from '../lib/backup';

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
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exportScope, masterKey, activeVaultId]);

  const itemsToExport = useMemo(() => {
    const chosen = selectionMode ? scopedItems.filter(i => selectedIds.has(i.id)) : scopedItems;
    return stripScopeMetadata(chosen);
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
        if (parsed.ciphertext && parsed.iv && masterKey) {
          try {
            let keyToUse = masterKey;
            if (backupPassphrase.trim()) {
              const fileSalt = new Uint8Array(atob(parsed.salt).split('').map(c => c.charCodeAt(0)));
              keyToUse = await deriveMasterKey(backupPassphrase, fileSalt);
            }

            const decryptedItems = await decryptVaultData<VaultItem[]>(parsed, keyToUse);
            if (Array.isArray(decryptedItems)) {
              onImportItems(decryptedItems);
              setImportStatus(`Sucesso! ${decryptedItems.length} itens importados e integrados ao cofre.`);
            }
          } catch (err) {
            setImportError('Falha ao descriptografar o backup. A senha de backup informada pode estar incorreta.');
            setImportStatus(null);
          }
        } else if (Array.isArray(parsed)) {
          onImportItems(parsed);
          setImportStatus(`Sucesso! ${parsed.length} registros em texto claro foram importados.`);
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
                {SCOPE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportScope(opt.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-semibold border transition-colors text-left ${
                      exportScope === opt.id
                        ? 'border-indigo-500/60 bg-indigo-950/60 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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

            <label className="p-6 bg-slate-950 hover:bg-slate-800/60 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
              <Upload className="w-6 h-6 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">
                Clique ou arraste um arquivo de backup (.vault / .json)
              </span>
              <span className="text-[11px] text-slate-500">
                Se o arquivo for criptografado, preencha a senha no campo acima antes de selecionar.
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
