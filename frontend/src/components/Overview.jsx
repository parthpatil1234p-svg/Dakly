import { ArrowRight } from 'lucide-react';

export default function Overview({ project, stats, loading, error, onRetry, onSend, onLogs, onTemplates, onSenders, onBuyCredits }) {
  const capacity = stats?.capacity;
  const delivered = stats?.metrics?.allTime?.totalDelivered;
  const failed = stats?.metrics?.allTime?.totalFailed;
  const latency = stats?.metrics?.performance?.avgExecutionTimeMs;
  const sent = capacity?.sentToday;
  const quota = capacity?.totalDailyQuota;
  const purchasedCredits = capacity?.purchasedCredits || 0;
  const usage = Number.isFinite(sent) && quota > 0 ? Math.min(100, sent / quota * 100) : 0;
  const fmt = value => Number.isFinite(value) ? value.toLocaleString() : '—';
  return <section className="overview" aria-labelledby="overview-title">
    <div className="workspace-page-heading"><div><p className="eyebrow">Your email workspace</p><h1 id="overview-title">Mail, in view.</h1><p>Sending activity for <strong>{project.name}</strong>.</p></div><button className="button button-primary" onClick={onSend}>Send a test email <ArrowRight size={17} aria-hidden="true" /></button></div>
    {error && <div className="notice notice-error" role="alert">{error}<button className="text-link" onClick={onRetry}>Try again</button></div>}
    <div className="usage-panel" aria-busy={loading}>
      <div>
        <p className="eyebrow">Daily sending allowance</p>
        <div className="usage-number">{loading ? '…' : fmt(sent)}<span>/ {fmt(quota)}</span></div>
        <p>
          {loading ? 'Checking your sender quota…' : Number.isFinite(capacity?.remainingToday) ? `${fmt(capacity.remainingToday)} remaining today across your connected senders.` : 'Quota is not available yet.'}
          {purchasedCredits > 0 && <span className="block mt-1 font-semibold text-emerald-700 dark:text-emerald-400">+{fmt(purchasedCredits)} purchased extra credits active.</span>}
        </p>
      </div>
      <div className="usage-detail">
        <span>Used today <strong>{quota > 0 ? `${Math.round(usage)}%` : '—'}</strong></span>
        <progress max="100" value={usage} aria-label="Daily sending quota used" />
        <p>Gmail limits apply. Warm-up may reduce a sender’s daily allowance.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="text-link" onClick={onSenders}>Manage senders <ArrowRight size={14} aria-hidden="true" /></button>
          {onBuyCredits && <button className="text-link font-bold text-brand-600 dark:text-brand-400" onClick={onBuyCredits}>⚡ Buy Credits / Upgrade <ArrowRight size={14} aria-hidden="true" /></button>}
        </div>
      </div>
    </div>
    <dl className="metric-ledger"><div><dt>Delivered · all time</dt><dd>{fmt(delivered)}</dd></div><div><dt>Failed · all time</dt><dd>{fmt(failed)}</dd></div><div><dt>Average processing time</dt><dd>{delivered > 0 && Number.isFinite(latency) ? `${fmt(latency)} ms` : '—'}</dd></div></dl>
    <div className="overview-next"><div><h2>Make the next send count.</h2><p>{delivered > 0 ? 'Inspect delivery results or prepare your next transactional email.' : 'Send a test to your own inbox before adding Dakly to your app.'}</p></div><div className="task-links"><button onClick={onLogs}><span>Inspect delivery logs</span><ArrowRight size={18} aria-hidden="true" /></button><button onClick={onTemplates}><span>Choose an email template</span><ArrowRight size={18} aria-hidden="true" /></button></div></div>
    <details className="engagement-details"><summary>Open & click tracking</summary><p>Recorded tracking events. Mail clients and privacy proxies can affect these counts.</p><dl className="metric-ledger"><div><dt>Opened</dt><dd>{fmt(stats?.metrics?.tracking?.totalOpened)}</dd></div><div><dt>Clicked</dt><dd>{fmt(stats?.metrics?.tracking?.totalClicked)}</dd></div><div><dt>Open / click rate</dt><dd>{delivered > 0 ? `${stats?.metrics?.tracking?.openRate ?? '—'} / ${stats?.metrics?.tracking?.clickRate ?? '—'}` : '—'}</dd></div></dl><dl className="metric-ledger"><div><dt>Mobile events</dt><dd>{fmt(stats?.metrics?.tracking?.devices?.mobile)}</dd></div><div><dt>Desktop events</dt><dd>{fmt(stats?.metrics?.tracking?.devices?.desktop)}</dd></div><div><dt>Other / proxy events</dt><dd>{fmt(stats?.metrics?.tracking?.devices?.other)}</dd></div></dl></details>
  </section>;
}
