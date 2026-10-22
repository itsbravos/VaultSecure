import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  KeyRound,
  FileText,
} from 'lucide-react';
import {
  generatePassword,
  calculatePasswordStrength,
  PasswordGeneratorOptions,
} from '../lib/crypto';
import { VaultSettings } from '../types';
import { getAccent, getTheme } from '../lib/theme';
import { PageHeader } from './PageHeader';
import { tr } from '../lib/i18n';

interface PasswordGeneratorViewProps {
  onCopyText: (text: string, label: string) => void;
  copiedId: string | null;
  settings?: VaultSettings;
}

export const PasswordGeneratorView: React.FC<PasswordGeneratorViewProps> = ({
  onCopyText,
  copiedId,
  settings,
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true,
    avoidAmbiguous: true,
    passphraseMode: false,
    wordCount: 4,
    wordSeparator: '-',
  });

  const [generatedPassword, setGeneratedPassword] = useState('');

  const accent = getAccent(settings?.accentColor, getTheme(settings?.theme).isLight);
  const theme = getTheme(settings?.theme);

  const handleRegenerate = () => {
    const pwd = generatePassword(options);
    setGeneratedPassword(pwd);
  };

  useEffect(() => {
    handleRegenerate();
  }, [options]);

  const strength = calculatePasswordStrength(generatedPassword);

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <PageHeader
        theme={theme}
        title={tr("Gerador de senhas")}
        description={tr("Senhas aleatórias geradas no próprio navegador. Nada sai do seu dispositivo.")}
        actions={
          <button onClick={handleRegenerate} className={`h-9 px-4 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} ${accent.shadowAccent} text-white text-[13px] font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50`}>
            <RefreshCw className="w-4 h-4" />
            {tr("Gerar outra")}
          </button>
        }
      />

      {/* Main Generator Box */}
      <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-6 ${theme.depthShadow} transition-colors`}>
        
        {/* DISPLAY GENERATED PASSWORD */}
        <div className={`${theme.bgCardInner} border ${theme.borderInner} rounded-xl p-5 space-y-4 shadow-inner`}>
          <div className={`flex items-center justify-between font-mono text-base sm:text-xl break-all ${accent.textAccent} font-bold tracking-wider select-all`}>
            <span>{generatedPassword}</span>
          </div>

          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t ${theme.borderInner} text-xs`}>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${strength.color}`}>
                {tr(strength.label)}
              </span>
              <span className={`${theme.textMuted} text-[11px]`}>
                {strength.entropy} {tr("bits de entropia • Tempo para quebrar:")} {tr(strength.crackTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleRegenerate}
                className={`p-2.5 ${theme.bgInput} ${theme.hoverBg} ${theme.textPrimary} border ${theme.borderMain} rounded-xl transition-colors`}
                title={tr("Gerar Outra Senha")}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onCopyText(generatedPassword, 'Senha Gerada')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 ${accent.bgBtn} ${accent.bgBtnHover} text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${accent.shadowAccent}`}
              >
                {copiedId === 'Senha Gerada' || copiedId === generatedPassword ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{tr("Copiada!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{tr("Copiar Senha")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MODE SELECTOR TABS */}
        <div className={`flex ${theme.bgCardInner} p-1 rounded-xl border ${theme.borderInner} text-xs font-medium`}>
          <button
            onClick={() => setOptions({ ...options, passphraseMode: false })}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
              !options.passphraseMode
                ? `${accent.bgBtn} text-white font-bold shadow-sm`
                : `${theme.textMuted} ${theme.hoverBg} hover:${theme.textPrimary}`
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{tr("Senha Criptográfica")}</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, passphraseMode: true })}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
              options.passphraseMode
                ? `${accent.bgBtn} text-white font-bold shadow-sm`
                : `${theme.textMuted} ${theme.hoverBg} hover:${theme.textPrimary}`
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{tr("Frase Secreta (Passphrase)")}</span>
          </button>
        </div>

        {/* CONTROLS & OPTIONS */}
        {!options.passphraseMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* LENGTH SLIDER */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-4 shadow-inner`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                  <Sliders className={`w-4 h-4 ${accent.textAccent}`} />
                  {tr("Comprimento da Senha:")}
                </label>
                <span className={`text-sm font-bold ${accent.textAccent}`}>
                  {options.length} {tr("caracteres")}
                </span>
              </div>

              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={e => setOptions({ ...options, length: Number(e.target.value) })}
                style={{ accentColor: accent.colorHex }}
                className="w-full bg-gray-300 dark:bg-[#183238] rounded-lg cursor-pointer h-2"
              />

              <div className={`flex items-center justify-between text-xs ${theme.textMuted}`}>
                <span>{tr("8 Caracteres")}</span>
                <span>{tr("64 Caracteres")}</span>
              </div>
            </div>

            {/* TOGGLES & PARAMETERS */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-3 shadow-inner`}>
              <label className={`text-xs font-bold ${theme.textPrimary} block border-b ${theme.borderInner} pb-2`}>
                {tr("Conjunto de caracteres e regras")}
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Custom Option Square Toggles (Painted when selected, unpainted when unselected, no checkmark) */}
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useUppercase: !options.useUppercase })}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                    options.useUppercase
                      ? `${theme.bgCardInner} ${accent.borderAccent}`
                      : `${theme.bgCardInner} ${theme.borderInner}`
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useUppercase ? accent.colorHex : 'transparent',
                      borderColor: options.useUppercase ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                    }}
                  />
                  <span className={options.useUppercase ? `${theme.textPrimary} font-bold` : `${theme.textSecondary}`}>
                    {tr("Maiúsculas (A-Z)")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useLowercase: !options.useLowercase })}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                    options.useLowercase
                      ? `${theme.bgCardInner} ${accent.borderAccent}`
                      : `${theme.bgCardInner} ${theme.borderInner}`
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useLowercase ? accent.colorHex : 'transparent',
                      borderColor: options.useLowercase ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                    }}
                  />
                  <span className={options.useLowercase ? `${theme.textPrimary} font-bold` : `${theme.textSecondary}`}>
                    {tr("Minúsculas (a-z)")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useNumbers: !options.useNumbers })}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                    options.useNumbers
                      ? `${theme.bgCardInner} ${accent.borderAccent}`
                      : `${theme.bgCardInner} ${theme.borderInner}`
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useNumbers ? accent.colorHex : 'transparent',
                      borderColor: options.useNumbers ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                    }}
                  />
                  <span className={options.useNumbers ? `${theme.textPrimary} font-bold` : `${theme.textSecondary}`}>
                    {tr("Números (0-9)")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useSymbols: !options.useSymbols })}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                    options.useSymbols
                      ? `${theme.bgCardInner} ${accent.borderAccent}`
                      : `${theme.bgCardInner} ${theme.borderInner}`
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useSymbols ? accent.colorHex : 'transparent',
                      borderColor: options.useSymbols ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                    }}
                  />
                  <span className={options.useSymbols ? `${theme.textPrimary} font-bold` : `${theme.textSecondary}`}>
                    {tr("Símbolos (!@#$)")}
                  </span>
                </button>
              </div>

              <div className={`pt-2 border-t ${theme.borderInner}`}>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, avoidAmbiguous: !options.avoidAmbiguous })}
                  className={`w-full p-2.5 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                    options.avoidAmbiguous
                      ? `${theme.bgCardInner} ${accent.borderAccent}`
                      : `${theme.bgCardInner} ${theme.borderInner}`
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.avoidAmbiguous ? accent.colorHex : 'transparent',
                      borderColor: options.avoidAmbiguous ? accent.colorHex : theme.isLight ? '#9CA3AF' : '#4B5563',
                    }}
                  />
                  <span className={options.avoidAmbiguous ? `${theme.textPrimary} font-bold` : `${theme.textSecondary}`}>
                    {tr("Evitar Caracteres Confusos (1, l, I, 0, O)")}
                  </span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* WORD COUNT SLIDER */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-4 shadow-inner`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                  <Sliders className={`w-4 h-4 ${accent.textAccent}`} />
                  {tr("Quantidade de Palavras:")}
                </label>
                <span className={`text-sm font-bold ${accent.textAccent}`}>
                  {options.wordCount} {tr("palavras")}
                </span>
              </div>

              <input
                type="range"
                min={3}
                max={10}
                value={options.wordCount}
                onChange={e => setOptions({ ...options, wordCount: Number(e.target.value) })}
                style={{ accentColor: accent.colorHex }}
                className="w-full bg-gray-300 dark:bg-[#183238] rounded-lg cursor-pointer h-2"
              />

              <div className={`flex items-center justify-between text-xs ${theme.textMuted}`}>
                <span>{tr("3 Palavras")}</span>
                <span>{tr("10 Palavras")}</span>
              </div>
            </div>

            {/* SEPARATOR CONFIG */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-3 shadow-inner`}>
              <label className={`text-xs font-bold ${theme.textPrimary} block border-b ${theme.borderInner} pb-2`}>
                {tr("Separador de Palavras")}
              </label>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={3}
                  value={options.wordSeparator}
                  onChange={e => setOptions({ ...options, wordSeparator: e.target.value })}
                  className={`w-full ${theme.bgInput} border ${theme.borderInner} rounded-xl p-2.5 text-center font-mono ${accent.textAccent} font-bold text-sm focus:outline-none focus:ring-1 ${accent.ringAccent}`}
                  placeholder={tr("Ex: - ou . ou _")}
                />

                <div className="flex items-center gap-2 justify-center text-xs">
                  <span className={`text-xs ${theme.textMuted}`}>Atalhos:</span>
                  {['-', '.', '_', ' '].map(sep => (
                    <button
                      key={sep}
                      onClick={() => setOptions({ ...options, wordSeparator: sep })}
                      className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                        options.wordSeparator === sep
                          ? `${accent.bgBtn} text-white font-bold`
                          : `${theme.bgInput} ${theme.textSecondary} border-${theme.borderInner}`
                      }`}
                    >
                      {sep === ' ' ? tr("espaço") : sep}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

