import React, { useEffect, useState } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { tr } from '../lib/i18n';

interface ClipboardWarningBannerProps {
  label: string;
  expiresAt: number; // epoch ms when App wipes the clipboard
  totalSeconds: number;
  onClearNow: () => void;
  onClose: () => void;
}

// Display-only countdown; the actual wipe is scheduled by App so it survives dismissal.
export const ClipboardWarningBanner: React.FC<ClipboardWarningBannerProps> = ({
  label,
  expiresAt,
  totalSeconds,
  onClearNow,
  onClose,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const percentage = Math.min(100, ((expiresAt - now) / (totalSeconds * 1000)) * 100);

  return (
    <div
      role="status"
      className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-[#13282E] border border-[#2C4A50] rounded-xl shadow-[0_20px_40px_-16px_rgba(0,0,0,0.7)] text-[#E6EFEC] overflow-hidden animate-slide-up"
    >
      <div className="flex items-center gap-3 pl-3.5 pr-2 py-2.5">
        <ClipboardCheck className="w-4 h-4 text-[#D8B65C] shrink-0" />
        <p className="text-[13px] min-w-0 flex-1">
          <span className="font-semibold">{label} {tr("copiado.")}</span>{' '}
          <span className="text-[#86A19B]">{tr("Será apagado em")} {secondsLeft}s.</span>
        </p>
        <button
          onClick={onClearNow}
          className="shrink-0 h-8 px-3 rounded-lg text-[13px] font-medium text-[#E6EFEC] hover:bg-[#1D3A41] cursor-pointer"
        >
          {tr("Apagar agora")}
        </button>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#86A19B] hover:bg-[#1D3A41] cursor-pointer"
          title={tr("Ocultar aviso (a limpeza continua)")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-0.5 bg-[#2C4A50]">
        <div className="h-full bg-[#C9A54C] transition-[width] duration-300 ease-linear" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};
