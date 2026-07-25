import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  CreditCard,
  FileText,
  Zap,
  ShieldAlert,
  FileCheck,
  Download,
  Plus,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { VaultSettings, ItemCategory } from '../types';
import { getAccent, getTheme } from '../lib/theme';

export interface QuickActionDef {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  category?: ItemCategory;
  view?: string;
  actionType: 'generator' | 'add_item' | 'autofill' | 'view';
}

export const ALL_QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: 'generate_pass',
    title: 'Gerar Senha Forte',
    description: 'Criar senha aleatória com alta entropia',
    badge: 'Instantâneo',
    icon: Sparkles,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    actionType: 'generator',
  },
  {
    id: 'add_login',
    title: 'Novo Login',
    description: 'Cadastrar e-mail, usuário e senha',
    badge: 'Mais Usado',
    icon: Key,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    category: 'login',
    actionType: 'add_item',
  },
  {
    id: 'add_card',
    title: 'Novo Cartão',
    description: 'Guardar número, validade e CVC',
    badge: 'PCI Compliance',
    icon: CreditCard,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    category: 'card',
    actionType: 'add_item',
  },
  {
    id: 'add_note',
    title: 'Nova Nota Segura',
    description: 'Anotação criptografada confidencial',
    badge: 'Zero-Knowledge',
    icon: FileText,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    category: 'note',
    actionType: 'add_item',
  },
  {
    id: 'autofill_sim',
    title: 'Simulador Auto-Fill',
    description: 'Testar detecção em formulários web',
    badge: 'Alt+Shift+A',
    icon: Zap,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    actionType: 'autofill',
  },
  {
    id: 'audit_view',
    title: 'Verificar Vulnerabilidades',
    description: 'Auditar senhas fracas e vazamentos',
    badge: 'Diagnóstico',
    icon: ShieldAlert,
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    view: 'audit',
    actionType: 'view',
  },
  {
    id: 'cert_view',
    title: 'Certificados PKI',
    description: 'Chaves X.509 e assinaturas digitais',
    badge: 'Segurança',
    icon: FileCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    view: 'certificates',
    actionType: 'view',
  },
  {
    id: 'backup_view',
    title: 'Backup do Cofre',
    description: 'Exportar arquivo .vault ou JSON',
    badge: 'Exportação',
    icon: Download,
    colorClass: 'text-teal-500',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/30',
    view: 'backup',
    actionType: 'view',
  },
];

interface QuickActionsWidgetProps {
  settings?: VaultSettings;
  onSaveSettings?: (newSettings: VaultSettings) => void;
  onOpenGenerator: () => void;
  onOpenAddItem: (category?: ItemCategory) => void;
  onOpenAutoFillModal: () => void;
  onSelectView: (view: string) => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  settings,
  onSaveSettings,
  onOpenGenerator,
  onOpenAddItem,
  onOpenAutoFillModal,
  onSelectView,
}) => {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  const activeIds = settings?.quickActionIds || [
    'generate_pass',
    'add_login',
    'add_card',
    'autofill_sim',
    'audit_view',
    'backup_view',
  ];

  const visibleActions = ALL_QUICK_ACTIONS.filter(act => activeIds.includes(act.id));

  const toggleAction = (id: string) => {
    if (!onSaveSettings || !settings) return;
    const current = settings.quickActionIds || ALL_QUICK_ACTIONS.map(a => a.id);
    let updated: string[];
    if (current.includes(id)) {
      if (current.length <= 1) return; // keep at least 1
      updated = current.filter(x => x !== id);
    } else {
      updated = [...current, id];
    }
    onSaveSettings({ ...settings, quickActionIds: updated });
  };

  const handleActionClick = (act: QuickActionDef) => {
    switch (act.actionType) {
      case 'generator':
        onOpenGenerator();
        break;
      case 'add_item':
        onOpenAddItem(act.category);
        break;
      case 'autofill':
        onOpenAutoFillModal();
        break;
      case 'view':
        if (act.view) onSelectView(act.view);
        break;
    }
  };

  return (
    <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-4 ${theme.depthShadow} transition-colors`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${accent.bgBtn} text-white flex items-center justify-center ${accent.shadowAccent} shrink-0`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${theme.textPrimary} tracking-tight`}>Ações Rápidas & Atalhos</h3>
            <p className={`text-[11px] ${theme.textMuted} font-mono`}>Navegação rápida para operações diárias</p>
          </div>
        </div>

        <button
          onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold ${theme.bgCardInner} border ${theme.borderInner} ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
          title="Personalizar quais atalhos aparecem no Dashboard"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Personalizar</span>
        </button>
      </div>

      {/* CUSTOMIZE MODAL / COLLAPSIBLE */}
      {isCustomizeOpen && (
        <div className={`p-4 ${theme.bgCardInner} border ${theme.borderInner} rounded-xl space-y-3 animate-fade-in font-mono`}>
          <div className="flex items-center justify-between border-b border-gray-800/40 pb-2">
            <span className={`text-xs font-bold ${theme.textPrimary}`}>Selecione os atalhos ativos:</span>
            <button
              onClick={() => setIsCustomizeOpen(false)}
              className={`text-xs ${theme.textMuted} hover:${theme.textPrimary}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_QUICK_ACTIONS.map(act => {
              const isChecked = activeIds.includes(act.id);
              return (
                <button
                  key={act.id}
                  onClick={() => toggleAction(act.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                    isChecked
                      ? `${accent.badgeBg} ${accent.badgeText} ${accent.borderAccent} font-bold`
                      : `${theme.bgInput} ${theme.textMuted} ${theme.borderMain}`
                  }`}
                >
                  <span className="truncate pr-1">{act.title}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                    isChecked ? `${accent.bgBtn} border-transparent text-white` : 'border-gray-600'
                  }`}>
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK ACTION BUTTONS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {visibleActions.map(act => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => handleActionClick(act)}
              className={`group p-3.5 rounded-xl border ${theme.bgCardInner} ${theme.borderInner} hover:${theme.borderMain} transition-all duration-200 hover:scale-[1.03] text-left flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg ${act.bgClass} ${act.colorClass} border ${act.borderClass} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${theme.bgInput} ${theme.textMuted} border ${theme.borderMain}`}>
                  {act.badge}
                </span>
              </div>

              <div>
                <h4 className={`text-xs font-bold ${theme.textPrimary} group-hover:${accent.textAccent} transition-colors truncate`}>
                  {act.title}
                </h4>
                <p className={`text-[10px] ${theme.textMuted} font-mono line-clamp-2 mt-0.5 leading-tight`}>
                  {act.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
