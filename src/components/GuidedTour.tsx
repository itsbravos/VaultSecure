import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X } from 'lucide-react';
import { VaultSettings } from '../types';
import { getAccent, getTheme } from '../lib/theme';
import { tr } from '../lib/i18n';

export interface TourStep {
  target?: string; // value of a data-tour attribute; omitted = centered card
  title: string;
  body: string;
}

interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  settings: VaultSettings;
  onFinish: () => void; // closed via "Concluir" or "Pular": either way, don't auto-show again
  onOpenProtectionGuide: () => void;
}

const PAD = 6; // breathing room around the highlighted element
const CARD_W = 340;

const findTarget = (step?: TourStep): HTMLElement | null => {
  if (!step?.target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Hidden, or parked off-screen like the phone sidebar drawer
  const onScreen = r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
  return onScreen ? el : null;
};

export const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, steps, settings, onFinish, onOpenProtectionGuide }) => {
  const theme = getTheme(settings.theme);
  const accent = getAccent(settings.accentColor, theme.isLight);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, forceRender] = useState(0);

  // Steps whose element isn't on screen right now are skipped
  const visibleSteps = useMemo(
    () => (isOpen ? steps.filter(s => !s.target || findTarget(s)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, steps]
  );
  const step = visibleSteps[index];
  const isLast = index === visibleSteps.length - 1;

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  const measure = useCallback(() => {
    const el = findTarget(step);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen || !step) return;
    const el = findTarget(step);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
    const onChange = () => {
      measure();
      forceRender(n => n + 1);
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [isOpen, step, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onFinish();
      } else if (e.key === 'ArrowRight' && !isLast) setIndex(i => i + 1);
      else if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, isLast, onFinish]);

  if (!isOpen || !step) return null;

  // Card goes below the target, or above if there's no room, clamped to the viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_W, vw - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    const below = rect.bottom + PAD + 12;
    const fitsBelow = below + 220 < vh;
    // Tall/narrow targets on the left edge (sidebar items): place the card beside them
    const beside = rect.right + PAD + 16 + cardW < vw && rect.left < vw / 3 && rect.height < 80;
    cardStyle = beside
      ? { left: rect.right + PAD + 16, top: Math.min(Math.max(16, rect.top - 12), vh - 260), width: cardW }
      : fitsBelow
      ? { left, top: below, width: cardW }
      : { left, bottom: vh - rect.top + PAD + 12, width: cardW };
  } else {
    cardStyle = { left: (vw - cardW) / 2, top: Math.max(16, vh / 2 - 150), width: cardW };
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dimmed backdrop with a cut-out around the target (huge box-shadow trick) */}
      {rect ? (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: `0 0 0 2px ${accent.colorHex}, 0 0 0 9999px rgba(5, 14, 17, 0.62)`,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(5,14,17,0.62)]" />
      )}
      {/* Clicks outside the card do nothing, so the tour can't be lost by accident */}
      <div className="fixed inset-0" />

      <div
        key={index}
        className={`fixed ${theme.bgCard} border ${theme.borderMain} rounded-2xl p-5 shadow-2xl animate-slide-up`}
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={`text-xs font-medium ${theme.textMuted} tabular-nums`}>
            {index + 1} {tr("de")} {visibleSteps.length}
          </p>
          <button onClick={onFinish} className={`-mt-1 -mr-1 p-1 rounded-md ${theme.textMuted} ${theme.hoverBg} cursor-pointer`} title={tr("Pular tour")}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 id="tour-title" className={`text-[17px] font-semibold ${theme.textPrimary} mt-1`}>
          {step.title}
        </h3>
        <p className={`text-sm ${theme.textSecondary} mt-1.5 leading-relaxed`}>{step.body}</p>

        {isLast && (
          <button
            onClick={() => {
              onFinish();
              onOpenProtectionGuide();
            }}
            className={`mt-4 w-full h-10 rounded-xl border ${accent.borderAccent} ${accent.badgeBg} ${accent.badgeText} text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer`}
          >
            <ShieldCheck className="w-4 h-4" />
            {tr("Ver como sua senha é protegida")}
          </button>
        )}

        <div className="mt-4 flex items-center gap-2">
          {/* progress dots */}
          <div className="flex gap-1 mr-auto">
            {visibleSteps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? `w-4 ${accent.bgBtn}` : `w-1.5 ${theme.isLight ? 'bg-[#0E1F24]/15' : 'bg-[#3D5F65]'}`}`} />
            ))}
          </div>
          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)} className={`h-9 px-3 rounded-lg text-[13px] font-medium ${theme.textSecondary} ${theme.hoverBg} cursor-pointer`}>
              {tr("Voltar")}
            </button>
          )}
          <button
            autoFocus
            onClick={() => (isLast ? onFinish() : setIndex(i => i + 1))}
            className={`h-9 px-4 rounded-lg ${accent.bgBtn} ${accent.bgBtnHover} text-white text-[13px] font-semibold cursor-pointer`}
          >
            {isLast ? tr("Concluir") : tr("Próximo")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
