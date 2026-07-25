import React, { useEffect, useState } from 'react';
import { ShieldAlert, Trash2, X, EyeOff, AlertOctagon, Check } from 'lucide-react';

interface ClipboardWarningBannerProps {
  label: string;
  autoClearSeconds: number;
  onClearNow: () => void;
  onClose: () => void;
}

export const ClipboardWarningBanner: React.FC<ClipboardWarningBannerProps> = ({
  label,
  autoClearSeconds,
  onClearNow,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(autoClearSeconds || 20);

  useEffect(() => {
    setSecondsLeft(autoClearSeconds || 20);
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClearNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoClearSeconds, onClearNow]);

  const percentage = Math.round((secondsLeft / (autoClearSeconds || 20)) * 100);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg bg-[#0F0F0F] border-2 border-amber-500/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(245,158,11,0.25)] text-gray-100 font-sans animate-slide-down space-y-3">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
              <span>ALERTA DE MONITORAMENTO DE CLIPBOARD</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] border border-amber-500/40">
                Dado Exposto
              </span>
            </h4>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              <strong className="text-amber-400">{label}</strong> está atualmente na área de transferência.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors"
          title="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Security Warning Body */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-[11px] text-gray-300 font-mono space-y-1">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wide">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
          Outros aplicativos podem ler este dado!
        </div>
        <p className="text-[10px] text-gray-400 leading-tight">
          Qualquer aplicativo, script ou extensão ativa do sistema operacional com permissão de área de transferência pode ler esta informação.
        </p>
      </div>

      {/* Countdown Progress & Immediate Wipe Button */}
      <div className="space-y-2 pt-1 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400 flex items-center gap-1 text-[10px]">
            <EyeOff className="w-3 h-3 text-amber-400" /> Auto-limpeza de segurança:
          </span>
          <span className="text-amber-400 font-bold text-xs">{secondsLeft}s restante</span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
          <div
            className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={onClearNow}
          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>LIMPAR ÁREA DE TRANSFERÊNCIA AGORA ({secondsLeft}s)</span>
        </button>
      </div>

    </div>
  );
};
