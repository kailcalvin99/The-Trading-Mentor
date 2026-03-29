import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";

export const USER_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "navigate",
    description: "Navigate the user to a specific page in the app. Use this when the user asks to go to a page, or when an action requires showing a specific page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description: "The page to navigate to. Options: academy, planner, risk-shield, journal, analytics, pricing, admin, welcome, community, dashboard",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "log_trade",
    description: "Log a trade in the Smart Journal. Use this when the user says they want to log a trade, record a win/loss, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pair: { type: Type.STRING, description: "Trading pair/ticker (e.g., NQ1!, MNQ1!, ES1!)" },
        outcome: { type: Type.STRING, description: "Trade outcome: win, loss, or breakeven" },
        riskPct: { type: Type.NUMBER, description: "Risk percentage (e.g., 0.5)" },
        entryTime: { type: Type.STRING, description: "Entry time (e.g., 10:15 AM)" },
        notes: { type: Type.STRING, description: "Trade notes including entry mode [Conservative] or [Silver Bullet]" },
        sideDirection: { type: Type.STRING, description: "BUY or SELL" },
        behaviorTag: { type: Type.STRING, description: "Behavior tag: Disciplined, FOMO, Chased, or Greedy" },
      },
      required: ["pair", "outcome"],
    },
  },
  {
    name: "get_journal_entries",
    description: "Get the user's recent trade journal entries. Use when the user asks about their trades, recent performance, or trading history.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: "Number of trades to return (default 10)" },
      },
    },
  },
  {
    name: "get_analytics_summary",
    description: "Get a summary of the user's trading analytics including win rate, total trades, behavior patterns, profit factor, etc. Use when the user asks 'how did I do', 'what's my win rate', or anything about their performance.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "calculate_position_size",
    description: "Calculate position size for NQ/MNQ futures based on account balance, risk percentage, and stop loss distance. Use when the user asks about position sizing, how many contracts to trade, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        stopLossPoints: { type: Type.NUMBER, description: "Stop loss distance in points" },
        riskPct: { type: Type.NUMBER, description: "Risk percentage of account (default 0.5)" },
        accountBalance: { type: Type.NUMBER, description: "Optional override for account balance" },
      },
      required: ["stopLossPoints"],
    },
  },
  {
    name: "complete_planner_items",
    description: "Mark morning routine items as complete. Use when the user says 'mark my routine done', 'complete my morning routine', etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        markAll: { type: Type.BOOLEAN, description: "If true, mark ALL routine items as complete" },
        items: {
          type: Type.ARRAY,
          description: "Specific item keys to mark complete",
          items: { type: Type.STRING },
        },
      },
    },
  },
  {
    name: "get_user_context",
    description: "Get the current user's profile, subscription, and app context. Use when you need information about the user to answer a question.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_kill_zone_status",
    description: "Get the current ICT kill zone status based on real New York time. Use when the user asks 'are we in a kill zone?', 'should I be trading right now?', 'what session is active?', or any timing-related question.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_academy_lesson",
    description: "Look up academy lesson content by ICT concept keyword. Use when the user asks 'what is X?', 'explain X', 'teach me about X' — for any ICT concept (FVG, OB, OTE, MSS, liquidity, sweep, kill zone, premium, discount, displacement, SMT, IPDA, etc.).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        concept: {
          type: Type.STRING,
          description: "The ICT concept or keyword to look up (e.g., 'FVG', 'Order Block', 'OTE', 'liquidity sweep', 'MSS', 'kill zone', 'premium', 'discount')",
        },
      },
      required: ["concept"],
    },
  },
  {
    name: "get_psychology_report",
    description: "Get a structured psychology/emotional-leaks report from the trading journal. Use when the user asks 'what are my emotional leaks?', 'how is my discipline?', 'am I trading emotionally?', 'what is my mindset score?', or anything about trading psychology and behaviour patterns.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

export const ADMIN_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "list_users_summary",
    description: "List all users with their subscription status. Admin only. Use when admin asks about users, user count, who's subscribed, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_platform_stats",
    description: "Get platform-wide statistics: user counts, subscription distribution, trade counts, revenue summary. Admin only.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_inactive_users",
    description: "Get a list of users who haven't been active on the platform (no AI conversations or app usage) in a specified number of days. Admin only. Note: trade journal is a shared team resource without per-user tracking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.NUMBER, description: "Number of days of inactivity (default 7)" },
      },
    },
  },
  {
    name: "suggest_system_prompt",
    description: "Generate a suggested AI mentor system prompt based on current platform data and usage patterns. Admin only.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus: { type: Type.STRING, description: "Optional focus area for the prompt (e.g., 'risk management', 'discipline', 'ICT concepts')" },
      },
    },
  },
  {
    name: "read_source_file",
    description: "Read the contents of a source file inside the artifacts/ directory. Use when the admin asks you to read, review, or audit a source file before proposing changes. Always read the file before proposing any edits. Admin only.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_source_file",
    description: "Overwrite a source file inside the artifacts/ directory with new content. Only call this AFTER the admin has explicitly confirmed the change in chat. Writes outside artifacts/ are rejected. Admin only.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
        content: { type: Type.STRING, description: "The full new content to write to the file" },
        reason: { type: Type.STRING, description: "Brief description of what changed and why" },
      },
      required: ["path", "content", "reason"],
    },
  },
  {
    name: "update_self_system_prompt",
    description: "Write a new system prompt for the AI mentor to the admin_settings table (key: ai_mentor_system_prompt). This replaces the active prompt immediately. Only call after the admin has reviewed and approved the new prompt text in chat. Admin only.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: "The full new system prompt text to save" },
        reason: { type: Type.STRING, description: "Brief explanation of why the prompt is being updated" },
      },
      required: ["prompt", "reason"],
    },
  },
];

export const CODE_EDITOR_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "read_source_file",
    description: "Read the contents of a source file inside the artifacts/ directory. Returns content WITH LINE NUMBERS on the left (e.g., '   1 | import React...'). Always read before editing — use the line numbers with replace_lines.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
      },
      required: ["path"],
    },
  },
  {
    name: "replace_lines",
    description: "PREFERRED tool for all modifications. Replaces lines start_line through end_line (inclusive, 1-indexed) with new_content. Uses line numbers from read_source_file — no fragile string matching required. Always prefer this over edit_source_file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file, e.g. 'artifacts/web/src/pages/Dashboard.tsx'" },
        start_line: { type: Type.NUMBER, description: "First line to replace (1-indexed, inclusive). Get this number from read_source_file output." },
        end_line: { type: Type.NUMBER, description: "Last line to replace (1-indexed, inclusive). Use the same as start_line for a single-line change." },
        new_content: { type: Type.STRING, description: "The replacement content (replaces everything from start_line to end_line). Must be syntactically valid code." },
      },
      required: ["path", "start_line", "end_line", "new_content"],
    },
  },
  {
    name: "edit_source_file",
    description: "Fallback string-replacement edit. Only use this if replace_lines is not suitable. Finds old_string verbatim in the file and replaces it with new_string — WILL FAIL if whitespace or indentation differs even slightly.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file, e.g. 'artifacts/web/src/pages/Dashboard.tsx'" },
        old_string: { type: Type.STRING, description: "The exact text to find and replace — copy it verbatim from the read_source_file output, preserving indentation and whitespace." },
        new_string: { type: Type.STRING, description: "The replacement text. Must be syntactically valid code." },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "write_source_file",
    description: "Overwrite a source file with entirely new content. Only use this when creating a brand new file from scratch — for all edits use replace_lines instead.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative path to the file inside the artifacts/ directory (e.g., 'artifacts/web/src/components/Dashboard.tsx')" },
        content: { type: Type.STRING, description: "The full new content to write to the file" },
        reason: { type: Type.STRING, description: "Brief description of what changed and why" },
      },
      required: ["path", "content", "reason"],
    },
  },
  {
    name: "report_critical_error",
    description: "Call this ONLY when the Checker phase finds a major error that cannot be self-corrected — e.g., a broken import, a missing component, or a syntax error that breaks the file structure. Provide a plain-English description of exactly what is wrong, which file is affected, and what the user should do next.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file: { type: Type.STRING, description: "The file path where the critical error was found" },
        error: { type: Type.STRING, description: "Plain-English description of the error" },
        suggestion: { type: Type.STRING, description: "What the user should do to fix it (e.g., 'Revert the change to line 42' or 'Re-run with more specific instructions')" },
      },
      required: ["file", "error", "suggestion"],
    },
  },
];

export const NQ_POINT_VALUE = 20;
export const MNQ_POINT_VALUE = 2;

export interface AcademyLessonEntry {
  id: string;
  title: string;
  chapter: string;
  takeaway: string;
  keywords: string[];
}

// NOTE: This index is hand-derived from artifacts/web/src/data/academy-data.ts.
// Keep in sync when lessons are added/updated in academy-data.ts.
// A future improvement could source this from a shared @workspace/academy-data package.
export const ACADEMY_LESSON_INDEX: AcademyLessonEntry[] = [
  { id: "ch1-1", chapter: "Trading Basics", title: "What is Trading?", keywords: ["trading", "buy", "sell", "profit", "short", "shorting", "market"], takeaway: "Trading is buying and selling to profit from price changes. You can make money when prices go up (buying) or down (selling/shorting)." },
  { id: "ch1-2", chapter: "Trading Basics", title: "What are Futures? What is NQ?", keywords: ["futures", "nq", "mnq", "nasdaq", "contract", "e-mini"], takeaway: "NQ = Nasdaq-100 Futures ($20/point). MNQ = the mini version ($2/point). Start with MNQ while learning." },
  { id: "ch1-3", chapter: "Trading Basics", title: "What is a Candlestick Chart?", keywords: ["candlestick", "candle", "chart", "open", "close", "high", "low", "wick", "bullish", "bearish"], takeaway: "Each candle shows Open, High, Low, Close for a time period. Green = price went up, Red = price went down." },
  { id: "ch1-4", chapter: "Trading Basics", title: "What are Timeframes?", keywords: ["timeframe", "timeframes", "htf", "ltf", "daily", "1h", "5m", "15m", "top-down", "bias"], takeaway: "Higher timeframes (Daily, 1H) show the big picture. Lower timeframes (15m, 5m, 1m) show the details. Always start with the big picture first." },
  { id: "ch1-5", chapter: "Trading Basics", title: "What is a Broker and Trading Platform?", keywords: ["broker", "platform", "account", "demo", "commission", "ninjatrader", "tradingview", "tradovate"], takeaway: "A broker connects you to the market. Always start with a demo account to practice with fake money first!" },
  { id: "ch1-6", chapter: "Trading Basics", title: "What is a Prop Firm?", keywords: ["prop", "prop firm", "funded", "evaluation", "topstep", "apex", "ftmo", "drawdown", "daily loss"], takeaway: "Prop firms give you their money to trade with. Pass their evaluation by following strict risk rules." },
  { id: "ch2-1", chapter: "How the Market Really Works", title: "Who Moves the Market?", keywords: ["smart money", "institutions", "banks", "retail", "manipulation", "whales", "hedge fund"], takeaway: "Banks and institutions (Smart Money) move the market. ICT teaches you to follow the Smart Money instead of getting fooled." },
  { id: "ch2-2", chapter: "How the Market Really Works", title: "What is Liquidity?", keywords: ["liquidity", "stop loss", "stop hunt", "stops", "orders", "fill"], takeaway: "Liquidity = stop-loss orders sitting at predictable levels. The big players sweep these stops to fill their orders, then reverse." },
  { id: "ch2-3", chapter: "How the Market Really Works", title: "Buy-Side vs Sell-Side Liquidity", keywords: ["bsl", "ssl", "buy side", "sell side", "buyside", "sellside", "liquidity", "sweep"], takeaway: "BSL (Buy-Side Liquidity) = stop-losses above highs. SSL (Sell-Side Liquidity) = stop-losses below lows. Smart Money sweeps one side, then moves the other way." },
  { id: "ch2-4", chapter: "How the Market Really Works", title: "What is Smart Money?", keywords: ["smart money", "institutional", "displacement", "fair value gap", "clues"], takeaway: "Smart Money = big banks and institutions that move the market. ICT teaches you to follow their moves instead of fighting them." },
  { id: "ch2-5", chapter: "How the Market Really Works", title: "Internal vs External Liquidity", keywords: ["internal liquidity", "external liquidity", "tp1", "tp2", "target", "fvg"], takeaway: "External Liquidity = old highs/lows (the big target, TP2). Internal Liquidity = nearby gaps and levels (the first target, TP1)." },
  { id: "ch3-1", chapter: "The ICT Toolbox", title: "Market Structure — Highs, Lows, Trends", keywords: ["market structure", "trend", "uptrend", "downtrend", "higher high", "lower low", "swing high", "swing low"], takeaway: "Uptrend = higher highs + higher lows (buy only). Downtrend = lower highs + lower lows (sell only). Always trade in the direction of the trend." },
  { id: "ch3-2", chapter: "The ICT Toolbox", title: "Market Structure Shift (MSS)", keywords: ["mss", "market structure shift", "choch", "change of character", "bos", "break of structure", "reversal", "shift"], takeaway: "MSS = the trend just changed direction. Bullish MSS = breaks above a high. Bearish MSS = breaks below a low. Wait for the candle to CLOSE." },
  { id: "ch3-3", chapter: "The ICT Toolbox", title: "Fair Value Gap (FVG)", keywords: ["fvg", "fair value gap", "gap", "imbalance", "3 candle", "entry", "ifvg", "inversion"], takeaway: "FVG = a price gap from a fast move. Price usually comes back to fill it. This is where you place your entry order." },
  { id: "ch3-4", chapter: "The ICT Toolbox", title: "Liquidity Sweep — The Fake-Out", keywords: ["sweep", "liquidity sweep", "fake out", "fakeout", "stop hunt", "trap"], takeaway: "A sweep is a fake move that grabs stop-losses, then price reverses. It's the bait before the real move. Always wait for the sweep BEFORE entering." },
  { id: "ch3-5", chapter: "The ICT Toolbox", title: "Optimal Trade Entry (OTE)", keywords: ["ote", "optimal trade entry", "fibonacci", "fib", "0.62", "0.79", "62", "79", "retracement"], takeaway: "OTE = the 62-79% Fibonacci zone. After a sweep + MSS, price pulls back to this zone before continuing." },
  { id: "ch3-6", chapter: "The ICT Toolbox", title: "Premium vs Discount", keywords: ["premium", "discount", "50%", "equilibrium", "eq", "cheap", "expensive", "midpoint"], takeaway: "Premium = above 50% (expensive, sell zone). Discount = below 50% (cheap, buy zone). Always buy in Discount and sell in Premium." },
  { id: "ch3-7", chapter: "The ICT Toolbox", title: "Displacement — The Power Candle", keywords: ["displacement", "power candle", "aggressive", "fast move", "momentum"], takeaway: "Displacement = a big, fast candle showing real Smart Money intent. It creates FVGs and signals the real move has started." },
  { id: "ch4-1", chapter: "The Kill Zones", title: "Asian Session", keywords: ["asian session", "asian range", "accumulation", "overnight", "range", "8pm", "midnight"], takeaway: "Asian session builds the range. It sets up the liquidity that London and NY will sweep." },
  { id: "ch4-2", chapter: "The Kill Zones", title: "London Open Kill Zone", keywords: ["london", "london open", "london kill zone", "2am", "3am", "4am", "5am", "lkz"], takeaway: "London Open (2-5 AM NY) is the first major liquidity hunt of the day. Often sets the fake-out direction." },
  { id: "ch4-3", chapter: "The Kill Zones", title: "New York Open Kill Zone", keywords: ["new york", "ny open", "nyc", "7am", "8am", "9am", "10am", "nykz", "kill zone", "silver bullet"], takeaway: "NY Open (7-10 AM NY) is where the real daily direction is decided. Highest volume and best setups." },
  { id: "ch4-4", chapter: "The Kill Zones", title: "Silver Bullet", keywords: ["silver bullet", "10am", "11am", "10-11", "silver", "bullet", "1-minute"], takeaway: "Silver Bullet (10:00-11:00 AM NY) is a precise 1-hour window for the cleanest FVG entries on the 1m/5m chart." },
  { id: "ch4-5", chapter: "The Kill Zones", title: "Power of Three (AMD)", keywords: ["power of three", "amd", "accumulation", "manipulation", "distribution", "judas swing", "fake move"], takeaway: "Power of Three: Accumulate → Manipulate (fake move) → Distribute (real move). The daily candle follows this pattern." },
  { id: "ch5-1", chapter: "Order Blocks", title: "What is an Order Block?", keywords: ["order block", "ob", "institutional order", "last candle", "bearish ob", "bullish ob"], takeaway: "An Order Block is the last opposing candle before a big move. It's where institutions placed their orders — price returns to it." },
  { id: "ch5-2", chapter: "Order Blocks", title: "Breaker Blocks", keywords: ["breaker", "breaker block", "violated ob", "failed ob", "support becomes resistance"], takeaway: "A Breaker Block is a former Order Block that was violated — it now acts as resistance/support in the opposite direction." },
];

