import React from 'react';
import {
  Layers,
  Star,
  Dices,
  Upload,
  Download,
  FileCheck,
  Settings,
  ShieldCheck,
  ChevronRight,
  Compass,
  Plus,
  Key,
  CreditCard,
  FileText,
  Code2,
  LucideIcon,
} from 'lucide-react';
import { SecurityReport, VaultItem, VaultSettings } from '../types';
import { getAccent, getTheme, getSignals } from '../lib/theme';
import { Guilloche } from './Guilloche';
import { ItemIcon } from './ItemIcon';
import { tr, locale } from '../lib/i18n';

export type AppView = 'home' | 'items' | 'generator' | 'audit' | 'settings' | 'certificates' | 'backup';

interface HomeViewProps {
  settings: VaultSettings;
  items: VaultItem[];
  report: SecurityReport;
  vaultName: string;
  onNavigate: (view: AppView, category?: 'all' | 'favorites') => void;
  onOpenAddItem: () => void;
  onOpenBrowserImport: () => void;
  onOpenProtectionGuide: () => void;
  onStartTour: () => void;
  onSelectItem: (item: VaultItem) => void;
}

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return tr("Boa noite");
  if (h < 12) return tr("Bom dia");
  if (h < 18) return tr("Boa tarde");
  return tr("Boa noite");
};

const shortAge = (t?: number): string => {
  if (!t) return '';
  const d = Math.floor((Date.now() - t) / 86_400_000);
  if (d <= 0) return tr('hoje');
  if (d === 1) return tr('ontem');
  if (d < 30) return tr("há {p0} dias", { p0: d });
  return new Date(t).toLocaleDateString(locale());
};

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  items,
  report,
  vaultName,
  onNavigate,
  onOpenAddItem,
  onOpenBrowserImport,
  onOpenProtectionGuide,
  onStartTour,
  onSelectItem,
}) => {
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);
  const signal = getSignals(theme.isLight);

  const firstName = (settings.userName || '').trim().split(/\s+/)[0];
  const showName = firstName && firstName !== 'Seu';
  const withPassword = items.filter(i => i.password).length;
  // Each password counts once, under its worst problem (same rule as the health page)
  const leakedIds = new Set(report.leakedItems.map(i => i.id));
  const weakIds = new Set(report.weakItems.filter(i => !leakedIds.has(i.id)).map(i => i.id));
  const reusedIds = new Set(report.reusedItems.filter(i => !leakedIds.has(i.id) && !weakIds.has(i.id)).map(i => i.id));
  const worst = { leaked: leakedIds.size, weak: weakIds.size, reused: reusedIds.size };
  const issues = worst.leaked + worst.weak + worst.reused;
  const scoreHex = report.score >= 90 ? signal.safeHex : report.score >= 70 ? signal.warnHex : signal.dangerHex;
  const isEmpty = items.length === 0;

  const counts: { label: string; icon: LucideIcon; n: number }[] = [
    { label: tr("Logins"), icon: Key, n: items.filter(i => i.category === 'login').length },
    { label: tr("Cartões"), icon: CreditCard, n: items.filter(i => i.category === 'card').length },
    { label: tr("Notas"), icon: FileText, n: items.filter(i => i.category === 'note').length },
    { label: tr("Chaves"), icon: Code2, n: items.filter(i => i.category === 'api_key').length },
  ];

  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5);

  const tiles: { id: string; title: string; desc: string; icon: LucideIcon; onClick: () => void; tour?: string }[] = [
    { id: 'items', title: tr("Todos os itens"), desc: tr("{p0} {p1} neste cofre", { p0: items.length, p1: items.length === 1 ? tr("item") : tr("itens") }), icon: Layers, onClick: () => onNavigate('items', 'all') },
    { id: 'fav', title: tr("Favoritos"), desc: tr("O que você usa sempre"), icon: Star, onClick: () => onNavigate('items', 'favorites') },
    { id: 'gen', title: tr("Gerador de senhas"), desc: tr("Senhas aleatórias e fortes"), icon: Dices, onClick: () => onNavigate('generator') },
    { id: 'import', title: tr("Importar do navegador"), desc: tr("Chrome, Edge, Firefox, Safari"), icon: Upload, onClick: onOpenBrowserImport, tour: 'home-import' },
    { id: 'backup', title: tr("Backup"), desc: tr("Exportar ou restaurar"), icon: Download, onClick: () => onNavigate('backup') },
    { id: 'certs', title: tr("Certificados"), desc: tr("Camada extra de acesso"), icon: FileCheck, onClick: () => onNavigate('certificates') },
    { id: 'settings', title: tr("Configurações"), desc: tr("Tema, bloqueio, sincronização"), icon: Settings, onClick: () => onNavigate('settings') },
    { id: 'guide', title: tr("Como sua senha é protegida"), desc: tr("Entenda a criptografia"), icon: ShieldCheck, onClick: onOpenProtectionGuide, tour: 'home-guide' },
  ];

  const card = `${theme.bgCard} border ${theme.borderMain} rounded-2xl`;

  return (
    <div className="max-w-6xl space-y-8 pb-12">
      {/* Greeting */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`text-2xl sm:text-[28px] font-bold tracking-tight ${theme.textPrimary}`}>
            {greeting()}
            {showName ? `, ${firstName}` : ''}
          </h2>
          <p className={`text-sm ${theme.textMuted} mt-1`}>
            {tr("Cofre {name}, {n} {unit}.", { name: vaultName, n: items.length, unit: items.length === 1 ? tr("item") : tr("itens") })}
          </p>
        </div>
        <button
          onClick={onStartTour}
          className={`self-start sm:self-auto h-9 px-3.5 rounded-lg border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer`}
        >
          <Compass className="w-4 h-4" />
          {tr("Fazer o tour")}
        </button>
      </header>

      {/* First steps for an empty vault */}
      {isEmpty && (
        <section className={`${card} p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4`}>
          <div className="min-w-0 flex-1">
            <h3 className={`text-[17px] font-semibold ${theme.textPrimary}`}>{tr("Comece guardando suas senhas")}</h3>
            <p className={`text-sm ${theme.textMuted} mt-1`}>
              {tr("Traga as senhas que já estão no navegador ou adicione a primeira à mão.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenBrowserImport} className={`h-10 px-4 rounded-xl ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer`}>
              <Upload className="w-4 h-4" /> {tr("Importar do navegador")}
            </button>
            <button onClick={onOpenAddItem} className={`h-10 px-4 rounded-xl border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-sm font-medium inline-flex items-center gap-2 cursor-pointer`}>
              <Plus className="w-4 h-4" /> {tr("Adicionar item")}
            </button>
          </div>
        </section>
      )}

      {/* Health + composition */}
      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <button
            data-tour="home-health"
            onClick={() => onNavigate('audit')}
            className={`${card} lg:col-span-3 p-5 flex items-center gap-5 text-left ${theme.hoverBg} transition-colors cursor-pointer group`}
          >
            <div className="relative w-24 h-24 shrink-0">
              <Guilloche size={96} color={scoreHex} strokeWidth={0.35} className="absolute inset-0" />
              <div className={`absolute inset-[22px] rounded-full ${theme.bgCard} border ${theme.borderMain} flex items-center justify-center`}>
                <span className={`text-2xl font-extrabold tabular-nums ${theme.textPrimary}`}>{withPassword ? report.score : '—'}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${theme.textMuted}`}>{tr("Saúde do cofre")}</p>
              <p className={`text-[17px] font-semibold ${theme.textPrimary} mt-0.5`}>
                {withPassword === 0
                  ? tr("Nenhuma senha para avaliar ainda")
                  : issues === 0
                  ? tr("Tudo certo com suas senhas")
                  : tr("{p0} {p1} de atenção", { p0: issues, p1: issues === 1 ? tr("senha precisa") : tr("senhas precisam") })}
              </p>
              <p className={`text-[13px] ${theme.textMuted} mt-1`}>
                {issues === 0
                  ? tr("Nenhuma senha vazada, fraca ou repetida.")
                  : [
                      worst.leaked && tr(worst.leaked > 1 ? '{n} vazadas' : '{n} vazada', { n: worst.leaked }),
                      worst.weak && tr(worst.weak > 1 ? '{n} fracas' : '{n} fraca', { n: worst.weak }),
                      worst.reused && tr(worst.reused > 1 ? '{n} repetidas' : '{n} repetida', { n: worst.reused }),
                    ]
                      .filter(Boolean)
                      .join(', ') + '.'}
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 shrink-0 ${theme.textMuted} group-hover:translate-x-0.5 transition-transform`} />
          </button>

          <div className={`${card} lg:col-span-2 p-5`}>
            <p className={`text-xs font-medium ${theme.textMuted}`}>{tr("Neste cofre")}</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {counts.map(c => (
                <li key={c.label} className="flex items-center gap-2.5 min-w-0">
                  <c.icon className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                  <span className={`text-sm ${theme.textSecondary} truncate`}>{c.label}</span>
                  <span className={`ml-auto text-sm font-semibold tabular-nums ${theme.textPrimary}`}>{c.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Go to */}
      <section className="space-y-3">
        <h3 className={`text-[15px] font-semibold ${theme.textPrimary}`}>{tr("Ir para")}</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
          {tiles.map(t => (
            <button
              key={t.id}
              data-tour={t.tour}
              onClick={t.onClick}
              className={`group flex items-center gap-3 p-3.5 rounded-xl border ${theme.borderMain} ${theme.bgCard} ${theme.hoverBg} text-left transition-colors cursor-pointer min-w-0`}
            >
              <span className={`w-10 h-10 rounded-lg ${theme.bgCardInner} border ${theme.borderInner} ${accent.textAccent} flex items-center justify-center shrink-0`}>
                <t.icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold leading-snug ${theme.textPrimary}`}>{t.title}</span>
                <span className={`block text-xs ${theme.textMuted} line-clamp-2`}>{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent */}
      {recent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h3 className={`text-[15px] font-semibold ${theme.textPrimary}`}>{tr("Alterados recentemente")}</h3>
            <button onClick={() => onNavigate('items', 'all')} className={`text-[13px] font-medium ${accent.textAccent} hover:underline underline-offset-2 cursor-pointer`}>
              {tr("Ver todos")}
            </button>
          </div>
          <ul className={`${card} divide-y ${theme.divideInner} overflow-hidden`}>
            {recent.map(item => (
              <li key={item.id}>
                <button onClick={() => onSelectItem(item)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${theme.hoverBg} cursor-pointer`}>
                  <ItemIcon item={item} settings={settings} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${theme.textPrimary} truncate`}>{item.title}</span>
                    <span className={`block text-xs ${theme.textMuted} truncate`}>{item.username || item.email || item.cardHolder || ''}</span>
                  </span>
                  <span className={`text-xs ${theme.textMuted} shrink-0`}>{shortAge(item.updatedAt)}</span>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${theme.textMuted}`} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
