import { Lock, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export type FrostedGateMode = "academy" | "standard" | "premium";

interface FrostedGateOverlayProps {
  children: React.ReactNode;
  mode: FrostedGateMode;
  onAction?: () => void;
}

const GATE_CONTENT: Record<FrostedGateMode, {
  iconType: "lock" | "plus";
  title: string;
  description: string;
  buttonText: string;
}> = {
  academy: {
    iconType: "plus",
    title: "Finish the Academy to Unlock",
    description: "Complete the ICT Academy to gain access to Full Mode and unlock all features.",
    buttonText: "Go to Academy",
  },
  standard: {
    iconType: "lock",
    title: "Upgrade to Standard",
    description: "This feature is included in the Standard plan. Upgrade to access your full trading toolkit.",
    buttonText: "Upgrade Now",
  },
  premium: {
    iconType: "lock",
    title: "Upgrade to Premium",
    description: "This is a Premium feature. Unlock advanced analytics, AI coaching, and more.",
    buttonText: "Upgrade to Premium",
  },
};

export default function FrostedGateOverlay({ children, mode, onAction }: FrostedGateOverlayProps) {
  const navigate = useNavigate();
  const { setAppMode } = useAuth();
  const config = GATE_CONTENT[mode];

  function handleAction() {
    if (onAction) {
      onAction();
      return;
    }
    if (mode === "academy") {
      setAppMode("full");
      navigate("/academy");
    } else {
      navigate("/pricing");
    }
  }

  return (
    <div className="relative w-full min-h-[60vh] overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none opacity-60" aria-hidden="true">
        {children}
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "rgba(10, 10, 15, 0.65)",
        }}
      >
        <div className="flex flex-col items-center text-center px-6 max-w-sm space-y-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            config.iconType === "plus"
              ? "bg-primary/20 border border-primary/30"
              : "bg-amber-500/20 border border-amber-500/30"
          }`}>
            {config.iconType === "plus" ? (
              <Plus className="h-8 w-8 text-primary" />
            ) : (
              <Lock className={`h-8 w-8 ${mode === "premium" ? "text-amber-500" : "text-amber-400"}`} />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{config.title}</h3>
            <p className="text-sm text-white/70 leading-relaxed">{config.description}</p>
          </div>

          <button
            onClick={handleAction}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
              config.iconType === "plus"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-gradient-to-r from-amber-500 to-primary text-white hover:opacity-90"
            }`}
          >
            {config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
