import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Check,
  Copy,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Globe,
  Repeat,
} from 'lucide-react';
import { VaultItem, VaultSettings } from '../types';
import { getAccent, getTheme, getSignals } from '../lib/theme';
import {
  parseBrowserExport,
  ImportResult,
  ImportError,
  RowStatus,
  SOURCE_LABELS,
  MAX_FILE_BYTES,
  hostOf,
} from '../lib/browserImport';
import { calculatePasswordStrength } from '../lib/crypto';
import { VaultId, VAULT_IDS } from '../lib/storage';
import { tr } from '../lib/i18n';

interface BrowserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: VaultItem[]; // items from every vault, for duplicate detection
  defaultVault: VaultId;
  settings: VaultSettings;
  onImport: (byVault: Partial<Record<VaultId, VaultItem[]>>) => Promise<void> | void;
  onShowItems?: () => void;
}

const VAULT_LABELS: Record<VaultId, string> = {
  pessoal: 'Pessoal',
  trabalho: 'Trabalho',
  compartilhado: 'Compartilhado',
};

type BrowserId = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';

interface Guide {
  id: BrowserId;
  name: string;
  address?: string; // internal page the user types in the address bar (can't be linked from a web page)
  steps: string[];
}

const GUIDES = (): Guide[] => [
  {
    id: 'chrome',
    name: tr("Chrome"),
    address: 'chrome://password-manager/settings',
    steps: [
      tr("Cole o endereço acima na barra do Chrome e aperte Enter."),
      tr("Em \"Exportar senhas\", clique em \"Baixar arquivo\"."),
      tr("Confirme com a senha ou o PIN do computador. O arquivo .csv vai para Downloads."),
    ],
  },
  {
    id: 'edge',
    name: tr("Edge"),
    address: 'edge://settings/passwords',
    steps: [
      tr("Cole o endereço acima na barra do Edge e aperte Enter."),
      tr("No menu ⋯ ao lado de \"Senhas salvas\", escolha \"Exportar senhas\"."),
      tr("Confirme com a senha ou o PIN do computador e salve o arquivo .csv."),
    ],
  },
  {
    id: 'firefox',
    name: tr("Firefox"),
    address: 'about:logins',
    steps: [
      tr("Cole o endereço acima na barra do Firefox e aperte Enter."),
      tr("No menu ⋯ do canto superior direito, escolha \"Exportar senhas…\"."),
      tr("Confirme e salve o arquivo .csv."),
    ],
  },
  {
    id: 'safari',
    name: tr("Safari"),
    steps: [
      tr("No Mac, abra o app Senhas (ou o Safari em versões mais antigas)."),
      tr("Use o menu Arquivo › Exportar todas as senhas (no Safari: Arquivo › Exportar › Senhas)."),
      tr("Confirme com Touch ID ou a senha do Mac e salve o arquivo .csv."),
    ],
  },
  {
    id: 'other',
    name: tr("Outros"),
    steps: [
      tr("Brave, Opera e Vivaldi: siga o passo a passo do Chrome, trocando \"chrome://\" pelo nome do navegador (ex.: brave://password-manager/settings)."),
      tr("Bitwarden, LastPass e 1Password: exporte o cofre no formato CSV."),
      tr("Qualquer CSV com colunas de site, usuário e senha também funciona."),
    ],
  },
];

const guessBrowser = (): BrowserId => {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  return 'chrome';
};

type Filter = 'all' | RowStatus;

export const BrowserImportModal: React.FC<BrowserImportModalProps> = ({
  isOpen,
  onClose,
  existingItems,
  defaultVault,
  settings,
  onImport,
  onShowItems,
}) => {
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);
  const signal = getSignals(theme.isLight);

  const [step, setStep] = useState<'pick' | 'review' | 'done'>('pick');
  const [browser, setBrowser] = useState<BrowserId>(guessBrowser);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Destination vault per row; rows not listed go to defaultVault
  const [destination, setDestination] = useState<Record<string, VaultId>>({});
  const [bulkVault, setBulkVault] = useState<VaultId>(defaultVault);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const guide = GUIDES().find(g => g.id === browser)!;

  const reset = () => {
    setStep('pick');
    setFileName('');
    setResult(null);
    setSelected(new Set());
    setDestination({});
    setFilter('all');
    setError(null);
    setImportedCount(0);
  };

  const handleClose = () => {
    // Drop the decrypted rows from memory as soon as the dialog goes away
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== 'text/csv') {
      setError(tr("Escolha o arquivo .csv exportado pelo navegador."));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(tr("O arquivo passa de 10 MB. Confira se é mesmo a exportação de senhas."));
      return;
    }
    try {
      const parsed = parseBrowserExport(await file.text(), existingItems);
      setFileName(file.name);
      setResult(parsed);
      // Preselect only what's safe to add without thinking about it
      setSelected(new Set(parsed.rows.filter(r => r.status === 'new').map(r => r.item.id)));
      setFilter('all');
      setDestination({});
      setBulkVault(defaultVault);
      setStep('review');
    } catch (err) {
      setError(err instanceof ImportError ? err.message : tr("Não foi possível ler este arquivo como CSV."));
    }
  };

  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { new: 0, duplicate: 0, conflict: 0, invalid: 0 };
    result?.rows.forEach(r => c[r.status]++);
    return c;
  }, [result]);

  const visibleRows = useMemo(
    () => (result?.rows || []).filter(r => filter === 'all' || r.status === filter),
    [result, filter]
  );
  const selectableVisible = visibleRows.filter(r => r.status !== 'invalid');
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every(r => selected.has(r.item.id));

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected(prev => {
      const next = new Set(prev);
      selectableVisible.forEach(r => (allVisibleSelected ? next.delete(r.item.id) : next.add(r.item.id)));
      return next;
    });

  const vaultOf = (id: string): VaultId => destination[id] || defaultVault;

  const moveSelectedTo = (vault: VaultId) => {
    setBulkVault(vault);
    setDestination(prev => {
      const next = { ...prev };
      selected.forEach(id => (next[id] = vault));
      return next;
    });
  };

  const handleImport = async () => {
    if (!result) return;
    const items = result.rows.filter(r => r.status !== 'invalid' && selected.has(r.item.id)).map(r => r.item);
    if (items.length === 0) return;
    const byVault: Partial<Record<VaultId, VaultItem[]>> = {};
    items.forEach(item => (byVault[vaultOf(item.id)] ||= []).push(item));
    setIsImporting(true);
    try {
      await onImport(byVault);
      setImportedCount(items.length);
      setResult(null); // plaintext rows are no longer needed
      setSelected(new Set());
      setStep('done');
    } finally {
      setIsImporting(false);
    }
  };

  const STATUS_META: Record<RowStatus, { label: string; text: string; dot: string }> = {
    new: { label: tr("Novo"), text: signal.safeText, dot: signal.safeBg },
    duplicate: { label: tr("Já no cofre"), text: theme.textMuted, dot: theme.isLight ? 'bg-[#0E1F24]/25' : 'bg-[#4A6A6E]' },
    conflict: { label: tr("Outra senha"), text: signal.warnText, dot: signal.warnBg },
    invalid: { label: tr("Ignorado"), text: signal.dangerText, dot: signal.dangerBg },
  };

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: tr("Todos"), count: result?.rows.length || 0 },
    { id: 'new', label: tr("Novos"), count: counts.new },
    { id: 'conflict', label: tr("Outra senha"), count: counts.conflict },
    { id: 'duplicate', label: tr("Já no cofre"), count: counts.duplicate },
    { id: 'invalid', label: tr("Ignorados"), count: counts.invalid },
  ];

  const ghostBtn = `h-10 px-4 rounded-xl border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-sm font-medium cursor-pointer inline-flex items-center gap-2`;
  const primaryBtn = `h-10 px-5 rounded-xl ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-sm font-semibold cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`;

  // No exit animation: an interrupted exit could leave the overlay stuck over the app
  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-[2px]"
          onMouseDown={e => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col ${theme.bgCard} border ${theme.borderMain} sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className={`flex items-start gap-3 px-5 sm:px-6 py-4 border-b ${theme.borderMain}`}>
              {step === 'review' && (
                <button onClick={reset} className={`-ml-2 mt-0.5 p-1.5 rounded-lg ${theme.textMuted} ${theme.hoverBg} cursor-pointer`} title={tr("Escolher outro arquivo")}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 id="import-title" className={`text-lg font-bold tracking-tight ${theme.textPrimary}`}>
                  {step === 'done' ? tr("Importação concluída") : tr("Importar senhas do navegador")}
                </h2>
                <p className={`text-[13px] ${theme.textMuted} mt-0.5`}>
                  {step === 'pick' && tr("Exporte as senhas do navegador como CSV e envie o arquivo aqui.")}
                  {step === 'review' && result && tr("{p0}, formato {p1}. Escolha o que entra no cofre.", { p0: fileName, p1: tr(SOURCE_LABELS[result.source]) })}
                  {step === 'done' && tr("Os itens já estão criptografados nos cofres escolhidos.")}
                </p>
              </div>
              <button onClick={handleClose} className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hoverBg} cursor-pointer`} title={tr("Fechar")}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: browser guide + file drop */}
            {step === 'pick' && (
              <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
                <div role="tablist" aria-label={tr("Navegador")} className={`flex gap-1 p-1 rounded-xl border ${theme.borderMain} overflow-x-auto`}>
                  {GUIDES().map(g => (
                    <button
                      key={g.id}
                      role="tab"
                      aria-selected={browser === g.id}
                      onClick={() => setBrowser(g.id)}
                      className={`flex-1 min-w-[72px] h-9 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                        browser === g.id
                          ? `${theme.isLight ? 'bg-[#0E1F24]/[0.07]' : 'bg-[#183238]'} ${theme.textPrimary}`
                          : `${theme.textMuted} ${theme.hoverBg}`
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {guide.address && (
                    <div className={`flex items-center gap-2 pl-3 pr-1 h-10 rounded-lg border ${theme.borderInner} ${theme.bgCardInner}`}>
                      <Globe className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                      <code className={`flex-1 min-w-0 truncate text-[13px] ${theme.textPrimary}`}>{guide.address}</code>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(guide.address!).catch(() => {});
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 1500);
                        }}
                        className={`h-8 px-2.5 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 ${theme.textSecondary} ${theme.hoverBg} cursor-pointer`}
                      >
                        {copiedAddress ? <Check className={`w-3.5 h-3.5 ${accent.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedAddress ? tr("Copiado") : tr("Copiar")}
                      </button>
                    </div>
                  )}
                  <ol className="space-y-2">
                    {guide.steps.map((s, i) => (
                      <li key={i} className={`flex gap-3 text-sm ${theme.textSecondary}`}>
                        <span className={`w-6 h-6 shrink-0 rounded-full border ${theme.borderMain} flex items-center justify-center text-xs font-semibold ${theme.textMuted}`}>
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <p className={`text-xs ${theme.textMuted}`}>{tr("Os nomes dos menus podem variar um pouco entre versões do navegador.")}</p>
                </div>

                <label
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                  className={`flex flex-col items-center justify-center text-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    isDragging ? `${accent.borderAccent} ${accent.badgeBg}` : `${theme.borderMain} ${theme.hoverBg}`
                  }`}
                >
                  <Upload className={`w-6 h-6 ${isDragging ? accent.textAccent : theme.textMuted}`} />
                  <span className={`text-sm font-semibold ${theme.textPrimary}`}>{tr("Arraste o arquivo .csv aqui")}</span>
                  <span className={`text-[13px] ${theme.textMuted}`}>{tr("ou clique para escolher")}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                {error && (
                  <p role="alert" className={`flex items-start gap-2 text-[13px] ${signal.dangerText}`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                  </p>
                )}

                <p className={`flex items-start gap-2 text-[13px] ${theme.textMuted}`}>
                  <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${signal.safeText}`} />
                  {tr("O arquivo é lido só neste dispositivo e nunca é enviado para lugar nenhum.")}
                </p>
              </div>
            )}

            {/* STEP 2: review */}
            {step === 'review' && result && (
              <>
                <div className={`px-5 sm:px-6 pt-4 pb-3 space-y-3 border-b ${theme.borderInner}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {filters.filter(f => f.id === 'all' || f.count > 0).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        aria-pressed={filter === f.id}
                        className={`h-8 px-3 rounded-full border text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 ${
                          filter === f.id ? `${accent.borderAccent} ${accent.badgeBg} ${accent.badgeText}` : `${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg}`
                        }`}
                      >
                        {f.id !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[f.id as RowStatus].dot}`} />}
                        {f.label}
                        <span className="tabular-nums opacity-70">{f.count}</span>
                      </button>
                    ))}
                  </div>
                  {counts.conflict > 0 && (filter === 'all' || filter === 'conflict') && (
                    <p className={`text-[13px] ${theme.textMuted}`}>
                      {tr("\"Outra senha\" são contas que já estão no cofre com uma senha diferente. Se marcar, elas entram como um item a mais, e o original não é alterado.")}
                    </p>
                  )}
                </div>

                <div className="overflow-y-auto flex-1 min-h-0">
                  {visibleRows.length === 0 ? (
                    <p className={`px-6 py-10 text-center text-sm ${theme.textMuted}`}>{tr("Nada nesta categoria.")}</p>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead className={`sticky top-0 ${theme.bgCard} text-xs ${theme.textMuted} border-b ${theme.borderInner} z-10`}>
                        <tr>
                          <th className="w-12 pl-5 sm:pl-6 pr-3 py-2 text-left">
                            <input
                              type="checkbox"
                              aria-label={tr("Selecionar todos visíveis")}
                              checked={allVisibleSelected}
                              disabled={selectableVisible.length === 0}
                              onChange={toggleAllVisible}
                              className="w-4 h-4"
                              style={{ accentColor: accent.colorHex }}
                            />
                          </th>
                          <th className="py-2 pr-3 text-left font-medium">{tr("Site")}</th>
                          <th className="py-2 pr-3 text-left font-medium hidden sm:table-cell">{tr("Usuário")}</th>
                          <th className="py-2 pr-3 text-left font-medium">{tr("Cofre")}</th>
                          <th className="py-2 pr-5 sm:pr-6 text-left font-medium">{tr("Situação")}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme.divideInner}`}>
                        {visibleRows.map(row => {
                          const meta = STATUS_META[row.status];
                          const disabled = row.status === 'invalid';
                          const login = row.item.username || row.item.email || '';
                          const weak = !disabled && calculatePasswordStrength(row.item.password || '').score < 50;
                          return (
                            <tr
                              key={row.item.id}
                              onClick={() => !disabled && toggle(row.item.id)}
                              className={`${disabled ? 'opacity-60' : `cursor-pointer ${theme.hoverBg}`}`}
                            >
                              <td className="pl-5 sm:pl-6 pr-3 py-2.5 align-top">
                                <input
                                  type="checkbox"
                                  aria-label={tr("Importar {p0}", { p0: row.item.title })}
                                  checked={!disabled && selected.has(row.item.id)}
                                  disabled={disabled}
                                  onChange={() => toggle(row.item.id)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-4 h-4 mt-0.5"
                                  style={{ accentColor: accent.colorHex }}
                                />
                              </td>
                              <td className="py-2.5 pr-3 align-top max-w-0 w-1/2">
                                <p className={`font-medium ${theme.textPrimary} truncate`}>{row.item.title}</p>
                                <p className={`text-xs ${theme.textMuted} truncate`}>
                                  {hostOf(row.item.url) || '—'}
                                  <span className="sm:hidden">{login && `, ${login}`}</span>
                                </p>
                              </td>
                              <td className={`py-2.5 pr-3 align-top max-w-0 w-1/3 hidden sm:table-cell ${theme.textSecondary}`}>
                                <p className="truncate">{login || '—'}</p>
                              </td>
                              <td className="py-2 pr-3 align-top">
                                {!disabled && (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      const next = VAULT_IDS[(VAULT_IDS.indexOf(vaultOf(row.item.id)) + 1) % VAULT_IDS.length];
                                      setDestination(prev => ({ ...prev, [row.item.id]: next }));
                                    }}
                                    title={tr("Clique para trocar o cofre de destino")}
                                    className={`h-7 px-2 rounded-md border ${theme.borderMain} ${theme.hoverBg} ${theme.textSecondary} text-xs font-medium whitespace-nowrap cursor-pointer inline-flex items-center gap-1`}
                                  >
                                    {tr(VAULT_LABELS[vaultOf(row.item.id)])}
                                    <Repeat className="w-3 h-3 opacity-60" />
                                  </button>
                                )}
                              </td>
                              <td className="py-2.5 pr-5 sm:pr-6 align-top">
                                <span className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${meta.text}`} title={row.reason}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                                {row.status === 'invalid' && <p className={`text-xs ${theme.textMuted}`}>{row.reason}</p>}
                                {weak && <p className={`text-xs ${signal.warnText}`}>{tr("Senha fraca")}</p>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {selected.size > 0 && (
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 border-t ${theme.borderInner} ${theme.bgCardInner}`}>
                    <p className={`text-[13px] ${theme.textSecondary} sm:flex-1`}>
                      {tr("Enviar")} {selected.size === 1 ? tr("o selecionado") : tr("os {p0} selecionados", { p0: selected.size })} {tr("para o cofre:")}
                    </p>
                    <div role="radiogroup" aria-label={tr("Cofre de destino")} className={`flex p-0.5 rounded-lg border ${theme.borderMain}`}>
                      {VAULT_IDS.map(v => {
                        const allHere = [...selected].every(id => vaultOf(id) === v);
                        return (
                          <button
                            key={v}
                            role="radio"
                            aria-checked={allHere}
                            onClick={() => moveSelectedTo(v)}
                            className={`flex-1 sm:flex-none h-8 px-3 rounded-md text-[13px] font-medium cursor-pointer ${
                              allHere ? `${accent.bgBtn} text-white` : `${theme.textSecondary} ${theme.hoverBg}`
                            }`}
                          >
                            {tr(VAULT_LABELS[v])}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={`flex flex-col-reverse sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-t ${theme.borderMain}`}>
                  <p className={`text-[13px] ${theme.textMuted} sm:flex-1`}>
                    {selected.size} {tr("de")} {result.rows.length - counts.invalid} {tr("selecionados")}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleClose} className={`${ghostBtn} flex-1 sm:flex-none justify-center`}>{tr("Cancelar")}</button>
                    <button onClick={handleImport} disabled={selected.size === 0 || isImporting} className={`${primaryBtn} flex-1 sm:flex-none justify-center`}>
                      <FileSpreadsheet className="w-4 h-4" />
                      {isImporting ? tr("Importando…") : tr("Importar {p0} {p1}", { p0: selected.size, p1: selected.size === 1 ? tr("item") : tr("itens") })}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: done */}
            {step === 'done' && (
              <div className="overflow-y-auto px-5 sm:px-6 py-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full ${accent.badgeBg} ${accent.textAccent} flex items-center justify-center shrink-0`}>
                    <Check className="w-5 h-5" />
                  </div>
                  <p className={`text-[15px] ${theme.textPrimary}`}>
                    <strong>{importedCount}</strong> {importedCount === 1 ? tr("item foi adicionado") : tr("itens foram adicionados")} {tr("ao cofre.")}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${theme.borderMain} ${theme.bgCardInner} space-y-2`}>
                  <p className={`flex items-center gap-2 text-sm font-semibold ${signal.warnText}`}>
                    <Trash2 className="w-4 h-4" /> {tr("Apague o arquivo exportado")}
                  </p>
                  <p className={`text-[13px] ${theme.textSecondary}`}>
                    {tr("O arquivo")} <code className="font-mono">{fileName}</code> {tr("tem todas as senhas sem criptografia. Exclua-o da pasta Downloads e esvazie a Lixeira.")}
                  </p>
                  <p className={`text-[13px] ${theme.textMuted}`}>
                    {tr("Se quiser, apague também as senhas salvas no navegador, para que fiquem só no cofre.")}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button onClick={reset} className={`${ghostBtn} justify-center`}>{tr("Importar outro arquivo")}</button>
                  <button
                    onClick={() => {
                      handleClose();
                      onShowItems?.();
                    }}
                    className={`${primaryBtn} justify-center`}
                  >
                    {tr("Ver itens")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
