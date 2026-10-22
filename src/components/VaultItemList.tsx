import React, { useState, useEffect } from 'react';
import {
  Key,
  CreditCard,
  FileText,
  FileCheck,
  Code2,
  Star,
  Copy,
  Check,
  ExternalLink,
  MoreVertical,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  List as ListIcon,
  SearchX,
  Clock,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { VaultItem, ItemCategory, SecurityReport, VaultSettings } from '../types';
import { calculatePasswordStrength, isLocalLeakedPassword, checkPasswordBreachOnline } from '../lib/crypto';
import { getAccent, getTheme, getSignals } from '../lib/theme';
import { ItemIcon } from './ItemIcon';
import { tr } from '../lib/i18n';

interface VaultItemListProps {
  items: VaultItem[];
  securityReport?: SecurityReport;
  onSelectItem: (item: VaultItem) => void;
  onToggleFavorite: (itemId: string, e: React.MouseEvent) => void;
  onCopyText: (text: string, label: string) => void;
  copiedId: string | null;
  settings?: VaultSettings;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenAddItem?: () => void;
  searchInputRef?: React.Ref<HTMLInputElement>;
  onOpenBrowserImport?: () => void;
}

export const VaultItemList: React.FC<VaultItemListProps> = ({
  items,
  securityReport,
  onSelectItem,
  onToggleFavorite,
  onCopyText,
  copiedId,
  settings,
  searchQuery,
  onSearchChange,
  onOpenAddItem,
  searchInputRef,
  onOpenBrowserImport,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);
  const signal = getSignals(theme.isLight);
  const [onlineLeakedMap, setOnlineLeakedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Perform background pwned check for items with passwords
    items.forEach(async item => {
      if (item.password && !onlineLeakedMap[item.id]) {
        const isLeaked = await checkPasswordBreachOnline(item.password);
        if (isLeaked) {
          setOnlineLeakedMap(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [items]);

  const togglePasswordVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getItemBadgeStyle = (title: string, category: ItemCategory) => {
    const letter = title.charAt(0).toUpperCase();
    switch (category) {
      case 'login':
        return { letter, bg: 'bg-blue-900/40 text-blue-400 border border-blue-800/40' };
      case 'card':
        return { letter, bg: 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/40' };
      case 'note':
        return { letter, bg: 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/40' };
      case 'certificate':
        return { letter, bg: 'bg-purple-900/40 text-purple-400 border border-purple-800/40' };
      case 'api_key':
        return { letter, bg: 'bg-orange-900/40 text-orange-400 border border-orange-800/40' };
      default:
        return { letter, bg: 'bg-gray-800 text-gray-300 border border-gray-700' };
    }
  };

  const getCategoryLabel = (category: ItemCategory) => {
    switch (category) {
      case 'login': return tr("Login");
      case 'card': return tr("Cartão");
      case 'note': return tr("Nota segura");
      case 'certificate': return tr("Certificado");
      case 'api_key': return tr("Chave API");
    }
  };

  const getIssue = (item: VaultItem) => {
    const isLeaked = Boolean(
      (item.password && isLocalLeakedPassword(item.password)) ||
      onlineLeakedMap[item.id] ||
      securityReport?.leakedItems?.some(i => i.id === item.id)
    );
    if (isLeaked) return { kind: 'leaked' as const, label: tr("Vazada"), hint: tr("Esta senha apareceu em vazamentos públicos. Troque-a."), icon: ShieldAlert, tone: signal.dangerText, edge: signal.dangerBg };

    const isWeak = Boolean(
      (item.password && calculatePasswordStrength(item.password).score < 50) ||
      securityReport?.weakItems?.some(i => i.id === item.id)
    );
    if (isWeak) return { kind: 'weak' as const, label: tr("Fraca"), hint: tr("Senha fácil de adivinhar. Gere uma mais forte."), icon: AlertTriangle, tone: signal.warnText, edge: signal.warnBg };

    if (securityReport?.reusedItems?.some(i => i.id === item.id)) {
      return { kind: 'reused' as const, label: tr("Reutilizada"), hint: tr("Mesma senha usada em outra conta."), icon: AlertTriangle, tone: signal.warnText, edge: signal.warnBg };
    }
    return null;
  };

  // Four engraved ticks; filled count follows the strength score
  const StrengthMeter = ({ score }: { score: number }) => {
    const filled = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
    const color = filled >= 3 ? signal.safeBg : filled === 2 ? signal.warnBg : signal.dangerBg;
    return (
      <span className="inline-flex gap-0.5" title={tr("Força: {p0}%", { p0: score })}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`w-3 h-1 rounded-full ${i < filled ? color : signal.trackBg}`} />
        ))}
      </span>
    );
  };

  const subtitleOf = (item: VaultItem) => item.username || item.email || item.cardHolder || getCategoryLabel(item.category);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className={`w-4 h-4 ${theme.textMuted} absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none`} />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery || ''}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={tr("Buscar por nome, usuário, site ou tag")}
            aria-label={tr("Buscar itens")}
            className={`w-full h-10 pl-10 pr-9 ${theme.bgInput} ${theme.inputDepth} rounded-lg text-sm ${theme.textPrimary} placeholder:opacity-60 focus:outline-none focus:ring-2 ${accent.ringAccent} transition`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md ${theme.textMuted} ${theme.hoverBg} cursor-pointer`}
              title={tr("Limpar busca")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className={`flex items-center justify-between sm:justify-end gap-3 text-[13px] ${theme.textMuted} sm:ml-auto`}>
          <span className="tabular-nums">
            {items.length} {items.length === 1 ? tr("item") : tr("itens")}
          </span>
          <div className={`flex items-center border ${theme.borderMain} rounded-lg p-0.5`}>
            {([['grid', LayoutGrid, 'Cartões'], ['table', ListIcon, 'Tabela']] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === mode ? `${theme.isLight ? 'bg-[#0E1F24]/[0.07]' : 'bg-[#183238]'} ${theme.textPrimary}` : `${theme.textMuted} ${theme.hoverBg}`
                }`}
                title={tr(label)}
                aria-pressed={viewMode === mode}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {items.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed ${theme.borderMain}`}>
          <div className={`w-12 h-12 rounded-full border ${theme.borderMain} flex items-center justify-center ${theme.textMuted} mb-4`}>
            {searchQuery ? <SearchX className="w-5 h-5" /> : <Key className="w-5 h-5" />}
          </div>
          <h3 className={`text-base font-semibold ${theme.textPrimary}`}>
            {searchQuery ? tr("Nada encontrado para \"{p0}\"", { p0: searchQuery }) : tr("Nenhum item aqui ainda")}
          </h3>
          <p className={`text-sm ${theme.textMuted} mt-1 max-w-sm`}>
            {searchQuery
              ? tr("Tente outro termo ou limpe a busca para ver todos os itens.")
              : tr("Adicione um login, cartão ou nota. Ele será criptografado antes de ser salvo.")}
          </p>
          <div className="mt-5">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange?.('')}
                className={`h-9 px-4 rounded-lg border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-[13px] font-medium cursor-pointer`}
              >
                {tr("Limpar busca")}
              </button>
            ) : (
              onOpenAddItem && (
                <div className="flex flex-wrap justify-center gap-2">
                {onOpenBrowserImport && (
                  <button
                    onClick={onOpenBrowserImport}
                    className={`h-9 px-4 rounded-lg border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-[13px] font-medium cursor-pointer`}
                  >
                    {tr("Importar do navegador")}
                  </button>
                )}
                <button
                  onClick={onOpenAddItem}
                  className={`h-9 px-4 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-[13px] font-semibold cursor-pointer`}
                >
                  {tr("Adicionar item")}
                </button>
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map(item => {
            const isPasswordVisible = visiblePasswords[item.id];
            const passStrength = item.password ? calculatePasswordStrength(item.password) : null;
            const issue = getIssue(item);
            const IssueIcon = issue?.icon;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group relative overflow-hidden ${theme.bgCard} border ${theme.borderMain} rounded-xl p-4 cursor-pointer transition-colors ${theme.isLight ? 'hover:border-[#0E1F24]/25' : 'hover:border-[#3D5F65]'} ${theme.depthShadow}`}
              >
                {issue && <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${issue.edge}`} />}

                {/* Header Row */}
                <div className="flex items-start gap-3">
                  <ItemIcon item={item} settings={settings} size="md" />
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-[15px] leading-snug font-semibold ${theme.textPrimary} line-clamp-2`} title={item.title}>{item.title}</h4>
                    <p className={`text-[13px] ${theme.textMuted} truncate`}>{subtitleOf(item)}</p>
                  </div>
                  <button
                    onClick={e => onToggleFavorite(item.id, e)}
                    className={`p-1 -m-1 rounded-md transition-colors cursor-pointer ${
                      item.favorite ? 'text-[#C9A54C]' : `${theme.textMuted} opacity-0 group-hover:opacity-100 focus:opacity-100`
                    }`}
                    title={item.favorite ? tr("Remover dos favoritos") : tr("Adicionar aos favoritos")}
                  >
                    <Star className={`w-4 h-4 ${item.favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Secret preview */}
                {item.category === 'login' && item.password && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className={`mt-3.5 ${theme.bgCardInner} border ${theme.borderInner} rounded-lg pl-3 pr-1 h-9 flex items-center justify-between font-mono text-[13px]`}
                  >
                    <span className={`${theme.textSecondary} truncate ${isPasswordVisible ? '' : 'tracking-[0.2em]'}`}>
                      {isPasswordVisible ? item.password : '••••••••••••'}
                    </span>
                    <div className="flex items-center shrink-0">
                      <button
                        onClick={e => togglePasswordVisibility(item.id, e)}
                        className={`${theme.textMuted} ${theme.hoverBg} p-1.5 rounded-md cursor-pointer`}
                        title={isPasswordVisible ? tr("Ocultar senha") : tr("Mostrar senha")}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onCopyText(item.password!, 'Senha')}
                        className={`${copiedId === item.password ? accent.textAccent : theme.textMuted} ${theme.hoverBg} p-1.5 rounded-md cursor-pointer`}
                        title={tr("Copiar senha")}
                      >
                        {copiedId === item.password ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {item.category === 'card' && item.cardNumber && (
                  <div className={`mt-3.5 ${theme.bgCardInner} border ${theme.borderInner} rounded-lg px-3 h-9 font-mono text-[13px] flex items-center justify-between ${theme.textSecondary}`}>
                    <span>{item.cardNumber}</span>
                    <span className={theme.textMuted}>{item.cardExpiry}</span>
                  </div>
                )}

                {/* Footer: issue or tags + strength */}
                <div className="mt-3.5 flex items-center justify-between gap-3 text-xs min-h-[20px]">
                  {issue && IssueIcon ? (
                    <span className={`flex items-center gap-1.5 font-medium ${issue.tone}`} title={issue.hint}>
                      <IssueIcon className="w-3.5 h-3.5 shrink-0" />
                      {tr("Senha")} {issue.label.toLowerCase()}
                    </span>
                  ) : (
                    <span className={`${theme.textMuted} truncate`}>
                      {item.tags.length > 0 ? item.tags.join(', ') : getCategoryLabel(item.category)}
                    </span>
                  )}
                  {passStrength && <StrengthMeter score={passStrength.score} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className={`${theme.bgCard} border ${theme.borderMain} rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-[13px] ${theme.textSecondary}`}>
              <thead className={`${theme.textMuted} text-xs border-b ${theme.borderMain}`}>
                <tr>
                  <th className="py-2.5 px-4 font-medium">{tr("Nome")}</th>
                  <th className="py-2.5 px-4 font-medium">{tr("Tipo")}</th>
                  <th className="py-2.5 px-4 font-medium">{tr("Usuário")}</th>
                  <th className="py-2.5 px-4 font-medium">{tr("Segurança")}</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.divideInner}`}>
                {items.map(item => {
                  const passStrength = item.password ? calculatePasswordStrength(item.password) : null;
                  const issue = getIssue(item);
                  const IssueIcon = issue?.icon;

                  return (
                    <tr key={item.id} onClick={() => onSelectItem(item)} className={`${theme.hoverBg} cursor-pointer transition-colors`}>
                      <td className={`py-2.5 px-4 font-medium ${theme.textPrimary}`}>
                        <div className="flex items-center gap-3">
                          <ItemIcon item={item} settings={settings} size="sm" />
                          <span className="truncate">{item.title}</span>
                          {item.favorite && <Star className="w-3.5 h-3.5 text-[#C9A54C] fill-current shrink-0" />}
                        </div>
                      </td>
                      <td className={`py-2.5 px-4 ${theme.textMuted}`}>{getCategoryLabel(item.category)}</td>
                      <td className={`py-2.5 px-4 ${theme.textMuted} truncate max-w-[220px]`}>{item.username || item.email || item.cardHolder || '—'}</td>
                      <td className="py-2.5 px-4">
                        {issue && IssueIcon ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${issue.tone}`} title={issue.hint}>
                            <IssueIcon className="w-3.5 h-3.5" /> {issue.label}
                          </span>
                        ) : passStrength ? (
                          <StrengthMeter score={passStrength.score} />
                        ) : (
                          <span className={theme.textMuted}>—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        {item.password && (
                          <button
                            onClick={() => onCopyText(item.password!, 'Senha')}
                            className={`${theme.textMuted} ${theme.hoverBg} p-1.5 rounded-md cursor-pointer`}
                            title={tr("Copiar senha")}
                          >
                            {copiedId === item.password ? <Check className={`w-3.5 h-3.5 ${accent.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
