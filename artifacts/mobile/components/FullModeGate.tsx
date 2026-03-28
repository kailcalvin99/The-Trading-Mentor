import React from "react";

interface FullModeGateProps {
  children: React.ReactNode;
  demoContent?: React.ReactNode;
}

export default function FullModeGate({ children }: FullModeGateProps) {
  return <>{children}</>;
}
