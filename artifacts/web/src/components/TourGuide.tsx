import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Map, BookOpen, Calendar, BookMarked, BarChart2, Shield, Users, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TOUR_KEY = "ict_tour_complete_v1";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  path?: string;
  color: string;
}

const STEPS: TourStep[] = [
  {
    icon: <LayoutDashboard className="h-8 w-8" />,
    title: "Welcome to ICT Trading Mentor!",
    subtitle: "Your AI-powered trading coach",
    description: "This platform teaches you the ICT (Inner Circle Trader) methodology — a professional approach to reading markets used by full-time traders worldwide. Let us show you around.",
    tip: "Your dashboard shows your daily score, spin wheel rewards, and quick access to everything.",
    color: "text-primary",
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "ICT Academy",
    subtitle: "Learn the full system — step by step",
    description: "Start here if you're new. The Academy breaks down every ICT concept — Fair Value Gaps, Kill Zones, Market Structure, Silver Bullet setups — into easy lessons with quizzes.",
    tip: "Complete lessons to unlock higher-difficulty content and earn XP points.",
    path: "/academy",
    color: "text-blue-500",
  },
  {
    icon: <Calendar className="h-8 w-8" />,
    title: "Daily Planner",
    subtitle: "Plan your sessions before the market opens",
    description: "Every professional trader plans their day. The planner shows you Kill Zone timers (the best trading windows), a pre-market checklist, and lets you set your daily game plan.",
    tip: "London and New York Kill Zones are the highest-probability times. Always plan before you trade.",
    path: "/planner",
    color: "text-green-500",
  },
  {
    icon: <BookMarked className="h-8 w-8" />,
    title: "Smart Journal",
    subtitle: "Log every trade — learn from every outcome",
    description: "The journal is your most powerful improvement tool. Log your trades with setup tags, behavior notes, and let the AI coach grade your decisions and give personal feedback.",
    tip: "Be honest in your notes. The AI coach uses your journal to spot patterns you can't see yourself.",
    path: "/journal",
    color: "text-purple-500",
  },
  {
    icon: <BarChart2 className="h-8 w-8" />,
    title: "Analytics Dashboard",
    subtitle: "See your real performance data",
    description: "Your analytics page shows your win rate, P&L, average reward-to-risk, discipline score, best setups, and worst habits — all from your journal data. No more guessing about your performance.",
    tip: "Sort by setup type to discover which ICT patterns work best for YOUR trading style.",
    path: "/analytics",
    color: "text-amber-500",
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Risk Shield",
    subtitle: "Protect your account like a pro",
    description: "Risk Shield tracks your daily drawdown, calculates your position size for any trade, and locks you out when you hit your daily loss limit — before you do damage you can't recover from.",
    tip: "Set your max daily loss to 2% and stick to it. Most accounts blow up from one bad day, not bad trades.",
    path: "/risk-shield",
    color: "text-red-500",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Community",
    subtitle: "Learn alongside other ICT traders",
    description: "Share your trade setups, ask questions, and connect with other traders learning the ICT methodology. The community is moderated and focused on quality — not noise.",
    tip: "Post your best trades (with chart screenshots) to get feedback from the community.",
    path: "/community",
    color: "text-cyan-500",
  },
  {
    icon: <Map className="h-8 w-8" />,
    title: "You're all set!",
    subtitle: "Start your journey today",
    description: "The best traders are relentless learners. Log your first trade in the journal, complete your first Academy lesson, and let the AI coach start learning your patterns.",
    tip: "You can restart this tour anytime from the Dashboard menu.",
    color: "text-primary",
  },
];

interface TourGuideProps {
  onClose?: () => void;
}

export function TourGuide({ onClose }: TourGuideProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const total = STEPS.length;

  function handleClose() {
    localStorage.setItem(TOUR_KEY, "1");
    onClose?.();
  }

  function handleNext() {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  function handleGoTo() {
    if (current.path) {
      navigate(current.path);
    }
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl bg-card border border-border shrink-0 ${current.color}`}>
              {current.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
                Step {step + 1} of {total}
              </p>
              <h2 className="text-lg font-bold text-foreground leading-tight">{current.title}</h2>
              <p className="text-sm text-primary font-medium">{current.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

          <div className="bg-muted/50 border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Pro tip: </span>
              {current.tip}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <div className="flex gap-1 mx-auto">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {current.path && step < total - 1 && (
              <button
                onClick={handleGoTo}
                className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
              >
                Go there
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity ml-auto"
            >
              {step === total - 1 ? "Let's go!" : "Next"}
              {step < total - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useTourGuide() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShowTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function startTour() {
    setShowTour(true);
  }

  function closeTour() {
    setShowTour(false);
  }

  return { showTour, startTour, closeTour };
}

export { TOUR_KEY };
