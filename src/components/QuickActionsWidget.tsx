import React, { useState } from 'react';
import {
  Dices,
  Key,
  CreditCard,
  FileText,
  Zap,
  ShieldAlert,
  FileCheck,
  Download,
  Upload,
  Plus,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { VaultSettings, ItemCategory } from '../types';
import { getAccent, getTheme } from '../lib/theme';
import { tr } from '../lib/i18n';

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
  actionType: 'generator' | 'add_item' | 'view' | 'browser_import';
}

export const ALL_QUICK_ACTIONS = (): QuickActionDef[] => [
  {
    id: 'generate_pass',
    title: tr("Gerar senha forte"),
    description: tr("Aleatória e difícil de adivinhar"),
    badge: tr("Instantâneo"),
    icon: Dices,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    actionType: 'generator',
  },
  {
    id: 'add_login',
    title: tr("Novo login"),
    description: tr("Cadastrar e-mail, usuário e senha"),
    badge: tr("Mais Usado"),
    icon: Key,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    category: 'login',
    actionType: 'add_item',
  },
  {
    id: 'add_card',
    title: tr("Novo cartão"),
    description: tr("Número, validade e CVC"),
    badge: tr("PCI Compliance"),
    icon: CreditCard,
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    category: 'card',
    actionType: 'add_item',
  },
  {
    id: 'add_note',
    title: tr("Nova nota segura"),
    description: tr("Texto confidencial criptografado"),
    badge: 'Zero-Knowledge',
    icon: FileText,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    category: 'note',
    actionType: 'add_item',
  },
  {
    id: 'browser_import',
    title: tr("Importar do navegador"),
    description: tr("Senhas do Chrome, Edge, Firefox"),
    badge: '',
    icon: Upload,
    colorClass: '',
    bgClass: '',
    borderClass: '',
    actionType: 'browser_import',
  },
  {
    id: 'audit_view',
    title: tr("Saúde do cofre"),
    description: tr("Senhas fracas e vazadas"),
    badge: tr("Diagnóstico"),
    icon: ShieldAlert,
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    view: 'audit',
    actionType: 'view',
  },
  {
    id: 'cert_view',
    title: tr("Certificados"),
    description: tr("Chaves X.509 e assinaturas digitais"),
    badge: tr("Segurança"),
    icon: FileCheck,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    view: 'certificates',
    actionType: 'view',
  },
  {
    id: 'backup_view',
    title: tr("Backup"),
    description: tr("Exportar arquivo .vault ou JSON"),
    badge: tr("Exportação"),
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
  onSelectView: (view: string) => void;
  onOpenBrowserImport?: () => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  settings,
  onSaveSettings,
  onOpenGenerator,
  onOpenAddItem,
  onSelectView,
  onOpenBrowserImport,
}) => {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const theme = getTheme(settings?.theme);
  const accent = getAccent(settings?.accentColor, theme.isLight);

  const activeIds = settings?.quickActionIds || [
    'generate_pass',
    'add_login',
    'add_card',
    'browser_import',
    'audit_view',
    'backup_view',
  ];

  const visibleActions = ALL_QUICK_ACTIONS().filter(act => activeIds.includes(act.id));

  const toggleAction = (id: string) => {
    if (!onSaveSettings || !settings) return;
    const current = settings.quickActionIds || ALL_QUICK_ACTIONS().map(a => a.id);
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
      case 'browser_import':
        onOpenBrowserImport?.();
        break;
      case 'view':
        if (act.view) onSelectView(act.view);
        break;
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <h3 className={`text-[15px] font-semibold ${theme.textPrimary}`}>{tr("Atalhos")}</h3>
        <button
          onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
          className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${theme.textMuted} hover:underline underline-offset-2 cursor-pointer shrink-0`}
          aria-expanded={isCustomizeOpen}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {isCustomizeOpen ? tr("Concluir") : tr("Personalizar")}
        </button>
      </div>

      {isCustomizeOpen && (
        <div className={`p-3 ${theme.bgCardInner} border ${theme.borderInner} rounded-xl animate-fade-in`}>
          <p className={`text-[13px] ${theme.textMuted} mb-2.5 px-1`}>{tr("Escolha quais atalhos aparecem aqui.")}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-1.5">
            {ALL_QUICK_ACTIONS().map(act => {
              const isChecked = activeIds.includes(act.id);
              return (
                <button
                  key={act.id}
                  onClick={() => toggleAction(act.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] ${theme.hoverBg} cursor-pointer min-w-0`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      isChecked ? `${accent.bgBtn} border-transparent text-white` : theme.borderMain
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </span>
                  <span className={`truncate ${isChecked ? theme.textPrimary : theme.textMuted}`}>{act.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
        {visibleActions.map(act => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => handleActionClick(act)}
              className={`group flex items-center gap-3 p-3 rounded-xl border ${theme.borderMain} ${theme.bgCard} ${theme.hoverBg} text-left transition-colors cursor-pointer min-w-0`}
            >
              <span className={`w-9 h-9 rounded-lg border ${theme.borderInner} ${theme.bgCardInner} ${theme.textSecondary} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className={`block text-[13.5px] font-semibold ${theme.textPrimary} truncate`}>{act.title}</span>
                <span className={`block text-xs ${theme.textMuted} truncate`}>{act.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
