import { useState, useRef, useEffect } from "react";
import GraduationCelebration, { useGraduationCheck } from "@/components/GraduationCelebration";
import { useAuth } from "@/contexts/AuthContext";
import { COURSE_CHAPTERS } from "../data/academy-data";
import { GlossaryView } from "./academy/GlossaryView";
import { QuizView } from "./academy/QuizView";
import { FlashcardsView } from "./academy/FlashcardsView";
import { LearnView } from "./academy/LearnView";
import { PlanView } from "./academy/PlanView";
import { ToolsView } from "./academy/ToolsView";
import {
  getProgress,
  setProgress,
  syncProgressFromApi,
  saveProgressToApi,
  PROGRESS_KEY,
} from "./academy/academyUtils";
import { useAcademyWatchedVideos, ADVANCED_LESSON_IDS } from "./academy/academyHooks";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type Tab = "learn" | "glossary" | "quiz" | "plan" | "tools" | "flashcards";

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "glossary", label: "Glossary" },
  { key: "quiz", label: "Quiz" },
  { key: "plan", label: "Plan" },
  { key: "tools", label: "Tools" },
  { key: "flashcards", label: "Flashcards" },
];

const UNLOCK_KEY = "ict-academy-unlocked";
const QUIZ_PASSED_KEY = "ict-quiz-passed";

function checkAndUnlock() {
  try {
    const progress = getProgress();
    const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
    const allDone = progress.size >= totalLessons;
    const quizPassed = localStorage.getItem(QUIZ_PASSED_KEY) === "true";
    if (allDone && quizPassed) {
      localStorage.setItem(UNLOCK_KEY, "true");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function IctAcademy() {
  const [tab, setTab] = useState<Tab>("learn");
  const { user } = useAuth();
  const { showCelebration, closeCelebration } = useGraduationCheck();
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const interval = setInterval(checkAndUnlock, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const mainEl = document.getElementById("academy-main");
    if (!mainEl) return;
    const header = headerRef.current;
    if (!header) return;

    const onScroll = () => {
      const currentY = mainEl.scrollTop;
      if (currentY > lastScrollY.current && currentY > 60) {
        header.style.transform = `translateY(-100%)`;
      } else {
        header.style.transform = "translateY(0)";
      }
      lastScrollY.current = currentY;
    };

    mainEl.addEventListener("scroll", onScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {showCelebration && (
        <GraduationCelebration
          userName={user?.name || "Graduate"}
          onClose={closeCelebration}
        />
      )}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 bg-background border-b px-6 py-2.5 flex items-center gap-4"
        style={{ transition: "transform 0.3s ease" }}
      >
        <span className="text-sm font-bold whitespace-nowrap text-foreground">
          ICT Trading Academy
        </span>
        <div className="flex flex-1 bg-secondary rounded-xl p-1">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main id="academy-main" className="flex-1 overflow-y-auto">
        {tab === "learn" && <LearnView />}
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "plan" && <PlanView />}
        {tab === "tools" && <ToolsView />}
        {tab === "flashcards" && <FlashcardsView />}
      </main>
    </div>
  );
}
