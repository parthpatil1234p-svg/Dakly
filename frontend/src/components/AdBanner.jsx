import React, { useEffect, useState } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

/**
 * AdBanner - Google AdSense Monetization Banner Component
 * 
 * When configured with a valid Google AdSense Publisher ID (VITE_GOOGLE_ADSENSE_ID),
 * it serves responsive Google Ad units.
 * While pending approval or in local dev, it renders an elegant developer partner card
 * so the layout looks intentional and attractive.
 */
export default function AdBanner({
  slot,
  format = 'auto',
  className = '',
  label = 'Sponsored by Google Ads',
}) {
  const adClient = import.meta.env.VITE_GOOGLE_ADSENSE_ID || 'ca-pub-XXXXXXXXXXXXXXXX';
  const adSlot = slot || import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_FOOTER || '1234567890';
  const isLiveAdSense = Boolean(adClient && adClient !== 'ca-pub-XXXXXXXXXXXXXXXX');
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (isLiveAdSense && !adFailed) {
      try {
        if (typeof window !== 'undefined') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.warn('AdSense load issue or AdBlocker active:', err);
        setAdFailed(true);
      }
    }
  }, [isLiveAdSense, adFailed]);

  return (
    <aside
      aria-label="Advertisement & Sponsored Content"
      className={`w-full my-6 rounded-2xl overflow-hidden border transition-all duration-200 ${className}
        bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white border-slate-200/80 text-slate-800 shadow-xs
        dark:bg-gradient-to-r dark:from-[#0b0d14] dark:via-[#111422] dark:to-[#090b10] dark:border-white/10 dark:text-slate-200`}
    >
      {/* Ad Label Header */}
      <div className="px-4 py-1.5 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold flex items-center space-x-1.5">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {isLiveAdSense && !adFailed ? 'Google AdSense Live' : 'Ad Space Ready'}
        </span>
      </div>

      {/* Ad Container */}
      <div className="p-3 sm:p-4 min-h-[90px] flex items-center justify-center text-center">
        {isLiveAdSense && !adFailed ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client={adClient}
            data-ad-slot={adSlot}
            data-ad-format={format}
            data-full-width-responsive="true"
          ></ins>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Dakly Cloud Email Microservice</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    100% Free
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                  Turn free Gmail accounts into production-grade transactional relays with failover & warmup.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/parthpatil1234p-svg/Dakly"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1 shadow-sm shadow-indigo-600/20 flex-shrink-0"
            >
              <span>Explore Engine</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
