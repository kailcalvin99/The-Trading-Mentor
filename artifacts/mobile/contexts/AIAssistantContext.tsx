import React, { createContext, useContext, useRef } from "react";

interface AIAssistantContextValue {
  openWithTopic: (topic: string) => void;
  registerOpenHandler: (fn: (topic: string) => void) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue>({
  openWithTopic: () => {},
  registerOpenHandler: () => {},
});

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<((topic: string) => void) | null>(null);

  function registerOpenHandler(fn: (topic: string) => void) {
    handlerRef.current = fn;
  }

  function openWithTopic(topic: string) {
    handlerRef.current?.(topic);
  }

  return (
    <AIAssistantContext.Provider value={{ openWithTopic, registerOpenHandler }}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  return useContext(AIAssistantContext);
}
