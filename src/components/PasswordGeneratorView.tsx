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

  const accent = getAccent(settings?.accentColor);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Header */}
      <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 ${theme.depthShadow} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${accent.bgBtn} text-white flex items-center justify-center ${accent.shadowAccent} shrink-0`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme.textPrimary} tracking-tight`}>Gerador Criptográfico de Senhas</h2>
            <p className={`text-xs ${theme.textMuted} font-mono`}>
              Gere senhas de alta entropia derivadas com CSPRNG local no navegador (Web Crypto API)
            </p>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          className={`${accent.bgBtn} ${accent.bgBtnHover} text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${accent.shadowAccent}`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Gerar Nova Senha</span>
        </button>
      </div>

      {/* Main Generator Box */}
      <div className={`${theme.bgCard} ${theme.borderMain} border rounded-2xl p-6 space-y-6 ${theme.depthShadow} transition-colors`}>
        
        {/* DISPLAY GENERATED PASSWORD */}
        <div className={`${theme.bgCardInner} border ${theme.borderInner} rounded-xl p-5 space-y-4 shadow-inner`}>
          <div className={`flex items-center justify-between font-mono text-base sm:text-xl break-all ${accent.textAccent} font-bold tracking-wider select-all`}>
            <span>{generatedPassword}</span>
          </div>

          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t ${theme.borderInner} text-xs`}>
            <div className="flex items-center gap-2 font-mono">
              <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${strength.color}`}>
                {strength.label}
              </span>
              <span className={`${theme.textMuted} text-[11px]`}>
                {strength.entropy} bits de entropia • Tempo para quebrar: {strength.crackTime}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleRegenerate}
                className={`p-2.5 ${theme.bgInput} ${theme.hoverBg} ${theme.textPrimary} border ${theme.borderMain} rounded-xl transition-colors`}
                title="Gerar Outra Senha"
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
                    <span>Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Senha</span>
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
            className={`flex-1 py-2.5 px-4 rounded-lg font-mono flex items-center justify-center gap-2 transition-all ${
              !options.passphraseMode
                ? `${accent.bgBtn} text-white font-bold shadow-sm`
                : `${theme.textMuted} ${theme.hoverBg} hover:${theme.textPrimary}`
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Senha Criptográfica</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, passphraseMode: true })}
            className={`flex-1 py-2.5 px-4 rounded-lg font-mono flex items-center justify-center gap-2 transition-all ${
              options.passphraseMode
                ? `${accent.bgBtn} text-white font-bold shadow-sm`
                : `${theme.textMuted} ${theme.hoverBg} hover:${theme.textPrimary}`
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Frase Secreta (Passphrase)</span>
          </button>
        </div>

        {/* CONTROLS & OPTIONS */}
        {!options.passphraseMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* LENGTH SLIDER */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-4 font-mono shadow-inner`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                  <Sliders className={`w-4 h-4 ${accent.textAccent}`} />
                  Comprimento da Senha:
                </label>
                <span className={`text-sm font-bold ${accent.textAccent}`}>
                  {options.length} caracteres
                </span>
              </div>

              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={e => setOptions({ ...options, length: Number(e.target.value) })}
                style={{ accentColor: accent.colorHex }}
                className="w-full bg-gray-300 dark:bg-gray-800 rounded-lg cursor-pointer h-2"
              />

              <div className={`flex items-center justify-between text-[10px] ${theme.textMuted}`}>
                <span>8 Caracteres</span>
                <span>64 Caracteres</span>
              </div>
            </div>

            {/* TOGGLES & PARAMETERS */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-3 font-mono shadow-inner`}>
              <label className={`text-xs font-bold ${theme.textPrimary} block border-b ${theme.borderInner} pb-2`}>
                Conjunto de Caracteres & Regras
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Custom Option Square Toggles (Painted when selected, unpainted when unselected, no checkmark) */}
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useUppercase: !options.useUppercase })}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
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
                    Maiúsculas (A-Z)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useLowercase: !options.useLowercase })}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
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
                    Minúsculas (a-z)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useNumbers: !options.useNumbers })}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
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
                    Números (0-9)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useSymbols: !options.useSymbols })}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
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
                    Símbolos (!@#$)
                  </span>
                </button>
              </div>

              <div className={`pt-2 border-t ${theme.borderInner}`}>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, avoidAmbiguous: !options.avoidAmbiguous })}
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 cursor-pointer transition-all select-none ${
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
                    Evitar Caracteres Confusos (1, l, I, 0, O)
                  </span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* WORD COUNT SLIDER */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-4 font-mono shadow-inner`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                  <Sliders className={`w-4 h-4 ${accent.textAccent}`} />
                  Quantidade de Palavras:
                </label>
                <span className={`text-sm font-bold ${accent.textAccent}`}>
                  {options.wordCount} palavras
                </span>
              </div>

              <input
                type="range"
                min={3}
                max={10}
                value={options.wordCount}
                onChange={e => setOptions({ ...options, wordCount: Number(e.target.value) })}
                style={{ accentColor: accent.colorHex }}
                className="w-full bg-gray-300 dark:bg-gray-800 rounded-lg cursor-pointer h-2"
              />

              <div className={`flex items-center justify-between text-[10px] ${theme.textMuted}`}>
                <span>3 Palavras</span>
                <span>10 Palavras</span>
              </div>
            </div>

            {/* SEPARATOR CONFIG */}
            <div className={`p-4 ${theme.bgCardInner} rounded-xl border ${theme.borderInner} space-y-3 font-mono shadow-inner`}>
              <label className={`text-xs font-bold ${theme.textPrimary} block border-b ${theme.borderInner} pb-2`}>
                Separador de Palavras
              </label>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={3}
                  value={options.wordSeparator}
                  onChange={e => setOptions({ ...options, wordSeparator: e.target.value })}
                  className={`w-full ${theme.bgInput} border ${theme.borderInner} rounded-xl p-2.5 text-center font-mono ${accent.textAccent} font-bold text-sm focus:outline-none focus:ring-1 ${accent.ringAccent}`}
                  placeholder="Ex: - ou . ou _"
                />

                <div className="flex items-center gap-2 justify-center text-xs">
                  <span className={`text-[10px] ${theme.textMuted}`}>Atalhos:</span>
                  {['-', '.', '_', ' '].map(sep => (
                    <button
                      key={sep}
                      onClick={() => setOptions({ ...options, wordSeparator: sep })}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                        options.wordSeparator === sep
                          ? `${accent.bgBtn} text-white font-bold`
                          : `${theme.bgInput} ${theme.textSecondary} border-${theme.borderInner}`
                      }`}
                    >
                      {sep === ' ' ? 'espaço' : sep}
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

