import { useState, useEffect } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { GLOSSARY } from "../../data/academy-data";

interface FlashcardItem {
  term: string;
  full: string;
  color: string;
  definition: string;
}

const WEB_FLASHCARDS: FlashcardItem[] = GLOSSARY.map((item) => ({
  term: item.term,
  full: item.full,
  color: item.color,
  definition: item.definition,
}));

export function FlashcardsView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [done, setDone] = useState(false);

  const total = WEB_FLASHCARDS.length;
  const card = WEB_FLASHCARDS[currentIndex];
  const progress = (currentIndex + 1) / total;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        advance("known");
      } else if (e.key === "ArrowLeft") {
        advance("review");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [done, currentIndex]);

  function advance(result: "known" | "review") {
    if (result === "known") setKnownCount((c) => c + 1);
    else setReviewCount((c) => c + 1);
    const next = currentIndex + 1;
    if (next >= total) {
      setDone(true);
    } else {
      setCurrentIndex(next);
      setFlipped(false);
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setReviewCount(0);
    setDone(false);
  }

  if (done) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-6xl">🎓</div>
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground text-center">You've gone through all {total} ICT flashcards</p>
        <div className="flex gap-4 w-full max-w-sm">
          <div className="flex-1 rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex flex-col items-center gap-1">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <span className="text-2xl font-bold text-green-500">{knownCount}</span>
            <span className="text-xs text-muted-foreground">Got It</span>
          </div>
          <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col items-center gap-1">
            <ChevronLeft className="h-6 w-6 text-amber-500" />
            <span className="text-2xl font-bold text-amber-500">{reviewCount}</span>
            <span className="text-xs text-muted-foreground">Review</span>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
          onClick={handleReset}
        >
          Study Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-green-500 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {knownCount}
          </div>
          <span className="text-xs text-muted-foreground">{currentIndex + 1} of {total}</span>
          <div className="flex items-center gap-1.5 text-amber-500 text-sm font-bold">
            <ChevronLeft className="h-4 w-4" />
            {reviewCount}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Space to flip · ← Review · → Got It</span>
      </div>

      <div className="h-1.5 bg-border rounded-full mb-6 overflow-hidden">
        <div
          className="h-1.5 bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div
        className="relative w-full cursor-pointer select-none"
        style={{ perspective: "1000px", minHeight: "320px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "320px",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl border-2 bg-card flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              borderColor: card.color + "66",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: card.color + "15" }}>
              <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: card.color + "25", color: card.color }}>
                {card.term}
              </span>
              <span className="text-xs text-muted-foreground">{currentIndex + 1} / {total}</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
              <span className="text-5xl font-bold text-center" style={{ color: card.color }}>{card.term}</span>
              <span className="text-sm text-muted-foreground text-center">{card.full}</span>
              <div className="flex items-center gap-2 mt-4 bg-secondary rounded-full px-4 py-2 text-xs text-muted-foreground">
                Click to reveal definition
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 rounded-2xl border-2 bg-card flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderColor: card.color + "66",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: card.color + "15" }}>
              <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: card.color + "25", color: card.color }}>
                {card.term}
              </span>
              <span className="text-xs text-muted-foreground">{currentIndex + 1} / {total}</span>
            </div>
            <div className="flex-1 px-6 py-5 overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Definition</p>
              <p className="text-sm leading-relaxed">{card.definition}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-500 font-bold text-sm hover:bg-amber-500/20 transition-colors"
          onClick={() => advance("review")}
        >
          <ChevronLeft className="h-5 w-5" />
          Review
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-500 font-bold text-sm hover:bg-green-500/20 transition-colors"
          onClick={() => advance("known")}
        >
          Got It
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
