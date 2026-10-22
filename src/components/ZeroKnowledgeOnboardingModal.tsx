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
import { tr } from '../lib/i18n';

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
  const activeAccent = getAccent(settings?.accentColor, getTheme(settings?.theme).isLight);

  const SLIDES = [
    {
      title: tr("Arquitetura Zero-Knowledge & Criptografia Local"),
      subtitle: tr("Suas senhas são criptografadas antes de tocar em qualquer disco."),
      icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      bullets: [
        {
          head: tr("PBKDF2 com 250.000 iterações:"),
          desc: tr("Sua Senha Mestra deriva a chave AES-256-GCM na memória do seu navegador."),
        },
        {
          head: tr("O arquivo .json do cofre é indecifrável:"),
          desc: tr("Se alguém copiar o arquivo do seu computador, verá apenas um amontoado aleatório de bytes."),
        },
        {
          head: tr("O aplicativo não possui servidores centrais:"),
          desc: tr("Nenhuma senha é enviada para fora. Nem mesmo os desenvolvedores conseguem ver seus dados."),
        },
      ],
    },
    {
      title: tr("Modo Duress (Senha de Coação) & Autodestruição"),
      subtitle: tr("Proteção extrema contra abordagens físicas ou coação."),
      icon: EyeOff,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      bullets: [
        {
          head: tr("Senha de Coação (Duress):"),
          desc: tr("Cadastre uma senha mestra alternativa que abre um cofre com dados inofensivos de fachada."),
        },
        {
          head: tr("Autodestruição do Cofre:"),
          desc: tr("Defina para apagar o cofre local automaticamente após N tentativas erradas de senha mestra."),
        },
        {
          head: tr("Múltiplos Cofres Isolados:"),
          desc: tr("Alterne facilmente entre cofre Pessoal, de Trabalho e Compartilhado com senhas independentes."),
        },
      ],
    },
    {
      title: tr("Verificação Zero-Knowledge de Vazamentos (HIBP)"),
      subtitle: tr("Verifique se suas senhas vazaram na internet sem revelar suas senhas."),
      icon: RefreshCw,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      bullets: [
        {
          head: 'k-Anonymity SHA-1 Hash:',
          desc: tr("Ao testar uma senha no Have I Been Pwned, o app envia APENAS os 5 primeiros caracteres do Hash."),
        },
        {
          head: tr("Sua senha real nunca trafega na rede:"),
          desc: tr("A comparação final do restante do hash acontece 100% localmente na sua máquina."),
        },
        {
          head: tr("Modo 100% Offline Opcional:"),
          desc: tr("Você pode desativar qualquer requisição externa nas configurações de privacidade."),
        },
      ],
    },
    {
      title: tr("Anexos e sincronização entre aparelhos"),
      subtitle: tr("Guarde documentos e sincronize entre dispositivos de forma privada."),
      icon: HardDrive,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      bullets: [
        {
          head: tr("Anexos em Base64 Criptografados:"),
          desc: tr("Guarde fotos de RG, contratos em PDF ou notas secretas de até 2MB junto de cada entrada."),
        },
        {
          head: tr("Sincronização automática por pasta:"),
          desc: tr("Em Configurações, escolha uma pasta do Syncthing, OneDrive ou Drive: o cofre grava e lê sozinho um arquivo criptografado nela."),
        },
        {
          head: tr("Sem Dependência de Servidores:"),
          desc: tr("Edições, novos itens e exclusões chegam aos outros aparelhos. O arquivo só abre com a senha mestra."),
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
              <h3 className={`text-sm font-bold ${activeTheme.textPrimary}`}>{tr("Manual de Segurança Zero-Knowledge")}</h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>{tr("Passo")} {currentSlide + 1} {tr("de")} {SLIDES.length}</p>
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
              <p className={`text-xs ${activeTheme.textMuted} mt-0.5`}>{slide.subtitle}</p>
            </div>
          </div>

          {/* Bullets */}
          <div className="space-y-3 pt-2">
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
        <div className={`p-4 border-t ${activeTheme.borderInner} ${activeTheme.bgCardInner} flex items-center justify-between`}>
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
                className={`px-3 py-2 rounded-xl border ${activeTheme.borderMain} ${activeTheme.bgInput} ${activeTheme.textSecondary} text-xs font-semibold flex items-center gap-1 hover:bg-[#183238] transition cursor-pointer`}
              >
                <ChevronLeft className="w-4 h-4" /> {tr("Anterior")}
              </button>
            )}

            {currentSlide < SLIDES.length - 1 ? (
              <button
                onClick={() => setCurrentSlide(prev => prev + 1)}
                className={`px-4 py-2 rounded-xl ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold flex items-center gap-1 shadow-md transition cursor-pointer`}
              >
                {tr("Próximo")} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-xl ${activeAccent.bgBtn} ${activeAccent.bgBtnHover} text-white text-xs font-bold shadow-md transition cursor-pointer`}
              >
                {tr("Entendi, Acessar Cofre!")}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
