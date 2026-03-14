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
} from "lucide-react";

const TUTORIAL_STEPS = [
  {
    icon: Calendar,
    title: "Daily Planner",
    color: "#00C896",
    heading: "Start Every Day Right",
    bullets: [
      "Complete a 4-step morning routine before you can trade — drink water, breathe, check the news, and set your market direction.",
      "Add your own personal routine items like exercise, review notes, or anything that helps you prepare.",
      "See live countdown timers for the best trading windows: London (2-5 AM), NY Open (9:30 AM), and Silver Bullet (10-11 AM).",
      "A red warning bar appears when major news events could make the market dangerous.",
    ],
  },
  {
    icon: GraduationCap,
    title: "ICT Academy",
    color: "#818CF8",
    heading: "Learn Trading from Zero",
    bullets: [
      "A full 7-chapter course with 39 lessons — from the very basics (what is trading?) all the way to psychology and discipline.",
      "A glossary with 16 terms explained in plain, simple language so you always know what a word means.",
      "An adaptive quiz with 30 questions that gets harder as you answer correctly and easier when you miss.",
      "An AI mentor you can ask any question — like having a private tutor available 24/7.",
      "A complete trading plan you can reference any time you need a reminder of the rules.",
    ],
  },
  {
    icon: Shield,
    title: "Risk Shield",
    color: "#EF4444",
    heading: "Protect Your Money",
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
    navigate("/");
  }

  if (step === -1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-2xl">ICT</span>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3">
            Welcome to ICT Trading Mentor
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto">
            Your personal guide to learning NQ Futures trading from scratch. 
            No experience needed — we'll teach you everything step by step.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 text-left mb-10">
            {[
              { icon: "📚", text: "A full trading course with 39 lessons" },
              { icon: "🛡️", text: "Risk management tools to protect your account" },
              { icon: "📝", text: "A smart journal to track every trade" },
              { icon: "🤖", text: "An AI mentor to answer your questions" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 bg-secondary/50 rounded-xl px-4 py-3 border border-border"
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

  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">ICT</span>
          </div>
          <span className="text-sm font-semibold text-foreground">App Tour</span>
        </div>
        <div className="flex items-center gap-2">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {step + 1} of {TUTORIAL_STEPS.length}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: current.color + "20" }}
          >
            <Icon className="h-8 w-8" style={{ color: current.color }} />
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: current.color }}>
            {current.title}
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-6">{current.heading}</h2>

          <div className="space-y-4 mb-10">
            {current.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-3">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 mt-0.5"
                  style={{ color: current.color }}
                />
                <p className="text-sm text-muted-foreground leading-relaxed">{bullet}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {isLast ? (
              <button
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={handleGetStarted}
              >
                <Rocket className="h-5 w-5" />
                Start Trading
              </button>
            ) : (
              <button
                className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => setStep(step + 1)}
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
