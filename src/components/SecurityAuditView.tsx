import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Key,
  ArrowRight,
  Sparkles,
  PieChart as PieChartIcon,
  Calendar,
  Globe,
  Search,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { SecurityReport, VaultItem, VaultSettings, ItemCategory } from '../types';
import { calculatePasswordStrength, checkPasswordBreachOnline } from '../lib/crypto';
import { getAccent, getTheme } from '../lib/theme';
import { QuickActionsWidget } from './QuickActionsWidget';

interface SecurityAuditViewProps {
  report: SecurityReport;
  allItems?: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onOpenGenerator: () => void;
  settings?: VaultSettings;
  onSaveSettings?: (newSettings: VaultSettings) => void;
  onOpenAddItem?: (category?: ItemCategory) => void;
  onOpenAutoFillModal?: () => void;
  onSelectView?: (view: string) => void;
  onOnlineBreachResults?: (leakedItemIds: string[]) => void;
}

export function formatPasswordAge(timestamp?: number): string {
  if (!timestamp) return 'Data não registrada';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = new Date(timestamp).toLocaleDateString('pt-BR');

  if (diffDays === 0) return `Criada hoje (${dateStr})`;
  if (diffDays === 1) return `Criada ontem (${dateStr})`;
  if (diffDays < 30) return `Criada há ${diffDays} dias (${dateStr})`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return `Criada há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} (${dateStr})`;

  const diffYears = Math.floor(diffDays / 365);
  return `Criada há ${diffYears} ${diffYears === 1 ? 'ano' : 'anos'} (${dateStr})`;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  report,
  allItems = [],
  onSelectItem,
  onOpenGenerator,
  settings,
  onSaveSettings,
  onOpenAddItem,
  onOpenAutoFillModal,
  onSelectView,
  onOnlineBreachResults,
}) => {
  const accent = getAccent(settings?.accentColor);
  const theme = getTheme(settings?.theme);

  // Manual HIBP Breach Scanner State
  const [isScanningBreaches, setIsScanningBreaches] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);

  const handleRunBreachCheck = async () => {
    if (itemsWithPassword.length === 0) return;
    setIsScanningBreaches(true);
    setScanProgress(0);
    setScanStatusMsg('Iniciando verificação k-Anonymity (Zero-Knowledge)...');

    const found: VaultItem[] = [];
    for (let i = 0; i < itemsWithPassword.length; i++) {
      const item = itemsWithPassword[i];
      if (item.password) {
        const isLeaked = await checkPasswordBreachOnline(item.password);
        if (isLeaked) {
          found.push(item);
        }
      }
      setScanProgress(Math.round(((i + 1) / itemsWithPassword.length) * 100));
    }

    setIsScanningBreaches(false);
    setScanStatusMsg(
      found.length > 0
        ? `Varredura concluída! ${found.length} senha(s) encontrada(s) em vazamentos conhecidos.`
        : 'Varredura concluída! Nenhuma das suas senhas foi encontrada na base de vazamentos.'
    );

    if (found.length > 0) {
      onOnlineBreachResults?.(found.map(item => item.id));
    }
  };

  // Calculate Strong Count (items that are logins/items with password that are not weak, reused or leaked)
  const itemsWithPassword = allItems.filter(i => !!i.password);
  const totalPasswords = itemsWithPassword.length || report.total || 0;

  const weakIds = new Set(report.weakItems.map(i => i.id));
  const reusedIds = new Set(report.reusedItems.map(i => i.id));
  const leakedIds = new Set((report.leakedItems || []).map(i => i.id));

  const strongItems = itemsWithPassword.filter(
    i => !weakIds.has(i.id) && !reusedIds.has(i.id) && !leakedIds.has(i.id)
  );

  const strongCount = strongItems.length;
  const weakCount = report.weakCount;
  const reusedCount = report.reusedCount;
  const leakedCount = report.leakedCount || 0;

  // Recharts Pie Chart Data
  const pieData = [
    { name: 'Senhas Fortes', value: strongCount, color: '#10B981' },
    { name: 'Senhas Fracas', value: weakCount, color: '#EF4444' },
    { name: 'Reutilizadas', value: reusedCount, color: '#F59E0B' },
    { name: 'Vazadas na Web', value: leakedCount, color: '#F97316' },
  ].filter(d => d.value > 0);

  // If no items, show default placeholder pie chart
  const emptyPieData = [
    { name: 'Nenhuma Senha Registrada', value: 1, color: '#374151' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner & Pie Chart Section */}
      <div
        className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-5 md:p-6 ${theme.depthShadow} relative overflow-hidden transition-colors`}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Header Info */}
          <div className="space-y-3 text-center lg:text-left max-w-xl">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold ${theme.bgCardInner} border ${theme.borderInner} ${theme.textMuted} flex items-center gap-1.5`}>
                <PieChartIcon className="w-3.5 h-3.5" /> Saúde do Cofre
              </span>
            </div>

            <h2 className={`text-lg md:text-xl font-bold tracking-tight ${theme.textPrimary}`}>
              Criptoanálise & Auditoria de Integridade
            </h2>
            <p className={`text-xs ${theme.textMuted} font-mono leading-relaxed`}>
              Monitoramento da entropia das senhas, duplicações de credenciais e verificação Zero-Knowledge de vazamentos na web.
            </p>

            {/* Structured Mini-Cards Badges */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className={`p-2.5 rounded-xl border ${theme.borderInner} ${theme.bgCardInner} flex items-center gap-2.5`}>
                <div className={`w-8 h-8 rounded-lg ${theme.bgInput} border ${theme.borderInner} flex items-center justify-center text-slate-400 shrink-0`}>
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold ${theme.textMuted}`}>Total Registros</p>
                  <p className={`text-sm font-bold ${theme.textPrimary}`}>{totalPasswords}</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400/80">Senhas Fortes</p>
                  <p className="text-sm font-bold text-emerald-400">{strongCount}</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-red-400/80">Vulnerabilidades</p>
                  <p className="text-sm font-bold text-red-400">{weakCount + reusedCount + leakedCount}</p>
                </div>
              </div>
            </div>

            {/* Action & k-Anonymity Scan Progress Bar */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleRunBreachCheck}
                disabled={isScanningBreaches || itemsWithPassword.length === 0}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl ${accent.bgBtn} ${accent.bgBtnHover} text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50`}
              >
                {isScanningBreaches ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando HIBP ({scanProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Checar Vazamentos Global (k-Anonymity)</span>
                  </>
                )}
              </button>

              {/* Animated Progress Bar when scanning */}
              {isScanningBreaches && (
                <div className="space-y-1.5 font-mono pt-1">
                  <div className={`w-full h-2 rounded-full ${theme.bgInput} overflow-hidden border ${theme.borderInner}`}>
                    <div
                      className={`h-full ${accent.bgBtn} transition-all duration-300 rounded-full`}
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className={`text-[10px] ${theme.textMuted} flex items-center justify-between`}>
                    <span>Consultando prefixos SHA-1 k-Anonymity sem expor senhas...</span>
                    <span>{scanProgress}%</span>
                  </p>
                </div>
              )}
            </div>

            {scanStatusMsg && !isScanningBreaches && (
              <div className={`mt-2 p-3 rounded-xl border ${theme.borderInner} ${theme.bgCardInner} text-xs font-mono flex items-center gap-2.5`}>
                <ShieldAlert className={`w-4 h-4 ${accent.textAccent} shrink-0`} />
                <span className={theme.textPrimary}>{scanStatusMsg}</span>
              </div>
            )}
          </div>

          {/* Pie Chart Widget */}
          <div className={`w-full lg:w-80 flex flex-col items-center justify-center shrink-0 ${theme.bgCardInner} p-4 rounded-xl border ${theme.borderInner} shadow-inner`}>
            <p className={`text-[11px] font-mono font-bold uppercase ${theme.textMuted} mb-1 flex items-center gap-1.5`}>
              <PieChartIcon className={`w-3.5 h-3.5 ${accent.textAccent}`} /> Distribuição de Saúde
            </p>
            <div className="w-full h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1, color: theme.isLight ? '#CBD5E1' : '#374151' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {(pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1, color: theme.isLight ? '#CBD5E1' : '#374151' }]).map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.isLight ? '#FFFFFF' : '#0F0F0F',
                      borderColor: theme.isLight ? '#CBD5E1' : '#374151',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: theme.isLight ? '#0F172A' : '#FFFFFF',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    wrapperStyle={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      color: theme.isLight ? '#475569' : '#9CA3AF',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS WIDGET */}
      <QuickActionsWidget
        settings={settings}
        onSaveSettings={onSaveSettings}
        onOpenGenerator={onOpenGenerator}
        onOpenAddItem={category => onOpenAddItem?.(category)}
        onOpenAutoFillModal={() => onOpenAutoFillModal?.()}
        onSelectView={view => onSelectView?.(view)}
      />

      {/* Metrics Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`${theme.bgCard} ${theme.borderMain} border p-4 rounded-xl space-y-2 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center justify-between text-xs ${theme.textMuted} font-mono`}>
            <span>Senhas Fortes</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-500">
            {strongCount}
          </p>
          <p className={`text-[11px] ${theme.textMuted} font-mono`}>
            Alta entropia criptográfica
          </p>
        </div>

        <div
          className={`${theme.bgCard} ${theme.borderMain} border p-4 rounded-xl space-y-2 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center justify-between text-xs ${theme.textMuted} font-mono`}>
            <span>Senhas Fracas</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-500">
            {report.weakCount}
          </p>
          <p className={`text-[11px] ${theme.textMuted} font-mono`}>
            Abaixo de 50 bits de entropia
          </p>
        </div>

        <div
          className={`${theme.bgCard} ${theme.borderMain} border p-4 rounded-xl space-y-2 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center justify-between text-xs ${theme.textMuted} font-mono`}>
            <span>Reutilizadas</span>
            <RefreshCw className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-500">
            {report.reusedCount}
          </p>
          <p className={`text-[11px] ${theme.textMuted} font-mono`}>
            Usadas em 2+ serviços
          </p>
        </div>

        <div
          className={`${theme.bgCard} ${theme.borderMain} border p-4 rounded-xl space-y-2 ${theme.depthShadow} transition-colors`}
        >
          <div className={`flex items-center justify-between text-xs ${theme.textMuted} font-mono`}>
            <span>Vazadas na Web</span>
            <ShieldAlert className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-orange-500">
            {report.leakedCount || 0}
          </p>
          <p className={`text-[11px] ${theme.textMuted} font-mono`}>
            Presentes em vazamentos
          </p>
        </div>
      </div>

      {/* LEAKED PASSWORDS SECTION */}
      {report.leakedItems && report.leakedItems.length > 0 && (
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 shadow-xl transition-colors`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" /> Senhas
              Vazadas na Internet ({report.leakedItems.length})
            </h3>
            <button
              onClick={onOpenGenerator}
              className={`${accent.textAccent} hover:underline flex items-center gap-1 font-mono font-semibold text-xs`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Gerar Novas
            </button>
          </div>

          <div className="space-y-2">
            {report.leakedItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`${theme.bgCardInner} p-3.5 rounded-xl border border-orange-500/30 hover:border-orange-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors shadow-inner`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/30 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${theme.textPrimary}`}>
                      {item.title}
                    </h4>
                    <p className={`text-[11px] ${theme.textMuted} font-mono`}>
                      {item.username || item.email || 'Sem usuário'}
                    </p>
                    <p className={`text-[10px] ${theme.textMuted} font-mono flex items-center gap-1 mt-0.5`}>
                      <Clock className={`w-3 h-3 ${theme.textMuted}`} />
                      <span>{formatPasswordAge(item.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[10px] text-orange-500 font-mono bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/30 font-semibold">
                    Vazado na Web
                  </span>
                  <ArrowRight className={`w-4 h-4 ${theme.textMuted}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEAK PASSWORDS SECTION */}
      {report.weakItems.length > 0 && (
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 shadow-xl transition-colors`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Senhas Fracas ou Vulneráveis ({report.weakItems.length})
            </h3>
            <button
              onClick={onOpenGenerator}
              className={`${accent.textAccent} hover:underline flex items-center gap-1 font-mono font-semibold text-xs`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Gerar Novas
            </button>
          </div>

          <div className="space-y-2">
            {report.weakItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`${theme.bgCardInner} p-3.5 rounded-xl border ${theme.borderInner} hover:border-red-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors shadow-inner`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/30 shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${theme.textPrimary}`}>
                      {item.title}
                    </h4>
                    <p className={`text-[11px] ${theme.textMuted} font-mono`}>
                      {item.username || item.email || 'Sem usuário'}
                    </p>
                    <p className={`text-[10px] ${theme.textMuted} font-mono flex items-center gap-1 mt-0.5`}>
                      <Clock className={`w-3 h-3 ${theme.textMuted}`} />
                      <span>{formatPasswordAge(item.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[10px] text-red-500 font-mono bg-red-500/10 px-2.5 py-1 rounded border border-red-500/30 font-semibold">
                    Senha Fraca
                  </span>
                  <ArrowRight className={`w-4 h-4 ${theme.textMuted}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REUSED PASSWORDS SECTION */}
      {report.reusedItems.length > 0 && (
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 shadow-xl transition-colors`}>
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Senhas Reutilizadas ({report.reusedItems.length})
          </h3>

          <div className="space-y-2">
            {report.reusedItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`${theme.bgCardInner} p-3.5 rounded-xl border ${theme.borderInner} hover:border-amber-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors shadow-inner`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${theme.textPrimary}`}>
                      {item.title}
                    </h4>
                    <p className={`text-[11px] ${theme.textMuted} font-mono`}>
                      {item.username || item.email || 'Sem usuário'}
                    </p>
                    <p className={`text-[10px] ${theme.textMuted} font-mono flex items-center gap-1 mt-0.5`}>
                      <Clock className={`w-3 h-3 ${theme.textMuted}`} />
                      <span>{formatPasswordAge(item.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 font-semibold">
                    Reutilizada
                  </span>
                  <ArrowRight className={`w-4 h-4 ${theme.textMuted}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL REGISTERED PASSWORDS AGE DIRECTORY */}
      {itemsWithPassword.length > 0 && (
        <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 shadow-xl transition-colors`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${theme.textPrimary} flex items-center gap-2`}>
              <Calendar className={`w-4 h-4 ${accent.textAccent}`} /> Histórico de Criação & Idade das Senhas ({itemsWithPassword.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {itemsWithPassword.map(item => {
              const str = calculatePasswordStrength(item.password || '');
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`${theme.bgCardInner} p-3.5 rounded-xl border ${theme.borderInner} ${theme.hoverBg} flex items-center justify-between cursor-pointer transition-colors shadow-inner`}
                >
                  <div className="space-y-1">
                    <h4 className={`text-xs font-semibold ${theme.textPrimary}`}>
                      {item.title}
                    </h4>
                    <p className={`text-[11px] ${theme.textMuted} font-mono`}>
                      {item.username || item.email || 'Sem login'}
                    </p>
                    <div className={`flex items-center gap-1 text-[10px] ${accent.textAccent} font-mono pt-1`}>
                      <Clock className={`w-3 h-3 ${accent.textAccent}`} />
                      <span>{formatPasswordAge(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        str.label === 'Forte' || str.label === 'Excelente'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : str.label === 'Média'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-red-500/10 text-red-500 border-red-500/30'
                      }`}
                    >
                      {str.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PERFECT STATUS EMPTY */}
      {report.weakItems.length === 0 &&
        report.reusedItems.length === 0 &&
        (!report.leakedItems || report.leakedItems.length === 0) && (
          <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-8 text-center space-y-3 shadow-xl transition-colors`}>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${theme.textPrimary}`}>
              Seu Cofre está Protegido!
            </h3>
            <p className={`text-xs ${theme.textMuted} max-w-sm mx-auto font-mono`}>
              Não encontramos senhas vulneráveis, repetidas ou vazadas nos seus registros.
            </p>
          </div>
        )}
    </div>
  );
};
