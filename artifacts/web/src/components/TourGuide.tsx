import { useReducer, useEffect, useLayoutEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  List,
  Play,
  ExternalLink,
  VideoOff,
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
import { useAppConfig } from "@/contexts/AppConfigContext";

export type { TourMachineState };

type TourAction =
  | { type: "START_TOUR" }
  | { type: "CLOSE_TOUR" }
  | { type: "PLAY_VIDEO" }
  | { type: "VIDEO_ENDED" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "JUMP_TO_STEP"; step: number }
  | { type: "COMPLETE_TOUR" }
  | { type: "TOGGLE_CHECKLIST" }
  | { type: "NAVIGATE_DONE" }
  | { type: "RESET_TOUR" };

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START_TOUR":
      return {
        ...state,
        visible: true,
        machineState: "INTRODUCING",
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
        machineState: "INTRODUCING",
        currentStep: 0,
        completedSteps: [],
      };

    case "PLAY_VIDEO":
      return {
        ...state,
        machineState: "PLAYING_VIDEO",
      };

    case "VIDEO_ENDED": {
      const nextCompleted = state.completedSteps.includes(state.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, state.currentStep];
      const isLast = state.currentStep >= TOUR_STEPS.length - 1;
      if (isLast) {
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

export const TOUR_NEVER_SHOW_KEY = "ict-tour-never-show";

export function useTourGuide(userId?: string | number) {
  const stateKey = userId !== undefined ? makeStorageKey(userId, "state") : TOUR_STORAGE_KEY;
  const autoShownKey = userId !== undefined ? makeStorageKey(userId, "auto-shown") : null;

  const [state, dispatch] = useReducer(tourReducer, undefined, () => loadPersistedState(stateKey));

  useEffect(() => {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {}
  }, [state, stateKey]);

  useEffect(() => {
    if (autoShownKey === null) return undefined;
    const seen = localStorage.getItem(autoShownKey);
    const neverShow = localStorage.getItem(TOUR_NEVER_SHOW_KEY);
    if (!seen && !neverShow && !state.visible && state.machineState === "IDLE" && state.completedSteps.length === 0) {
      const timer = setTimeout(() => {
        const stillEligible =
          !localStorage.getItem(autoShownKey) &&
          !localStorage.getItem(TOUR_NEVER_SHOW_KEY) &&
          !state.visible &&
          state.machineState === "IDLE";
        if (stillEligible) {
          localStorage.setItem(autoShownKey, "1");
          dispatch({ type: "START_TOUR" });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoShownKey, state.visible, state.machineState, state.completedSteps.length]);

  const startTour = useCallback(() => {
    dispatch({ type: "START_TOUR" });
  }, []);

  const closeTour = useCallback(() => {
    dispatch({ type: "CLOSE_TOUR" });
  }, []);

  const resetTour = useCallback(() => {
    try { localStorage.removeItem(TOUR_NEVER_SHOW_KEY); } catch {}
    dispatch({ type: "RESET_TOUR" });
  }, []);

  const neverShowTour = useCallback(() => {
    try { localStorage.setItem(TOUR_NEVER_SHOW_KEY, "1"); } catch {}
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

const HEYGEN_ORIGIN = "https://app.heygen.com";
const HEYGEN_SIGNAL_TIMEOUT_MS = 10_000;
const BASE_URL = import.meta.env.BASE_URL ?? "/";

export function TourGuide({ onClose, onNeverShow, state, dispatch }: TourGuideProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { config } = useAppConfig();
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heygenConfirmedRef = useRef(false);
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => { navigateRef.current = navigate; });
  const navigatingRef = useRef(false);

  const step = TOUR_STEPS[state.currentStep];
  const isLast = state.currentStep >= TOUR_STEPS.length - 1;
  const isFirst = state.currentStep === 0;

  const adminOverrideId = config[`tour_video_${state.currentStep}`];
  const videoId = adminOverrideId || step?.videoId || "";
  const heygenShareUrl = videoId ? `https://app.heygen.com/share/${videoId}` : "";

  const localVideoSrc = !adminOverrideId && step?.videoSrc
    ? `${BASE_URL}${step.videoSrc.replace(/^\//, "")}`
    : null;

  const useLocalVideo = Boolean(localVideoSrc);

  function cancelSignalTimer() {
    if (signalTimerRef.current !== null) {
      clearTimeout(signalTimerRef.current);
      signalTimerRef.current = null;
    }
  }

  function startSignalTimer() {
    cancelSignalTimer();
    signalTimerRef.current = setTimeout(() => {
      if (!heygenConfirmedRef.current) {
        setVideoLoading(false);
        setVideoError(true);
      }
    }, HEYGEN_SIGNAL_TIMEOUT_MS);
  }

  useEffect(() => {
    if (state.machineState === "PLAYING_VIDEO") {
      setVideoError(false);
      if (useLocalVideo) {
        setVideoLoading(true);
        cancelSignalTimer();
      } else {
        heygenConfirmedRef.current = false;
        cancelSignalTimer();
        if (!videoId) {
          setVideoLoading(false);
          setVideoError(true);
        } else {
          setVideoLoading(true);
        }
      }
    }
    return () => { cancelSignalTimer(); };
  }, [state.machineState, state.currentStep, videoId, useLocalVideo]);

  useEffect(() => {
    if (state.machineState !== "PLAYING_VIDEO" || !useLocalVideo) return;
    const el = videoRef.current;
    if (!el) return;
    el.load();
    el.play().catch(() => {});
  }, [state.machineState, state.currentStep, useLocalVideo]);

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

  useEffect(() => {
    if (state.machineState === "INTRODUCING") {
      const targetRoute = TOUR_STEPS[state.currentStep]?.targetRoute;
      if (targetRoute) {
        navigateRef.current(targetRoute, { replace: true });
      }
    }
  }, [state.machineState, state.currentStep]);

  useEffect(() => {
    if (state.machineState !== "PLAYING_VIDEO" || useLocalVideo) return;

    function handleMessage(e: MessageEvent) {
      if (e.origin !== HEYGEN_ORIGIN) return;
      if (!heygenConfirmedRef.current) {
        heygenConfirmedRef.current = true;
        cancelSignalTimer();
        setVideoLoading(false);
        setVideoError(false);
      }
      if (
        e.data === "heygen:video:ended" ||
        (e.data && typeof e.data === "object" && e.data.type === "heygen:video:ended")
      ) {
        dispatch({ type: "VIDEO_ENDED" });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [state.machineState, dispatch, useLocalVideo]);

  function handleClose() {
    dispatch({ type: "CLOSE_TOUR" });
    onClose?.();
  }

  function handleNeverShow() {
    try { localStorage.setItem(TOUR_NEVER_SHOW_KEY, "1"); } catch {}
    dispatch({ type: "CLOSE_TOUR" });
    onNeverShow?.();
  }

  function handlePlayVideo() {
    dispatch({ type: "PLAY_VIDEO" });
  }

  function handleSkipVideo() {
    dispatch({ type: "VIDEO_ENDED" });
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

  if (!state.visible) return null;

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
      {state.machineState === "PLAYING_VIDEO" && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-white/80 text-sm font-medium">
                Step {state.currentStep + 1} of {TOUR_STEPS.length}: {step.title}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Continue
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
              style={{ paddingBottom: "56.25%" }}
            >
              {useLocalVideo && !videoError && (
                <video
                  ref={videoRef}
                  key={localVideoSrc ?? undefined}
                  src={localVideoSrc ?? undefined}
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  onCanPlay={() => setVideoLoading(false)}
                  onEnded={() => dispatch({ type: "VIDEO_ENDED" })}
                  onError={() => { setVideoLoading(false); setVideoError(true); }}
                />
              )}

              {!useLocalVideo && !videoError && (
                <iframe
                  ref={iframeRef}
                  src={heygenShareUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                  title={step.title}
                  onLoad={() => { if (!heygenConfirmedRef.current) startSignalTimer(); }}
                  onError={() => { cancelSignalTimer(); setVideoLoading(false); setVideoError(true); }}
                />
              )}

              {videoLoading && !videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 pointer-events-none">
                  <div className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                  <p className="text-white/60 text-sm">Loading video...</p>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-6 text-center">
                  <VideoOff className="h-12 w-12 text-white/30 mb-4" />
                  <p className="text-white font-semibold mb-1">{step.title}</p>
                  <p className="text-white/50 text-sm mb-6 max-w-sm">
                    This video couldn't be loaded. Click Continue to proceed to the next step.
                  </p>
                  <button
                    onClick={handleSkipVideo}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
                  >
                    <SkipForward className="h-4 w-4" />
                    Continue
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-white/40 text-xs mt-3">
              {videoError
                ? "Video couldn't load. Click 'Continue' above to proceed to the next step."
                : "Video not advancing? Click 'Continue' above to proceed to the next step."}
            </p>
          </div>
        </div>
      )}

      {state.machineState === "INTRODUCING" && (
        <div className="fixed bottom-4 right-4 z-[99] w-64 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-base select-none"
                  style={{ filter: "drop-shadow(0 0 6px hsl(165 100% 39% / 0.5))" }}
                >
                  🤖
                </span>
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
                <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-3">{step.description}</p>
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

              <button
                onClick={handlePlayVideo}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity text-[10px] mb-2"
              >
                <Play className="h-3 w-3 fill-current" />
                Watch Video
              </button>

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
                  className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {isLast ? "Finish" : "Skip"}
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
