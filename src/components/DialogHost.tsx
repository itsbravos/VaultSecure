import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { loadVaultSettings } from '../lib/storage';
import { getAccent, getTheme } from '../lib/theme';
import { tr } from '../lib/i18n';

interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  alertOnly?: boolean; // single "OK" button
}

interface PendingDialog extends DialogOptions {
  resolve: (ok: boolean) => void;
}

// Imperative bridge so any component can `await confirmDialog(...)`
// the same way it used to call the browser's blocking confirm().
let enqueue: ((d: PendingDialog) => void) | null = null;

export const confirmDialog = (opts: DialogOptions): Promise<boolean> =>
  new Promise(resolve => {
    if (!enqueue) return resolve(window.confirm(opts.message || opts.title));
    enqueue({ ...opts, resolve });
  });

export const alertDialog = (title: string, message?: string): Promise<void> =>
  confirmDialog({ title, message, alertOnly: true, confirmLabel: tr("Entendi") }).then(() => undefined);

export const DialogHost: React.FC = () => {
  const [queue, setQueue] = useState<PendingDialog[]>([]);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    enqueue = d => setQueue(q => [...q, d]);
    return () => {
      enqueue = null;
    };
  }, []);

  const current = queue[0];

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setQueue(q => q.slice(1));
  };

  useEffect(() => {
    if (!current) return;
    // Destructive prompts start on "Cancelar" so a stray Enter can't delete anything
    (current.danger && !current.alertOnly ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [current]);

  if (!current) return null;

  const settings = loadVaultSettings();
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);
  const Icon = current.danger ? AlertTriangle : Info;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={e => e.target === e.currentTarget && close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`w-full max-w-sm ${theme.bgCard} border ${theme.borderMain} rounded-2xl p-6 shadow-2xl animate-slide-up`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
            current.danger ? 'bg-red-500/10 text-red-500' : `${accent.badgeBg} ${accent.textAccent}`
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 id="dialog-title" className={`text-base font-semibold ${theme.textPrimary}`}>
          {current.title}
        </h3>
        {current.message && <p className={`mt-1.5 text-sm leading-relaxed ${theme.textMuted}`}>{current.message}</p>}

        <div className="flex gap-2 mt-6">
          {!current.alertOnly && (
            <button
              ref={cancelRef}
              onClick={() => close(false)}
              className={`flex-1 h-10 rounded-xl border ${theme.borderMain} ${theme.textSecondary} ${theme.hoverBg} text-sm font-medium cursor-pointer`}
            >
              {current.cancelLabel || tr("Cancelar")}
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={() => close(true)}
            className={`flex-1 h-10 rounded-xl text-white text-sm font-semibold cursor-pointer ${
              current.danger ? 'bg-red-600 hover:bg-red-500' : `${accent.bgBtn} ${accent.bgBtnHover}`
            }`}
          >
            {current.confirmLabel || tr("Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
};
