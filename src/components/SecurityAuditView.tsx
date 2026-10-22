import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Globe,
  Repeat,
} from 'lucide-react';
import { SecurityReport, VaultItem, VaultSettings, ItemCategory } from '../types';
import { calculatePasswordStrength, checkPasswordBreachOnline } from '../lib/crypto';
import { getAccent, getTheme, getSignals } from '../lib/theme';
import { QuickActionsWidget } from './QuickActionsWidget';
import { ItemIcon } from './ItemIcon';
import { Guilloche } from './Guilloche';
import { tr, locale } from '../lib/i18n';

interface SecurityAuditViewProps {
  report: SecurityReport;
  allItems?: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onOpenGenerator: () => void;
  settings?: VaultSettings;
  onSaveSettings?: (newSettings: VaultSettings) => void;
  onOpenAddItem?: (category?: ItemCategory) => void;
  onSelectView?: (view: string) => void;
  onOpenBrowserImport?: () => void;
  onOnlineBreachResults?: (leakedItemIds: string[]) => void;
}

export function formatPasswordAge(timestamp?: number): string {
  if (!timestamp) return tr("Data não registrada");
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = new Date(timestamp).toLocaleDateString(locale());

  if (diffDays === 0) return tr("Criada hoje ({p0})", { p0: dateStr });
  if (diffDays === 1) return tr("Criada ontem ({p0})", { p0: dateStr });
  if (diffDays < 30) return tr("Criada há {p0} dias ({p1})", { p0: diffDays, p1: dateStr });

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return tr("Criada há {p0} {p1} ({p2})", { p0: diffMonths, p1: diffMonths === 1 ? tr("mês") : tr("meses"), p2: dateStr });

  const diffYears = Math.floor(diffDays / 365);
  return tr("Criada há {p0} {p1} ({p2})", { p0: diffYears, p1: diffYears === 1 ? tr("ano") : tr("anos"), p2: dateStr });
}

// Short relative age for dense rows ("hoje", "há 3 meses")
const shortAge = (timestamp?: number): string => {
  if (!timestamp) return '—';
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return tr('hoje');
  if (days === 1) return tr('ontem');
  if (days < 30) return tr("há {p0} dias", { p0: days });
  const months = Math.floor(days / 30);
  if (months < 12) return tr("há {p0} {p1}", { p0: months, p1: months === 1 ? tr("mês") : tr("meses") });
  const years = Math.floor(days / 365);
  return tr("há {p0} {p1}", { p0: years, p1: years === 1 ? tr("ano") : tr("anos") });
};

type IssueKind = 'leaked' | 'weak' | 'reused';

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  report,
  allItems = [],
  onSelectItem,
  onOpenGenerator,
  settings,
  onSaveSettings,
  onOpenAddItem,
  onSelectView,
  onOpenBrowserImport,
  onOnlineBreachResults,
}) => {
  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);
  const signal = getSignals(theme.isLight);

  // Manual HIBP breach scan
  const [isScanningBreaches, setIsScanningBreaches] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [onlineLeakedItems, setOnlineLeakedItems] = useState<VaultItem[]>([]);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);

  const itemsWithPassword = allItems.filter(i => !!i.password);

  const handleRunBreachCheck = async () => {
    if (itemsWithPassword.length === 0) return;
    setIsScanningBreaches(true);
    setScanProgress(0);
    setOnlineLeakedItems([]);
    setScanStatusMsg(null);

    const found: VaultItem[] = [];
    for (let i = 0; i < itemsWithPassword.length; i++) {
      const item = itemsWithPassword[i];
      if (item.password && (await checkPasswordBreachOnline(item.password))) {
        found.push(item);
      }
      setScanProgress(Math.round(((i + 1) / itemsWithPassword.length) * 100));
    }

    setOnlineLeakedItems(found);
    // Lift results to the app so the item list, sidebar score and home also flag them
    if (found.length > 0) onOnlineBreachResults?.(found.map(item => item.id));
    setIsScanningBreaches(false);
    setScanStatusMsg(
      found.length > 0
        ? tr("{p0} {p1} em vazamentos conhecidos.", { p0: found.length, p1: found.length === 1 ? tr("senha apareceu") : tr("senhas apareceram") })
        : tr("Nenhuma senha foi encontrada em vazamentos conhecidos.")
    );
  };

  // One entry per item, keeping its most severe problem
  const issues = useMemo(() => {
    const byId = new Map<string, { item: VaultItem; kind: IssueKind }>();
    const add = (list: VaultItem[] | undefined, kind: IssueKind) =>
      (list || []).forEach(item => {
        if (!byId.has(item.id)) byId.set(item.id, { item, kind });
      });
    add(report.leakedItems, 'leaked');
    add(onlineLeakedItems, 'leaked');
    add(report.weakItems, 'weak');
    add(report.reusedItems, 'reused');
    return [...byId.values()];
  }, [report, onlineLeakedItems]);

  const counts = {
    leaked: issues.filter(i => i.kind === 'leaked').length,
    weak: issues.filter(i => i.kind === 'weak').length,
    reused: issues.filter(i => i.kind === 'reused').length,
  };
  const strongCount = Math.max(0, itemsWithPassword.length - issues.length);
  const total = itemsWithPassword.length;

  const score = report.score;
  const scoreHex = score >= 80 ? signal.safeHex : score >= 50 ? signal.warnHex : signal.dangerHex;
  const verdict =
    total === 0
      ? tr("Adicione logins para que o cofre possa avaliar suas senhas.")
      : issues.length === 0
      ? tr("Todas as senhas estão fortes, únicas e fora de vazamentos conhecidos.")
      : tr("{p0} {p1} de atenção. Comece pelas vazadas.", { p0: issues.length, p1: issues.length === 1 ? tr("senha precisa") : tr("senhas precisam") });

  const KIND_META: Record<IssueKind, { label: string; hint: string; icon: typeof ShieldAlert; text: string; bar: string }> = {
    leaked: { label: tr("Vazada"), hint: tr("Apareceu em vazamento público"), icon: ShieldAlert, text: signal.dangerText, bar: signal.dangerBg },
    weak: { label: tr("Fraca"), hint: tr("Fácil de adivinhar"), icon: AlertTriangle, text: signal.warnText, bar: signal.warnBg },
    reused: { label: tr("Reutilizada"), hint: tr("Usada em mais de uma conta"), icon: Repeat, text: signal.warnText, bar: `${signal.warnBg} opacity-60` },
  };

  const segments = [
    { key: 'strong', label: tr("Fortes"), value: strongCount, bar: signal.safeBg, text: signal.safeText },
    { key: 'leaked', label: tr("Vazadas"), value: counts.leaked, bar: KIND_META.leaked.bar, text: KIND_META.leaked.text },
    { key: 'weak', label: tr("Fracas"), value: counts.weak, bar: KIND_META.weak.bar, text: KIND_META.weak.text },
    { key: 'reused', label: tr("Reutilizadas"), value: counts.reused, bar: KIND_META.reused.bar, text: KIND_META.reused.text },
  ];

  const sectionTitle = `text-[15px] font-semibold ${theme.textPrimary}`;

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* HERO: score seal + verdict + composition */}
      <section className={`${theme.bgCard} border ${theme.borderMain} rounded-2xl p-5 sm:p-7 ${theme.depthShadow}`}>
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 sm:items-center">
          <div className="relative w-32 h-32 shrink-0 self-center sm:self-auto">
            <Guilloche size={128} color={scoreHex} strokeWidth={0.32} className="absolute inset-0 opacity-90" />
            <div className={`absolute inset-[30px] rounded-full ${theme.bgCard} border ${theme.borderMain} flex flex-col items-center justify-center`}>
              <span className={`text-[30px] leading-none font-extrabold tracking-tight tabular-nums ${theme.textPrimary}`}>{total ? score : '—'}</span>
              <span className={`text-[11px] ${theme.textMuted} mt-0.5`}>{tr("de 100")}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textPrimary}`}>{tr("Saúde do cofre")}</h2>
              <p className={`text-sm ${theme.textSecondary} mt-1 max-w-prose`}>{verdict}</p>
            </div>

            {total > 0 && (
              <div className="space-y-2.5">
                <div className={`flex h-2 w-full rounded-full overflow-hidden gap-0.5 ${signal.trackBg}`}>
                  {segments.filter(s => s.value > 0).map(s => (
                    <div key={s.key} className={`${s.bar} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(s.value / total) * 100}%` }} />
                  ))}
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                  {segments.map(s => (
                    <li key={s.key} className={`flex items-center gap-1.5 ${s.value ? theme.textSecondary : theme.textMuted}`}>
                      <span className={`w-2 h-2 rounded-full ${s.bar} ${s.value ? '' : 'opacity-30'}`} />
                      <span className={`font-semibold tabular-nums ${s.value ? s.text : ''}`}>{s.value}</span>
                      {s.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Breach scan */}
        <div className={`mt-6 pt-5 border-t ${theme.borderInner} flex flex-col md:flex-row md:items-center gap-3 md:gap-6`}>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${theme.textPrimary}`}>{tr("Verificar vazamentos na internet")}</p>
            <p className={`text-[13px] ${theme.textMuted} mt-0.5`}>
              {isScanningBreaches
                ? tr("Consultando {p0}%. Apenas os 5 primeiros caracteres do hash saem do dispositivo.", { p0: scanProgress })
                : scanStatusMsg || tr("Compara suas senhas com o Have I Been Pwned. A senha em si nunca é enviada.")}
            </p>
            {isScanningBreaches && (
              <div className={`mt-2 h-1 w-full max-w-md rounded-full overflow-hidden ${signal.trackBg}`}>
                <div className={`h-full ${accent.bgBtn} transition-all duration-300`} style={{ width: `${scanProgress}%` }} />
              </div>
            )}
          </div>
          <button
            onClick={handleRunBreachCheck}
            disabled={isScanningBreaches || itemsWithPassword.length === 0}
            className={`shrink-0 h-9 px-4 rounded-lg border ${theme.borderMain} ${theme.textPrimary} ${theme.hoverBg} text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isScanningBreaches ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isScanningBreaches ? tr("Verificando…") : scanStatusMsg ? tr("Verificar de novo") : tr("Verificar agora")}
          </button>
        </div>
      </section>

      {/* NEEDS ATTENTION */}
      {issues.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <h3 className={sectionTitle}>{tr("Precisam de atenção")}</h3>
            <button onClick={onOpenGenerator} className={`text-[13px] font-medium ${accent.textAccent} hover:underline underline-offset-2 cursor-pointer shrink-0`}>
              {tr("Gerar senha forte")}
            </button>
          </div>
          <ul className={`${theme.bgCard} border ${theme.borderMain} rounded-xl divide-y ${theme.divideInner} overflow-hidden`}>
            {issues.map(({ item, kind }) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelectItem(item)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 ${theme.hoverBg} transition-colors cursor-pointer`}
                  >
                    <ItemIcon item={item} settings={settings} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${theme.textPrimary} truncate`}>{item.title}</p>
                      <p className={`text-[13px] ${theme.textMuted} truncate`}>
                        {item.username || item.email || tr("Sem usuário")}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <p className={`text-[13px] font-medium ${meta.text} flex items-center justify-end gap-1.5`}>
                        <Icon className="w-3.5 h-3.5" /> {meta.label}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>{meta.hint}</p>
                    </div>
                    <Icon className={`sm:hidden w-4 h-4 shrink-0 ${meta.text}`} />
                    <ChevronRight className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {issues.length === 0 && total > 0 && (
        <section className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${theme.borderMain} ${theme.bgCard}`}>
          <ShieldCheck className={`w-5 h-5 shrink-0 ${signal.safeText}`} />
          <p className={`text-sm ${theme.textSecondary}`}>{tr("Nada a corrigir agora. Rode a verificação de vazamentos de vez em quando.")}</p>
        </section>
      )}

      {/* PASSWORD AGE */}
      {total > 0 && (
        <section className="space-y-3">
          <h3 className={sectionTitle}>{tr("Idade das senhas")}</h3>
          <div className={`${theme.bgCard} border ${theme.borderMain} rounded-xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className={`text-xs ${theme.textMuted} border-b ${theme.borderMain}`}>
                  <tr>
                    <th className="text-left font-medium py-2.5 px-4">{tr("Item")}</th>
                    <th className="text-left font-medium py-2.5 px-4 whitespace-nowrap">{tr("Criada")}</th>
                    <th className="text-left font-medium py-2.5 px-4">{tr("Força")}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.divideInner}`}>
                  {[...itemsWithPassword]
                    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                    .map(item => {
                      const str = calculatePasswordStrength(item.password || '');
                      const tone = str.score >= 70 ? signal.safeText : str.score >= 50 ? signal.warnText : signal.dangerText;
                      return (
                        <tr key={item.id} onClick={() => onSelectItem(item)} className={`${theme.hoverBg} cursor-pointer`}>
                          <td className="py-2.5 px-4 max-w-0 w-full">
                            <p className={`font-medium ${theme.textPrimary} truncate`}>{item.title}</p>
                          </td>
                          <td className={`py-2.5 px-4 whitespace-nowrap ${theme.textMuted}`} title={formatPasswordAge(item.createdAt)}>
                            {shortAge(item.createdAt)}
                          </td>
                          <td className={`py-2.5 px-4 whitespace-nowrap font-medium ${tone}`}>{tr(str.label)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SHORTCUTS */}
      <QuickActionsWidget
        settings={settings}
        onSaveSettings={onSaveSettings}
        onOpenGenerator={onOpenGenerator}
        onOpenAddItem={category => onOpenAddItem?.(category)}
        onSelectView={view => onSelectView?.(view)}
        onOpenBrowserImport={onOpenBrowserImport}
      />
    </div>
  );
};
