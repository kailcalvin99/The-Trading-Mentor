import { Link } from "react-router-dom";
import { Shield, BookOpen, Calendar, Brain, CheckCircle2, AlertTriangle, ArrowRight, Lock } from "lucide-react";
import Logo from "@/components/Logo";

const DISCLAIMER =
  "Trading involves significant risk of loss and is not suitable for all investors. This tool is for educational and decision-support purposes only — not financial advice.";

export default function Welcome() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold text-foreground text-base hidden sm:inline">ICT Trading Mentor</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="text-sm bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-16 sm:py-24 text-center max-w-3xl mx-auto">
          <Logo size={72} className="mx-auto mb-6" />
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
            ICT Trading Mentor
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-3 max-w-2xl mx-auto leading-relaxed">
            A Decision Support Tool for traders — not financial advice.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-8 max-w-xl mx-auto">
            Learn the ICT methodology, build disciplined habits, and protect your capital with
            aviation-style safety checks — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/signup"
              className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-base"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Already have an account? Log in
            </Link>
          </div>

          <div className="inline-flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-600 dark:text-amber-400 text-left max-w-xl">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="font-medium">{DISCLAIMER}</span>
          </div>
        </section>

        <section className="px-6 py-14 bg-card/40 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
              Everything You Need to Trade with Discipline
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
              Built on the ICT methodology. Designed to keep you safe, focused, and improving every day.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Risk Shield</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Your personal risk guardian. Risk Shield watches your account like an air-traffic
                  controller watching the skies — so small mistakes don't turn into disasters.
                </p>
                <ul className="space-y-2">
                  {[
                    "Position-size calculator based on your exact risk rules",
                    "Daily loss limit: lose 2%? The app locks you out for 24 hours",
                    "Drawdown shield tracks your prop-firm balance in real time",
                    "Focus Mode blocks distractions during live sessions",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">AI Mentor</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  A private tutor available 24/7. Ask anything about ICT concepts, get plain-language
                  answers, and build real knowledge — not just guesses.
                </p>
                <ul className="space-y-2">
                  {[
                    "39 structured lessons from zero to advanced ICT",
                    "Adaptive quiz that adjusts to your level",
                    "16-term glossary in plain, simple language",
                    "AI answers any trading question, any time",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Daily Planner</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Great traders don't wing it. The Daily Planner walks you through a morning
                  routine before you touch the market — like a pilot's pre-flight checklist.
                </p>
                <ul className="space-y-2">
                  {[
                    "4-step pre-session checklist before you can trade",
                    "Live countdowns to London, NY Open, and Silver Bullet windows",
                    "News-event warnings flag high-risk periods automatically",
                    "Custom routine items you can add yourself",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Smart Journal</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Log every trade and see the truth about your behavior. Patterns that cost you money
                  become visible — so you can fix them.
                </p>
                <ul className="space-y-2">
                  {[
                    "Entry checklist so you only trade when criteria are met",
                    "Behavior tags: discipline, FOMO, revenge trading",
                    "Pattern analysis shows what's hurting your results",
                    "Monk Mode removes distractions during reviews",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-14 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Aviation-Style Safety Checks
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Pilots don't skip their checklist, no matter how experienced they are. ICT Trading Mentor
            builds the same discipline into every trading session.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: "✈️",
                title: "Pre-Flight Checklist",
                desc: "Complete your morning routine before the market opens — every single day.",
              },
              {
                icon: "🛡️",
                title: "24-Hour Drawdown Lock",
                desc: "Hit your daily loss limit and the app shuts you down before you dig a deeper hole.",
              },
              {
                icon: "🎯",
                title: "Position-Size Guardrails",
                desc: "The calculator tells you exactly how many contracts to take so you never oversize.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-secondary/40 border border-border rounded-2xl px-5 py-6 text-left"
              >
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-14 bg-primary/5 border-y border-border text-center">
          <div className="max-w-xl mx-auto">
            <Lock className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Your Vault Stays Closed Until You Log In
            </h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              The calculators, journal, dashboard, and all your trading data are only accessible
              after you sign in. Sign up is free — no credit card required to get started.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Create Your Free Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-600 dark:text-amber-400 mb-5">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="font-semibold">{DISCLAIMER}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} ICT Trading Mentor. For educational purposes only.</span>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/terms" className="hover:text-foreground transition-colors underline">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors underline">
                Privacy Policy
              </Link>
              <Link to="/refund" className="hover:text-foreground transition-colors underline">
                Refund Policy
              </Link>
              <Link to="/risk-disclosure" className="hover:text-foreground transition-colors underline">
                Risk Disclosure
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
