import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Lock,
  ChevronRight,
} from "lucide-react";
import {   createPaymentOrder,verifyPayment, } from "../api.js";

const plans = [
  {
    name: "Starter",
    price: 49,
    credits: 10,
    description: "For occasional codebase exploration",
  },
  {
    name: "Pro",
    price: 99,
    credits: 30,
    description: "For developers who explore regularly",
    popular: true,
  },
  {
    name: "Power",
    price: 249,
    credits: 100,
    description: "For heavy development workflows",
  },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function UpgradePrompt({ onUnlocked }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plans[1]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const openCheckout = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
    setSuccess(false);
    setError(null);
  };


const handlePayment = async () => {
  setLoading(true);
  setError(null);

  try {
    const loaded = await loadRazorpayScript();

    if (!loaded) {
      throw new Error("Unable to load Razorpay Checkout.");
    }

    const planId = selectedPlan.name.toLowerCase();

    // Create the order on the backend.
    const order = await createPaymentOrder(planId);

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Codebase Explainer",
      description: `${selectedPlan.name} Plan`,
      order_id: order.orderId,

      handler: async (response) => {
        try {
          // Credits are granted only after backend verification.
          await verifyPayment(response);

          setSuccess(true);

          setTimeout(() => {
            onUnlocked?.();
            setShowCheckout(false);
            setSuccess(false);
          }, 1200);
        } catch (err) {
          setError(
            err.message ||
              "Payment verification failed. Please contact support if you were charged."
          );
        } finally {
          setLoading(false);
        }
      },

      theme: {
        color: "#8b5cf6",
      },

      modal: {
        ondismiss: () => setLoading(false),
      },
    });

    checkout.on("payment.failed", (response) => {
      setError(
        response.error?.description ||
          "Payment failed. Please try again."
      );
      setLoading(false);
    });

    checkout.open();
  } catch (err) {
    setError(err.message || "Unable to start payment.");
    setLoading(false);
  }
};


  return (
    <>
      {/* Original upgrade card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative">
          <div className="mb-1 flex items-center gap-2 text-violet-300">
            <Sparkles size={16} />
            <span className="text-sm font-semibold">Free trial completed</span>
          </div>

          <p className="mb-4 text-sm leading-6 text-slate-400">
            You've used your free allowance. Upgrade to continue exploring
            repositories and asking AI-powered questions.
          </p>

          <button
            onClick={() => openCheckout(plans[1])}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-violet-500/30"
          >
            <Zap size={15} />
            View upgrade plans
            <ChevronRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>

      {/* Checkout overlay */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Background */}
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" />

          {/* Glow effects */}
          <div className="pointer-events-none fixed left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

          <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-2xl">
              {/* Top glow */}
              <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />

              {/* Header */}
              <div className="border-b border-white/10 px-6 py-5 sm:px-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-sm font-semibold text-white">
                        Codebase Explainer
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
                      Upgrade your workspace
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Choose a plan that fits your development workflow.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowCheckout(false)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
                {/* Plans */}
                <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  {!success ? (
                    <>
                      <div className="mb-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                          Choose your plan
                        </p>
                      </div>

                      <div className="space-y-3">
                        {plans.map((plan) => {
                          const selected = selectedPlan.name === plan.name;

                          return (
                            <button
                              key={plan.name}
                              onClick={() => setSelectedPlan(plan)}
                              className={`relative w-full rounded-2xl border p-5 text-left transition-all ${
                                selected
                                  ? "border-violet-400/60 bg-violet-500/[0.10] shadow-lg shadow-violet-500/10"
                                  : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                              }`}
                            >
                              {plan.popular && (
                                <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-violet-400/20 bg-violet-500/15 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                                  Most Popular
                                </span>
                              )}

                              <div className={`flex items-start gap-4 ${plan.popular ? 'pt-3' : ''}`}>
                                <div
                                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    selected
                                      ? "border-violet-400 bg-violet-500"
                                      : "border-slate-600"
                                  }`}
                                >
                                  {selected && (
                                    <Check size={12} className="text-white" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <h3 className="font-semibold text-white">
                                        {plan.name}
                                      </h3>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {plan.description}
                                      </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <div className="text-xl font-bold text-white">
                                        ₹{plan.price}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        one-time
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center gap-2 text-sm">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                                      <Zap size={14} />
                                    </div>
                                    <span className="font-medium text-slate-200">
                                      {plan.credits} credits
                                    </span>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-slate-500">
                                      Never expires
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4">
                        <ShieldCheck
                          size={19}
                          className="shrink-0 text-emerald-400"
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-300">
                            Secure & transparent
                          </p>
                          <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                            Your credits never expire and can be used whenever
                            you need them.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
                        <Check size={38} className="text-emerald-400" />
                      </div>

                      <h2 className="mt-6 text-2xl font-bold text-white">
                        You're all set!
                      </h2>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                        {selectedPlan.credits} credits have been added to your
                        account. You can continue exploring your codebase.
                      </p>
                    </div>
                  )}
                </div>

                {/* Order summary / checkout */}
                <div className="bg-black/10 p-6 sm:p-8">
                  {!success && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Order summary
                      </p>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">
                              {selectedPlan.name} Plan
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {selectedPlan.credits} credits
                            </p>
                          </div>

                          <span className="text-xl font-bold text-white">
                            ₹{selectedPlan.price}
                          </span>
                        </div>

                        <div className="my-5 h-px bg-white/10" />

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Credits</span>
                            <span className="text-slate-300">
                              {selectedPlan.credits}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Expiration</span>
                            <span className="text-slate-300">Never</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="text-slate-300">
                              ₹{selectedPlan.price}
                            </span>
                          </div>
                        </div>

                        <div className="my-5 h-px bg-white/10" />

                        <div className="flex items-end justify-between">
                          <span className="text-sm text-slate-400">Total</span>
                          <span className="text-3xl font-bold text-white">
                            ₹{selectedPlan.price}
                          </span>
                        </div>
                      </div>

                      {/* Demo payment method */}
                      <div className="mt-5">
                        <label className="text-xs font-medium text-slate-400">
                          Payment method
                        </label>

                        <div className="mt-2 flex items-center justify-between rounded-xl border border-violet-400/30 bg-violet-500/[0.07] p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                              <CreditCard size={17} />
                            </div>

                            <div>
                              <p className="text-sm font-medium text-white">
                                Demo Checkout
                              </p>
                              <p className="text-[11px] text-slate-500">
                                No real payment will be charged
                              </p>
                            </div>
                          </div>

                          <Check size={17} className="text-violet-300" />
                        </div>
                      </div>

                      {error && (
                        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
                          {error}
                        </div>
                      )}

                      <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Lock size={15} />
                            Pay ₹{selectedPlan.price}
                          </>
                        )}
                      </button>

                      <p className="mt-4 text-center text-[10px] leading-5 text-slate-600">
                        By continuing, you agree to the demo purchase terms.
                        <br />
                        This is a simulated checkout for demonstration purposes.
                      </p>

                      <button
                        onClick={() => setShowCheckout(false)}
                        disabled={loading}
                        className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-slate-500 transition hover:text-white"
                      >
                        <ArrowLeft size={13} />
                        Back to workspace
                      </button>
                    </>
                  )}

                  {success && (
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                          <ShieldCheck size={22} />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-white">
                          Payment confirmed
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Updating your workspace...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
