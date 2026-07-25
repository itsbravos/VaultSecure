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
import { getAccent, getTheme } from '../lib/theme';
import { ItemIcon } from './ItemIcon';

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
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);
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
      case 'login': return 'Login / Email';
      case 'card': return 'Cartão de Crédito';
      case 'note': return 'Nota Segura';
      case 'certificate': return 'Certificado Digital';
      case 'api_key': return 'Chave API / SSH';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Field */}
        <div className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 ${theme.textMuted} absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none`} />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder="Buscar credenciais, logins, notas..."
            className={`w-full pl-10 pr-9 py-2 ${theme.bgInput} border ${theme.borderMain} rounded-xl text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none focus:ring-1 ${accent.ringAccent} ${accent.borderAccent} transition-all font-mono shadow-xs`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Count & View Mode Toggle */}
        <div className={`flex items-center justify-between sm:justify-end gap-3 text-xs ${theme.textMuted} font-mono shrink-0`}>
          <span>Exibindo <strong className={theme.textPrimary}>{items.length}</strong> {items.length === 1 ? 'registro' : 'registros'}</span>
          <div className={`flex items-center gap-1 ${theme.bgCardInner} border ${theme.borderInner} p-1 rounded-lg`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? `${accent.textAccent} font-bold` : `${theme.textMuted} hover:${theme.textPrimary}`
              }`}
              title="Grade de Credenciais"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? `${accent.textAccent} font-bold` : `${theme.textMuted} hover:${theme.textPrimary}`
              }`}
              title="Tabela de Credenciais"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {items.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 ${theme.bgCard} rounded-2xl border ${theme.borderMain} shadow-sm`}>
          <div className={`w-16 h-16 rounded-2xl ${theme.bgCardInner} border ${theme.borderInner} flex items-center justify-center text-cyan-400 shadow-inner`}>
            {searchQuery ? <SearchX className="w-8 h-8 text-amber-400" /> : <Sparkles className="w-8 h-8 text-cyan-400" />}
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className={`text-base font-bold ${theme.textPrimary}`}>
              {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma credencial nesta seção'}
            </h3>
            <p className={`text-xs ${theme.textMuted} font-mono leading-relaxed`}>
              {searchQuery
                ? `Nenhum registro corresponde à busca por "${searchQuery}".`
                : 'Esta categoria do cofre está vazia no momento. Adicione um novo registro para protegê-lo com criptografia AES-GCM.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 font-mono">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange?.('')}
                className={`px-4 py-2 rounded-xl ${accent.badgeBg} ${accent.badgeText} text-xs font-bold border ${accent.borderAccent} cursor-pointer hover:opacity-90 transition-opacity`}
              >
                Limpar busca
              </button>
            ) : (
              onOpenAddItem && (
                <button
                  onClick={onOpenAddItem}
                  className={`px-4 py-2 rounded-xl ${accent.bgBtn} ${accent.bgBtnHover} text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cadastrar Credencial</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {items.map(item => {
            const isPasswordVisible = visiblePasswords[item.id];
            const passStrength = item.password ? calculatePasswordStrength(item.password) : null;
            const badge = getItemBadgeStyle(item.title, item.category);

            const isLeaked = Boolean(
              (item.password && isLocalLeakedPassword(item.password)) ||
              onlineLeakedMap[item.id] ||
              securityReport?.leakedItems?.some(i => i.id === item.id)
            );

            const isWeak = Boolean(
              (item.password && calculatePasswordStrength(item.password).score < 50) ||
              securityReport?.weakItems?.some(i => i.id === item.id)
            );

            const isReused = Boolean(
              securityReport?.reusedItems?.some(i => i.id === item.id)
            );

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group relative ${theme.bgCard} ${theme.hoverBg} border rounded-xl p-4 space-y-3 cursor-pointer transition-all ${theme.depthShadow} ${
                  isLeaked
                    ? 'border-orange-500/80 hover:border-orange-600'
                    : isWeak || isReused
                    ? 'border-amber-500/80 hover:border-amber-600'
                    : `${theme.borderMain}`
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemIcon item={item} settings={settings} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className={`text-sm font-semibold ${theme.textPrimary} truncate group-hover:${accent.textAccent} transition-colors`}>
                          {item.title}
                        </h4>
                        {isLeaked && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[10px] font-mono flex items-center gap-1 font-bold shrink-0 animate-pulse" title="Senha encontrada em vazamentos de dados na internet!">
                            <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Vazada
                          </span>
                        )}
                        {!isLeaked && isWeak && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-mono flex items-center gap-1 font-bold shrink-0" title="Senha fraca identificada pela auditoria">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Fraca
                          </span>
                        )}
                        {!isLeaked && !isWeak && isReused && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-mono flex items-center gap-1 font-bold shrink-0" title="Senha reutilizada em múltiplas contas">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Reutilizada
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${theme.textMuted} truncate font-mono`}>
                        {item.username || item.email || item.cardHolder || getCategoryLabel(item.category)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={e => onToggleFavorite(item.id, e)}
                    className={`${theme.textMuted} hover:text-amber-400 transition-colors p-1`}
                    title={item.favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                  >
                    <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Password / Value Preview Field */}
                {item.category === 'login' && item.password && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className={`${theme.bgCardInner} border ${theme.borderInner} rounded-lg px-3 py-2 flex items-center justify-between text-xs font-mono`}
                  >
                    <span className={`${theme.textPrimary} truncate tracking-widest`}>
                      {isPasswordVisible ? item.password : '••••••••••••••••'}
                    </span>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={e => togglePasswordVisibility(item.id, e)}
                        className={`${theme.textMuted} hover:${theme.textPrimary} p-1`}
                        title={isPasswordVisible ? 'Ocultar' : 'Revelar'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => onCopyText(item.password!, 'Senha')}
                        className={`${accent.textAccent} hover:opacity-80 text-xs font-semibold p-1 transition-colors`}
                        title="Copiar Senha"
                      >
                        {copiedId === item.password ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Immediate Action Security Alert Banner */}
                {isLeaked && (
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between text-xs font-mono text-orange-500">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 animate-pulse" />
                      Senha Vazada na Internet!
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className="px-2 py-0.5 rounded bg-orange-500 text-white font-bold text-[10px] transition-colors hover:bg-orange-600"
                      title="Clique para alterar e resolver este problema"
                    >
                      Alterar Agora
                    </button>
                  </div>
                )}

                {!isLeaked && isWeak && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-500">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      Senha Fraca Identificada
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px] transition-colors hover:bg-amber-600"
                      title="Clique para alterar e fortalecer"
                    >
                      Ação Imediata
                    </button>
                  </div>
                )}

                {/* Credit Card Mask Preview */}
                {item.category === 'card' && item.cardNumber && (
                  <div className={`${theme.bgCardInner} border ${theme.borderInner} rounded-lg px-3 py-2 text-xs font-mono flex items-center justify-between ${theme.textPrimary}`}>
                    <span>{item.cardNumber}</span>
                    <span className={`text-[10px] ${theme.textMuted}`}>{item.cardExpiry}</span>
                  </div>
                )}

                {/* Footer Tags & Strength (UNCLIPPED FULL WRAP / TRUNCATED SAFELY) */}
                <div className={`flex items-center justify-between text-[11px] pt-1 ${theme.textMuted} font-mono gap-2`}>
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-[75%]">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`${theme.bgCardInner} ${theme.textSecondary} px-2 py-0.5 rounded text-[10px] border ${theme.borderInner} truncate max-w-[130px] inline-block`}
                        title={`#${tag}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {passStrength && (
                    <span className={`text-[10px] font-semibold shrink-0 ${passStrength.color.split(' ')[0]}`}>
                      {passStrength.label}
                    </span>
                  )}
                </div>

              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <motion.div layout className={`${theme.bgCard} border ${theme.borderMain} rounded-xl overflow-hidden shadow-sm`}>
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${theme.textSecondary}`}>
              <thead className={`${theme.bgCardInner} ${theme.textMuted} uppercase font-mono text-[10px] tracking-wider border-b ${theme.borderInner}`}>
                <tr>
                  <th className="py-3 px-4">Item / Credencial</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Login / Informação</th>
                  <th className="py-3 px-4">Segurança / Alertas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.borderInner}`}>
                {items.map(item => {
                  const passStrength = item.password ? calculatePasswordStrength(item.password) : null;
                  const badge = getItemBadgeStyle(item.title, item.category);

                  const isLeaked = Boolean(
                    (item.password && isLocalLeakedPassword(item.password)) ||
                    onlineLeakedMap[item.id] ||
                    securityReport?.leakedItems?.some(i => i.id === item.id)
                  );

                  const isWeak = Boolean(
                    (item.password && calculatePasswordStrength(item.password).score < 50) ||
                    securityReport?.weakItems?.some(i => i.id === item.id)
                  );

                  const isReused = Boolean(
                    securityReport?.reusedItems?.some(i => i.id === item.id)
                  );

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className={`${theme.hoverBg} cursor-pointer transition-colors`}
                    >
                      <td className={`py-3 px-4 font-semibold ${theme.textPrimary}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={e => onToggleFavorite(item.id, e)}
                            className={`${theme.textMuted} hover:text-amber-400`}
                          >
                            <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <ItemIcon item={item} settings={settings} size="sm" />
                          <span>{item.title}</span>
                          {isLeaked && (
                            <ShieldAlert className="w-4 h-4 text-orange-500 animate-pulse shrink-0" title="Senha Vazada na Internet" />
                          )}
                          {!isLeaked && (isWeak || isReused) && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title="Alerta de Segurança" />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${theme.bgCardInner} border ${theme.borderInner} text-[11px] font-mono ${theme.textMuted}`}>
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>

                      <td className={`py-3 px-4 font-mono ${theme.textMuted}`}>
                        {item.username || item.email || item.cardHolder || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isLeaked ? (
                            <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[10px] font-mono font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-orange-500" /> Vazada
                            </span>
                          ) : isWeak ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-mono font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" /> Fraca
                            </span>
                          ) : isReused ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-mono font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-yellow-500" /> Reutilizada
                            </span>
                          ) : passStrength ? (
                            <span className={`text-[10px] font-mono font-semibold ${passStrength.color.split(' ')[0]}`}>
                              {passStrength.label} ({passStrength.score}%)
                            </span>
                          ) : (
                            <span className={`text-[10px] ${theme.textMuted} font-mono`}>—</span>
                          )}

                          {(isLeaked || isWeak || isReused) && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onSelectItem(item);
                              }}
                              className="text-[10px] font-mono font-bold text-amber-500 underline hover:text-amber-600"
                            >
                              Ação
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {item.password && (
                            <button
                              onClick={() => onCopyText(item.password!, 'Senha')}
                              className={`${accent.textAccent} hover:opacity-80 text-xs font-semibold p-1`}
                              title="Copiar Senha"
                            >
                              COPIAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
        </>
      )}
    </div>
  );
};

