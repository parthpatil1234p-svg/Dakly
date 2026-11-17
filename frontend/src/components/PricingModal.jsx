import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  QrCode,
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
    id: 'scale-pack',
    name: 'Scale Credits Pack',
    category: 'credits',
    badge: 'BEST VALUE',
    badgeColor: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 font-bold',
    priceRupees: 499,
    interval: 'one-time',
    plan: null,
    cycle: null,
    credits: 50000,
    tagline: '50,000 permanent email credits for high-volume apps.',
    features: [
      '50,000 extra email credits (₹0.009 / email)',
      'Permanent validity with zero expiry',
      'Stacks directly on top of daily Gmail quota',
      'Priority delivery queue & burst protection',
    ],
  },
];

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

    try {
      const token =
        localStorage.getItem('dakly_auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('dakly_token') ||
        sessionStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Step 1: Create Order on Razorpay via backend
      const res = await fetch(`${API_BASE_URL}/api/payments/razorpay/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: selectedPlan.id,
          priceRupees: selectedPlan.priceRupees,
          credits: selectedPlan.credits || 0,
          category: selectedPlan.category,
          plan: selectedPlan.category === 'plans' ? 'pro' : null,
          cycle: selectedPlan.cycle || (selectedPlan.id === 'pro-yearly' ? 'yearly' : 'monthly'),
          projectId: project?.id || project?._id || '',
        }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned unexpected response (HTTP ${res.status}): ${responseText.substring(0, 80) || 'Empty response'}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize Razorpay checkout.');
      }

      // Step 2: Ensure Razorpay SDK is loaded
      if (typeof window.Razorpay === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Razorpay payment SDK'));
          document.body.appendChild(script);
        });
      }

      // Step 3: Open Razorpay Checkout modal
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Dakly',
        description: `${selectedPlan.name} (${selectedPlan.tagline})`,
        image: '/dakly-mark.svg',
        order_id: data.razorpayOrderId,
        prefill: {
          name: user?.name || user?.email?.split('@')[0] || 'Dakly Developer',
          email: user?.email || '',
        },
        theme: {
          color: '#10b981', // Brand emerald
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            if (onCancelReopen) {
              onCancelReopen();
            }
          },
        },
        handler: async function (response) {
          try {
            // Step 4: Verify payment signature on backend
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/razorpay/verify`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                projectId: project?.id || project?._id || '',
                planId: selectedPlan.id,
                category: selectedPlan.category,
                plan: selectedPlan.category === 'plans' ? 'pro' : null,
                cycle: selectedPlan.cycle || (selectedPlan.id === 'pro-yearly' ? 'yearly' : 'monthly'),
                creditsToAdd: selectedPlan.credits || 0,
              }),
            });

            const verifyText = await verifyRes.text();
            let verifyData;
            try {
              verifyData = JSON.parse(verifyText);
            } catch {
              throw new Error('Invalid verification response from server');
            }

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            try {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            } catch {}

            window.dispatchEvent(
              new CustomEvent('dakly:payment:success', {
                detail: {
                  order_id: data.orderId,
                  payment_id: response.razorpay_payment_id,
                },
              })
            );

            if (onUpgradeSuccess) {
              onUpgradeSuccess(verifyData.order, selectedPlan);
            }
          } catch (verifyErr) {
            console.error('Razorpay verification error:', verifyErr);
            alert(`Payment completed (ID: ${response.razorpay_payment_id}), but verification failed: ${verifyErr.message}`);
          } finally {
            setIsProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failResp) {
        alert(`Payment failed: ${failResp.error?.description || 'Transaction could not be completed.'}`);
        setIsProcessing(false);
        if (onCancelReopen) {
          onCancelReopen();
        }
      });

      // Close the PricingModal dialog so HTML5 <dialog> top layer does not cover Razorpay checkout
      if (onClose) {
        onClose();
      }

      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setPaymentNotice({
        type: 'error',
        message: err.message || 'Could not initiate Razorpay checkout. Please try again.',
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      title="Pricing & Sending Upgrades"
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

        {/* Header / Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono tracking-wider text-brand-600 dark:text-brand-400 font-bold">
                Razorpay Checkout
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>100% Secure &amp; Instant</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Upgrade your developer pass or top up email credits via UPI (GPay, PhonePe, Paytm), Cards &amp; Netbanking.
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
                  <span className="text-slate-500">Instant activation</span>
                  <span className={`font-semibold ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
                    {isSelected ? '● Selected' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Razorpay Action Footer */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>UPI QR &amp; Apps (GPay, PhonePe, Paytm, CRED)</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Cards &amp; Netbanking</span>
            </span>
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
                  <span>Opening Razorpay Checkout…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Pay ₹{selectedPlan?.priceRupees} via Razorpay</span>
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
