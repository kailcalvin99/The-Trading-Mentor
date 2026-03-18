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
    description: "Hey trader! Welcome aboard. I'm your personal ICT mentor. Let me give you a quick tour of everything this platform has to offer. We'll cover all the tools that are going to transform your trading journey.",
    videoId: "f84fcfe5a9104aed9666060e0c2b8fc6",
    videoSrc: "/tour-videos/step-00.mp4",
    targetRoute: "/dashboard",
  },
  {
    title: "The Daily Planner: Your Morning Routine",
    description: "Every profitable trader starts the day with a plan. The Daily Planner helps you set your bias, identify key levels, and prepare mentally before the market opens. Let's see how it works.",
    videoId: "daaddb169de14b6b93670fe93eb19bed",
    videoSrc: "/tour-videos/step-01.mp4",
    targetRoute: "/planner",
  },
  {
    title: "Setting Up Your Trading Rules and Profile",
    description: "Your settings are the foundation of your trading discipline. Here you'll configure your preferred sessions, entry styles, and the pairs you trade. Getting this right from the start saves you headaches later.",
    videoId: "c9cca2343e7a46779122156e8a409bf8",
    videoSrc: "/tour-videos/step-02.mp4",
    targetRoute: "/settings",
  },
  {
    title: "The Risk Shield: How to Protect Your Money",
    description: "The Risk Shield is your most important tool. It tracks your daily drawdown, calculates position sizes, and makes sure you never blow your account. Protecting capital is rule #1.",
    videoId: "24d4952d27d046a7b20f348bec868bbd",
    videoSrc: "/tour-videos/step-03.mp4",
    targetRoute: "/risk-shield",
  },
  {
    title: "The Dashboard: Putting It All Together",
    description: "The Dashboard is your command center. You'll see live market sessions, today's mission, your progress streak, and quick access to every tool. This is where you start every trading day.",
    videoId: "d6260b0aa26d4cbea7ed114d4c961c27",
    videoSrc: "/tour-videos/step-04.mp4",
    targetRoute: "/dashboard",
  },
  {
    title: "The ICT Academy: Your Trading Classroom",
    description: "The ICT Academy has everything you need to master the Inner Circle Trader methodology — from concepts like Fair Value Gaps and Order Blocks to advanced entry techniques. Learn at your own pace.",
    videoId: "907bcbe8563e4f21bd8a1916585dfa2c",
    videoSrc: "/tour-videos/step-05.mp4",
    targetRoute: "/academy",
  },
  {
    title: "The Smart Journal: Logging Your Trades",
    description: "Elite traders review every single trade. The Smart Journal lets you log entries, track your win rate, and identify patterns in your performance. Your journal is your edge.",
    videoId: "e1d4717f408344a1a3e6eb2078c5d4e3",
    videoSrc: "/tour-videos/step-06.mp4",
    targetRoute: "/journal",
  },
  {
    title: "Analytics: Reading Your Report Card",
    description: "The Analytics page turns your journal data into powerful charts and insights. See your win rate over time, best sessions, and where you need to improve. Data-driven improvement is sustainable improvement.",
    videoId: "f5ea6b0702f64830b1098bf67b917e72",
    videoSrc: "/tour-videos/step-07.mp4",
    targetRoute: "/analytics",
  },
  {
    title: "The AI Assistant: Your 24/7 ICT Tutor",
    description: "Got a question about ICT concepts at 2 AM? The AI Assistant has you covered. It's trained on ICT methodology and can answer anything from smart money concepts to trade management.",
    videoId: "947090857d98427d9fe930ffe82747e2",
    videoSrc: "/tour-videos/step-08.mp4",
    targetRoute: "/dashboard",
  },
  {
    title: "The Community Page: You Are Not Alone",
    description: "Trading can feel lonely, but it doesn't have to be. The Community page connects you with other ICT traders — share setups, ask questions, and stay accountable together.",
    videoId: "ccb2acbae4bd4dbbb61f0dcaec90e809",
    videoSrc: "/tour-videos/step-09.mp4",
    targetRoute: "/community",
  },
  {
    title: "Tips, Traps & What Not to Do",
    description: "Before you go live, there are some critical mistakes most new traders make. Let me walk you through the traps to avoid so you can fast-track your progress and skip the painful lessons.",
    videoId: "98b5e0f3ad3b4d889d7e029e91f7da9f",
    videoSrc: "/tour-videos/step-10.mp4",
    targetRoute: "/dashboard",
  },
];

export const TOUR_STORAGE_KEY = "ict-tour-state";

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
