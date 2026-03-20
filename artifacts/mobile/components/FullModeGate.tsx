import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import FrostedGate from "@/components/FrostedGate";

interface FullModeGateProps {
  children: React.ReactNode;
  demoContent?: React.ReactNode;
}

export default function FullModeGate({ children, demoContent }: FullModeGateProps) {
  const { appMode } = useAuth();

  if (appMode === "lite") {
    return (
      <FrostedGate mode="academy">
        {demoContent ?? children}
      </FrostedGate>
    );
  }

  return <>{children}</>;
}
