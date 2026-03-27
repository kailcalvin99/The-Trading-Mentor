import { useReducer, useEffect, useLayoutEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
  List,
} from "lucide-react";
import {
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
  TOUR_NEVER_SHOW_KEY,
  DEFAULT_TOUR_STATE,
  type TourState,
  type TourMachineState,
} from "./tourConfig";
import TourChecklist from "./TourChecklist";

export type { TourMachineState };

type TourAction =
  | { type: "START_TOUR" }
  | { type: "CLOSE_TOUR" }
  | { type: "WELCOME_VIDEO_DONE" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "JUMP_TO_STEP"; step: number }
  | { type: "COMPLETE_TOUR" }
  | { type: "TOGGLE_CHECKLIST" }
  | { type: "NAVIGATE_DONE" }
  | { type: "RESET_TOUR" }
  | { type: "LOAD_STATE"; payload: TourState };

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START_TOUR":
      return {
        ...state,
        visible: true,
        machineState: "WELCOME_VIDEO",
      };

    case "CLOSE_TOUR":
      return {
        ...state,
        visible: false,
        machineState: "IDLE",
      };

    case "RESET_TOUR":
      return {
        ...DEFAULT_TOUR_STATE,
        visible: true,
        machineState: "WELCOME_VIDEO",
        currentStep: 0,
        completedSteps: [],
      };

    case "LOAD_STATE":
      return { ...action.payload };

    case "WELCOME_VIDEO_DONE":
      return {
        ...state,
        machineState: "INTRODUCING",
        currentStep: 0,
      };

    case "NAVIGATE_DONE": {
      const nextStep = state.currentStep + 1;
      return {
        ...state,
        currentStep: nextStep,
        machineState: "INTRODUCING",
      };
    }

    case "NEXT_STEP": {
      const nextCompleted = state.completedSteps.includes(state.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, state.currentStep];
      const nextStep = state.currentStep + 1;
      if (nextStep >= TOUR_STEPS.length) {
        return {
          ...state,
          completedSteps: nextCompleted,
          machineState: "COMPLETED",
          visible: true,
        };
      }
      return {
        ...state,
        completedSteps: nextCompleted,
        machineState: "NAVIGATING",
      };
    }

    case "PREV_STEP": {
      if (state.currentStep <= 0) return state;
      return {
        ...state,
        currentStep: state.currentStep - 1,
        machineState: "INTRODUCING",
      };
    }

    case "JUMP_TO_STEP":
      return {
        ...state,
        currentStep: action.step,
        machineState: "INTRODUCING",
        checklistOpen: false,
      };

    case "COMPLETE_TOUR":
      return {
        ...state,
        machineState: "COMPLETED",
        completedSteps: TOUR_STEPS.map((_, i) => i),
        visible: true,
      };

    case "TOGGLE_CHECKLIST":
      return {
        ...state,
        checklistOpen: !state.checklistOpen,
      };

    default:
      return state;
  }
}

function makeStorageKey(userId: string | number, suffix: string) {
  return `${TOUR_STORAGE_KEY}:${userId}:${suffix}`;
}

function loadPersistedState(stateKey: string): TourState {
  try {
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TourState>;
      return { ...DEFAULT_TOUR_STATE, ...parsed };
    }
  } catch {}
  return DEFAULT_TOUR_STATE;
}

const TOUR_AUTO_SHOWN_KEY = "ict-tour-auto-shown";

const TOUR_API_BASE = import.meta.env.VITE_API_URL || "/api";

function persistTourShown() {
  try {
    const token = localStorage.getItem("ICT_TRADING_MENTOR_TOKEN");
    fetch(`${TOUR_API_BASE}/auth/user-flags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ tourShown: true }),
    }).catch(() => {});
  } catch {}
}

export function useTourGuide(userId?: string | number, userTourShown?: boolean) {
  const stateKey = userId !== undefined ? makeStorageKey(userId, "state") : null;

  const [state, dispatch] = useReducer(tourReducer, DEFAULT_TOUR_STATE);

  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    if (stateKey && stateKey !== activeKey) {
      dispatch({ type: "LOAD_STATE", payload: loadPersistedState(stateKey) });
      setActiveKey(stateKey);
    }
  }, [stateKey, activeKey]);

  useEffect(() => {
    if (!activeKey) return;
    try {
      localStorage.setItem(activeKey, JSON.stringify(state));
    } catch {}
  }, [state, activeKey]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (userId === undefined) return undefined;
    if (!activeKey) return undefined;
    if (userTourShown === true) return undefined;
    const seen = localStorage.getItem(TOUR_AUTO_SHOWN_KEY);
    const neverShow = localStorage.getItem(TOUR_NEVER_SHOW_KEY);
    const currentState = stateRef.current;
    if (!seen && !neverShow && !currentState.visible && currentState.machineState === "IDLE" && currentState.completedSteps.length === 0) {
      const timer = setTimeout(() => {
        const latest = stateRef.current;
        const stillEligible =
          userTourShown !== true &&
          !localStorage.getItem(TOUR_AUTO_SHOWN_KEY) &&
          !localStorage.getItem(TOUR_NEVER_SHOW_KEY) &&
          !latest.visible &&
          latest.machineState === "IDLE" &&
          latest.completedSteps.length === 0;
        if (stillEligible) {
          localStorage.setItem(TOUR_AUTO_SHOWN_KEY, "1");
          persistTourShown();
          dispatch({ type: "START_TOUR" });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [userId, activeKey, userTourShown]);

  const startTour = useCallback(() => {
    dispatch({ type: "START_TOUR" });
  }, []);

  const closeTour = useCallback(() => {
    try { localStorage.setItem(TOUR_AUTO_SHOWN_KEY, "1"); } catch {}
    dispatch({ type: "CLOSE_TOUR" });
  }, []);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_NEVER_SHOW_KEY);
      localStorage.removeItem(TOUR_AUTO_SHOWN_KEY);
    } catch {}
    dispatch({ type: "RESET_TOUR" });
  }, []);

  const neverShowTour = useCallback(() => {
    try {
      localStorage.setItem(TOUR_NEVER_SHOW_KEY, "1");
      localStorage.setItem(TOUR_AUTO_SHOWN_KEY, "1");
    } catch {}
    dispatch({ type: "CLOSE_TOUR" });
  }, []);

  return {
    state,
    dispatch,
    showTour: state.visible,
    startTour,
    closeTour,
    resetTour,
    neverShowTour,
  };
}

interface TourGuideProps {
  onClose?: () => void;
  onNeverShow?: () => void;
  state: TourState;
  dispatch: React.Dispatch<TourAction>;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const WELCOME_VIDEO_SRC = `${BASE_URL}videos/intro.mp4`.replace(/\/\//g, "/");

export function TourGuide({ onClose, onNeverShow, state, dispatch }: TourGuideProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => { navigateRef.current = navigate; });
  const navigatingRef = useRef(false);

  const [videoEnded, setVideoEnded] = useState(false);
  const [videoMinTimePassed, setVideoMinTimePassed] = useState(false);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TOUR_STEPS[state.currentStep];
  const isLast = state.currentStep >= TOUR_STEPS.length - 1;
  const isFirst = state.currentStep === 0;

  useEffect(() => {
    if (state.machineState === "WELCOME_VIDEO") {
      setVideoEnded(false);
      setVideoMinTimePassed(false);
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
      minTimerRef.current = setTimeout(() => {
        setVideoMinTimePassed(true);
      }, 5000);
    }
    return () => {
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
    };
  }, [state.machineState]);

  useEffect(() => {
    if (state.machineState === "NAVIGATING" && !navigatingRef.current) {
      navigatingRef.current = true;
      const nextStepIndex = state.currentStep + 1;
      const targetRoute = TOUR_STEPS[nextStepIndex]?.targetRoute;
      if (targetRoute) {
        navigateRef.current(targetRoute);
      }
      const timer = setTimeout(() => {
        navigatingRef.current = false;
        dispatch({ type: "NAVIGATE_DONE" });
      }, 700);
      return () => {
        clearTimeout(timer);
        navigatingRef.current = false;
      };
    }
    return undefined;
  }, [state.machineState, state.currentStep, dispatch]);

  const introducingNavigatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.machineState === "INTRODUCING") {
      const targetRoute = TOUR_STEPS[state.currentStep]?.targetRoute;
      const key = `${state.currentStep}:${targetRoute}`;
      if (targetRoute && introducingNavigatedRef.current !== key) {
        introducingNavigatedRef.current = key;
        navigateRef.current(targetRoute, { replace: true });
      }
    } else {
      introducingNavigatedRef.current = null;
    }
  }, [state.machineState, state.currentStep]);

  useEffect(() => {
    if (state.machineState === "COMPLETED") {
      navigateRef.current("/");
    }
  }, [state.machineState]);

  function handleClose() {
    dispatch({ type: "CLOSE_TOUR" });
    onClose?.();
  }

  function handleNeverShow() {
    try { localStorage.setItem(TOUR_NEVER_SHOW_KEY, "1"); } catch {}
    dispatch({ type: "CLOSE_TOUR" });
    onNeverShow?.();
  }

  function handleNext() {
    dispatch({ type: "NEXT_STEP" });
  }

  function handlePrev() {
    dispatch({ type: "PREV_STEP" });
  }

  function handleJumpToStep(stepIndex: number) {
    dispatch({ type: "JUMP_TO_STEP", step: stepIndex });
  }

  function handleToggleChecklist() {
    dispatch({ type: "TOGGLE_CHECKLIST" });
  }

  function handleSkipVideo() {
    dispatch({ type: "WELCOME_VIDEO_DONE" });
  }

  function handleStartTour() {
    dispatch({ type: "WELCOME_VIDEO_DONE" });
  }

  if (!state.visible) return null;

  if (state.machineState === "WELCOME_VIDEO") {
    const canStartTour = videoEnded || videoMinTimePassed;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-4xl px-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-white/70 text-sm font-medium">Welcome to ICT Trading Mentor</p>
            <button
              onClick={handleSkipVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Skip
            </button>
          </div>

          <div
            className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
            style={{ paddingBottom: "56.25%" }}
          >
            <video
              ref={videoRef}
              src={WELCOME_VIDEO_SRC}
              controls
              playsInline
              autoPlay
              className="absolute inset-0 w-full h-full object-contain bg-black"
              onEnded={() => setVideoEnded(true)}
            />
          </div>

          <div className="flex items-center justify-center mt-5">
            <button
              onClick={handleStartTour}
              disabled={!canStartTour}
              className={`px-8 py-3 font-bold rounded-xl text-sm transition-all ${
                canStartTour
                  ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              {canStartTour ? "Start Tour" : "Please wait..."}
            </button>
          </div>
          {!canStartTour && (
            <p className="text-center text-white/30 text-xs mt-2">
              Start Tour will be available after a few seconds
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state.machineState === "COMPLETED") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tour Complete!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You've seen everything this platform has to offer. Now it's time to put it to work. Happy trading!
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Let's Go!
          </button>
        </div>
      </div>
    );
  }

  if (state.machineState === "NAVIGATING") {
    return (
      <div className="fixed bottom-6 right-6 z-[99] w-full max-w-xs">
        <div className="bg-card border border-border rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 animate-in fade-in duration-300">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
          <p className="text-sm text-muted-foreground">Navigating to next section...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {state.machineState === "INTRODUCING" && (
        <div className="fixed bottom-4 right-4 z-[99] w-64 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5">
              <div className="flex items-center gap-1.5">
                <div>
                  <p className="text-[10px] font-bold text-foreground">ICT Tour Guide</p>
                  <p className="text-[9px] text-muted-foreground">
                    Step {state.currentStep + 1} of {TOUR_STEPS.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleChecklist}
                  className={`p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${
                    state.checklistOpen ? "bg-secondary text-foreground" : ""
                  }`}
                  title="View progress checklist"
                >
                  <List className="h-3 w-3" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Close tour"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="px-3 py-2">
              <h3 className="text-[10px] font-bold text-foreground mb-1.5 leading-tight">{step.title}</h3>

              <div className="relative bg-secondary/50 border border-border rounded-lg p-2 mb-2">
                <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-4">{step.description}</p>
              </div>

              <div className="mb-2">
                <div className="flex gap-0.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-all ${
                        state.completedSteps.includes(i)
                          ? "bg-primary"
                          : i === state.currentStep
                          ? "bg-primary/40"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  disabled={isFirst}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleNext}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors font-bold"
                >
                  {isLast ? "Finish" : "Next"}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={handleNeverShow}
                className="w-full text-center text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors pt-1"
              >
                Don't show again
              </button>
            </div>
          </div>
        </div>
      )}

      {state.checklistOpen && state.machineState === "INTRODUCING" && (
        <TourChecklist
          steps={TOUR_STEPS}
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onJumpToStep={handleJumpToStep}
          onClose={handleToggleChecklist}
        />
      )}
    </>
  );
}

export const TOUR_KEY = TOUR_STORAGE_KEY;
