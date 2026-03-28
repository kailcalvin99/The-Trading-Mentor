import { Bot } from "lucide-react";

export function AskAIFloater({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
        visible ? "top-20 opacity-100 pointer-events-auto" : "-top-12 opacity-0 pointer-events-none"
      }`}
    >
      <button
        onClick={onOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg text-xs font-bold hover:opacity-90 transition-opacity"
      >
        <Bot className="h-3.5 w-3.5" />
        Ask AI Mentor
      </button>
    </div>
  );
}
