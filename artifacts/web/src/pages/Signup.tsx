import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Eye, EyeOff, UserPlus, Crown, Sparkles, PartyPopper, BrainCircuit } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [showFounderModal, setShowFounderModal] = useState(false);
  const [founderNum, setFounderNum] = useState(0);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => r.json())
      .then((data) => setFounderSpotsLeft(data.founderSpotsLeft))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);

    const result = await register(email, password, name);
    setLoading(false);

    if (result.success) {
      if (result.isFounder) {
        setFounderNum(result.founderNumber || 0);
        setShowFounderModal(true);
      } else {
        localStorage.setItem("ict-welcome-seen", "true");
        navigate("/planner");
      }
    } else {
      setError(result.error || "Registration failed");
    }
  }

  if (showFounderModal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl blur-2xl" />
            <div className="relative bg-card border border-primary/30 rounded-2xl p-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Crown className="h-14 w-14 text-primary" />
                  <Sparkles className="h-5 w-5 text-primary/80 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
                <PartyPopper className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">FOUNDER #{founderNum}</span>
              </div>

              <h1 className="font-serif text-3xl font-bold text-foreground mb-3">
                Welcome, Founding Member
              </h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                You are one of our first <span className="text-primary font-semibold">20 founding members</span>.
                As a thank you for your early trust, you receive an exclusive{" "}
                <span className="text-primary font-semibold">50% discount</span> on any paid plan for{" "}
                <span className="text-primary font-semibold">6 months</span>.
              </p>

              <div className="bg-background border border-border rounded-xl p-4 mb-6 text-left space-y-2.5">
                {[
                  "Permanent Founder badge on your profile",
                  "50% off any plan for 6 months",
                  "Early access to all future features",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground/80">{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  localStorage.setItem("ict-welcome-seen", "true");
                  navigate("/planner");
                }}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-lg hover:brightness-110 transition-all text-lg"
              >
                Start My Journey
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Logo size={44} />
          <span className="font-serif text-xl font-bold text-foreground tracking-tight">ICT Trading Mentor</span>
        </div>

        {founderSpotsLeft !== null && founderSpotsLeft > 0 && (
          <div className="border border-primary/20 rounded-xl p-4 mb-6 text-center bg-primary/5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary tracking-wide">FOUNDER SPOTS AVAILABLE</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Only <span className="text-primary font-bold">{founderSpotsLeft}</span> founder spots remaining.
              Get 50% off for 6 months.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-1">Create your account</h2>
          <div className="flex items-center gap-2 mb-6">
            <BrainCircuit className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm text-muted-foreground">Begin your AI-powered trading journey</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                placeholder="Your name"
                required
              />
            </div>

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
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
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
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
