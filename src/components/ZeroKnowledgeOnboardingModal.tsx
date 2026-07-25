import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  HardDrive,
  KeyRound,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Layers,
  FileCheck,
  Globe,
  Sparkles,
} from 'lucide-react';
import { getTheme, getAccent } from '../lib/theme';
import { VaultSettings } from '../types';

interface ZeroKnowledgeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: VaultSettings;
}

export const ZeroKnowledgeOnboardingModal: React.FC<ZeroKnowledgeOnboardingModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const [currentSlide, setCurrentSlide] = useState(0);

  const activeTheme = getTheme(settings?.theme);
  const activeAccent = getAccent(settings?.accentColor);

  const SLIDES = [
    {
      title: 'Arquitetura Zero-Knowledge & Criptografia Local',
      subtitle: 'Suas senhas são criptografadas antes de tocar em qualquer disco.',
      icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      bullets: [
        {
          head: 'PBKDF2 com 250.000 iterações:',
          desc: 'Sua Senha Mestra deriva a chave AES-256-GCM na memória do seu navegador.',
        },
        {
          head: 'O arquivo .json do cofre é indecifrável:',
          desc: 'Se alguém copiar o arquivo do seu computador, verá apenas um amontoado aleatório de bytes.',
        },
        {
          head: 'O aplicativo não possui servidores centrais:',
          desc: 'Nenhuma senha é enviada para fora. Nem mesmo os desenvolvedores conseguem ver seus dados.',
        },
      ],
    },
    {
      title: 'Modo Duress (Senha de Coação) & Autodestruição',
      subtitle: 'Proteção extrema contra abordagens físicas ou coação.',
      icon: EyeOff,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      bullets: [
        {
          head: 'Senha de Coação (Duress):',
          desc: 'Cadastre uma senha mestra alternativa que abre um cofre com dados inofensivos de fachada.',
        },
        {
          head: 'Autodestruição do Cofre:',
          desc: 'Defina para apagar o cofre local automaticamente após N tentativas erradas de senha mestra.',
        },
        {
          head: 'Múltiplos Cofres Isolados:',
          desc: 'Alterne facilmente entre cofre Pessoal, de Trabalho e Compartilhado com senhas independentes.',
        },
      ],
    },
    {
      title: 'Verificação Zero-Knowledge de Vazamentos (HIBP)',
      subtitle: 'Verifique se suas senhas vazaram na internet sem revelar suas senhas.',
      icon: RefreshCw,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      bullets: [
        {
          head: 'k-Anonymity SHA-1 Hash:',
          desc: 'Ao testar uma senha no Have I Been Pwned, o app envia APENAS os 5 primeiros caracteres do Hash.',
        },
        {
          head: 'Sua senha real nunca trafega na rede:',
          desc: 'A comparação final do restante do hash acontece 100% localmente na sua máquina.',
        },
        {
          head: 'Modo 100% Offline Opcional:',
          desc: 'Você pode desativar qualquer requisição externa nas configurações de privacidade.',
        },
      ],
    },
    {
      title: 'Anexos Criptografados & Sincronização via Syncthing',
      subtitle: 'Guarde documentos e sincronize entre dispositivos de forma privada.',
      icon: HardDrive,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      bullets: [
        {
          head: 'Anexos em Base64 Criptografados:',
          desc: 'Guarde fotos de RG, contratos em PDF ou notas secretas de até 2MB junto de cada entrada.',
        },
        {
          head: 'Sincronização sem Nuvem do App:',
          desc: 'Exporte backups criptografados para uma pasta do Syncthing, Dropbox ou Drive local.',
        },
        {
          head: 'Sem Dependência de Servidores:',
          desc: 'Seus múltiplos dispositivos se sincronizam trocando apenas o arquivo .vault.json criptografado.',
        },
      ],
    },
  ];

  const slide = SLIDES[currentSlide];
  const IconComp = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className={`w-full max-w-lg ${activeTheme.bgCard} border ${activeTheme.borderMain} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${activeTheme.borderMain} ${activeTheme.bgCardInner} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${activeAccent.badgeBg} border ${activeAccent.borderAccent} ${activeAccent.textAccent} flex items-center justify-center`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>Manual de Segurança Zero-Knowledge</h3>
              <p className={`text-[10px] ${activeTheme.textMuted} font-mono`}>Passo {currentSlide + 1} de {SLIDES.length}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${activeTheme.bgInput} ${activeTheme.hoverBg} ${activeTheme.textSecondary} transition-colors border ${activeTheme.borderMain}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Top Banner */}
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl border ${slide.color} flex items-center justify-center shrink-0 shadow-lg`}>
              <IconComp className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`text-base font-bold ${activeTheme.textPrimary}`}>{slide.title}</h4>
              <p className={`text-xs ${activeTheme.textMuted} font-mono mt-0.5`}>{slide.subtitle}</p>
            </div>
          </div>

          {/* Bullets */}
          <div className="space-y-3 pt-2 font-mono">
            {slide.bullets.map((b, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border ${activeTheme.borderInner} ${activeTheme.bgCardInner} space-y-1 text-xs`}
              >
                <div className={`font-bold ${activeAccent.textAccent} flex items-center gap-2`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  {b.head}
                </div>
                <p className={`text-[11px] ${activeTheme.textMuted} leading-relaxed pl-6`}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Carousel Navigation */}
        <div className={`p-4 border-t ${activeTheme.borderInner} ${activeTheme.bgCardInner} flex items-center justify-between font-mono`}>
          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  i === currentSlide
                    ? `${activeAccent.bgBtn} w-6`
                    : `${activeTheme.bgInput} border ${activeTheme.borderMain}`
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                onClick={() => setCurrentSlide(prev => prev - 1)}
                className={`px-3 py-2 rounded-xl border ${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.textSecondary} text-xs font-semibold flex items-center gap-1 hover:bg-gray-800 transition cursor-pointer`}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}

            {currentSlide < SLIDES.length - 1 ? (
              <button
                onClick={() => setCurrentSlide(prev => prev + 1)}
                className={`px-4 py-2 rounded-xl ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold flex items-center gap-1 shadow-md transition cursor-pointer`}
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold shadow-md transition cursor-pointer`}
              >
                Entendi, Acessar Cofre!
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
