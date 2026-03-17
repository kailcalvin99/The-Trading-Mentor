import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTourGuide } from "@/components/TourGuide";

type TourGuideContextValue = ReturnType<typeof useTourGuide>;

const TourGuideContext = createContext<TourGuideContextValue | null>(null);

export function TourGuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tourGuide = useTourGuide(user?.id);
  return (
    <TourGuideContext.Provider value={tourGuide}>
      {children}
    </TourGuideContext.Provider>
  );
}

export function useTourGuideContext(): TourGuideContextValue {
  const ctx = useContext(TourGuideContext);
  if (!ctx) {
    throw new Error("useTourGuideContext must be used within TourGuideProvider");
  }
  return ctx;
}
