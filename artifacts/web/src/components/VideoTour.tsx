import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  SkipForward,
  ExternalLink,
  VideoOff,
  X,
} from "lucide-react";
import {
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
} from "./tourConfig";
import { useAppConfig } from "@/contexts/AppConfigContext";

type VideoTourMachineState =
  | "IDLE"
  | "INTRODUCING"
  | "PLAYING_VIDEO"
  | "COMPLETED";

interface VideoTourState {
  visible: boolean;
  machineState: VideoTourMachineState;
  currentStep: number;
  completedSteps: number[];
}

const DEFAULT_VIDEO_TOUR_STATE: VideoTourState = {
  visible: false,
  machineState: "IDLE",
  currentStep: 0,
  completedSteps: [],
};

type TourAction =
  | { type: "START_TOUR" }
  | { type: "PLAY_VIDEO" }
  | { type: "VIDEO_ENDED" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "JUMP_TO_STEP"; step: number }
  | { type: "COMPLETE_TOUR" }
  | { type: "NAVIGATE_DONE" }
  | { type: "FINISH_TOUR" };

function tourReducer(state: VideoTourState, action: TourAction): VideoTourState {
  switch (action.type) {
    case "START_TOUR":
      return {
        ...state,
        visible: true,
        machineState: "INTRODUCING",
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
        machineState: "PLAYING_VIDEO",
        currentStep: state.currentStep + 1,
      };
    }

    case "NEXT_STEP": {
      const nextStep = state.currentStep + 1;
      if (nextStep >= TOUR_STEPS.length) {
        return {
          ...state,
          machineState: "COMPLETED",
          visible: true,
        };
      }
      return {
        ...state,
        currentStep: nextStep,
        machineState: "PLAYING_VIDEO",
      };
    }

    case "PREV_STEP": {
      if (state.currentStep <= 0) return state;
      return {
        ...state,
        currentStep: state.currentStep - 1,
        machineState: "PLAYING_VIDEO",
      };
    }

    case "JUMP_TO_STEP":
      return {
        ...state,
        currentStep: action.step,
        machineState: "PLAYING_VIDEO",
      };

    case "COMPLETE_TOUR":
      return {
        ...state,
        machineState: "COMPLETED",
        completedSteps: TOUR_STEPS.map((_, i) => i),
        visible: true,
      };

    case "FINISH_TOUR":
      return {
        ...state,
        visible: false,
        machineState: "IDLE",
      };

    case "NAVIGATE_DONE":
      return state;

    default:
      return state;
  }
}

function makeStorageKey(userId: string | number, suffix: string) {
  return `${TOUR_STORAGE_KEY}:${userId}:${suffix}`;
}

function loadPersistedState(stateKey: string): VideoTourState {
  try {
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VideoTourState>;
      return { ...DEFAULT_VIDEO_TOUR_STATE, ...parsed };
    }
  } catch {}
  return DEFAULT_VIDEO_TOUR_STATE;
}

export function useVideoTour(userId?: string | number) {
  const stateKey = userId !== undefined ? makeStorageKey(userId, "video-tour-state") : TOUR_STORAGE_KEY;

  const [state, dispatch] = useReducer(tourReducer, undefined, () => loadPersistedState(stateKey));

  useEffect(() => {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {}
  }, [state, stateKey]);

  const startTour = useCallback(() => {
    dispatch({ type: "START_TOUR" });
    dispatch({ type: "PLAY_VIDEO" });
  }, []);

  return {
    state,
    dispatch,
    showTour: state.visible,
    startTour,
  };
}

interface VideoTourProps {
  state: VideoTourState;
  dispatch: React.Dispatch<TourAction>;
  onClose?: () => void;
}

const HEYGEN_ORIGIN = "https://app.heygen.com";
const HEYGEN_SIGNAL_TIMEOUT_MS = 10_000;

export function VideoTour({ state, dispatch, onClose }: VideoTourProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { config } = useAppConfig();
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heygenConfirmedRef = useRef(false);

  const step = TOUR_STEPS[state.currentStep];
  const isLast = state.currentStep >= TOUR_STEPS.length - 1;
  const isFirst = state.currentStep === 0;

  const videoId = config[`tour_video_${state.currentStep}`] || "";
  const heygenShareUrl = videoId ? `https://app.heygen.com/share/${videoId}` : "";

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
      heygenConfirmedRef.current = false;
      cancelSignalTimer();
      if (!videoId) {
        setVideoLoading(false);
        setVideoError(true);
      } else {
        setVideoLoading(true);
        setVideoError(false);
      }
    }
    return () => {
      cancelSignalTimer();
    };
  }, [state.machineState, state.currentStep, videoId]);

  useEffect(() => {
    if (state.machineState !== "PLAYING_VIDEO") return;

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
        if (isLast) {
          dispatch({ type: "COMPLETE_TOUR" });
        } else {
          dispatch({ type: "NEXT_STEP" });
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [state.machineState, dispatch, isLast]);

  function handleSkipVideo() {
    if (isLast) {
      dispatch({ type: "COMPLETE_TOUR" });
    } else {
      dispatch({ type: "NEXT_STEP" });
    }
  }

  function handleNext() {
    if (isLast) {
      dispatch({ type: "COMPLETE_TOUR" });
    } else {
      dispatch({ type: "NEXT_STEP" });
    }
  }

  function handlePrev() {
    dispatch({ type: "PREV_STEP" });
  }

  function handleFinish() {
    dispatch({ type: "FINISH_TOUR" });
    onClose?.();
  }

  function handleExit() {
    dispatch({ type: "FINISH_TOUR" });
    onClose?.();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleExit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!state.visible) return null;

  if (state.machineState === "COMPLETED") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tour Complete!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You've completed the full video tour. You're ready to start your trading journey!
          </p>
          <button
            onClick={handleFinish}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-white/80 text-sm font-medium">
            Video {state.currentStep + 1} of {TOUR_STEPS.length}: {step.title}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip Video
            </button>
            <button
              onClick={handleExit}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              title="Exit tour (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
          style={{ paddingBottom: "56.25%" }}
        >
          {!videoError && (
            <iframe
              ref={iframeRef}
              src={heygenShareUrl}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              title={step.title}
              onLoad={() => {
                if (!heygenConfirmedRef.current) startSignalTimer();
              }}
              onError={() => {
                cancelSignalTimer();
                setVideoLoading(false);
                setVideoError(true);
              }}
            />
          )}

          {videoLoading && !videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <div className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-sm">Loading video...</p>
            </div>
          )}

          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-6 text-center">
              <VideoOff className="h-12 w-12 text-white/30 mb-4" />
              <p className="text-white font-semibold mb-1">{step.title}</p>
              <p className="text-white/50 text-sm mb-6 max-w-sm">
                This video couldn't be embedded. Watch it directly on HeyGen, then continue the tour.
              </p>
              {heygenShareUrl && (
                <a
                  href={heygenShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Watch on HeyGen
                </a>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-3">
          {videoError
            ? "Video couldn't load. Use 'Watch on HeyGen' above or click navigation buttons below to proceed."
            : "Video will auto-advance when finished. Use buttons below to navigate or skip."}
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < state.currentStep
                    ? "w-6 bg-primary"
                    : i === state.currentStep
                    ? "w-4 bg-primary/60"
                    : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            {isLast ? "Finish" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
