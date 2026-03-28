import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Sparkles } from "lucide-react";
import { Maximize2 } from "lucide-react";
import {
  GLOSSARY,
} from "../../data/academy-data";
import {
  ChartLightbox,
  chartImageToConceptKey,
  FVGDiagram,
  OTEDiagram,
  MSSDiagram,
  LiquiditySweepDiagram,
  KillZoneDiagram,
  SilverBulletDiagram,
  ConservativeEntryDiagram,
  ExitCriteriaDiagram,
} from "@/components/IctChartDiagrams";
import { getProgress } from "./academyUtils";

const IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "chart-idm-inducement.webp": { width: 1408, height: 768 },
  "lesson-why-lose.webp": { width: 1408, height: 768 },
};

function getImageDimensions(filename: string): { width: number; height: number } {
  return IMAGE_DIMENSIONS[filename] ?? { width: 1280, height: 896 };
}

function getImageUrl(filename: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${filename}`;
}

export function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed] = useState<Set<string>>(getProgress);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);

  function hasUnlockedAdvanced(item: typeof GLOSSARY[0]): boolean {
    if (!item.requiredLessons || item.requiredLessons.length === 0) return false;
    return item.requiredLessons.every((id) => completed.has(id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {lightboxKey && (
        <ChartLightbox conceptKey={lightboxKey} onClose={() => setLightboxKey(null)} />
      )}
      <h2 className="text-xl font-bold mb-1">ICT Concepts</h2>
      <p className="text-sm text-muted-foreground mb-6">Click any term for the full definition + trader tip. Complete lessons to unlock advanced tiers.</p>
      <div className="grid gap-3">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          const advancedUnlocked = hasUnlockedAdvanced(item);
          const hasAdvanced = !!item.advancedTerm;
          return (
            <div
              key={item.term}
              className="rounded-xl border overflow-hidden transition-colors cursor-pointer bg-card"
              style={{ borderColor: isOpen ? item.color : undefined }}
              onClick={() => setExpanded(isOpen ? null : item.term)}
            >
              <div className="flex items-center gap-3 p-4">
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: item.color + "22", color: item.color }}
                >
                  {item.term}
                </span>
                <span className="flex-1 text-sm text-muted-foreground font-medium">{item.full}</span>
                {hasAdvanced && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${advancedUnlocked ? "bg-amber-500/20 text-amber-500" : "bg-secondary text-muted-foreground"}`}>
                    {advancedUnlocked ? "ADV" : <Lock className="h-3 w-3 inline" />}
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm leading-relaxed">{item.definition}</p>
                  {item.image && (() => {
                    const ck = chartImageToConceptKey(item.image);
                    return ck ? (
                      <div className="relative cursor-pointer group" onClick={(e) => { e.stopPropagation(); setLightboxKey(ck); }}>
                        {ck === "fvg" && <FVGDiagram className="w-full rounded-lg" />}
                        {ck === "ote" && <OTEDiagram className="w-full rounded-lg" />}
                        {ck === "mss" && <MSSDiagram className="w-full rounded-lg" />}
                        {ck === "liquidity-sweep" && <LiquiditySweepDiagram className="w-full rounded-lg" />}
                        {ck === "kill-zone" && <KillZoneDiagram className="w-full rounded-lg" />}
                        {ck === "silver-bullet" && <SilverBulletDiagram className="w-full rounded-lg" />}
                        {ck === "conservative-entry" && <ConservativeEntryDiagram className="w-full rounded-lg" />}
                        {ck === "exit-criteria" && <ExitCriteriaDiagram className="w-full rounded-lg" />}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                          <Maximize2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Click to zoom in</p>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(item.image)}
                        alt={`${item.term} chart`}
                        className="w-full rounded-lg"
                        style={{ maxHeight: "320px", objectFit: "contain" }}
                        loading="lazy"
                        width={getImageDimensions(item.image).width}
                        height={getImageDimensions(item.image).height}
                      />
                    );
                  })()}
                  <div
                    className="border-l-[3px] pl-3 py-1"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: item.color }}>NQ Tip</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
                  </div>
                  {hasAdvanced && (
                    <div className={`mt-3 rounded-xl border p-4 ${advancedUnlocked ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className={`h-4 w-4 ${advancedUnlocked ? "text-amber-500" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-bold ${advancedUnlocked ? "text-amber-500" : "text-muted-foreground"}`}>
                          Advanced: {item.advancedTerm}
                        </span>
                      </div>
                      {advancedUnlocked ? (
                        <>
                          <p className="text-sm leading-relaxed mb-2">{item.advancedDefinition}</p>
                          <div className="border-l-[3px] border-amber-500 pl-3 py-1">
                            <p className="text-xs font-bold mb-1 text-amber-500">Pro Tip</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.advancedTip}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Complete related lessons to unlock this advanced concept.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
