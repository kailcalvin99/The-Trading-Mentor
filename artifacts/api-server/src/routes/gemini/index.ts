import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages, adminSettingsTable, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable, propAccountTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray, count } from "drizzle-orm";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { authRequired, adminRequired } from "../../middleware/auth";
import type { Type } from "@google/genai";

const router: IRouter = Router();

const DEFAULT_ICT_SYSTEM_PROMPT = `You are the Ultimate ICT & Trading Psychology Mentor — a full-featured trading assistant who blends Inner Circle Trader (ICT) methodology with proven trading psychology principles. You teach at a 6th-grade reading level: short sentences, bold key terms, and everyday analogies. You never use RSI, MACD, or "Support/Resistance" — you always reframe those as **liquidity pools** or **old highs/lows where orders are resting**.

═══════════════════════════════════════
SECTION 1 — ICT METHODOLOGY CORE
═══════════════════════════════════════

Always pair every ICT acronym with its plain-English meaning on first use. You teach the following concepts:

**Market Structure**
- **BOS (Break of Structure):** Price smashes through a previous high or low — like knocking over a fence in the direction it wants to go. Bullish BOS = new higher high. Bearish BOS = new lower low.
- **CHoCH (Change of Character):** The first sign the trend is flipping. Like a car slowing down before it makes a U-turn.
- **HTF Bias (Higher Time-Frame Bias):** The "GPS route" set on the daily/weekly chart. All entries must agree with the GPS before you get in.

**Liquidity**
- **BSL (Buy-Side Liquidity):** A cluster of stop-loss orders sitting above an old high — money the market wants to grab. Think of it as a piggy bank sitting on a shelf; price reaches up and smashes it.
- **SSL (Sell-Side Liquidity):** Same idea, but orders below an old low.
- **Liquidity Sweep (Stop Hunt):** Price quickly grabs BSL or SSL, then reverses hard. Like a broom sweeping up the money before turning around.
- **IDM (Inducement / SMC Inducement):** A small, fake liquidity grab that tricks impatient traders into entering too early — the "trap" move before the real move. Example: price briefly pokes above a minor high (grabbing IDM), then continues lower to grab the real SSL before reversing up. Always ask: "Was that sweep IDM, or was it the real liquidity run?"

**Price Delivery Concepts**
- **FVG (Fair Value Gap):** A three-candle pattern where the middle candle moves so fast it leaves a gap — a hole price usually comes back to fill. Like a bus that skipped a stop; it has to come back.
- **OB (Order Block):** The last opposing candle before a big move. Institutions placed their orders here. Price often returns to this "loading dock" before continuing.
- **Breaker Block:** A failed Order Block that flips to the opposite role after price takes out the liquidity it was protecting.
- **Mitigation Block:** Similar to a Breaker — a zone where unfilled institutional orders are mopped up.
- **OTE (Optimal Trade Entry):** The sweet-spot entry between the 62%–79% Fibonacci retracement of a swing. Like buying a $100 item on a 62–79% off sale — only buy when price is deeply discounted.
- **Premium vs. Discount:** Is price expensive (above equilibrium = **Premium**, look to sell) or cheap (below equilibrium = **Discount**, look to buy)?
- **NWOG/NDOG (New Week/Day Opening Gap):** Gaps created at the weekly or daily open — high-probability magnets for price.

**Time-Based Concepts**
- **Kill Zones (Best Trading Windows):**
  - Asian Kill Zone: 8 PM – Midnight EST (range-building, liquidity building)
  - London Kill Zone: 2 AM – 5 AM EST (big moves start here)
  - New York AM Kill Zone: 7 AM – 10 AM EST (continuation or reversal of London)
  - Silver Bullet: 10 AM – 11 AM EST (cleanest ICT setup of the day)
  - New York PM: 1:30 PM – 4 PM EST (closing range, avoid unless experienced)
- **Power of Three (AMD):** Every significant candle (daily, weekly) has three phases — **Accumulation** (price builds a range), **Manipulation** (price fakes one direction to grab liquidity), **Distribution** (price delivers in the true direction). ICT calls this "turtle soup" at the macro level.
- **IPDA (Interbank Price Delivery Algorithm):** Institutional price delivery operates in 20-, 40-, and 60-day lookback windows. Price is always reaching for an old high, old low, FVG, or OB within these windows.

**SMT Divergence (Smart Money Tool)**
- When two correlated assets (e.g., ES and NQ, or EUR/USD and GBP/USD) should move together but one makes a new high/low while the other does NOT — that disagreement is **SMT Divergence**. It signals institutional intent. One asset is being used to run liquidity while the other reveals the true direction.

═══════════════════════════════════════
SECTION 2 — TRADING PSYCHOLOGY BASE
═══════════════════════════════════════

You weave Mark Douglas' probabilistic mindset into every lesson:

**The 5 Truths (Douglas)**
1. Anything can happen.
2. You don't need to know what happens next to make money.
3. There is a random distribution between wins and losses for any given set of variables.
4. An edge is nothing more than a higher probability of one thing happening over another.
5. Every moment in the market is unique.

**Probabilistic Thinking:**
Trading is a casino — but YOU are the house. The house doesn't panic after one bad hand. It trusts its edge across thousands of hands. Teach traders to think in sample sizes (e.g., "Over my next 20 trades, my edge should play out") rather than judging every single trade as a win or failure.

**Emotional Leaks — Recognise & Name Them:**
- **FOMO (Fear of Missing Out):** Chasing a move that already happened. Like running for a bus that already left — the next bus (setup) is coming.
- **Greed:** Widening targets, removing take profits, or over-sizing. Greed turns winners into losers.
- **Fear:** Closing trades early, moving stop losses tighter, or not taking valid setups. Fear is the account-killer disguised as caution.
- **Revenge Trading:** After a loss, immediately jumping back in to "get it back." This is gambling, not trading.
- **Overconfidence:** After a winning streak, sizing up too much or skipping checklist steps. The market humbles everyone eventually.

═══════════════════════════════════════
SECTION 3 — EMOTIONAL DETECTION & COOL-DOWN PROTOCOL
═══════════════════════════════════════

**CRITICAL RULE:** Before every response, scan the user's message for emotional distress signals. Look for:
- Words of anger: "angry," "furious," "pissed," "so mad," "I hate this"
- Words of despair: "blew my account," "lost everything," "I want to quit," "this is hopeless," "I'm done"
- Words of panic: "scared," "terrified," "freaking out," "I don't know what to do"
- Excessive punctuation/caps that signals agitation: "WHY DID IT JUST DROP?!?!", "I CAN'T BELIEVE THIS"

**If ANY emotional distress is detected:**
1. STOP all technical content immediately.
2. Acknowledge the emotion with one short, genuine sentence — no lectures.
3. Run the **Cool-Down Exercise** below.
4. Only AFTER the cool-down, gently ask if they are ready to look at the chart together.

**Cool-Down Exercise (always in this order):**
> "Let's pause the chart for a second. Try this with me:
> 1. Take a slow breath in for 4 counts.
> 2. Hold for 4 counts.
> 3. Breathe out slowly for 6 counts.
> Do that twice. The market will be there in 60 seconds — your clear head is worth more than the next trade."

Then add one grounding reframe from Mark Douglas:
> "Remember — this is just one trade in a series of hundreds. The casino doesn't close after one bad hand. Neither do we."

═══════════════════════════════════════
SECTION 4 — 5-STEP LESSON / TRADE REVIEW STRUCTURE
═══════════════════════════════════════

Every time you analyze a trade idea OR review a past trade, follow this exact 5-step order. Label each step clearly:

**Step 1 — HTF Bias: What is the GPS saying?**
What is the Daily/Weekly trend? Are we in a bullish or bearish delivery? Until the GPS is clear, we don't move.

**Step 2 — Timing: Are we in a Kill Zone?**
Is the clock right? Is this the London open, NY open, or Silver Bullet window? Good setup + wrong time = no trade.

**Step 3 — The Sweep: Did price grab liquidity?**
Did we see a BSL or SSL grab? Was there an IDM (inducement) fake-out before the real sweep? No sweep = wait.

**Step 4 — The Displacement: FVG + BOS confirmed?**
After the sweep, did price aggressively displace and leave a Fair Value Gap? Did we get a Break of Structure (BOS) or Change of Character (CHoCH) to confirm the reversal?

**Step 5 — Risk Math: Does the RR make sense?**
- Entry: where exactly? (OTE? FVG? OB?)
- Stop: beyond the swing high/low that was swept.
- Target: next liquidity pool (BSL or SSL above/below).
- **Minimum acceptable Risk-to-Reward: 1:3 (risk $1 to make $3).**
- Position size: never risk more than 0.5% of account on one trade.

═══════════════════════════════════════
SECTION 5 — CONFIDENCE SCORING
═══════════════════════════════════════

**MANDATORY:** Begin EVERY response with a confidence prefix on its own line, before any other content:

> **Confidence: X/10** — [one-sentence reason for this score]

Score guide:
- **9–10/10:** All 5 steps confirmed, clean setup, Kill Zone active, strong HTF alignment.
- **7–8/10:** Most steps confirmed, minor uncertainties noted.
- **5–6/10:** Key confluence missing — explain what's missing.
- **3–4/10:** Multiple red flags — strong lean toward "do not trade this."
- **1–2/10:** Setup does not meet ICT criteria — do not trade this.

For non-trade questions (psychology, app navigation, general questions), use the score to indicate how confident you are in your answer/advice.

═══════════════════════════════════════
SECTION 6 — LANGUAGE & ANALOGY RULES
═══════════════════════════════════════

1. **Reading level:** 6th grade. Short sentences. No jargon without a plain-English definition.
2. **Bold all key ICT terms** on first use in any response.
3. **Use these analogies:**
   - GPS analogy for HTF Bias and direction.
   - Casino analogy for edge, probability, and consistency.
   - Bus Route analogy for Kill Zones and timing (price has a schedule; get to the stop on time).
4. **NEVER mention:** RSI, MACD, Stochastic, Bollinger Bands, traditional Support/Resistance, trend lines drawn randomly.
   - If a user asks about these, reframe: "What we call that in ICT is a **liquidity pool** — here's how to see it the right way..."
5. **Always pair acronyms with plain English:** e.g., "**FVG (Fair Value Gap)**" not just "FVG."

═══════════════════════════════════════
SECTION 7 — APP ASSISTANT CAPABILITIES
═══════════════════════════════════════

You are also a full app assistant. You can help the user navigate the app, log trades, calculate position sizes, mark routine checklist items, and analyze trading performance. When the user asks you to do something the app can do, USE your available tools/functions to take that action. Always be helpful and proactive.

IMPORTANT: This platform uses a shared/team trading journal. Trade data (journal entries, analytics) is platform-wide, not per-user. When discussing trades, refer to them as "the team's trades" or "logged trades" rather than implying they belong to one specific user.

═══════════════════════════════════════
SECTION 8 — PERSONALITY & CORE PRINCIPLES
═══════════════════════════════════════

- Encouraging, patient, and disciplined. You celebrate good **risk management** as much as good trades.
- You protect the student's capital like it is your own.
- You never shame a trader for a loss — losses are tuition in the school of the market.
- You hold the line on discipline: no setup = no trade, no matter how strongly the student wants to act.
- Protecting the account is always Priority #1.`;

async function getSystemPrompt(): Promise<string> {
  try {
    const [row] = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
    if (row && row.value && row.value.trim().length > 0) {
      return row.value;
    }
  } catch {}
  return DEFAULT_ICT_SYSTEM_PROMPT;
}

const USER_TOOL_DECLARATIONS = [
  {
    name: "navigate",
    description: "Navigate the user to a specific page in the app. Use this when the user asks to go to a page, or when an action requires showing a specific page.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        page: {
          type: "STRING" as Type,
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
      type: "OBJECT" as Type,
      properties: {
        pair: { type: "STRING" as Type, description: "Trading pair/ticker (e.g., NQ1!, MNQ1!, ES1!)" },
        outcome: { type: "STRING" as Type, description: "Trade outcome: win, loss, or breakeven" },
        riskPct: { type: "NUMBER" as Type, description: "Risk percentage (e.g., 0.5)" },
        entryTime: { type: "STRING" as Type, description: "Entry time (e.g., 10:15 AM)" },
        notes: { type: "STRING" as Type, description: "Trade notes including entry mode [Conservative] or [Silver Bullet]" },
        sideDirection: { type: "STRING" as Type, description: "BUY or SELL" },
        behaviorTag: { type: "STRING" as Type, description: "Behavior tag: Disciplined, FOMO, Chased, or Greedy" },
      },
      required: ["pair", "outcome"],
    },
  },
  {
    name: "get_journal_entries",
    description: "Get the user's recent trade journal entries. Use when the user asks about their trades, recent performance, or trading history.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        limit: { type: "NUMBER" as Type, description: "Number of trades to return (default 10)" },
      },
    },
  },
  {
    name: "get_analytics_summary",
    description: "Get a summary of the user's trading analytics including win rate, total trades, behavior patterns, profit factor, etc. Use when the user asks 'how did I do', 'what's my win rate', or anything about their performance.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "calculate_position_size",
    description: "Calculate position size for NQ/MNQ futures based on account balance, risk percentage, and stop loss distance. Use when the user asks about position sizing, how many contracts to trade, etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        stopLossPoints: { type: "NUMBER" as Type, description: "Stop loss distance in points" },
        riskPct: { type: "NUMBER" as Type, description: "Risk percentage of account (default 0.5)" },
        accountBalance: { type: "NUMBER" as Type, description: "Optional override for account balance" },
      },
      required: ["stopLossPoints"],
    },
  },
  {
    name: "complete_planner_items",
    description: "Mark morning routine items as complete. Use when the user says 'mark my routine done', 'complete my morning routine', etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        markAll: { type: "BOOLEAN" as Type, description: "If true, mark ALL routine items as complete" },
        items: {
          type: "ARRAY" as Type,
          description: "Specific item keys to mark complete",
          items: { type: "STRING" as Type },
        },
      },
    },
  },
  {
    name: "get_user_context",
    description: "Get the current user's profile, subscription, and app context. Use when you need information about the user to answer a question.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
];

const ADMIN_TOOL_DECLARATIONS = [
  {
    name: "list_users_summary",
    description: "List all users with their subscription status. Admin only. Use when admin asks about users, user count, who's subscribed, etc.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_platform_stats",
    description: "Get platform-wide statistics: user counts, subscription distribution, trade counts, revenue summary. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {},
    },
  },
  {
    name: "get_inactive_users",
    description: "Get a list of users who haven't been active on the platform (no AI conversations or app usage) in a specified number of days. Admin only. Note: trade journal is a shared team resource without per-user tracking.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        days: { type: "NUMBER" as Type, description: "Number of days of inactivity (default 7)" },
      },
    },
  },
  {
    name: "suggest_system_prompt",
    description: "Generate a suggested AI mentor system prompt based on current platform data and usage patterns. Admin only.",
    parameters: {
      type: "OBJECT" as Type,
      properties: {
        focus: { type: "STRING" as Type, description: "Optional focus area for the prompt (e.g., 'risk management', 'discipline', 'ICT concepts')" },
      },
    },
  },
];

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

async function executeToolCall(toolName: string, args: Record<string, unknown>, userId?: number, isAdmin?: boolean): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "navigate": {
      const pageMap: Record<string, string> = {
        academy: "/",
        planner: "/planner",
        "risk-shield": "/risk-shield",
        journal: "/journal",
        analytics: "/analytics",
        pricing: "/pricing",
        admin: "/admin",
        welcome: "/welcome",
        community: "/community",
        dashboard: "/dashboard",
      };
      const page = args.page as string;
      const path = pageMap[page] || "/";
      return { action: "navigate", path, page };
    }

    case "log_trade": {
      const pair = (args.pair as string) || "NQ1!";
      const outcome = (args.outcome as string) || "";
      const riskPct = (args.riskPct as number) || 0.5;
      const entryTime = (args.entryTime as string) || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const notes = (args.notes as string) || "";
      const sideDirection = (args.sideDirection as string) || "BUY";
      const behaviorTag = (args.behaviorTag as string) || "";

      return {
        action: "log_trade",
        tradeData: { pair, outcome, riskPct, entryTime, notes, sideDirection, behaviorTag },
        requiresConfirmation: true,
        confirmMessage: `Log a ${outcome} trade on ${pair} (${sideDirection}, ${riskPct}% risk)?`,
      };
    }

    case "get_journal_entries": {
      // Note: tradesTable is not user-scoped by design (personal trading journal)
      // The entire platform shares a single trade log — this matches the existing
      // trades API routes which also have no userId filter
      const limit = (args.limit as number) || 10;
      try {
        const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt)).limit(limit);
        return {
          action: "data",
          trades: trades.map(t => ({
            pair: t.pair,
            outcome: t.outcome,
            riskPct: parseFloat(t.riskPct),
            entryTime: t.entryTime,
            notes: t.notes,
            behaviorTag: t.behaviorTag,
            sideDirection: t.sideDirection,
            isDraft: t.isDraft,
            createdAt: t.createdAt,
          })),
        };
      } catch {
        return { action: "data", trades: [], error: "Failed to fetch trades" };
      }
    }

    case "get_analytics_summary": {
      if (!isAdmin && userId) {
        const [sub] = await db
          .select({ level: subscriptionTiersTable.level })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
          .where(eq(userSubscriptionsTable.userId, userId));
        const tierLevel = sub?.level ?? 0;
        if (tierLevel < 2) {
          return { action: "data", analytics: null, error: "Analytics require a Premium subscription. Please upgrade to access performance insights.", upgradeUrl: "/pricing" };
        }
      }
      // Note: tradesTable has no userId column — platform-level shared journal by design
      try {
        const trades = await db.select().from(tradesTable).orderBy(desc(tradesTable.createdAt));
        const completed = trades.filter(t => !t.isDraft);
        const wins = completed.filter(t => t.outcome === "win").length;
        const losses = completed.filter(t => t.outcome === "loss").length;
        const breakeven = completed.filter(t => t.outcome === "breakeven").length;
        const total = completed.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        const disciplined = completed.filter(t => t.behaviorTag === "Disciplined").length;
        const fomo = completed.filter(t => t.behaviorTag === "FOMO").length;
        const chased = completed.filter(t => t.behaviorTag === "Chased").length;
        const greedy = completed.filter(t => t.behaviorTag === "Greedy").length;

        const avgRisk = total > 0 ? completed.reduce((s, t) => s + parseFloat(t.riskPct), 0) / total : 0;

        const account = await db.select().from(propAccountTable).limit(1);
        const propInfo = account[0] ? {
          balance: parseFloat(account[0].currentBalance),
          startingBalance: parseFloat(account[0].startingBalance),
          dailyLoss: parseFloat(account[0].dailyLoss),
        } : null;

        return {
          action: "data",
          analytics: {
            totalTrades: total,
            wins, losses, breakeven, winRate,
            avgRiskPct: parseFloat(avgRisk.toFixed(2)),
            behaviorBreakdown: { disciplined, fomo, chased, greedy },
            propAccount: propInfo,
            recentTrades: completed.slice(0, 5).map(t => ({
              pair: t.pair,
              outcome: t.outcome,
              riskPct: parseFloat(t.riskPct),
              createdAt: t.createdAt,
            })),
          },
        };
      } catch {
        return { action: "data", analytics: null, error: "Failed to fetch analytics" };
      }
    }

    case "calculate_position_size": {
      const stopLossPoints = (args.stopLossPoints as number) || 10;
      const riskPct = (args.riskPct as number) || 0.5;

      let accountBalance = args.accountBalance as number | undefined;
      if (!accountBalance) {
        try {
          const account = await db.select().from(propAccountTable).limit(1);
          if (account[0]) accountBalance = parseFloat(account[0].currentBalance);
        } catch {}
      }
      accountBalance = accountBalance || 50000;

      const riskAmount = accountBalance * (riskPct / 100);
      const nqContracts = stopLossPoints > 0 ? riskAmount / (stopLossPoints * NQ_POINT_VALUE) : 0;
      const mnqContracts = stopLossPoints > 0 ? riskAmount / (stopLossPoints * MNQ_POINT_VALUE) : 0;

      return {
        action: "position_size",
        calculation: {
          accountBalance,
          riskPct,
          riskAmount: parseFloat(riskAmount.toFixed(2)),
          stopLossPoints,
          nqContracts: parseFloat(nqContracts.toFixed(2)),
          mnqContracts: parseFloat(mnqContracts.toFixed(2)),
          nqContractsRounded: Math.floor(nqContracts),
          mnqContractsRounded: Math.floor(mnqContracts),
        },
        navigateTo: "/risk-shield",
      };
    }

    case "complete_planner_items": {
      const markAll = args.markAll as boolean;
      const items = args.items as string[] | undefined;
      return {
        action: "complete_planner",
        markAll: markAll || false,
        items: items || [],
        requiresConfirmation: true,
        confirmMessage: markAll ? "Mark all morning routine items as complete?" : `Mark ${(items || []).length} routine items as complete?`,
      };
    }

    case "get_user_context": {
      if (!userId) return { action: "data", context: { authenticated: false } };
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) return { action: "data", context: { authenticated: false } };

        const subs = await db.select({
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
          status: userSubscriptionsTable.status,
        })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
          .where(eq(userSubscriptionsTable.userId, userId));

        const sub = subs[0] || null;

        return {
          action: "data",
          context: {
            authenticated: true,
            name: user.name,
            email: user.email,
            role: user.role,
            isFounder: user.isFounder,
            subscription: sub ? { tierName: sub.tierName, tierLevel: sub.tierLevel, status: sub.status } : null,
          },
        };
      } catch {
        return { action: "data", context: { authenticated: false } };
      }
    }

    case "list_users_summary": {
      if (!isAdmin) return { error: "Admin access required" };
      try {
        const users = await db.select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          isFounder: usersTable.isFounder,
          createdAt: usersTable.createdAt,
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
          subStatus: userSubscriptionsTable.status,
        })
          .from(usersTable)
          .leftJoin(userSubscriptionsTable, eq(usersTable.id, userSubscriptionsTable.userId))
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id));

        return {
          action: "data",
          users: users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            isFounder: u.isFounder,
            plan: u.tierName || "Free",
            status: u.subStatus || "none",
            joined: u.createdAt,
          })),
          totalUsers: users.length,
        };
      } catch {
        return { error: "Failed to fetch users" };
      }
    }

    case "get_platform_stats": {
      if (!isAdmin) return { error: "Admin access required" };
      try {
        const allUsers = await db.select().from(usersTable);
        const allSubs = await db.select({
          status: userSubscriptionsTable.status,
          tierName: subscriptionTiersTable.name,
          tierLevel: subscriptionTiersTable.level,
        })
          .from(userSubscriptionsTable)
          .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id));

        const allTrades = await db.select().from(tradesTable);
        const completedTrades = allTrades.filter(t => !t.isDraft);
        const wins = completedTrades.filter(t => t.outcome === "win").length;

        const activeSubs = allSubs.filter(s => s.status === "active");
        const tierDistribution: Record<string, number> = {};
        activeSubs.forEach(s => {
          const name = s.tierName || "Unknown";
          tierDistribution[name] = (tierDistribution[name] || 0) + 1;
        });

        return {
          action: "data",
          stats: {
            totalUsers: allUsers.length,
            activeSubscriptions: activeSubs.length,
            tierDistribution,
            totalTrades: completedTrades.length,
            totalDrafts: allTrades.filter(t => t.isDraft).length,
            overallWinRate: completedTrades.length > 0 ? Math.round((wins / completedTrades.length) * 100) : 0,
            admins: allUsers.filter(u => u.role === "admin").length,
            founders: allUsers.filter(u => u.isFounder).length,
          },
        };
      } catch {
        return { error: "Failed to fetch platform stats" };
      }
    }

    case "get_inactive_users": {
      if (!isAdmin) return { error: "Admin access required" };
      const days = (args.days as number) || 7;
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allUsers = await db.select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          createdAt: usersTable.createdAt,
        }).from(usersTable);

        const recentConvsByUser = await db.select({
          userId: conversations.userId,
        }).from(conversations).where(
          and(gte(conversations.createdAt, cutoff), sql`${conversations.userId} IS NOT NULL`)
        );

        const activeUserIds = new Set(
          recentConvsByUser
            .filter(c => c.userId !== null)
            .map(c => c.userId!)
        );

        const recentTrades = await db.select({
          count: sql<number>`count(*)`,
        }).from(tradesTable).where(gte(tradesTable.createdAt, cutoff));

        const tradeCount = recentTrades[0]?.count ?? 0;

        const inactive = allUsers.filter(u => !activeUserIds.has(u.id));

        return {
          action: "data",
          inactiveUsers: inactive.map(u => ({
            name: u.name,
            email: u.email,
            joined: u.createdAt,
          })),
          days,
          totalInactive: inactive.length,
          totalUsers: allUsers.length,
          totalTradesInPeriod: tradeCount,
          note: "Inactivity measured by absence of AI conversation activity within the period. Trade journal is platform-level (not per-user) in current schema.",
        };
      } catch {
        return { error: "Failed to fetch inactive users" };
      }
    }

    case "suggest_system_prompt": {
      if (!isAdmin) return { error: "Admin access required" };
      const focus = (args.focus as string) || "general ICT mentorship";
      return {
        action: "suggest_prompt",
        focus,
        currentPrompt: await getSystemPrompt(),
        suggestion: `Generate a refined system prompt focused on: ${focus}. The admin will review and can save it.`,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

router.use(authRequired);

router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === "admin";
    let convs;
    if (isAdmin) {
      convs = await db.select().from(conversations).orderBy(conversations.createdAt);
    } else if (userId) {
      convs = await db
        .select()
        .from(conversations)
        .where(sql`${conversations.userId} = ${userId} OR ${conversations.userId} IS NULL`)
        .orderBy(conversations.createdAt);
    } else {
      convs = [];
    }
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = CreateGeminiConversationBody.parse(req.body);
    const userId = req.user?.userId;
    const [conv] = await db
      .insert(conversations)
      .values({ title: body.title, userId: userId || null })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.userId;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (req.user?.role !== "admin" && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list messages" });
  }
});

const FREE_AI_DAILY_LIMIT = 3;

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendGeminiMessageBody.parse(req.body);
    const pageContext = req.body.pageContext || null;
    const isAdmin = req.user?.role === "admin";
    const userId = req.user?.userId;

    if (!isAdmin && userId) {
      const [subRow] = await db
        .select({ tierLevel: subscriptionTiersTable.level })
        .from(userSubscriptionsTable)
        .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
        .where(eq(userSubscriptionsTable.userId, userId));

      const tierLevel = subRow?.tierLevel ?? 0;

      if (tierLevel === 0) {
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);

        const [{ msgCount }] = await db
          .select({ msgCount: count() })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(
              eq(messages.role, "user"),
              eq(conversations.userId, userId),
              gte(messages.createdAt, todayUtc)
            )
          );

        if (msgCount >= 3) {
          res.status(429).json({
            error: "Daily AI Mentor limit reached",
            message: "Free users can send up to 3 AI Mentor messages per day. Upgrade to Standard for unlimited access.",
            limitReached: true,
            upgradeUrl: "/pricing",
          });
          return;
        }
      }
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (!isAdmin && conv.userId !== null && conv.userId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    await db
      .insert(messages)
      .values({ conversationId: id, role: "user", content: body.content });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const chatHistory = existingMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as "model" | "user"),
      parts: [{ text: m.content }],
    }));

    chatHistory.push({
      role: "user",
      parts: [{ text: body.content }],
    });

    const tools = isAdmin
      ? [...USER_TOOL_DECLARATIONS, ...ADMIN_TOOL_DECLARATIONS]
      : USER_TOOL_DECLARATIONS;

    let systemPrompt = await getSystemPrompt();
    if (pageContext) {
      systemPrompt += `\n\nCurrent app context:\n- Current page: ${pageContext.currentPage || "unknown"}\n- Route: ${pageContext.route || "/"}\n`;
      if (pageContext.pageData) {
        systemPrompt += `- Page data: ${JSON.stringify(pageContext.pageData)}\n`;
      }
      if (pageContext.userName) {
        systemPrompt += `- User: ${pageContext.userName}\n`;
      }
      if (pageContext.tierLevel !== undefined) {
        systemPrompt += `- Subscription tier level: ${pageContext.tierLevel}\n`;
      }
    }

    if (isAdmin) {
      systemPrompt += "\n\nThis user is an ADMIN. You have access to admin-only tools for platform management, user analytics, and system prompt suggestions. Use them when asked about platform stats, user activity, or system configuration.";
    }

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatHistory,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: tools }],
      },
    });

    for await (const chunk of stream) {
      if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            fullResponse += part.text;
            res.write(`data: ${JSON.stringify({ content: part.text })}\n\n`);
          }
          if (part.functionCall) {
            const toolName = part.functionCall.name;
            const toolArgs = (part.functionCall.args || {}) as Record<string, unknown>;

            const result = await executeToolCall(toolName!, toolArgs, userId, isAdmin);

            res.write(`data: ${JSON.stringify({ toolCall: { name: toolName, args: toolArgs, result } })}\n\n`);

            const toolResponseContent = [{
              role: "model" as const,
              parts: [{ functionCall: { name: toolName!, args: toolArgs } }],
            }, {
              role: "user" as const,
              parts: [{ functionResponse: { name: toolName!, response: result } }],
            }];

            const followUp = await ai.models.generateContentStream({
              model: "gemini-2.5-flash",
              contents: [...chatHistory, ...toolResponseContent],
              config: {
                maxOutputTokens: 4096,
                systemInstruction: systemPrompt,
              },
            });

            for await (const followChunk of followUp) {
              const text = followChunk.text;
              if (text) {
                fullResponse += text;
                res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
              }
            }
          }
        }
      } else {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }
    }

    if (fullResponse) {
      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fullResponse,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;
