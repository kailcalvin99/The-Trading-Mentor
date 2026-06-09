import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  GraduationCap,
  Shield,
  BookOpen,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Rocket,
  CheckCircle2,
  ArrowRight,
  Lock,
  Play,
} from "lucide-react";
import Logo from "@/components/Logo";

const TUTORIAL_STEPS = [
  {
    icon: GraduationCap,
    title: "ICT Academy",
    color: "#818CF8",
    heading: "Learn Trading from Zero",
    bullets: [
      "This is where your journey begins. A full 7-chapter course with 39 lessons takes you from the very basics (what is trading?) all the way to psychology and discipline.",
      "A glossary with 16 terms explained in plain, simple language so you always know what a word means.",
      "An adaptive quiz with 30 questions that gets harder as you answer correctly and easier when you miss.",
      "An AI mentor you can ask any question — like having a private tutor available 24/7.",
      "Complete all lessons and pass the quiz to unlock the rest of the app's powerful tools.",
    ],
  },
  {
    icon: Calendar,
    title: "Daily Planner",
    color: "#00C896",
    heading: "Start Every Day Right",
    locked: false,
    bullets: [
      "Complete a 4-step morning routine before you can trade — drink water, breathe, check the news, and set your market direction.",
      "Add your own personal routine items like exercise, review notes, or anything that helps you prepare.",
      "See live countdown timers for the best trading windows: London (2-5 AM), NY Open (9:30 AM), and Silver Bullet (10-11 AM).",
      "A red warning bar appears when major news events could make the market dangerous.",
    ],
  },
  {
    icon: Shield,
    title: "Risk Shield",
    color: "#EF4444",
    heading: "Protect Your Money",
    locked: true,
    bullets: [
      "Track your prop firm account — see your balance, daily loss, and weekly loss at a glance.",
      "A built-in calculator tells you exactly how many contracts to trade based on your risk rules.",
      "If you lose 2% in a day, the app locks you out for 24 hours to stop you from revenge trading.",
      "Focus Mode blocks distractions so you can concentrate on your trading session.",
    ],
  },
  {
    icon: BookOpen,
    title: "Smart Journal",
    color: "#F59E0B",
    heading: "Track Every Trade",
    locked: true,
    bullets: [
      "Log every trade with the exact entry criteria — the app makes sure you checked all the boxes before entering.",
      "Tag your behavior on each trade: Were you disciplined? Did you chase? Was it FOMO?",
      "Over time, patterns emerge — you'll see which behaviors hurt you and which help.",
      "Monk Mode removes all distractions and keeps you focused on following the rules.",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    color: "#06B6D4",
    heading: "See Your Progress",
    locked: true,
    bullets: [
      "Charts show your profit and loss over time — are you improving week by week?",
      "See your win rate, average win, average loss, and profit factor at a glance.",
      "Track which trading sessions (London, NY, Silver Bullet) work best for you.",
      "Behavior analysis shows how emotions like FOMO and revenge trading affect your results.",
    ],
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(-1);

  function handleGetStarted() {
    localStorage.setItem("ict-welcome-seen", "true");
    navigate("/planner");
  }

  function handleSetupPlanner() {
    localStorage.setItem("ict-welcome-seen", "true");
    navigate("/planner");
  }

  if (step === -1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
        <div className="max-w-2xl w-full text-center py-6">
          <Logo size={64} className="mx-auto mb-4 sm:mb-6" />

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Welcome to ICT AI Trading Mentor
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-1 sm:mb-2 leading-relaxed max-w-lg mx-auto">
            Your AI-powered personal guide to learning NQ Futures trading from scratch.
            No experience needed — our AI mentor teaches you everything step by step.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/70 mb-5 sm:mb-8 max-w-md mx-auto">
            Built on the ICT methodology created by Michael J. Huddleston — the original Inner Circle Trader who pioneered Smart Money Concepts and changed how retail traders understand the markets.
          </p>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 text-left mb-6 sm:mb-10">
            {[
              { icon: "\uD83E\uDD16", text: "AI mentor available 24/7 to guide your trades" },
              { icon: "\uD83D\uDCDA", text: "39 AI-curated lessons on ICT methodology" },
              { icon: "\uD83D\uDEE1\uFE0F", text: "AI-assisted risk management tools" },
              { icon: "\uD83D\uDCDD", text: "Smart journal with AI trade analysis" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-border"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm text-foreground font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-base"
              onClick={() => setStep(0)}
            >
              Take the Tour
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              onClick={handleGetStarted}
            >
              Skip — I know my way around
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSetupStep = step === TUTORIAL_STEPS.length;

  if (isSetupStep) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">Almost There!</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[...TUTORIAL_STEPS, null].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 sm:w-8 bg-primary" : i < step ? "w-1.5 sm:w-2 bg-primary/50" : "w-1.5 sm:w-2 bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">Ready!</span>
        </div>

        <div className="flex-1 overflow-auto flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="max-w-xl w-full text-center py-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 sm:mb-6 mx-auto">
              <Rocket className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-3">Let's Set Up Your Planner!</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-8 leading-relaxed max-w-md mx-auto">
              Before diving into the Academy, let's set up your Daily Planner. A solid morning routine is the foundation of disciplined trading.
            </p>

            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8 text-left max-w-md mx-auto">
              <p className="text-sm font-bold text-foreground mb-4">Your journey starts here:</p>
              <div className="space-y-3">
                {[
                  { num: "1", text: "Set up your Daily Planner & morning routine", color: "#00C896" },
                  { num: "2", text: "Complete all 39 Academy lessons", color: "#818CF8" },
                  { num: "3", text: "Pass the adaptive quiz (70%+)", color: "#F59E0B" },
                  { num: "4", text: "Unlock Risk Shield, Journal & Analytics", color: "#06B6D4" },
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.num}
                    </div>
                    <p className="text-sm text-foreground/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-base"
                onClick={handleSetupPlanner}
              >
                <Calendar className="h-5 w-5" />
                Set Up My Planner
              </button>
              <button
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="h-4 w-4 inline mr-1" />
                Back to Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-xs sm:text-sm font-semibold text-foreground">App Tour</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[...TUTORIAL_STEPS, null].map((_, i) => (
            <div
              key={i}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 sm:w-8 bg-primary" : i < step ? "w-1.5 sm:w-2 bg-primary/50" : "w-1.5 sm:w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {step + 1}/{TUTORIAL_STEPS.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto flex items-start sm:items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full py-4">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: current.color + "20" }}
            >
              <Icon className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: current.color }} />
            </div>
            {current.locked && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500">Unlocked after Academy</span>
              </div>
            )}
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-2" style={{ color: current.color }}>
            {current.title}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">{current.heading}</h2>

          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
            {current.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2.5 sm:gap-3">
                <CheckCircle2
                  className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5"
                  style={{ color: current.color }}
                />
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{bullet}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pb-4">
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:opacity-90 transition-opacity"
              onClick={() => setStep(step + 1)}
            >
              {isLast ? "Almost Done" : "Next"}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
