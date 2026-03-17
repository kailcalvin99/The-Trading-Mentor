import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VideoTour, useVideoTour } from "@/components/VideoTour";
import { useAuth } from "@/contexts/AuthContext";

export default function VideoTourPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, dispatch, startTour } = useVideoTour(user?.id);

  useEffect(() => {
    // Start the tour when page loads
    if (!state.visible) {
      startTour();
    }
  }, []);

  useEffect(() => {
    // When tour is finished and hidden, redirect back to dashboard
    if (!state.visible && state.machineState === "IDLE") {
      navigate("/dashboard");
    }
  }, [state.visible, state.machineState, navigate]);

  return <VideoTour state={state} dispatch={dispatch} />;
}
