import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield, BookOpen, Calendar, Brain, CheckCircle2, AlertTriangle,
  ArrowRight, ChevronDown, Star, Zap, Crown, Check, Mail,
} from "lucide-react";
import Logo from "@/components/Logo";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const DISCLAIMER =
  "Trading involves significant risk of loss and is not suitable for all investors. This tool is for educational and decision-support purposes only — not financial advice. Past performance is not indicative of future results.";

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

const STATS = [
  { value: "39", label: "Structured Lessons" },
  { value: "24hr", label: "Drawdown Lock" },
  { value: "3", label: "Subscription Tiers" },
  { value: "Free", label: "To Get Started" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create Your Free Account",
    desc: "Sign up in under 60 seconds — no credit card needed. Access the first 5 lessons, the daily planner, and 3 AI mentor questions per day instantly.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    step: "02",
    title: "Complete Your Morning Routine",
    desc: "Each trading day starts with a 4-step pre-session checklist — market bias, news scan, hydration, breathing. The app locks you out of tools until you finish.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    step: "03",
    title: "Trade With Risk Shield",
    desc: "The Risk Shield calculates your exact position size, tracks your daily loss limit, and automatically locks you out for 24 hours if you hit the drawdown threshold.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Risk Shield",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    desc: "Your personal risk guardian. Works like an air-traffic controller watching your account — stops small mistakes from becoming disasters.",
    bullets: [
      "Position-size calculator based on your exact risk rules",
      "Daily loss limit: lose 2%? App locks you out for 24 hours",
      "Drawdown shield tracks prop-firm balance in real time",
      "Focus Mode blocks distractions during live sessions",
    ],
  },
  {
    icon: Brain,
    title: "AI Mentor",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    desc: "A private ICT tutor available 24/7. Ask anything, get plain-language answers, and build real knowledge — not just guesses.",
    bullets: [
      "39 structured lessons from zero to advanced ICT",
      "Adaptive quiz that adjusts to your skill level",
      "16-term glossary in plain, simple language",
      "AI answers any trading question, any time",
    ],
  },
  {
    icon: Calendar,
    title: "Daily Planner",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    desc: "Great traders don't wing it. The Daily Planner walks you through a morning routine before you touch the market — like a pilot's pre-flight checklist.",
    bullets: [
      "4-step pre-session checklist before you can trade",
      "Live countdowns to London, NY Open, and Silver Bullet windows",
      "News-event warnings flag high-risk periods automatically",
      "Custom routine items you can add yourself",
    ],
  },
  {
    icon: BookOpen,
    title: "Smart Journal",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    desc: "Log every trade and see the truth about your behavior. Patterns that cost you money become visible — so you can fix them.",
    bullets: [
      "Entry checklist so you only trade when criteria are met",
      "Behavior tags: discipline, FOMO, revenge trading",
      "Pattern analysis shows what's hurting your results",
      "Monk Mode removes distractions during reviews",
    ],
  },
];

const FAQS = [
  {
    q: "What exactly is The Trading Mentor?",
    a: "The Trading Mentor is a decision-support tool for futures traders who follow the Inner Circle Trader (ICT) methodology. It combines a structured course (39 lessons), an AI-powered mentor, a daily planner with pre-session checklists, a smart trading journal, and a risk shield that enforces hard drawdown limits. It is not a trading signal service or broker.",
  },
  {
    q: "Is this financial advice?",
    a: "No. The Trading Mentor is an educational and decision-support tool only. It does not provide investment advice, trading signals, or recommendations to buy or sell any financial instrument. All trading decisions remain entirely yours. Trading futures involves significant risk of loss.",
  },
  {
    q: "What's included in the free tier?",
    a: "The free tier gives you access to the first 5 ICT Academy lessons, the daily planner, 3 AI mentor questions per day, and the daily spin wheel. No credit card is required to sign up.",
  },
  {
    q: "How does billing work? Can I cancel?",
    a: "Paid plans are billed monthly or annually via Stripe — a secure, PCI-compliant payment processor. You can cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. See our Refund Policy for full details.",
  },
  {
    q: "What is the 24-hour drawdown lock?",
    a: "If your account hits the daily loss threshold you set (default 2%), the app locks you out of all trading tools for 24 hours. This is designed to prevent emotional revenge trading after a losing session. The lock is a feature, not a punishment.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe. All payment data is handled directly by Stripe and is never stored on our servers.",
  },
];

export default function Welcome() {
  const [annual, setAnnual] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tiersError, setTiersError] = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        setTiers(data.tiers || []);
        setTiersLoading(false);
      })
      .catch(() => {
        setTiersError(true);
        setTiersLoading(false);
      });
  }, []);

  function getMonthlyEquivalent(tier: Tier) {
    if (tier.level === 0) return 0;
    return annual
      ? parseFloat(tier.annualPrice) / 12
      : parseFloat(tier.monthlyPrice);
  }

  const tierIcons = [Star, Zap, Crown];
  const tierAccents = [
    { border: "border-border", badge: "", glow: "" },
    { border: "border-primary/60", badge: "Most Popular", glow: "shadow-[0_0_30px_rgba(0,200,150,0.12)]" },
    { border: "border-amber-500/60", badge: "Full Access", glow: "shadow-[0_0_30px_rgba(245,158,11,0.12)]" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log In
            </Link>
            <Link
              to="/signup"
              className="text-sm bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Stat strip ── */}
        <section className="border-y border-border bg-card/40 px-6 py-8">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-primary mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Welcome Video ── */}
        <section className="px-6 py-14 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mb-3">See It In Action</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
              Meet Your AI Trading Mentor
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto text-sm">
              Watch a quick walkthrough of the platform and see exactly how The Trading Mentor helps you trade with structure and discipline.
            </p>
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
              <div
                className="w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}dashboard-preview.png`}
                    alt="The Trading Mentor Dashboard Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.classList.add("bg-gradient-to-br", "from-primary/10", "via-card", "to-secondary");
                    }}
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Coming Soon
                </span>
              </div>
              <div className="absolute bottom-4 left-4">
                <p className="text-white/80 text-sm font-medium">Full walkthrough video</p>
                <p className="text-white/50 text-xs">Watch how The Trading Mentor transforms your trading routine</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mb-3">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
              Three Steps to Trading Discipline
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-sm">
              No complex setup. No trading signals. Just a system that keeps you accountable to your own rules.
            </p>

            <div className="grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="relative bg-card border border-border rounded-2xl p-7 flex flex-col gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <span className={`text-xl font-extrabold ${item.color}`}>{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-16 sm:py-20 bg-card/30 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mb-3">Features</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
              Everything You Need to Trade with Discipline
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-sm">
              Built on the ICT methodology. Designed to keep you safe, focused, and improving every session.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={`bg-card border ${f.border} rounded-2xl p-7`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${f.color}`} />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{f.desc}</p>
                    <ul className="space-y-2">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex gap-2 text-sm text-foreground/85">
                          <CheckCircle2 className={`h-4 w-4 ${f.color} shrink-0 mt-0.5`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto text-sm">
              Start free — no credit card required. Upgrade when you're ready for full access.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <button
                onClick={() => setAnnual((a) => !a)}
                className={`relative w-11 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-secondary border border-border"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
                Annual
                <span className="ml-1.5 text-xs text-primary font-bold">Save 17%</span>
              </span>
            </div>

            {tiersLoading ? (
              <div className="grid gap-6 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-7 animate-pulse h-64" />
                ))}
              </div>
            ) : tiersError ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-sm mb-4">
                  Pricing information is temporarily unavailable. Please try refreshing.
                </p>
                <button
                  onClick={() => {
                    setTiersError(false);
                    setTiersLoading(true);
                    fetch(`${API_BASE}/subscriptions/tiers`)
                      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
                      .then((data) => { setTiers(data.tiers || []); setTiersLoading(false); })
                      .catch(() => { setTiersError(true); setTiersLoading(false); });
                  }}
                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-3">
                {tiers.sort((a, b) => a.level - b.level).map((tier, i) => {
                  const Icon = tierIcons[Math.min(i, tierIcons.length - 1)];
                  const accent = tierAccents[Math.min(i, tierAccents.length - 1)];
                  const monthlyEq = getMonthlyEquivalent(tier);
                  const isFree = tier.level === 0;

                  return (
                    <div
                      key={tier.id}
                      className={`relative bg-card border ${accent.border} rounded-2xl p-7 flex flex-col ${accent.glow}`}
                    >
                      {accent.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                          {accent.badge}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-4">
                        <Icon className={`h-5 w-5 ${i === 0 ? "text-muted-foreground" : i === 1 ? "text-primary" : "text-amber-400"}`} />
                        <span className="font-bold text-foreground">{tier.name}</span>
                      </div>

                      <div className="mb-4">
                        {isFree ? (
                          <div className="text-4xl font-extrabold text-foreground">Free</div>
                        ) : (
                          <>
                            <div className="flex items-end gap-1">
                              <span className="text-4xl font-extrabold text-foreground">
                                ${monthlyEq.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground text-sm mb-1">/mo</span>
                            </div>
                            {annual && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Billed ${parseFloat(tier.annualPrice).toFixed(2)}/year
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{tier.description}</p>

                      <ul className="space-y-2.5 flex-1 mb-6">
                        {(tier.features as string[]).map((feat) => (
                          <li key={feat} className="flex gap-2 text-sm text-foreground/85">
                            <Check className={`h-4 w-4 shrink-0 mt-0.5 ${i === 0 ? "text-muted-foreground" : i === 1 ? "text-primary" : "text-amber-400"}`} />
                            {feat}
                          </li>
                        ))}
                      </ul>

                      <Link
                        to="/signup"
                        className={`text-center text-sm font-bold py-3 rounded-xl transition-all ${
                          i === 1
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : i === 2
                            ? "bg-amber-500 text-black hover:opacity-90"
                            : "bg-secondary border border-border text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {isFree ? "Get Started Free" : "Start Free Trial"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              All payments processed securely by <span className="text-foreground font-medium">Stripe</span>. Cancel anytime. No hidden fees.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="px-6 py-16 sm:py-20 bg-card/30 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mb-3">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
              Common Questions
            </h2>

            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-foreground hover:bg-secondary/30 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 ml-3 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-6 py-16 sm:py-24 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(0,200,150,0.10),transparent)]" />
          <div className="relative max-w-2xl mx-auto">
            <Logo size={56} className="mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Ready to Trade With Discipline?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Join traders who are using The Trading Mentor to build consistent habits, protect their capital, and learn the ICT methodology properly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all text-base shadow-[0_0_24px_rgba(0,200,150,0.25)]"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Compare plans
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/60 px-6 pt-10 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Footer top */}
          <div className="grid gap-8 sm:grid-cols-3 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Logo size={26} />
                <span className="font-bold text-foreground text-sm">The Trading Mentor</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                A decision-support tool for futures traders following the ICT methodology. Not a broker. Not a signal service. Not financial advice.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: "Terms of Service", to: "/terms" },
                  { label: "Privacy Policy", to: "/privacy" },
                  { label: "Refund Policy", to: "/refund" },
                  { label: "Risk Disclosure", to: "/risk-disclosure" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Support</p>
              <a
                href="mailto:support@ictradingmentor.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@ictradingmentor.com
              </a>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Response within 1–2 business days.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/signup" className="text-xs bg-primary/10 border border-primary/30 text-primary font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                  Sign Up Free
                </Link>
                <Link to="/login" className="text-xs bg-secondary border border-border text-foreground font-semibold px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
                  Log In
                </Link>
              </div>
            </div>
          </div>

          {/* Risk disclaimer in footer */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-xs text-amber-500 mb-6">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{DISCLAIMER}</span>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} The Trading Mentor. All rights reserved. For educational and decision-support purposes only.</span>
            <span>Payments secured by Stripe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
