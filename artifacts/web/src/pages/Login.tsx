import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Eye, EyeOff, LogIn, TrendingUp, Zap, Trophy } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-col justify-center flex-1 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        
        <div className="relative z-10 max-w-lg">
          <Logo size={48} className="mb-8" />
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Trade Smarter.<br />
            <span className="text-primary">Win Bigger.</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Join the elite traders using ICT methodology to dominate the markets.
          </p>
          
          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: "Master ICT concepts with 39 expert lessons", color: "text-primary" },
              { icon: Zap, text: "AI mentor available 24/7 for instant guidance", color: "text-amber-500" },
              { icon: Trophy, text: "Track, analyze, and level up your trading game", color: "text-cyan-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-card/50 backdrop-blur border border-border/50 rounded-xl p-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm text-foreground/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Logo size={40} />
            <span className="text-lg font-bold text-foreground">ICT Trading Mentor</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
            <p className="text-sm text-muted-foreground mb-6">Sign in to continue your trading journey</p>

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
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-10"
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
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
