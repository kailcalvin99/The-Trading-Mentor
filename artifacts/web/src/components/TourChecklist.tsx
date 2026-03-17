import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { type TourStep } from "./tourConfig";

interface TourChecklistProps {
  steps: TourStep[];
  currentStep: number;
  completedSteps: number[];
  onJumpToStep: (index: number) => void;
  onClose: () => void;
}

export default function TourChecklist({
  steps,
  currentStep,
  completedSteps,
  onJumpToStep,
  onClose,
}: TourChecklistProps) {
  return (
    <div className="fixed bottom-[420px] right-6 z-[99] w-full max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-xs font-bold text-foreground">Tour Progress</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {completedSteps.length} of {steps.length} steps completed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isActive = index === currentStep;
            const canJump = isCompleted || index <= currentStep;

            return (
              <button
                key={index}
                onClick={() => canJump && onJumpToStep(index)}
                disabled={!canJump}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-primary/10"
                    : canJump
                    ? "hover:bg-secondary/60 cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle
                      className={`h-4 w-4 ${
                        isActive ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate ${
                      isCompleted
                        ? "line-through text-muted-foreground"
                        : isActive
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>

                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                )}

                {!isActive && canJump && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {isCompleted ? "Revisit" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
