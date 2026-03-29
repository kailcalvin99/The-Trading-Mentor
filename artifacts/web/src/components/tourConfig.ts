export interface TourStep {
  title: string;
  description: string;
  targetRoute: string;
  tierNote?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to The Trading Mentor",
    description: "This is your home base. The green nav bar at the bottom keeps every section one tap away. At the top you'll find the live KillZone ticker — it shows you exactly when the London, NY Open, and Silver Bullet windows are open. Check your XP level, daily streak, and use the floating AI orb anytime for instant mentor help.",
    targetRoute: "/",
  },
  {
    title: "ICT Academy — 48 Structured Lessons",
    description: "Start here if you're new to ICT. The Academy takes you from absolute basics all the way to advanced concepts like PD Arrays, OTE entries, and Silver Bullet setups — 48 lessons across 8 chapters. Complete lessons to unlock app features and build real knowledge, not just guesses.",
    targetRoute: "/academy",
  },
  {
    title: "Mission Control — Your Pre-Session HQ",
    description: "Before every session, open Mission Control. Set your market bias (bullish, bearish, or neutral), check the economic calendar for high-impact news, and run through your pre-trade checklist. The Probability Meter scores your setup quality in real time — if the score is low, sit on your hands.",
    targetRoute: "/planner",
  },
  {
    title: "Risk Shield — Inside Mission Control",
    description: "Still inside Mission Control — scroll down to find the Risk Shield. Enter your account balance, set your max daily drawdown, and it calculates the exact position size for NQ, MNQ, ES, Gold, and more. Hit the drawdown limit and the app locks you out for 24 hours — by design, to protect you from revenge trading.",
    targetRoute: "/planner",
  },
  {
    title: "Smart Journal — Log Every Trade",
    description: "After every trade, log it here. The Smart Journal captures your entry, exit, setup type, emotions, and behavior tags. The AI Trade Coach gives you instant written feedback on each trade — what you did well and where you can improve. Patterns that cost you money become visible over time.",
    targetRoute: "/journal",
  },
  {
    title: "Analytics — Understand Your Edge",
    description: "Review your performance every week. Analytics breaks down your results by session, setup type, and behavior tag — so you know exactly where your profits come from and where they're leaking. Spot your best setups, worst habits, and the times of day when you trade best.",
    targetRoute: "/analytics",
    tierNote: "Analytics is a Premium feature. Upgrade to the Premium plan to unlock full performance tracking.",
  },
  {
    title: "Prop Tracker — Protect Your Funded Account",
    description: "Trading a funded account? The Prop Tracker monitors your daily loss limit, max drawdown, and profit target in real time — so you never blow a challenge by accident. Set your firm's rules once and get clear visual alerts before you hit a limit.",
    targetRoute: "/prop-tracker",
    tierNote: "Prop Tracker is a Standard & Premium feature. Upgrade your plan to unlock funded account monitoring.",
  },
  {
    title: "Community — Trade With Others",
    description: "You're not trading alone. Connect with other ICT traders, share trade ideas, ask questions, and stay accountable in the Community hub. Discussion threads, trade reviews, and daily chat keep you engaged and improving alongside traders at every level.",
    targetRoute: "/community",
  },
  {
    title: "Your AI Mentor — Always One Click Away",
    description: "That wraps up the tour! The floating AI orb is always one tap away — ask it anything about ICT concepts, setup reviews, or methodology questions. It's trained specifically on ICT methodology and the lessons you've been studying. Time to put the knowledge to work. Happy trading!",
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
