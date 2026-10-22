import React from 'react';
import { ThemeStyles } from '../lib/theme';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  theme: ThemeStyles;
}

// Plain page title: no box, so the content below carries the visual weight.
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, theme }) => (
  <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">
    <div className="min-w-0">
      <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textPrimary}`}>{title}</h2>
      {description && <p className={`text-sm ${theme.textMuted} mt-1 max-w-prose`}>{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </header>
);
