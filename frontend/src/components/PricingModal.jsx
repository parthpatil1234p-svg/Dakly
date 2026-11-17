import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  QrCode,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Dialog from './Dialog';
import { API_BASE_URL } from '../services/api';

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

export default function PricingModal({
  user,
  project,
  onClose,
  initialCategory = 'plans',
  onUpgradeSuccess,
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory); // 'plans' | 'credits'
  const [selectedPlanId, setSelectedPlanId] = useState(
    initialCategory === 'credits' ? 'growth-pack' : 'pro-monthly'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  const filteredPlans = PLANS_CATALOG.filter((p) => p.category === activeCategory);
  const selectedPlan = PLANS_CATALOG.find((p) => p.id === selectedPlanId) || filteredPlans[0];

  // Real-time order status polling when activeOrder is present
  useEffect(() => {
    if (!activeOrder?.orderId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/orders/${encodeURIComponent(activeOrder.orderId)}`);
        if (!res.ok) return;
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          return;
        }
        if (!isSubscribed) return;

        if (data.success && (data.order?.status === 'COMPLETED' || data.order?.status === 'PAID')) {
          clearInterval(interval);
          try {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } catch {}

          setPaymentNotice({
            type: 'success',
            message: `🎉 Payment Confirmed! UTR: ${data.order.utr || 'OK'}. Your account has been upgraded!`,
          });

          if (onUpgradeSuccess) {
            onUpgradeSuccess(data.order, activeOrder.plan);
          }

          setTimeout(() => {
            if (onClose) onClose();
          }, 2500);
        }
      } catch (pollErr) {
        console.debug('Order status check poll:', pollErr.message);
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeOrder, onUpgradeSuccess, onClose]);

  // Countdown timer
  useEffect(() => {
    if (!activeOrder) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeOrder]);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    setPaymentNotice(null);

    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('dakly_token') ||
        sessionStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/payments/create-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: selectedPlan.id,
          priceRupees: selectedPlan.priceRupees,
          credits: selectedPlan.credits || 0,
          plan: selectedPlan.plan || (selectedPlan.id.startsWith('pro') ? 'pro' : 'free'),
          cycle: selectedPlan.cycle || (selectedPlan.id === 'pro-yearly' ? 'yearly' : 'monthly'),
          projectId: project?.id || project?._id || '',
        }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned unexpected response (HTTP ${res.status}): ${responseText.substring(0, 80) || 'Empty response'}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment session.');
      }

      const orderPayload = {
        orderId: data.orderId,
        amount: selectedPlan.priceRupees,
        paymentId: data.paymentId,
        checkoutUrl: data.checkoutUrl,
        payeeVpa: '9923092340@ptaxis',
        payeeName: 'dakly',
        plan: selectedPlan,
      };

      setActiveOrder(orderPayload);
      setCountdown(600);

      // Launch dedicated popup window (resilient to all CSP & iframe restrictions)
      try {
        const popup = window.open(
          data.checkoutUrl,
          'YoupiCheckoutWindow',
          'width=480,height=750,left=150,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        );
        if (popup && popup.focus) {
          popup.focus();
        }
      } catch (popupErr) {
        console.warn('Popup blocked by browser, using in-modal QR and direct links:', popupErr.message);
      }
    } catch (err) {
      console.error('Checkout creation error:', err);
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Could not initiate UPI checkout. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyVpa = (vpa) => {
    try {
      navigator.clipboard.writeText(vpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {
      // fallback
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Build standard UPI intent deep-link
  const upiIntentUri = activeOrder
    ? `upi://pay?pa=${encodeURIComponent(activeOrder.payeeVpa)}&pn=${encodeURIComponent(
        activeOrder.payeeName
      )}&am=${encodeURIComponent(Number(activeOrder.amount).toFixed(2))}&cu=INR&tn=${encodeURIComponent(
        activeOrder.orderId
      )}`
    : '';

  return (
    <Dialog
      title={activeOrder ? 'Sovereign UPI Checkout' : 'Pricing & Sending Upgrades'}
      busy={isProcessing}
      onClose={onClose}
      className="dialog-wide max-w-4xl"
    >
      <div className="legacy-dialog-content space-y-5">
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

        {/* VIEW 1: ACTIVE ORDER / UPI QR PAYMENT SCREEN */}
        {activeOrder ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose a different plan</span>
              </button>

              <div className="flex items-center space-x-2 text-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Awaiting UPI Payment ({formatSeconds(countdown)})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Left Column: Official High-Res Vector Stand SVG QR */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center">
                <div className="relative group max-w-[280px] w-full rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-white/10 bg-white">
                  <img
                    src={`https://dakly-pay.fly.dev/stand/qr.svg?amount=${encodeURIComponent(
                      activeOrder.amount
                    )}`}
                    alt="Sovereign UPI QR Code"
                    className="w-full h-auto block"
                    loading="eager"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                  Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app.
                </p>
              </div>

              {/* Right Column: Order Details & Direct Payment Actions */}
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Plan Selected:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {activeOrder.plan.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Amount Due:</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{activeOrder.amount}.00
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Order Reference:</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {activeOrder.orderId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-white/10">
                    <span className="text-slate-500">Payee UPI ID:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {activeOrder.payeeVpa}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyVpa(activeOrder.payeeVpa)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition"
                        title="Copy UPI ID"
                      >
                        {copiedVpa ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Actions: Intent App & Popup Window */}
                <div className="space-y-2 pt-1">
                  <a
                    href={upiIntentUri}
                    className="button button-primary w-full flex items-center justify-center space-x-2 py-2.5"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay with Mobile UPI App</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        activeOrder.checkoutUrl,
                        'YoupiCheckoutWindow',
                        'width=480,height=750,left=150,top=60,resizable=yes,scrollbars=yes'
                      );
                    }}
                    className="button button-outline w-full flex items-center justify-center space-x-2 py-2 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Gateway Checkout Window</span>
                  </button>
                </div>

                {/* Live Polling Status Indicator */}
                <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 py-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-500" />
                  <span>Listening for payment confirmation... Zero fees.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: PLAN & CREDIT PACK SELECTION CATALOG */
          <>
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
                      <span>Generating UPI Order…</span>
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
          </>
        )}
      </div>
    </Dialog>
  );
}
