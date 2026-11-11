import React, { useEffect } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

// Public Google AdSense Publisher & Ad Slot IDs (No .env required)
const AD_CLIENT = 'ca-pub-2484983247170714';
const DEFAULT_DISPLAY_SLOT = '5973953697';
const DEFAULT_RELAXED_SLOT = '3867645044';

/**
 * AdBanner - Google AdSense Monetization Banner Component
 * 
 * Supports:
 * - Display Auto Banner: slot="5973953697", format="auto"
 * - Multiplex / Matched Content: slot="3867645044", format="autorelaxed"
 */
export default function AdBanner({
  slot,
  format,
  className = '',
  label = 'Sponsored by Google Ads',
}) {
  const isAutorelaxed = format === 'autorelaxed';
  const defaultSlot = isAutorelaxed ? DEFAULT_RELAXED_SLOT : DEFAULT_DISPLAY_SLOT;

  const adClient = AD_CLIENT;
  const adSlot = slot || defaultSlot;
  const adFormat = format || (adSlot === DEFAULT_RELAXED_SLOT ? 'autorelaxed' : 'auto');

  const hasValidSlot = Boolean(adSlot && adSlot.trim().length > 0);
  const isLiveAdSense = Boolean(adClient && adClient.startsWith('ca-pub-') && hasValidSlot);

  useEffect(() => {
    if (isLiveAdSense) {
      try {
        if (typeof window !== 'undefined') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.warn('AdSense load issue or AdBlocker active:', err);
      }
    }
  }, [isLiveAdSense]);

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
          <span>{adFormat === 'autorelaxed' ? 'Recommended For Developers' : label}</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          Google AdSense #{adSlot} ({adFormat})
        </span>
      </div>

      {/* Ad Container */}
      <div className="p-3 sm:p-4 min-h-[90px] flex items-center justify-center text-center overflow-hidden">
        {isLiveAdSense ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: isAutorelaxed ? '160px' : '90px' }}
            data-ad-client={adClient}
            data-ad-slot={adSlot}
            data-ad-format={adFormat}
            {...(adFormat !== 'autorelaxed' ? { 'data-full-width-responsive': 'true' } : {})}
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
