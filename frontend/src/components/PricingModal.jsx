import React, { useState } from 'react';
import { Sparkles, Zap, ShieldCheck, CheckCircle2, ArrowRight, QrCode, RefreshCw } from 'lucide-react';
import Dialog from './Dialog';

export const PLANS_CATALOG = [
  // Developer Pro Subscription Passes
  {
    id: 'pro-monthly',
    name: 'Pro Monthly Pass',
    category: 'plans',
    badge: 'MONTHLY',
    badgeColor: 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200',
    priceRupees: 20,
    interval: '/month',
    plan: 'pro',
    cycle: 'monthly',
    credits: 0,
    tagline: 'Lowest barrier to bespoke transactional email authoring.',
    features: [
      'Custom HTML Templates & Live Tag Preview',
      'Dynamic {{tags}} & automated variable interpolation',
      '1:1 Verified Brand Logo in email headers',
      'Multi-account automatic failover inboxes',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Annual Pass',
    category: 'plans',
    badge: '10% OFF',
    badgeColor: 'bg-amber-400 text-slate-950 font-bold',
    priceRupees: 216,
    originalPriceRupees: 240,
    interval: '/year',
    plan: 'pro',
    cycle: 'yearly',
    credits: 0,
    tagline: 'Monthly plan × 12 with 10% discount applied (save ₹24).',
    features: [
      'Full Pro developer features for 365 days',
      'Effective ₹18/month (10% bulk discount)',
      'Unlimited custom template revisions',
      'Priority webhook event delivery',
    ],
  },
  // Extra Email Credit Packs
  {
    id: 'starter-pack',
    name: 'Starter Credits Pack',
    category: 'credits',
    badge: 'PAY-AS-YOU-GO',
    badgeColor: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20',
    priceRupees: 99,
    interval: 'one-time',
    credits: 5000,
    tagline: 'Instant injection of 5,000 extra email dispatches.',
    features: [
      '5,000 extra email credits',
      'Credits never expire',
      'Stacks over standard daily Gmail quota',
      'Works with all REST API endpoints & SDK',
    ],
  },
  {
    id: 'growth-pack',
    name: 'Growth Credits Pack',
    category: 'credits',
    badge: 'MOST POPULAR',
    badgeColor: 'bg-brand-500/20 text-brand-800 dark:text-brand-300 border border-brand-500/30 font-bold',
    priceRupees: 299,
    interval: 'one-time',
    credits: 25000,
    tagline: 'Scale transactional volume for launches & marketing OTPs.',
    features: [
      '25,000 extra email credits (₹0.011 / email)',
      'Permanent validity with zero expiry',
      'Sub-second delivery queue priority',
      'Dedicated IP burst pacing protection',
    ],
  },
  {
    id: 'pro-unlimited',
    name: 'Pro Unlimited & Scale Pack',
    category: 'credits',
    badge: 'BEST VALUE',
    badgeColor: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 font-bold',
    priceRupees: 499,
    interval: 'bundle',
    plan: 'pro',
    cycle: 'monthly',
    credits: 50000,
    tagline: '50,000 email credits bundled with Full Pro features.',
    features: [
      '50,000 bonus email credits',
      'Full Pro Custom Templates unlocked',
      'Multi-account dual-sender pooling',
      'Priority developer support & webhook SLAs',
    ],
  },
];

/**
 * Triggers Sovereign UPI Checkout via YouPI PG
 */
export async function initiateCreditPurchase(
  user,
  plan,
  project,
  onSuccess,
  onFailed,
  onClosed,
  onReadyToOpen
) {
  const YoupiObj = window.Youpi || window.YoupiCheckout;
  const checkoutHost = 'https://dakly-pay.fly.dev';

  // 1. Create trusted checkout session on backend
  let sessionData = null;
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('dakly_token') ||
      sessionStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/payments/create-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        planId: plan.id,
        priceRupees: plan.priceRupees,
        credits: plan.credits || 0,
        plan: plan.plan || (plan.id.startsWith('pro') ? 'pro' : 'free'),
        cycle: plan.cycle || (plan.id === 'pro-yearly' ? 'yearly' : 'monthly'),
        projectId: project?.id || project?._id || '',
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && (data.checkoutUrl || data.paymentId)) {
      sessionData = data;
    } else {
      console.warn('⚠️ [YouPI] Backend session response not OK:', data);
    }
  } catch (createErr) {
    console.warn('⚠️ [YouPI] Session creation warning, falling back to direct mode:', createErr.message);
  }

  const orderId = sessionData?.orderId || `DAKLY-${plan.id}-${Date.now()}`;
  const checkoutUrl =
    sessionData?.checkoutUrl ||
    (sessionData?.paymentId
      ? `${checkoutHost}/checkout/${sessionData.paymentId}`
      : `${checkoutHost}/stand/qr.svg?amount=${plan.priceRupees}`);
  const paymentId = sessionData?.paymentId || '';

  const checkoutOptions = {
    order_id: orderId,
    orderId: orderId,
    amount: plan.priceRupees,
    currency: 'INR',
    name: plan.name,
    description: `${plan.name} (₹${plan.priceRupees}) - Instant Sovereign UPI Activation`,
    checkoutUrl,
    paymentId,
    portalUrl: checkoutHost,
    customer: {
      name: user?.name || 'Dakly Developer',
      email: user?.email || 'developer@example.com',
      phone: user?.phone || '',
    },
    metadata: {
      userId: user?.id || user?._id || '',
      projectId: project?.id || project?._id || '',
      planId: plan.id,
      creditsToAdd: plan.credits || 0,
      plan: plan.plan || (plan.id.startsWith('pro') ? 'pro' : 'free'),
      cycle: plan.cycle || (plan.id === 'pro-yearly' ? 'yearly' : 'monthly'),
    },
    handler: function (response) {
      console.log('🎉 [YouPI] Payment Confirmed:', response);
      if (onSuccess) {
        onSuccess(response, plan);
      } else {
        alert(`Payment successful! UTR: ${response.utr || response.bank_reference || 'Confirmed'}. Your account is being credited.`);
        window.location.reload();
      }
    },
    onSuccess: function (response) {
      if (onSuccess) onSuccess(response, plan);
    },
    onClose: function () {
      console.log('ℹ️ [YouPI] Checkout closed by customer.');
      if (onClosed) onClosed();
    },
    onCancelled: function () {
      console.log('ℹ️ [YouPI] Checkout cancelled.');
      if (onClosed) onClosed();
    },
    onFailed: function (response) {
      console.warn('⚠️ [YouPI] Payment failed or cancelled:', response);
      const reason = response?.reason || 'Transaction could not be completed';
      if (onFailed) {
        onFailed(reason, response);
      } else {
        alert(`Payment failed: ${reason}`);
      }
    },
  };

  // Signal caller to unmount native <dialog> right before iframe mounts
  if (onReadyToOpen) {
    onReadyToOpen();
  }

  if (!YoupiObj) {
    console.warn('⚠️ YouPI SDK not detected on window, opening hosted checkout fallback.');
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (onClosed) onClosed();
    return;
  }

  try {
    if (typeof YoupiObj.open === 'function') {
      YoupiObj.open(checkoutOptions);
    } else if (typeof YoupiObj.pay === 'function') {
      YoupiObj.pay(checkoutOptions).catch((err) => {
        console.warn('⚠️ [YouPI] pay() error, attempting direct open:', err);
        if (typeof YoupiObj.open === 'function') {
          YoupiObj.open(checkoutOptions);
        } else {
          window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
          if (onClosed) onClosed();
        }
      });
    } else {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      if (onClosed) onClosed();
    }
  } catch (err) {
    console.error('❌ [YouPI Launch Error]:', err);
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (onClosed) onClosed();
  }
}

export default function PricingModal({
  user,
  project,
  onClose,
  initialCategory = 'plans',
  onUpgradeSuccess,
  onCancelReopen,
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory); // 'plans' | 'credits'
  const [selectedPlanId, setSelectedPlanId] = useState(
    initialCategory === 'credits' ? 'growth-pack' : 'pro-monthly'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

  const filteredPlans = PLANS_CATALOG.filter((p) => p.category === activeCategory);
  const selectedPlan = PLANS_CATALOG.find((p) => p.id === selectedPlanId) || filteredPlans[0];

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    setPaymentNotice(null);

    await initiateCreditPurchase(
      user,
      selectedPlan,
      project,
      (response, plan) => {
        setIsProcessing(false);
        if (onUpgradeSuccess) {
          onUpgradeSuccess(response, plan);
        }
      },
      (errorReason) => {
        setIsProcessing(false);
        console.warn('⚠️ [YouPI] Checkout error:', errorReason);
        if (onCancelReopen) {
          onCancelReopen();
        }
      },
      () => {
        setIsProcessing(false);
        console.log('ℹ️ [YouPI] Checkout closed.');
        if (onCancelReopen) {
          onCancelReopen();
        }
      },
      () => {
        // Dismiss the pricing modal right before YouPI mounts so native <dialog showModal()>
        // doesn't sit in the top-layer over the checkout iframe
        if (onClose) {
          onClose();
        }
      }
    );
  };

  return (
    <Dialog
      title="Pricing & Sending Upgrades"
      busy={isProcessing}
      onClose={onClose}
      className="dialog-wide max-w-4xl"
    >
      <div className="legacy-dialog-content space-y-5">
        {/* Header / Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <p className="text-xs uppercase font-mono tracking-wider text-brand-600 dark:text-brand-400 font-bold">
              Sovereign Zero-Fee UPI Gateway
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Upgrade your developer pass or top up email credits via instant UPI QR (GPay, PhonePe, Paytm, CRED).
            </p>
          </div>

          {/* Category Switcher Tabs */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('plans');
                setSelectedPlanId('pro-monthly');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'plans'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pro Passes
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('credits');
                setSelectedPlanId('growth-pack');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeCategory === 'credits'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Email Credits
            </button>
          </div>
        </div>

        {/* Payment Notice Banner */}
        {paymentNotice && (
          <div
            role="alert"
            className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              paymentNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/30'
            }`}
          >
            <span>{paymentNotice.message}</span>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              className="text-xs font-bold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 ${filteredPlans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3.5`}>
          {filteredPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => setSelectedPlanId(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPlanId(plan.id);
                  }
                }}
                className={`cursor-pointer rounded-xl p-4 border transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-brand-500 ring-2 ring-brand-500 bg-brand-50/70 dark:bg-brand-950/40'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/40 dark:bg-white/[0.02]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {plan.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline space-x-1.5 my-2">
                    {plan.originalPriceRupees && (
                      <span className="text-sm line-through text-slate-400 dark:text-slate-500">
                        ₹{plan.originalPriceRupees}
                      </span>
                    )}
                    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      ₹{plan.priceRupees}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                        {plan.interval}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                    {plan.tagline}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200/60 dark:border-white/5 pt-3">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Instant UPI activation</span>
                  <span className={`font-semibold ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
                    {isSelected ? '● Selected' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pay via UPI Action Footer */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Supported: Google Pay, PhonePe, Paytm, CRED, BHIM &amp; UPI Intent</span>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary flex items-center space-x-2"
              onClick={handleCheckout}
              disabled={isProcessing || !selectedPlan}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Opening UPI Checkout…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Pay ₹{selectedPlan?.priceRupees} via UPI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
