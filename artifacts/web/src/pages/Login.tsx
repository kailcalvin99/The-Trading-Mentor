import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import Logo from "@/components/Logo";
import { Eye, EyeOff, LogIn, TrendingUp, Zap, Trophy, BrainCircuit, Bot, Sparkles, Rocket, Star, GraduationCap, Shield, Calendar, DollarSign, Crown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState(0);
  const [founderLimit, setFounderLimit] = useState(20);
  const { login } = useAuth();
  const { config } = useAppConfig();
  const navigate = useNavigate();
  const appName = config.app_name || "The Trading Mentor";
  const appTagline = config.app_tagline || "AI-Powered Trading Intelligence";

  useEffect(() => {
    fetch(`${API_BASE}/auth/setup-status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setNeedsSetup(data.needsSetup === true))
      .catch(() => setNeedsSetup(false));
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => r.json())
      .then((data) => {
        setFounderSpotsLeft(data.founderSpotsLeft ?? 0);
        setFounderLimit(data.founderLimit ?? 20);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(result.role === "admin" ? "/planner" : "/");
    } else {
      setError(result.error || "Login failed");
    }
  }

  if (needsSetup === true) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt={appName}
            className="w-40 h-40 object-contain mx-auto mb-6 drop-shadow-2xl"
          />
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">First Time Setup</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to {appName}</h1>
          <p className="text-muted-foreground mb-8">
            No accounts exist yet. Create the first account to become the Admin and set up your trading platform.
          </p>

          <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-semibold">Create your admin account</p>
                <p className="text-xs text-muted-foreground">The first account automatically becomes the admin with full control.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-semibold">Customize your platform</p>
                <p className="text-xs text-muted-foreground">Set pricing, founder spots, discounts, and features in the Admin Dashboard.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-semibold">Invite your community</p>
                <p className="text-xs text-muted-foreground">Share the link — the first 20 users get Founder status with exclusive discounts.</p>
              </div>
            </div>
          </div>

          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:brightness-110 transition-all text-lg"
          >
            <Rocket className="h-5 w-5" />
            Set Up Your Platform
          </Link>
        </div>
      </div>
    );
  }

  const scrollToSignIn = () => {
    const formEl = document.getElementById("login-form-section");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      <nav className="w-full bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <span className="text-lg font-bold text-foreground hidden sm:inline">{appName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </button>
            <Link to="/pricing" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </Link>
            <button
              onClick={scrollToSignIn}
              className="flex items-center gap-1.5 ml-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1">
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt={appName}
            className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl z-10"
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 text-center pb-8 pt-16 bg-gradient-to-t from-background/90 via-background/50 to-transparent">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-3">
              <BrainCircuit className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">{appTagline}</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">{appName}</h1>
          </div>
        </div>

        <div id="login-form-section" className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
              <Logo size={80} />
              <span className="text-xl font-bold text-foreground">{appName}</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your trading dashboard</p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 pr-10 transition-colors"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {founderSpotsLeft > 0 && (
        <section className="w-full bg-gradient-to-r from-amber-500/5 to-primary/5 border-t border-amber-500/20 py-8 px-6">
          <div className="max-w-md mx-auto">
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
        </section>
      )}

      <section id="features-section" className="w-full bg-card/30 border-t border-border py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Everything You Need to Trade Like a Pro</h2>
            <p className="text-muted-foreground">Built on ICT methodology with AI-powered guidance at every step</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">ICT Academy</h3>
              <p className="text-sm text-muted-foreground">39 structured lessons covering FVGs, MSS, OTE, Kill Zones, and more — explained simply.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI Mentor</h3>
              <p className="text-sm text-muted-foreground">Your personal ICT trading coach — ask questions, log trades, and get real-time feedback.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Risk Shield</h3>
              <p className="text-sm text-muted-foreground">Position sizing calculator, drawdown tracking, and automatic cool-down enforcement.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Daily Planner</h3>
              <p className="text-sm text-muted-foreground">Morning routine checklists, discipline tracking, and trade preparation workflows.</p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:brightness-110 transition-all">
              <Rocket className="h-5 w-5" />
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-border bg-card/50 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {appName}. For educational purposes only. Not financial advice.</p>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/risk-disclosure" className="hover:text-foreground transition-colors">Risk Disclosure</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
