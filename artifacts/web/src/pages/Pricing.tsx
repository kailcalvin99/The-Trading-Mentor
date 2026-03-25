import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Check, Crown, Sparkles, Zap, Star, ArrowLeft, CheckCircle2, XCircle, Shield } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface Tier {
  id: number;
  name: string;
  level: number;
  monthlyPrice: string;
  annualPrice: string;
  annualDiscountPct: number;
  features: string[];
  description: string;
}

export default function Pricing() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [annual, setAnnual] = useState(false);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState(0);
  const [founderLimit, setFounderLimit] = useState(20);
  const [founderDiscountPct, setFounderDiscountPct] = useState(50);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const { user, subscription, refreshUser, isAdmin, tierLevel } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const paymentSuccess = searchParams.get("success") === "1";
  const paymentCanceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    if (paymentSuccess) {
      refreshUser();
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
    if (paymentCanceled) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [paymentSuccess, paymentCanceled]);

  useEffect(() => {
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => r.json())
      .then((data) => {
        setTiers(data.tiers);
        setFounderSpotsLeft(data.founderSpotsLeft);
        setFounderLimit(data.founderLimit || 20);
        setFounderDiscountPct(data.founderDiscountPct);
      })
      .catch(() => {});
  }, []);

  async function handleUpgrade(tierId: number, tierLevel: number) {
    if (!user) {
      navigate("/signup");
      return;
    }
    setSubscribing(tierId);
    try {
      if (tierLevel === 0) {
        const res = await fetch(`${API_BASE}/subscriptions/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tierId, billingCycle: annual ? "annual" : "monthly" }),
        });
        if (res.ok) {
          await refreshUser();
          navigate("/");
        }
      } else {
        const res = await fetch(`${API_BASE}/subscriptions/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tierId, billingCycle: annual ? "annual" : "monthly" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error("Checkout error:", errData.error);
        }
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    }
    setSubscribing(null);
  }

  const tierColors = ["text-muted-foreground", "text-primary", "text-amber-500"];
  const tierBorders = ["border-border", "border-primary/50", "border-amber-500/50"];
  const tierBgs = ["bg-card", "bg-card", "bg-gradient-to-b from-amber-500/5 to-card"];
  const tierIcons = [Star, Zap, Crown];

  function getPrice(tier: Tier) {
    const basePrice = annual ? parseFloat(tier.annualPrice) / 12 : parseFloat(tier.monthlyPrice);
    if (user?.isFounder && tier.level > 0) {
      return basePrice * (1 - founderDiscountPct / 100);
    }
    return basePrice;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Choose Your Plan</span>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Trading involves significant risk of loss and is not suitable for all investors. Past performance is not indicative of future results.
          </p>
        </div>

        {paymentSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8 flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-500">Payment successful!</p>
              <p className="text-xs text-muted-foreground">Your plan has been upgraded. Welcome aboard!</p>
            </div>
          </div>
        )}

        {paymentCanceled && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-8 flex items-center gap-3 animate-in fade-in duration-300">
            <XCircle className="h-6 w-6 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-500">Payment canceled</p>
              <p className="text-xs text-muted-foreground">No charges were made. You can try again anytime.</p>
            </div>
          </div>
        )}

        {user?.isFounder && (
          <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-500">Founder Member #{user.founderNumber}</p>
              <p className="text-xs text-muted-foreground">You get {founderDiscountPct}% off any paid plan for 6 months!</p>
            </div>
          </div>
        )}

        {founderSpotsLeft > 0 && !user?.isFounder && (
          <div className="mb-8 max-w-md mx-auto">
            <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">Founder Phase 1</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{founderLimit - founderSpotsLeft} of {founderLimit} spots claimed</span>
                <span className="text-amber-500 font-bold">{founderSpotsLeft} left</span>
              </div>
              <div className="w-full h-2.5 bg-background/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-700"
                  style={{
                    width: `${((founderLimit - founderSpotsLeft) / founderLimit) * 100}%`,
                    boxShadow: "0 0 8px rgba(212, 175, 55, 0.5)",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Founder pricing ends when all spots are claimed — price locks in for life once you join
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${annual ? "translate-x-7.5" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
            Annual
            <span className="ml-1.5 text-xs text-primary font-bold">Save 17%</span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => {
            const Icon = tierIcons[i] || Star;
            const price = getPrice(tier);
            const isCurrentTier = isAdmin ? tier.level === tierLevel : subscription?.tierId === tier.id;
            const originalPrice = annual ? parseFloat(tier.annualPrice) / 12 : parseFloat(tier.monthlyPrice);
            const hasFounderDiscount = user?.isFounder && tier.level > 0;

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border-2 ${tierBorders[i]} ${tierBgs[i]} p-6 flex flex-col ${tier.level === 2 ? "ring-2 ring-amber-500/30" : ""}`}
              >
                {tier.level === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${tierColors[i]}`} />
                  <h3 className={`text-lg font-bold ${tierColors[i]}`}>{tier.name}</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{tier.description}</p>

                <div className="mb-6">
                  {tier.level > 0 && (
                    <div className="text-sm text-muted-foreground line-through mb-0.5">
                      ${(originalPrice * 2).toFixed(2)}/mo
                    </div>
                  )}
                  {hasFounderDiscount && (
                    <div className="text-xs text-muted-foreground line-through mb-0.5">
                      ${originalPrice.toFixed(2)}/mo
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">${price.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {annual && tier.level > 0 && (
                    <p className="text-xs text-primary mt-1">
                      Billed ${(annual ? parseFloat(tier.annualPrice) * (hasFounderDiscount ? 1 - founderDiscountPct / 100 : 1) : 0).toFixed(2)}/year
                    </p>
                  )}
                  {hasFounderDiscount && (
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 mt-2">
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-500">{founderDiscountPct}% FOUNDER DISCOUNT</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {(tier.features as string[]).map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tierColors[i]}`} />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {!isAdmin && (
                  <button
                    onClick={() => handleUpgrade(tier.id, tier.level)}
                    disabled={isCurrentTier || subscribing === tier.id}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      isCurrentTier
                        ? "bg-muted text-muted-foreground cursor-default"
                        : tier.level === 2
                          ? "bg-gradient-to-r from-amber-500 to-primary text-white hover:opacity-90"
                          : tier.level === 1
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {subscribing === tier.id ? (
                      <div className="h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : isCurrentTier ? (
                      "Current Plan"
                    ) : tier.level === 0 ? (
                      "Downgrade to Free"
                    ) : (
                      `Upgrade to ${tier.name}`
                    )}
                  </button>
                )}
                {isAdmin && isCurrentTier && (
                  <div className="w-full py-3 rounded-xl font-bold text-center bg-muted text-muted-foreground cursor-default">
                    Current Plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/refund" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Shield className="h-4 w-4" />
            7-Day Money-Back Guarantee
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60 max-w-md mx-auto">
            ICT Trading Mentor is an educational platform. Content is for informational purposes only and does not constitute financial advice. Trading involves substantial risk of loss and is not suitable for all investors.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground/50">
            <Link to="/terms" className="hover:text-muted-foreground transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link to="/refund" className="hover:text-muted-foreground transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
