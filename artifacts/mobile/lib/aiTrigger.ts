export interface MobileAITrigger {
  message: string;
  autoOpen?: boolean;
  prefillPrompt?: string;
  autoSend?: boolean;
}

type TriggerListener = (trigger: MobileAITrigger) => void;

const listeners: Set<TriggerListener> = new Set();

let _quizFailCount = 0;

export function fireMobileAITrigger(trigger: MobileAITrigger) {
  listeners.forEach((fn) => fn(trigger));
}

export function subscribeToAITrigger(fn: TriggerListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function incrementMobileQuizFail(): number {
  _quizFailCount += 1;
  return _quizFailCount;
}

export function resetMobileQuizFail() {
  _quizFailCount = 0;
}
