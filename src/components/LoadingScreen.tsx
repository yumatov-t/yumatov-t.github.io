import React, { useEffect, useState } from 'react';
import { Language } from '../types/discipline';
import { translations } from '../i18n/translations';

interface LoadingScreenProps {
  language: Language;
  onFinish: () => void;
  onPauseAutoDismiss?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  language,
  onFinish,
}) => {
  const t = translations[language];
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const durationMs = 1400;
    let startTime: number | null = null;
    let rafId = 0;

    const tick = (now: number) => {
      if (startTime === null) {
        startTime = now;
      }
      const elapsed = Math.max(0, now - startTime);
      const ratio = Math.max(0, Math.min(1, elapsed / durationMs));
      setProgress(Math.round(ratio * 100));

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(100, progress))
    : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#000000] text-[#FFFFFF] overflow-hidden select-none"
      role="region"
      aria-label="Loading DISCIPLINE"
    >
      {/* Static High-Contrast Swimmer Plate */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden">
        <img
          src="/assets/swimmer_clean.png"
          alt="Swimmer in butterfly stroke"
          className="w-full h-full object-cover object-bottom"
        />
      </div>

      {/* Center Monumental 'discipline.' Wordmark with straight lowercase 'l' */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pointer-events-none">
        <div className="relative w-[78vw] max-w-[760px] sm:w-[56vw] lg:w-[46vw] -mt-16 sm:-mt-24">
          <img
            src="/assets/discipline_wordmark.png"
            alt="discipline."
            className="w-full h-auto block"
          />
        </div>
      </div>

      {/* Minimalist Bottom Bar */}
      <div className="relative z-30 flex items-center justify-between gap-4 px-6 sm:px-10 py-5 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <span className="font-mono-tabular text-xs sm:text-sm font-semibold tracking-widest text-white w-12">
            {String(safeProgress).padStart(3, '0')}%
          </span>
          <div className="w-32 sm:w-56 h-[2px] bg-[#1C1F26] overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="px-5 py-2 text-xs font-semibold uppercase tracking-widest bg-white text-black hover:bg-[#D8E0EA] transition-colors cursor-pointer whitespace-nowrap"
        >
          {t.loadingEnter} →
        </button>
      </div>
    </div>
  );
};
