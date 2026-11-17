import { useEffect } from 'react';

/** One quiet footer placement. Never competes with account or sender setup. */
export default function AdBanner() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch { /* Ad blockers must not interrupt the product. */ }
    }
  }, []);
  return <aside className="ad-placement" aria-label="Advertisement">
    <p>Advertisement</p>
    <ins className="adsbygoogle" style={{ display: 'block', width: '100%' }} data-ad-client="ca-pub-2484983247170714" data-ad-slot="5973953697" data-ad-format="auto" data-full-width-responsive="true" />
  </aside>;
}
