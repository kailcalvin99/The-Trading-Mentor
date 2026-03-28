export interface TourStep {
  title: string;
  description: string;
  targetRoute: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to The Trading Mentor",
    description: "This is your home base. The live KillZone ticker at the top shows you exactly when London, New York Open, and Silver Bullet windows are active. Check your XP level, daily streak, and let the AI Mentor assist you anytime.",
    targetRoute: "/",
  },
  {
    title: "ICT Academy",
    description: "Start here if you're new. The Academy walks you through every ICT concept — from Smart Money basics to advanced PD Arrays. Complete lessons to unlock the full app.",
    targetRoute: "/academy",
  },
  {
    title: "Mission Control",
    description: "Before every session, come to Mission Control. Set your market bias, check the economic calendar, and complete your pre-trade checklist. The Probability Meter scores your setup quality in real time.",
    targetRoute: "/planner",
  },
  {
    title: "Risk Tools (inside Mission Control)",
    description: "Still inside Mission Control — scroll down to see the Risk Shield tools. Set your account balance, define your max daily drawdown, and calculate exact position sizes for NQ, ES, Gold, and more.",
    targetRoute: "/planner",
  },
  {
    title: "Smart Journal",
    description: "After every trade, log it here. The Smart Journal captures your entry, exit, emotions, and setup quality. The AI Trade Coach gives you instant feedback on what you did well and what to improve.",
    targetRoute: "/journal",
  },
  {
    title: "Analytics",
    description: "Review your edge every week. Analytics breaks down your performance by session, setup type, and behavior tag — so you know exactly where your money is coming from and where it's leaking.",
    targetRoute: "/analytics",
  },
  {
    title: "Prop Tracker",
    description: "Trading a funded account? The Prop Tracker monitors your daily loss limit, max drawdown, and profit target so you never blow a challenge by accident.",
    targetRoute: "/prop-tracker",
  },
  {
    title: "Community",
    description: "You're not alone. Connect with other ICT traders, share trade ideas, ask questions, and stay accountable inside the Community hub.",
    targetRoute: "/community",
  },
  {
    title: "Your AI Mentor",
    description: "That wraps up the tour! Remember — your AI Mentor is always one click away. Ask it anything about ICT concepts, setups, or trade reviews. It's trained specifically on ICT methodology. Let's get to work!",
    targetRoute: "/",
  },
];

export const TOUR_STORAGE_KEY = "ict-tour-state";
export const TOUR_NEVER_SHOW_KEY = "ict-tour-never-show";

export type TourMachineState =
  | "IDLE"
  | "WELCOME_VIDEO"
  | "INTRODUCING"
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
