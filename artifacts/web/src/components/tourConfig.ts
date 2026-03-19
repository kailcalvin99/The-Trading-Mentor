export interface TourStep {
  title: string;
  description: string;
  videoId: string;
  videoSrc?: string;
  targetRoute: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to ICT AI Trading Mentor",
    description: "Hey trader! Welcome aboard. I'm your personal ICT mentor. Let me give you a quick 5-step tour of the most important tools on the platform. You'll be ready to trade with structure in under 5 minutes.",
    videoId: "f84fcfe5a9104aed9666060e0c2b8fc6",
    videoSrc: "/tour-videos/step-00.mp4",
    targetRoute: "/dashboard",
  },
  {
    title: "The Daily Planner: Your Morning Routine",
    description: "Every profitable trader starts the day with a plan. The Daily Planner helps you set your bias, identify key levels, and prepare mentally before the market opens. Complete your morning routine before every session.",
    videoId: "daaddb169de14b6b93670fe93eb19bed",
    videoSrc: "/tour-videos/step-01.mp4",
    targetRoute: "/planner",
  },
  {
    title: "The Risk Shield: Protect Your Account",
    description: "The Risk Shield is your most important tool. It tracks your daily drawdown, calculates exact position sizes, and locks you out if you hit your loss limit. Capital preservation is rule #1.",
    videoId: "24d4952d27d046a7b20f348bec868bbd",
    videoSrc: "/tour-videos/step-03.mp4",
    targetRoute: "/risk-shield",
  },
  {
    title: "The Smart Journal: Log Every Trade",
    description: "Elite traders review every single trade. The Smart Journal lets you log entries, track your win rate, and identify patterns in your performance. Consistency builds the edge.",
    videoId: "e1d4717f408344a1a3e6eb2078c5d4e3",
    videoSrc: "/tour-videos/step-06.mp4",
    targetRoute: "/journal",
  },
  {
    title: "The AI Mentor: Your 24/7 ICT Tutor",
    description: "Got a question about ICT concepts at 2 AM? Your AI Mentor is always available. Ask anything from smart money concepts to trade management — it's trained specifically on ICT methodology.",
    videoId: "947090857d98427d9fe930ffe82747e2",
    videoSrc: "/tour-videos/step-08.mp4",
    targetRoute: "/dashboard",
  },
];

export const TOUR_STORAGE_KEY = "ict-tour-state";
export const TOUR_NEVER_SHOW_KEY = "ict-tour-never-show";

export type TourMachineState =
  | "IDLE"
  | "INTRODUCING"
  | "PLAYING_VIDEO"
  | "NAVIGATING"
  | "COMPLETED";

export interface TourState {
  visible: boolean;
  machineState: TourMachineState;
  currentStep: number;
  completedSteps: number[];
  checklistOpen: boolean;
}

export const DEFAULT_TOUR_STATE: TourState = {
  visible: false,
  machineState: "IDLE",
  currentStep: 0,
  completedSteps: [],
  checklistOpen: false,
};
