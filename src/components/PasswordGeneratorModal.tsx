import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  X,
  Sliders,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { generatePassword, calculatePasswordStrength, PasswordGeneratorOptions } from '../lib/crypto';
import { VaultSettings } from '../types';
import { getAccent, getTheme } from '../lib/theme';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
  copiedId: string | null;
  settings?: VaultSettings;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onCopyText,
  copiedId,
  settings,
}) => {
  if (!isOpen) return null;

  const accent = getAccent(settings?.accentColor);
  const theme = getTheme(settings?.theme);

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

  const handleRegenerate = () => {
    const pwd = generatePassword(options);
    setGeneratedPassword(pwd);
  };

  useEffect(() => {
    handleRegenerate();
  }, [options]);

  const strength = calculatePasswordStrength(generatedPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0F0F0F] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gerador Criptográfico de Senhas</h3>
              <p className="text-xs text-gray-400 font-mono">Entropia máxima com Web Crypto API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Generated Password Box */}
        <div className="p-6 space-y-6">
          <div className="bg-[#050505] border border-gray-800 rounded-xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between font-mono text-sm sm:text-base break-all text-emerald-400 font-bold tracking-wider">
              <span>{generatedPassword}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-900 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className={`px-2 py-0.5 rounded text-[10px] ${strength.color}`}>
                  {strength.label}
                </span>
                <span className="text-gray-400 text-[11px]">{strength.entropy} bits ({strength.crackTime})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                  title="Gerar Nova Senha"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onCopyText(generatedPassword, 'Senha Gerada')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === generatedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-[#050505] p-1 rounded-xl border border-gray-800 text-xs font-medium">
            <button
              onClick={() => setOptions({ ...options, passphraseMode: false })}
              className={`flex-1 py-2 rounded-lg font-mono transition-colors ${
                !options.passphraseMode ? 'bg-gray-800 text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Senha Criptográfica
            </button>
            <button
              onClick={() => setOptions({ ...options, passphraseMode: true })}
              className={`flex-1 py-2 rounded-lg font-mono transition-colors ${
                options.passphraseMode ? 'bg-gray-800 text-emerald-400 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Frase Secreta (Passphrase)
            </button>
          </div>

          {/* Controls */}
          {!options.passphraseMode ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Length Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-300">
                  <span>Comprimento da Senha:</span>
                  <span className={`font-mono font-bold ${accent.textAccent}`}>{options.length} caracteres</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={options.length}
                  onChange={e => setOptions({ ...options, length: Number(e.target.value) })}
                  style={{ accentColor: accent.colorHex }}
                  className="w-full bg-[#050505] cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useUppercase: !options.useUppercase })}
                  className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-[#050505] border transition-all ${
                    options.useUppercase ? accent.borderAccent : 'border-gray-800 hover:bg-gray-800/40'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useUppercase ? accent.colorHex : 'transparent',
                      borderColor: options.useUppercase ? accent.colorHex : '#4B5563',
                    }}
                  />
                  <span className={options.useUppercase ? 'text-white font-bold' : 'text-gray-300'}>Maiúsculas (A-Z)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useLowercase: !options.useLowercase })}
                  className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-[#050505] border transition-all ${
                    options.useLowercase ? accent.borderAccent : 'border-gray-800 hover:bg-gray-800/40'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useLowercase ? accent.colorHex : 'transparent',
                      borderColor: options.useLowercase ? accent.colorHex : '#4B5563',
                    }}
                  />
                  <span className={options.useLowercase ? 'text-white font-bold' : 'text-gray-300'}>Minúsculas (a-z)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useNumbers: !options.useNumbers })}
                  className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-[#050505] border transition-all ${
                    options.useNumbers ? accent.borderAccent : 'border-gray-800 hover:bg-gray-800/40'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useNumbers ? accent.colorHex : 'transparent',
                      borderColor: options.useNumbers ? accent.colorHex : '#4B5563',
                    }}
                  />
                  <span className={options.useNumbers ? 'text-white font-bold' : 'text-gray-300'}>Números (0-9)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions({ ...options, useSymbols: !options.useSymbols })}
                  className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-[#050505] border transition-all ${
                    options.useSymbols ? accent.borderAccent : 'border-gray-800 hover:bg-gray-800/40'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-sm border transition-all shrink-0"
                    style={{
                      backgroundColor: options.useSymbols ? accent.colorHex : 'transparent',
                      borderColor: options.useSymbols ? accent.colorHex : '#4B5563',
                    }}
                  />
                  <span className={options.useSymbols ? 'text-white font-bold' : 'text-gray-300'}>Símbolos (!@#$)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOptions({ ...options, avoidAmbiguous: !options.avoidAmbiguous })}
                className={`w-full flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-[#050505] border transition-all ${
                  options.avoidAmbiguous ? accent.borderAccent : 'border-gray-800 hover:bg-gray-800/40'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-sm border transition-all shrink-0"
                  style={{
                    backgroundColor: options.avoidAmbiguous ? accent.colorHex : 'transparent',
                    borderColor: options.avoidAmbiguous ? accent.colorHex : '#4B5563',
                  }}
                />
                <span className={options.avoidAmbiguous ? 'text-white font-bold' : 'text-gray-300'}>Evitar Caracteres Confusos (1, l, I, 0, O)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-300">
                  <span>Quantidade de Palavras:</span>
                  <span className={`font-mono font-bold ${accent.textAccent}`}>{options.wordCount} palavras</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={options.wordCount}
                  onChange={e => setOptions({ ...options, wordCount: Number(e.target.value) })}
                  style={{ accentColor: accent.colorHex }}
                  className="w-full bg-[#050505] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300">Separador de Palavras</label>
                <input
                  type="text"
                  maxLength={3}
                  value={options.wordSeparator}
                  onChange={e => setOptions({ ...options, wordSeparator: e.target.value })}
                  className={`w-full bg-[#050505] border border-gray-800 rounded-xl p-2.5 text-center font-mono ${accent.textAccent}`}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#050505] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition-colors"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
