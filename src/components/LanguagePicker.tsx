import React from 'react';
import { Check } from 'lucide-react';
import { VaultSettings } from '../types';
import { getAccent, getTheme } from '../lib/theme';
import { Lang, getLang } from '../lib/i18n';
import { Guilloche } from './Guilloche';

interface LanguagePickerProps {
  isOpen: boolean;
  settings: VaultSettings;
  onPick: (lang: Lang) => void;
}

// Shown in both languages on purpose: the person hasn't chosen one yet.
const OPTIONS: { id: Lang; label: string; hint: string }[] = [
  { id: 'en', label: 'English', hint: 'Use VaultSecure in English' },
  { id: 'pt', label: 'Português', hint: 'Usar o VaultSecure em português' },
];

export const LanguagePicker: React.FC<LanguagePickerProps> = ({ isOpen, settings, onPick }) => {
  if (!isOpen) return null;
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);
  const current = getLang();

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-title"
        className={`w-full max-w-md ${theme.bgCard} border ${theme.borderMain} rounded-2xl p-6 sm:p-7 shadow-2xl animate-slide-up`}
      >
        <div className="flex flex-col items-center text-center">
          <Guilloche size={64} color={accent.colorHex} strokeWidth={0.5} />
          <h2 id="lang-title" className={`mt-4 text-xl font-bold tracking-tight ${theme.textPrimary}`}>
            Choose your language
          </h2>
          <p className={`text-sm ${theme.textMuted} mt-0.5`}>Escolha seu idioma</p>
        </div>

        <div className="mt-6 space-y-2" role="radiogroup" aria-labelledby="lang-title">
          {OPTIONS.map(opt => {
            const isCurrent = opt.id === current;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isCurrent}
                autoFocus={isCurrent}
                onClick={() => onPick(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left cursor-pointer ${theme.hoverBg} ${
                  isCurrent ? accent.borderAccent : theme.borderMain
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] font-semibold ${theme.textPrimary}`}>{opt.label}</span>
                  <span className={`block text-[13px] ${theme.textMuted}`}>{opt.hint}</span>
                </span>
                {isCurrent && <Check className={`w-5 h-5 shrink-0 ${accent.textAccent}`} />}
              </button>
            );
          })}
        </div>

        <p className={`mt-5 text-xs text-center ${theme.textMuted}`}>
          You can change this later in Settings. / Dá para trocar depois nas Configurações.
        </p>
      </div>
    </div>
  );
};
